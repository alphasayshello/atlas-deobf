/*! Copyright (c) 2026 Tildra LLC. All rights reserved. ATLAS for GeoGuessr. Proprietary; unauthorized copying, distribution, or reverse engineering is prohibited. https://geoguessrcheats.com/terms */
(function () {
  "use strict";

  var READER_INSTALLED_FLAG = "__ziqkjcngr_reader_installed";
  if (window[READER_INSTALLED_FLAG]) {
    return;
  }
  try {
    window[READER_INSTALLED_FLAG] = true;
  } catch (err) {
    return;
  }

  var CHANNEL_SOURCE = "mh4ebrjayrj";
  var LEAFLET_MAP_KEY = "__ziqkjcngr_leaflet_map";
  var messagePort = null;
  var messageQueue = [];

  // Listen for PORT initialization message from the content script (geoguessr-content.js)
  window.addEventListener("message", function (event) {
    if (event.source === window && event.origin === window.location.origin) {
      var data = event && event.data;
      if (data && data.source === CHANNEL_SOURCE && data.type === "PORT" && event.ports && event.ports[0]) {
        messagePort = event.ports[0];
        try {
          messagePort.start();
        } catch (err) {}
        messagePort.onmessage = handlePortMessage;

        var queued = messageQueue;
        messageQueue = [];
        for (var i = 0; i < queued.length; i++) {
          try {
            messagePort.postMessage(queued[i]);
          } catch (err) {}
        }
      }
    }
  });

  // Notify content script that injection is ready
  try {
    window.postMessage({ source: CHANNEL_SOURCE, type: "READY" }, window.location.origin);
  } catch (err) {}

  var lastCoordsKey = "";
  var lastLat = null;
  var lastLng = null;

  var GOOGLE_METADATA_PATHS = [
    [1, 0, 5, 0, 1, 0],
    [1, 5, 0, 1, 0],
    [0, 5, 0, 1, 0],
    [1, 0, 1, 0],
    [2, 0, 5, 0, 1, 0],
  ];

  var COORDINATE_CONTAINER_KEYS = [
    "round",
    "location",
    "position",
    "coords",
    "answer",
    "target",
    "streetView",
    "pano",
    "geometry",
    "computed_geometry",
    "image",
    "images",
    "features",
    "properties",
  ];

  var BBOX_IGNORE_KEYS = [
    "map",
    "bounds",
    "bbox",
    "boundingBox",
    "viewport",
    "extent",
    "center",
    "sw",
    "ne",
    "southwest",
    "northeast",
    "rounds",
    "guesses",
    "guess",
    "teams",
    "players",
  ];

  var METADATA_URL_PATTERNS = ["GetMetadata", "SingleImageSearch", "GetPanorama"];

  var RELEVANT_DOMAINS = [
    "google",
    "openguessr",
    "worldguessr",
    "freeguessr",
    "guesswhere",
    "geotastic",
    "hideandseek",
    "geohub",
    "mapcrunch",
    "mapillary",
    "panoramax",
    "mapiguesser",
    "panoguessr",
  ];

  var currentRoundToken = "";
  var reportedRoundResults = {};
  var reportedSessionSummaries = {};
  var geoGuessrUserId = null;
  var isFetchingProfile = false;
  var geoGuessrNick3 = "";
  var AVATAR_ID_REGEX = /^[A-Z0-9_]{3,64}$/;
  var MAX_AVATAR_ITEMS = 30;
  var avatarFetchTriggered = false;

  // Intercept XMLHttpRequest
  var origXhrOpen = XMLHttpRequest.prototype.open;
  var origXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      this.__ziqkjcngr_url = url;
    } catch (err) {}
    return origXhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    try {
      xhr.addEventListener("load", function () {
        try {
          if (xhr.status === 200 && isRelevantUrl(xhr.__ziqkjcngr_url)) {
            processNetworkResponse(xhr.__ziqkjcngr_url, xhr.responseText);
          }
        } catch (err) {}
      });
    } catch (err) {}
    return origXhrSend.apply(this, arguments);
  };

  // Intercept window.fetch
  if (typeof window.fetch === "function") {
    var origFetch = window.fetch;
    window.fetch = function (resource) {
      var url = resource instanceof Request ? resource.url : String(resource || "");
      var promise = origFetch.apply(this, arguments);
      if (isRelevantUrl(url)) {
        promise.then(
          function (response) {
            try {
              response
                .clone()
                .text()
                .then(
                  function (bodyText) {
                    processNetworkResponse(url, bodyText);
                  },
                  function () {}
                );
            } catch (err) {}
          },
          function () {}
        );
      }
      return promise;
    };
  }

  // Intercept WebSocket
  (function interceptWebSocket() {
    var OrigWebSocket = window.WebSocket;
    if (OrigWebSocket && !OrigWebSocket.__ziqkjcngr_wrapped) {
      function WrappedWebSocket(url, protocols) {
        var ws = protocols === undefined ? new OrigWebSocket(url) : new OrigWebSocket(url, protocols);
        try {
          ws.addEventListener("message", function (event) {
            var msgData = event && event.data;
            if (typeof msgData === "string") {
              var first = msgData.charAt(0);
              if (first === "{" || first === "[") {
                var parsed;
                try {
                  parsed = JSON.parse(msgData);
                } catch (err) {
                  return;
                }
                updateCurrentRoundToken(parsed);
                var coords = extractRoundCoordinates(parsed);
                if (!coords && !hasGamePayload(parsed)) {
                  coords = deepFindCoordinates(parsed, 6);
                }
                if (coords) {
                  broadcastCoordinates(coords.lat, coords.lng, "socket " + truncateUrl(url));
                }
              }
            }
          });
        } catch (err) {}
        return ws;
      }

      WrappedWebSocket.prototype = OrigWebSocket.prototype;
      WrappedWebSocket.CONNECTING = OrigWebSocket.CONNECTING;
      WrappedWebSocket.OPEN = OrigWebSocket.OPEN;
      WrappedWebSocket.CLOSING = OrigWebSocket.CLOSING;
      WrappedWebSocket.CLOSED = OrigWebSocket.CLOSED;
      WrappedWebSocket.__ziqkjcngr_wrapped = true;
      try {
        window.WebSocket = WrappedWebSocket;
      } catch (err) {}
    }
  })();

  // Regex patterns for matching coordinates in URLs/iframes
  var IFRAME_COORD_REGEXES = [
    {
      re: /[?&](?:location|center|viewpoint|ll)=(-?[\d.]+),(-?[\d.]+)/,
      lngFirst: false,
    },
    { re: /!2d(-?[\d.]+)!3d(-?[\d.]+)/, lngFirst: true },
    { re: /@(-?[\d.]+),(-?[\d.]+)/, lngFirst: false },
  ];

  // Periodic DOM and Google Maps scanner (every 1500ms)
  setInterval(function () {
    var coords = (function scanGoogleMaps() {
      try {
        if (window.google && window.google.maps) {
          var divs = document.querySelectorAll("div");
          var maxDivs = Math.min(divs.length, 600);
          for (var i = 0; i < maxDivs; i++) {
            var gm = divs[i].__gm;
            if (gm) {
              for (var key in gm) {
                var item = gm[key];
                if (item) {
                  if (typeof item.getPosition === "function") {
                    var pos = extractLatLngFromGoogleMap(item.getPosition());
                    if (pos) return pos;
                  }
                  if (typeof item.getStreetView === "function") {
                    var sv = item.getStreetView();
                    if (sv && typeof sv.getPosition === "function") {
                      var svPos = extractLatLngFromGoogleMap(sv.getPosition());
                      if (svPos) return svPos;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {}

      try {
        for (var winKey in window) {
          var winVal;
          try {
            winVal = window[winKey];
          } catch (err) {
            continue;
          }
          if (winVal && typeof winVal.getPosition === "function" && typeof winVal.getPano === "function") {
            var panoPos = extractLatLngFromGoogleMap(winVal.getPosition());
            if (panoPos) return panoPos;
          }
        }
      } catch (err) {}

      return null;
    })();

    if (coords) {
      broadcastCoordinates(coords.lat, coords.lng, "panorama");
    } else {
      coords = (function scanIframes() {
        var iframes = document.querySelectorAll("iframe");
        for (var i = 0; i < iframes.length; i++) {
          var src = iframes[i].src || "";
          if (src.indexOf("google") !== -1) {
            for (var r = 0; r < IFRAME_COORD_REGEXES.length; r++) {
              var match = src.match(IFRAME_COORD_REGEXES[r].re);
              if (match) {
                var p1 = parseFloat(match[1]);
                var p2 = parseFloat(match[2]);
                var lat = IFRAME_COORD_REGEXES[r].lngFirst ? p2 : p1;
                var lng = IFRAME_COORD_REGEXES[r].lngFirst ? p1 : p2;
                if (isValidLatLng(lat, lng)) {
                  return { lat: lat, lng: lng };
                }
              }
            }
          }
        }
        return null;
      })();

      if (coords) {
        broadcastCoordinates(coords.lat, coords.lng, "iframe");
      }
    }
  }, 1500);

  // Hook Function.prototype.bind to intercept Leaflet map instance
  (function hookLeafletMap() {
    var origBind = Function.prototype.bind;
    Function.prototype.bind = function (context) {
      try {
        if (!window[LEAFLET_MAP_KEY] && isLeafletMap(context)) {
          window[LEAFLET_MAP_KEY] = context;
        }
      } catch (err) {}
      return origBind.apply(this, arguments);
    };

    setTimeout(function () {
      Function.prototype.bind = origBind;
    }, 60000);

    var checkAttempts = 0;
    var scanInterval = setInterval(function () {
      if (window[LEAFLET_MAP_KEY] || checkAttempts >= 30) {
        clearInterval(scanInterval);
      } else {
        checkAttempts++;
        for (var key in window) {
          try {
            if (isLeafletMap(window[key])) {
              window[LEAFLET_MAP_KEY] = window[key];
              break;
            }
          } catch (err) {}
        }
      }
    }, 2000);
  })();

  function postOrQueueMessage(msg) {
    if (messagePort) {
      try {
        messagePort.postMessage(msg);
        return;
      } catch (err) {
        messagePort = null;
      }
    }
    if (messageQueue.length < 8) {
      messageQueue.push(msg);
    }
  }

  function handlePortMessage(event) {
    var msg = event && event.data;
    if (!msg || msg.type !== "AVATAR_REQUEST") return;

    if (avatarFetchTriggered) return;
    avatarFetchTriggered = true;
    if (String(location.hostname || "").indexOf("geoguessr.com") === -1) return;

    try {
      fetch("/api/v4/avatar/user", { credentials: "include" })
        .then(function (res) {
          return res && res.ok ? res.json() : null;
        })
        .then(function (userData) {
          var equippedAssets = parseEquippedAvatarAssets(userData);
          if (equippedAssets.length > 0) {
            sendPortData("AVATAR_EQUIPPED", equippedAssets);
          }
        })
        .catch(function () {});
    } catch (err) {}
  }

  function parseEquippedAvatarAssets(userData) {
    if (!userData || typeof userData !== "object") return [];
    var result = [];
    var seenSlots = {};

    function addAsset(item) {
      if (item && typeof item === "object" && result.length < MAX_AVATAR_ITEMS) {
        var id = item.id;
        var slot = item.slot;
        if (
          typeof id === "string" &&
          AVATAR_ID_REGEX.test(id) &&
          typeof slot === "number" &&
          slot === Math.floor(slot) &&
          slot >= 1 &&
          slot <= 24 &&
          !seenSlots[slot]
        ) {
          seenSlots[slot] = true;
          result.push({ id: id, slot: slot });
        }
      }
    }

    var equipped = Array.isArray(userData.equipped) ? userData.equipped : [];
    for (var i = 0; i < equipped.length; i++) {
      addAsset(equipped[i]);
    }

    var emoteSlots = userData.equippedEmoteSlotAssets;
    if (emoteSlots && typeof emoteSlots === "object" && !Array.isArray(emoteSlots)) {
      var slotKeys = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6", "slotElite"];
      for (var j = 0; j < slotKeys.length; j++) {
        addAsset(emoteSlots[slotKeys[j]]);
      }
    }
    return result;
  }

  function isValidNumberInRange(val, max) {
    return typeof val === "number" && val === val && val >= -max && val <= max;
  }

  function isValidLatLng(lat, lng) {
    return (
      isValidNumberInRange(lat, 90) &&
      isValidNumberInRange(lng, 180) &&
      !(lat === 0 && lng === 0)
    );
  }

  function truncateUrl(url) {
    var str = String(url || "");
    var queryIdx = str.indexOf("?");
    if (queryIdx !== -1) str = str.slice(0, queryIdx);
    var hashIdx = str.indexOf("#");
    if (hashIdx !== -1) str = str.slice(0, hashIdx);
    return str.length > 80 ? str.slice(str.length - 80) : str;
  }

  function broadcastCoordinates(lat, lng, source) {
    if (!isValidLatLng(lat, lng)) return;
    var key = lat + "@" + lng;
    if (key === lastCoordsKey) return;

    if (lastLat != null) {
      var dLat = lat - lastLat;
      var dLng = (lng - lastLng) * Math.cos((lat * Math.PI) / 180);
      if (dLat * dLat + dLng * dLng < 81e-8) return;
    }

    lastCoordsKey = key;
    lastLat = lat;
    lastLng = lng;

    postOrQueueMessage({
      source: CHANNEL_SOURCE,
      type: "COORDINATES",
      coords: { lat: lat, lng: lng },
      src: source || "",
      round: currentRoundToken,
    });
  }

  function getNestedProperty(obj, path) {
    var current = obj;
    for (var i = 0; i < path.length; i++) {
      if (current == null) return undefined;
      current = current[path[i]];
    }
    return current;
  }

  function isBBoxOrMapProperty(propName) {
    return BBOX_IGNORE_KEYS.indexOf(propName) !== -1 || /bounds/i.test(propName);
  }

  function extractLatLngFromObject(obj) {
    var lat = obj.lat != null ? obj.lat : obj.latitude;
    var lng = obj.lng != null ? obj.lng : obj.lon != null ? obj.lon : obj.long != null ? obj.long : obj.longitude;
    if (isValidLatLng(lat, lng)) {
      return { lat: lat, lng: lng };
    }
    var geometry = obj.type === "Point"
      ? obj
      : obj.geometry && typeof obj.geometry === "object"
        ? obj.geometry
        : obj.computed_geometry && typeof obj.computed_geometry === "object"
          ? obj.computed_geometry
          : null;

    if (geometry && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
      var gLng = geometry.coordinates[0];
      var gLat = geometry.coordinates[1];
      if (isValidLatLng(gLat, gLng)) {
        return { lat: gLat, lng: gLng };
      }
    }
    return null;
  }

  function deepFindCoordinates(obj, depth) {
    if (obj == null || typeof obj !== "object" || depth < 0) return null;

    var direct = extractLatLngFromObject(obj);
    if (direct) return direct;

    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        var found = deepFindCoordinates(obj[i], depth - 1);
        if (found) return found;
      }
      return null;
    }

    for (var j = 0; j < COORDINATE_CONTAINER_KEYS.length; j++) {
      var val = obj[COORDINATE_CONTAINER_KEYS[j]];
      if (val && typeof val === "object") {
        var match = deepFindCoordinates(val, depth - 1);
        if (match) return match;
      }
    }

    for (var key in obj) {
      if (COORDINATE_CONTAINER_KEYS.indexOf(key) === -1 && !isBBoxOrMapProperty(key)) {
        var nestedMatch = deepFindCoordinates(obj[key], depth - 1);
        if (nestedMatch) return nestedMatch;
      }
    }
    return null;
  }

  function isRelevantUrl(url) {
    if (!url) return false;
    var lower = url.toLowerCase();
    for (var i = 0; i < RELEVANT_DOMAINS.length; i++) {
      if (lower.indexOf(RELEVANT_DOMAINS[i]) !== -1) return true;
    }
    return (
      url.charAt(0) === "/" ||
      /\/api\/|\/game\/|\/round\/|location|drops|\.php|countr/.test(lower)
    );
  }

  function extractRoundCoordinates(json) {
    if (!json || typeof json !== "object") return null;

    function toCoords(item) {
      return item && typeof item === "object" && isValidLatLng(item.lat, item.lng)
        ? { lat: item.lat, lng: item.lng }
        : null;
    }

    var rounds = json.rounds || json.round;
    if (Array.isArray(rounds) && rounds.length > 0) {
      var lastRound = rounds[rounds.length - 1];
      var point = toCoords(lastRound) || (lastRound && toCoords(lastRound.panorama)) || (lastRound && toCoords(lastRound.location));
      if (!point && lastRound && typeof lastRound === "object") {
        point = deepFindCoordinates(lastRound, 4);
      }
      if (point) return point;
    }

    var correct = toCoords(json.correctLocation);
    if (correct) return correct;

    var currentKeys = ["currentRound", "current_round"];
    for (var i = 0; i < currentKeys.length; i++) {
      var curr = json[currentKeys[i]];
      if (curr && typeof curr === "object") {
        var cPoint = toCoords(curr.correctLocation) || toCoords(curr.correct_location) || toCoords(curr.panorama);
        if (cPoint) return cPoint;
      }
    }
    return null;
  }

  function isGamePayload(json) {
    if (!json || typeof json !== "object") return false;
    var rounds = json.rounds || json.round;
    if (Array.isArray(rounds) && rounds.length > 0) return true;
    if (json.correctLocation && typeof json.correctLocation === "object") return true;
    var currentRound = json.currentRound || json.current_round;
    return Boolean(currentRound && typeof currentRound === "object");
  }

  function searchForGamePayload(json, depth) {
    if (!json || typeof json !== "object") return null;
    if (isGamePayload(json)) return json;
    if (depth <= 0 || Array.isArray(json)) return null;
    for (var key in json) {
      var val = json[key];
      var found = val && typeof val === "object" ? searchForGamePayload(val, depth - 1) : null;
      if (found) return found;
    }
    return null;
  }

  function isGeoGuessrDomain() {
    try {
      var loc = window.location || {};
      return String(loc.hostname || loc.origin || loc.href || "").indexOf("geoguessr.com") !== -1;
    } catch (err) {
      return false;
    }
  }

  function hasGamePayload(json) {
    return isGeoGuessrDomain() ? Boolean(searchForGamePayload(json, 2)) : isGamePayload(json);
  }

  function updateCurrentRoundToken(json) {
    var game = isGamePayload(json) ? json : isGeoGuessrDomain() ? searchForGamePayload(json, 2) : null;
    if (game && typeof game === "object") {
      var token = game.token || game.gameId || game.gameToken || "";
      var roundNum = typeof game.currentRoundNumber === "number"
        ? game.currentRoundNumber
        : typeof game.round === "number"
          ? game.round
          : Array.isArray(game.rounds)
            ? game.rounds.length
            : null;

      if (token && typeof roundNum === "number") {
        currentRoundToken = String(token).slice(0, 64) + ":" + roundNum;
      }
    }
  }

  function processNetworkResponse(url, rawResponseText) {
    if (!rawResponseText) return;
    var firstChar = rawResponseText.charAt(0);
    if (firstChar !== "{" && firstChar !== "[") return;

    var jsonData;
    try {
      jsonData = JSON.parse(rawResponseText);
    } catch (err) {
      return;
    }

    updateCurrentRoundToken(jsonData);

    var sourceTag = "";
    var foundCoords = null;

    var isMetadataUrl = METADATA_URL_PATTERNS.some(function (pattern) {
      return url.indexOf(pattern) !== -1;
    });

    if (isMetadataUrl) {
      foundCoords = (function extractFromMetadata(data) {
        for (var i = 0; i < GOOGLE_METADATA_PATHS.length; i++) {
          try {
            var pair = getNestedProperty(data, GOOGLE_METADATA_PATHS[i]);
            if (pair && isValidLatLng(pair[2], pair[3])) {
              return { lat: pair[2], lng: pair[3] };
            }
          } catch (err) {}
        }
        return null;
      })(jsonData);

      if (foundCoords) {
        sourceTag = "metadata";
      }
    }

    if (!foundCoords) {
      foundCoords = extractRoundCoordinates(jsonData);
      if (foundCoords) {
        sourceTag = "rounds";
      }
    }

    if (!foundCoords && !hasGamePayload(jsonData)) {
      foundCoords = deepFindCoordinates(jsonData, 6);
      if (foundCoords) {
        sourceTag = "walker";
      }
    }

    if (foundCoords) {
      broadcastCoordinates(foundCoords.lat, foundCoords.lng, sourceTag + " " + truncateUrl(url));
    }

    try {
      extractAndSendRoundResults(url, jsonData);
    } catch (err) {}
  }

  function extractAndSendRoundResults(url, jsonData) {
    if (String(url || "").toLowerCase().indexOf("geoguessr") === -1) return;
    var extractor = window.__ziqkjcngr_roundExtract;
    if (typeof extractor !== "function") return;

    ensureGeoGuessrProfile();

    var extraction = extractor(url, jsonData, geoGuessrUserId);
    if (!extraction || !extraction.rounds || !extraction.rounds.length) return;

    var gameId = String((jsonData && (jsonData.token || jsonData.gameId || jsonData.gameToken)) || url || "game");
    for (var i = 0; i < extraction.rounds.length; i++) {
      var round = extraction.rounds[i];
      var roundKey = gameId + ":" + round.mode + ":" + round.round;
      if (!reportedRoundResults[roundKey]) {
        reportedRoundResults[roundKey] = true;
        sendPortData("ROUND_RESULT", attachUserProfile(round));
      }
    }

    if (extraction.finished && !reportedSessionSummaries[gameId]) {
      reportedSessionSummaries[gameId] = true;
      var summary = computeSessionSummary(extraction.rounds);
      sendPortData("SESSION_SUMMARY", attachUserProfile(summary));
    }
  }

  function ensureGeoGuessrProfile() {
    if (geoGuessrUserId || isFetchingProfile) return;
    isFetchingProfile = true;
    try {
      fetch("/api/v3/profiles", { credentials: "include" })
        .then(function (res) {
          return res && res.ok ? res.json() : null;
        })
        .then(function (data) {
          if (data) {
            geoGuessrUserId = (data.user && (data.user.id || data.user.userId)) || data.id || null;
            var nick = (data.user && data.user.nick) || "";
            geoGuessrNick3 = typeof nick === "string" ? nick.trim().slice(0, 3) : "";
          }
        })
        .catch(function () {});
    } catch (err) {}
  }

  function computeSessionSummary(rounds) {
    var totalScore = 0;
    var totalDist = 0;
    var distCount = 0;
    for (var i = 0; i < rounds.length; i++) {
      totalScore += rounds[i].score || 0;
      if (typeof rounds[i].distance_km === "number") {
        totalDist += rounds[i].distance_km;
        distCount++;
      }
    }
    return {
      total_score: totalScore,
      rounds: rounds.length,
      avg_score: Math.round(totalScore / Math.max(1, rounds.length)),
      avg_distance_km: distCount ? Math.round((totalDist / distCount) * 10) / 10 : null,
      mode: rounds.length ? rounds[rounds.length - 1].mode : "unknown",
    };
  }

  function sendPortData(type, data) {
    postOrQueueMessage({ source: CHANNEL_SOURCE, type: type, data: data });
  }

  function attachUserProfile(data) {
    if (geoGuessrUserId && data && typeof data === "object") {
      data.gg_id = String(geoGuessrUserId).slice(0, 64);
      if (geoGuessrNick3) {
        data.gg_nick3 = geoGuessrNick3;
      }
    }
    return data;
  }

  function extractLatLngFromGoogleMap(latLngObj) {
    if (!latLngObj) return null;
    var lat = typeof latLngObj.lat === "function" ? latLngObj.lat() : latLngObj.lat;
    var lng = typeof latLngObj.lng === "function" ? latLngObj.lng() : latLngObj.lng;
    return typeof lat === "number" && typeof lng === "number" ? { lat: lat, lng: lng } : null;
  }

  function isLeafletMap(obj) {
    if (!obj || typeof obj !== "object") return false;
    var methods = ["setView", "panTo", "getZoom", "fire", "on", "off"];
    for (var i = 0; i < methods.length; i++) {
      try {
        if (typeof obj[methods[i]] !== "function") return false;
      } catch (err) {
        return false;
      }
    }
    return true;
  }
})();
