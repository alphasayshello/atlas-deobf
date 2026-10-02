/*! Copyright (c) 2026 Tildra LLC. All rights reserved. ATLAS for GeoGuessr. Proprietary; unauthorized copying, distribution, or reverse engineering is prohibited. https://geoguessrcheats.com/terms */

function getI18nMessage(key) {
  try {
    var msg = chrome.i18n.getMessage(key);
    return typeof msg === "string" && msg.length ? msg : key;
  } catch (err) {
    return key;
  }
}

(function () {
  "use strict";

  var CHANNEL_SOURCE = "mh4ebrjayrj";
  var messagePort = null;
  var isAvatarRequestPending = false;
  var COORDS_EXPIRY_MS = 120000; // 2 minutes

  var currentCoords = {
    lat: null,
    lng: null,
    at: 0,
    src: "",
    round: "",
  };

  var coordsHistory = [];
  var currentUrl = location.href;

  // Clear stale coordinates upon page/round navigation
  setInterval(function () {
    var nowUrl = location.href;
    if (nowUrl !== currentUrl) {
      currentUrl = nowUrl;
      currentCoords.lat = null;
      currentCoords.lng = null;
      currentCoords.at = 0;
      currentCoords.src = "";
      currentCoords.round = "";
      coordsHistory.length = 0;
    }
  }, 1000);

  var isPlatformAllowed = true;
  var isInstallBlocked = false;

  function refreshPlatformSettings() {
    try {
      chrome.storage.local.get(
        ["platformGG", "platformOG", "atlasInstallBlocked"],
        function (storage) {
          if (storage) {
            isInstallBlocked = Boolean(storage.atlasInstallBlocked);
          }
          var host = location.hostname;
          if (host.indexOf("openguessr") !== -1) {
            isPlatformAllowed = storage.platformOG !== false;
          } else if (host.indexOf("geoguessr.com") !== -1) {
            isPlatformAllowed = storage.platformGG !== false;
          } else {
            isPlatformAllowed = true;
          }
        }
      );
    } catch (err) {}
  }

  refreshPlatformSettings();

  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === "local" && (changes.platformGG || changes.platformOG)) {
        refreshPlatformSettings();
      }
    });
  } catch (err) {}

  // Rolling 1-minute rate limiter
  var rateLimitWindowStart = 0;
  var rateLimitCounter = 0;

  function checkRateLimit(maxPerMinute) {
    var now = Date.now();
    if (now - rateLimitWindowStart > 60000) {
      rateLimitWindowStart = now;
      rateLimitCounter = 0;
    }
    rateLimitCounter++;
    return rateLimitCounter <= maxPerMinute;
  }

  var isAvatarSyncDone = false;
  var isAvatarEquippedSent = false;

  function initAvatarSync() {
    if (!isAvatarSyncDone && location.hostname.indexOf("geoguessr.com") !== -1) {
      try {
        if (window.top !== window) return;
      } catch (err) {
        return;
      }

      try {
        chrome.storage.local.get(["atlasKey", "atlasKeyValid", "avatarSync"], function (storage) {
          if (
            !isAvatarSyncDone &&
            storage &&
            (storage.atlasKey || "").trim() &&
            storage.atlasKeyValid === true &&
            storage.avatarSync !== false
          ) {
            isAvatarSyncDone = true;
            isAvatarRequestPending = true;
            postPortMessage({ type: "AVATAR_REQUEST" });
          }
        });
      } catch (err) {}
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAvatarSync);
  } else {
    initAvatarSync();
  }

  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === "local" && changes.atlasKeyValid && changes.atlasKeyValid.newValue === true) {
        initAvatarSync();
      }
    });
  } catch (err) {}

  function setupMessageChannel() {
    try {
      var channel = new MessageChannel();

      channel.port1.onmessage = function (event) {
        handleInjectedMessage(event && event.data);
      };

      try {
        channel.port1.start();
      } catch (err) {}

      messagePort = channel.port1;

      // Transfer port2 to the MAIN world page script (xhr_inject.js)
      window.postMessage(
        { source: CHANNEL_SOURCE, type: "PORT" },
        window.location.origin,
        [channel.port2]
      );

      if (isAvatarRequestPending) {
        postPortMessage({ type: "AVATAR_REQUEST" });
      }
    } catch (err) {}
  }

  function handleInjectedMessage(msg) {
    if (!msg || isInstallBlocked) return;

    if (msg.type === "AVATAR_EQUIPPED") {
      if (!isAvatarSyncDone || isAvatarEquippedSent || !Array.isArray(msg.data)) return;
      isAvatarEquippedSent = true;
      try {
        chrome.runtime.sendMessage({ action: "avatarEquipped", data: msg.data }).catch(function () {});
      } catch (err) {}
      return;
    }

    if (msg.type === "ROUND_RESULT" || msg.type === "SESSION_SUMMARY") {
      if (!isPlatformAllowed || !msg.data) return;
      if (!checkRateLimit(20)) return;
      try {
        chrome.runtime
          .sendMessage({
            action: msg.type === "ROUND_RESULT" ? "roundResult" : "sessionSummary",
            data: msg.data,
          })
          .catch(function () {});
      } catch (err) {}
      return;
    }

    if (msg.type !== "COORDINATES") return;

    var coords = msg.coords;
    if (
      !coords ||
      typeof coords.lat !== "number" ||
      typeof coords.lng !== "number" ||
      !Number.isFinite(coords.lat) ||
      !Number.isFinite(coords.lng) ||
      Math.abs(coords.lat) > 90 ||
      Math.abs(coords.lng) > 180
    ) {
      return;
    }

    currentCoords.lat = coords.lat;
    currentCoords.lng = coords.lng;
    currentCoords.at = Date.now();
    currentCoords.src = typeof msg.src === "string" ? msg.src.slice(0, 120) : "";
    currentCoords.round = typeof msg.round === "string" ? msg.round.slice(0, 80) : "";

    // Add to recent history (avoiding duplicate coordinates, keeping up to 6)
    for (var i = 0; i < coordsHistory.length; i++) {
      if (coordsHistory[i].lat === currentCoords.lat && coordsHistory[i].lng === currentCoords.lng) {
        coordsHistory.splice(i, 1);
        break;
      }
    }
    coordsHistory.unshift({
      lat: currentCoords.lat,
      lng: currentCoords.lng,
      src: currentCoords.src || "",
      at: currentCoords.at,
      round: currentCoords.round || "",
    });
    if (coordsHistory.length > 6) {
      coordsHistory.length = 6;
    }

    if (!isPlatformAllowed) return;
    if (!checkRateLimit(60)) return;

    try {
      chrome.runtime
        .sendMessage({
          action: "coordinatesExtracted",
          coordinates: { lat: coords.lat, lng: coords.lng, src: currentCoords.src },
        })
        .catch(function () {});
    } catch (err) {}
  }

  function postPortMessage(msg) {
    if (!messagePort) return false;
    try {
      messagePort.postMessage(msg);
      return true;
    } catch (err) {
      return false;
    }
  }

  function getRoundCandidates(now) {
    var candidates = [];
    if (!currentCoords.round) return candidates;
    for (var i = 0; i < coordsHistory.length; i++) {
      var item = coordsHistory[i];
      if (item.round === currentCoords.round && now - item.at < COORDS_EXPIRY_MS) {
        candidates.push({ lat: item.lat, lng: item.lng, src: item.src, at: item.at });
      }
    }
    return candidates;
  }

  // Listen for READY signal from xhr_inject.js
  window.addEventListener("message", function (event) {
    if (event.source === window && event.origin === location.origin) {
      var data = event && event.data;
      if (data && data.source === CHANNEL_SOURCE && data.type === "READY") {
        setupMessageChannel();
      }
    }
  });

  setupMessageChannel();

  // Listen for messages from background / sidepanel
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message) return;

    if (message.action === "getCoordinates") {
      var now = Date.now();
      if (
        currentCoords.at &&
        now - currentCoords.at < COORDS_EXPIRY_MS &&
        currentCoords.lat != null &&
        currentCoords.lng != null
      ) {
        sendResponse({
          success: true,
          coordinates: {
            lat: currentCoords.lat,
            lng: currentCoords.lng,
            src: currentCoords.src,
            at: currentCoords.at,
            candidates: getRoundCandidates(now),
          },
        });
      } else {
        chrome.storage.local.get(["extractedCoordinates", "coordinatesTimestamp"], function (data) {
          var isFresh =
            data.coordinatesTimestamp && now - data.coordinatesTimestamp < COORDS_EXPIRY_MS;
          if (data.extractedCoordinates && isFresh) {
            var extracted = data.extractedCoordinates;
            sendResponse({
              success: true,
              coordinates: {
                lat: extracted.lat,
                lng: extracted.lng,
                src: extracted.src,
                at: data.coordinatesTimestamp,
              },
            });
          } else {
            sendResponse({
              success: false,
              error: getI18nMessage("content_err_no_coordinates_yet_start_a_round"),
            });
          }
        });
      }
      return true;
    }

    if (message.action === "atlasFetchProfile") {
      if (location.hostname.indexOf("geoguessr.com") !== -1) {
        fetch("/api/v3/profiles", {
          credentials: "include",
          headers: { accept: "application/json" },
        })
          .then(function (res) {
            return res.ok ? res.json() : Promise.reject(new Error("http " + res.status));
          })
          .then(function (profile) {
            sendResponse({ success: true, profile: profile });
          })
          .catch(function (err) {
            sendResponse({ success: false, error: String((err && err.message) || err) });
          });
      } else {
        sendResponse({ success: false, error: "not-geoguessr" });
      }
      return true;
    }
  });

  // Floating side panel launcher UI button
  var LAUNCHER_BUTTON_ID = "atlas-sidepanel-launcher";
  var LAUNCHER_STYLE_ID = "atlas-sidepanel-launcher-style";

  function injectLauncherStyles() {
    if (!document.getElementById(LAUNCHER_STYLE_ID)) {
      var style = document.createElement("style");
      style.id = LAUNCHER_STYLE_ID;
      style.textContent = [
        "#" + LAUNCHER_BUTTON_ID + " {",
        "  position: fixed; top: 50%; right: -34px; transform: translateY(-50%);",
        "  width: 92px; height: 56px; display: flex; align-items: center; justify-content: flex-start;",
        "  padding: 0; border: 0; border-radius: 28px 0 0 28px; background: #12121F; color: #F0F0F8;",
        "  cursor: pointer; overflow: hidden; z-index: 2147483647;",
        "  box-shadow: 0 18px 40px rgba(3, 9, 20, 0.28);",
        "  transition: right 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;",
        "}",
        "#" + LAUNCHER_BUTTON_ID + ":hover { right: -8px; box-shadow: 0 20px 44px rgba(3, 9, 20, 0.34); }",
        "#" + LAUNCHER_BUTTON_ID + ":focus-visible { right: -8px; outline: 2px solid rgba(255, 102, 0, 0.9); outline-offset: 2px; }",
        "#" + LAUNCHER_BUTTON_ID + " .atlas-mark { width: 56px; min-width: 56px; height: 56px; display: grid; place-items: center; }",
        "#" + LAUNCHER_BUTTON_ID + " svg { width: 26px; height: 26px; }",
        "#" + LAUNCHER_BUTTON_ID + ".is-busy { right: -8px; background: #0B0B14; }",
      ].join("\n");
      (document.head || document.documentElement).appendChild(style);
    }
  }

  function mountLauncherButton() {
    if (!document.getElementById(LAUNCHER_BUTTON_ID)) {
      injectLauncherStyles();
      var btn = document.createElement("button");
      btn.id = LAUNCHER_BUTTON_ID;
      btn.type = "button";
      btn.setAttribute("aria-label", getI18nMessage("content_attr_open_the_atlas_side_panel"));
      btn.innerHTML =
        '<span class="atlas-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" stroke="#F0F0F8" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.5" fill="#FF6600"/></svg></span>';

      btn.addEventListener("click", function () {
        btn.classList.add("is-busy");
        setTimeout(function () {
          btn.classList.remove("is-busy");
        }, 1200);

        try {
          chrome.runtime.sendMessage({ action: "openSidePanelFromPage" }).catch(function () {
            btn.classList.remove("is-busy");
          });
        } catch (err) {
          btn.classList.remove("is-busy");
        }
      });

      (document.body || document.documentElement).appendChild(btn);
    }
  }

  // Setup launcher visibility based on stored preferences
  (function initLauncher() {
    try {
      chrome.storage.local.get(["showLauncher"], function (data) {
        if (data && data.showLauncher === true) {
          mountLauncherButton();
        }
      });

      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === "local") {
          if (changes.atlasInstallBlocked) {
            isInstallBlocked = changes.atlasInstallBlocked.newValue === true;
          }
          if (changes.showLauncher) {
            if (changes.showLauncher.newValue === true) {
              mountLauncherButton();
            } else {
              var existingBtn = document.getElementById(LAUNCHER_BUTTON_ID);
              if (existingBtn) existingBtn.remove();
            }
          }
        }
      });
    } catch (err) {}
  })();
})();
