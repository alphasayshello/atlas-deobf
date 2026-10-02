/*! Copyright (c) 2026 Tildra LLC. All rights reserved. ATLAS for GeoGuessr. Proprietary; unauthorized copying, distribution, or reverse engineering is prohibited. https://geoguessrcheats.com/terms */

function getI18nMessage(key) {
  try {
    var msg = chrome.i18n.getMessage(key);
    return typeof msg === "string" && msg.length ? msg : key;
  } catch (err) {
    return key;
  }
}

if (typeof importScripts === "function") {
  importScripts("extpay.js");
}

const extpay = ExtPay("atlas-geoguessr");
extpay.startBackground();

const hasSidePanel = typeof chrome !== "undefined" && Boolean(chrome.sidePanel);
const sidebarApi =
  (typeof browser !== "undefined" && browser.sidebarAction) ||
  (typeof chrome !== "undefined" && chrome.sidebarAction) ||
  null;

if (hasSidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

const ATLAS_SITE = "https://geoguessrcheats.com";
const ATLAS_VALIDATE_URL = "https://geoguessrcheats.com/api/validate-key";
const ATLAS_LOG_EVENT_URL = "https://geoguessrcheats.com/api/log-event";
const ATLAS_CLAIM_URL = "https://geoguessrcheats.com/api/claim-key";
const ATLAS_MANAGE_URL = "https://geoguessrcheats.com/api/manage-key";
const ATLAS_AVATAR_URL = "https://geoguessrcheats.com/api/avatar-equipped";
const ATLAS_PROMO_REDEEM_URL = "https://geoguessrcheats.com/api/admin?route=promo-redeem";
const ATLAS_PROMO_CONSUME_URL = "https://geoguessrcheats.com/api/admin?route=promo-consume";
const ATLAS_PROMO_KEY = "atlasPromo";
const ATLAS_PROMO_REGEX = /^PROMO-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/;

const ATLAS_SUPABASE_URL = "https://ynqcxfjxirfqmspfjrws.supabase.co";
const ATLAS_SUPABASE_ANON = "sb_publishable_wMmqjlF-XSVuE-f_ZWP2GQ_hlMGQGCb";
const ATLAS_LICENSE_PUBKEY_B64 = "MPE44rAAXFmFUMBBlD9BRzRK5OyU+0SV2o8/1crArjU=";
const ATLAS_HEARTBEAT_ALARM = "atlasLicenseHeartbeat";

const FREE_SECRET_STORAGE_KEY = "atlasInstallSalt";
const FREE_RECORD_STORAGE_KEY = "atlasTrialState";
const AVATAR_ID_REGEX = /^[A-Z0-9_]{3,64}$/;

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToHex(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(digest));
}

function getOrGenerateMachineId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["atlasMachineId"], (stored) => {
      let id = stored && stored.atlasMachineId;
      if (typeof id === "string" && /^[a-f0-9]{8,128}$/.test(id)) {
        return resolve(id);
      }
      const randomBytes = new Uint8Array(18);
      crypto.getRandomValues(randomBytes);
      id = bytesToHex(randomBytes);
      chrome.storage.local.set({ atlasMachineId: id }, () => resolve(id));
    });
  });
}

function storageGet(area, keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage[area].get(keys, (res) => resolve(res || {}));
    } catch (err) {
      resolve({});
    }
  });
}

function storageSet(area, items) {
  return new Promise((resolve) => {
    try {
      chrome.storage[area].set(items, () => {
        const ignored = chrome.runtime.lastError;
        resolve();
      });
    } catch (err) {
      resolve();
    }
  });
}

async function getOrInitFreeSecret() {
  const [localData, syncData] = await Promise.all([
    storageGet("local", [FREE_SECRET_STORAGE_KEY]),
    storageGet("sync", [FREE_SECRET_STORAGE_KEY]),
  ]);

  let secret = localData[FREE_SECRET_STORAGE_KEY] || syncData[FREE_SECRET_STORAGE_KEY];
  if (typeof secret !== "string" || !/^[a-f0-9]{32,}$/.test(secret)) {
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    secret = bytesToHex(randomBytes);
  }

  await Promise.all([
    storageSet("local", { [FREE_SECRET_STORAGE_KEY]: secret }),
    storageSet("sync", { [FREE_SECRET_STORAGE_KEY]: secret }),
  ]);
  return secret;
}

async function signFreeRecord(secret, record) {
  const payload = `${record.iid}|${record.n}|${record.v}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToHex(new Uint8Array(signature));
}

async function readFreeUsageRecord() {
  const secret = await getOrInitFreeSecret();
  const machineId = await getOrGenerateMachineId();
  const [localData, syncData] = await Promise.all([
    storageGet("local", [FREE_RECORD_STORAGE_KEY]),
    storageGet("sync", [FREE_RECORD_STORAGE_KEY]),
  ]);

  let highestUsed = 0;
  let hasRecord = false;
  let hasValidSignature = false;

  const records = [localData[FREE_RECORD_STORAGE_KEY], syncData[FREE_RECORD_STORAGE_KEY]];
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    hasRecord = true;
    if (typeof record.n !== "number" || record.n < 0 || record.iid !== machineId) continue;

    const expectedSig = await signFreeRecord(secret, record);
    if (record.sig === expectedSig) {
      hasValidSignature = true;
      if (record.n > highestUsed) {
        highestUsed = record.n;
      }
    }
  }

  return {
    used: highestUsed,
    tampered: hasRecord && !hasValidSignature,
  };
}

async function writeFreeUsageRecord(usedCount) {
  const secret = await getOrInitFreeSecret();
  const machineId = await getOrGenerateMachineId();
  const record = { iid: machineId, n: usedCount, v: 1 };
  record.sig = await signFreeRecord(secret, record);

  await Promise.all([
    storageSet("local", { [FREE_RECORD_STORAGE_KEY]: record }),
    storageSet("sync", { [FREE_RECORD_STORAGE_KEY]: record }),
  ]);
  return usedCount;
}

async function postPromoRequest(url, data) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    let parsed = null;
    try {
      parsed = JSON.parse(await res.text());
    } catch (err) {
      parsed = null;
    }
    return { status: res.status, data: parsed };
  } catch (err) {
    return { status: 0, data: null };
  }
}

async function getStoredPromo() {
  const stored = await storageGet("local", [ATLAS_PROMO_KEY]);
  const promo = stored && stored[ATLAS_PROMO_KEY];
  return promo && typeof promo.code === "string" && promo.code ? promo : null;
}

async function consumePromoRound(promo) {
  const machineId = await getOrGenerateMachineId();
  const response = await postPromoRequest(ATLAS_PROMO_CONSUME_URL, {
    code: promo.code,
    device_id: machineId,
  });

  const isAllowed = response.status === 200 && response.data && response.data.allowed === true;
  const reason = (response.data && response.data.reason) || "unavailable";

  if (!isAllowed && reason === "exhausted") {
    await storageSet("local", { [ATLAS_PROMO_KEY]: null });
  }

  return {
    allowed: isAllowed,
    reason: isAllowed ? "ok" : reason,
    remaining: response.data && response.data.remaining,
  };
}

async function collectMachineComponents() {
  const components = {};
  const nav = typeof navigator !== "undefined" ? navigator : {};

  try {
    if (nav.userAgent) components.ua = await sha256Hex("ua:" + nav.userAgent);
    if (nav.language) components.lang = await sha256Hex("lang:" + nav.language);
    if (nav.hardwareConcurrency) components.cpu = await sha256Hex("cpu:" + nav.hardwareConcurrency);
    if (nav.platform) components.plat = await sha256Hex("plat:" + nav.platform);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) components.tz = await sha256Hex("tz:" + tz);
    } catch (err) {}
  } catch (err) {}

  return components;
}

async function verifyEd25519Signature(content, sigHeader) {
  if (!sigHeader || sigHeader.indexOf("ed25519=") !== 0) return false;
  try {
    const rawSig = base64ToBytes(sigHeader.slice(8));
    const pubKeyBytes = base64ToBytes(ATLAS_LICENSE_PUBKEY_B64);
    const key = await crypto.subtle.importKey(
      "raw",
      pubKeyBytes,
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      rawSig,
      new TextEncoder().encode(content)
    );
  } catch (err) {
    return false;
  }
}

async function validateLicenseKey(licenseKey) {
  let machineId = null;
  let components = {};
  try {
    [machineId, components] = await Promise.all([
      getOrGenerateMachineId(),
      collectMachineComponents(),
    ]);
  } catch (err) {}

  let response;
  try {
    response = await fetch(ATLAS_VALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: licenseKey,
        machine_id: machineId,
        machine_components: components,
      }),
    });
  } catch (err) {
    return {
      valid: false,
      error: "network",
      detail: String((err && err.message) || err),
    };
  }

  const rawBody = await response.text();
  const sigHeader = response.headers.get("X-Atlas-Sig") || "";
  const isValidSignature = await verifyEd25519Signature(rawBody, sigHeader);
  if (!isValidSignature) {
    return { valid: false, error: "signature" };
  }

  try {
    const json = JSON.parse(rawBody);
    if (!json) return { valid: false, error: "parse" };
    json.__status = response.status;
    if (json.valid) {
      json.__signed = { body: rawBody, sig: sigHeader };
    }
    return json;
  } catch (err) {
    return { valid: false, error: "parse" };
  }
}

function getCurrentMonthKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

async function signClientRequest(signingKeyB64, key, eventType) {
  try {
    const rawKey = base64ToBytes(signingKeyB64);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceBytes = new Uint8Array(8);
    crypto.getRandomValues(nonceBytes);
    const nonce = bytesToHex(nonceBytes);

    const message = (key || "").toUpperCase() + "|" + eventType + "|" + timestamp + "|" + nonce;
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
    return "hmac=" + bytesToHex(new Uint8Array(signature)) + "; ts=" + timestamp + "; nonce=" + nonce;
  } catch (err) {
    return null;
  }
}

function detectBrowserName() {
  try {
    const ua = navigator.userAgent || "";
    if (/Edg\//.test(ua)) return "Edge";
    if (/OPR\//.test(ua)) return "Opera";
    if (/Firefox\//.test(ua)) return "Firefox";
    if (/Chrome\//.test(ua)) return "Chrome";
    return "other";
  } catch (err) {
    return "other";
  }
}

function reportBotRound() {
  chrome.storage.local.get(
    ["atlasKey", "atlasRequestSigningKey", "atlasUsageMonth", "atlasUsageRounds"],
    (stored) => {
      const key = ((stored && stored.atlasKey) || "").trim();
      const signingKey = stored && stored.atlasRequestSigningKey;
      if (!key || !signingKey) return;

      signClientRequest(signingKey, key, "bot_round")
        .then((sigHeader) => {
          if (!sigHeader) return;
          return fetch(ATLAS_LOG_EVENT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Atlas-Sig": sigHeader,
            },
            body: JSON.stringify({ key: key, event_type: "bot_round" }),
          }).then((res) => res.json());
        })
        .then((resData) => {
          const monthlyRounds = resData && resData.monthly_rounds;
          if (typeof monthlyRounds !== "number") return;
          const currentMonth = getCurrentMonthKey();
          const recorded = (stored.atlasUsageMonth === currentMonth && stored.atlasUsageRounds) || 0;
          if (monthlyRounds > recorded) {
            chrome.storage.local.set({
              atlasUsageMonth: currentMonth,
              atlasUsageRounds: monthlyRounds,
            });
          }
        })
        .catch(() => {});
    }
  );
}

function reportAnonymousEvent(eventType, extraDetails) {
  chrome.storage.local.get(["atlasKey"], (stored) => {
    if (stored && (stored.atlasKey || "").trim()) return;

    getOrGenerateMachineId()
      .then((machineId) => {
        let version = "";
        try {
          version = chrome.runtime.getManifest().version;
        } catch (err) {}

        const payload = Object.assign(
          {
            anon: true,
            event_type: eventType,
            machine_id: machineId,
            client: "extension",
            browser: detectBrowserName(),
            v: version,
          },
          extraDetails || {}
        );

        fetch(ATLAS_LOG_EVENT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then((res) => (eventType === "anon_launch" && res && res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              chrome.storage.local.set({
                atlasInstallBlocked: data.blocked === true,
              });
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  });
}

function reportAppLaunch() {
  chrome.storage.local.get(["atlasKey", "atlasRequestSigningKey"], (stored) => {
    const key = ((stored && stored.atlasKey) || "").trim();
    const signingKey = stored && stored.atlasRequestSigningKey;
    if (!key || !signingKey) {
      reportAnonymousEvent("anon_launch");
      return;
    }

    const details = { client: "extension" };
    try {
      details.version = chrome.runtime.getManifest().version;
    } catch (err) {}
    try {
      details.os =
        (navigator.userAgentData && navigator.userAgentData.platform) ||
        navigator.platform ||
        "";
    } catch (err) {}
    try {
      details.locale = (navigator.language || "").slice(0, 16);
    } catch (err) {}
    try {
      details.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (err) {}
    details.browser = detectBrowserName();

    signClientRequest(signingKey, key, "app_launch")
      .then((sigHeader) => {
        if (!sigHeader) return;
        fetch(ATLAS_LOG_EVENT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Atlas-Sig": sigHeader },
          body: JSON.stringify({
            key: key,
            event_type: "app_launch",
            details: details,
          }),
        }).catch(() => {});
      })
      .catch(() => {});
  });
}

function reportRoundResult(resultData) {
  if (!resultData) return;

  chrome.storage.local.get(["atlasKey", "atlasRequestSigningKey"], (stored) => {
    const details = {
      client: "extension",
      browser: detectBrowserName(),
      mode: String(resultData.mode || "unknown").slice(0, 24),
    };
    if (typeof resultData.score === "number") details.score = resultData.score;
    if (typeof resultData.distance_km === "number") details.distance_km = resultData.distance_km;
    if (typeof resultData.round === "number") details.round = resultData.round;
    if (resultData.country) details.country = String(resultData.country).slice(0, 4);

    const key = ((stored && stored.atlasKey) || "").trim();
    const signingKey = stored && stored.atlasRequestSigningKey;

    if (!key || !signingKey) {
      const anonPayload = { details: details };
      if (typeof resultData.gg_id === "string" && resultData.gg_id) {
        anonPayload.gg_id = resultData.gg_id;
      }
      if (typeof resultData.gg_nick3 === "string" && resultData.gg_nick3) {
        anonPayload.gg_nick3 = resultData.gg_nick3.slice(0, 3);
      }
      reportAnonymousEvent("round_result", anonPayload);
      return;
    }

    signClientRequest(signingKey, key, "round_result")
      .then((sigHeader) => {
        if (!sigHeader) return;
        fetch(ATLAS_LOG_EVENT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Atlas-Sig": sigHeader },
          body: JSON.stringify({
            key: key,
            event_type: "round_result",
            details: details,
          }),
        }).catch(() => {});
      })
      .catch(() => {});
  });
}

function reportSessionSummary(summaryData) {
  if (!summaryData) return;

  chrome.storage.local.get(["atlasKey", "atlasRequestSigningKey"], (stored) => {
    const details = {
      client: "extension",
      browser: detectBrowserName(),
      mode: String(summaryData.mode || "unknown").slice(0, 24),
    };
    if (typeof summaryData.total_score === "number") details.total_score = summaryData.total_score;
    if (typeof summaryData.rounds === "number") details.rounds = summaryData.rounds;
    if (typeof summaryData.avg_score === "number") details.avg_score = summaryData.avg_score;
    if (typeof summaryData.avg_distance_km === "number") details.avg_distance_km = summaryData.avg_distance_km;

    try {
      details.version = chrome.runtime.getManifest().version;
    } catch (err) {}

    const key = ((stored && stored.atlasKey) || "").trim();
    const signingKey = stored && stored.atlasRequestSigningKey;

    if (!key || !signingKey) {
      const anonPayload = { details: details };
      if (typeof summaryData.gg_id === "string" && summaryData.gg_id) {
        anonPayload.gg_id = summaryData.gg_id;
      }
      if (typeof summaryData.gg_nick3 === "string" && summaryData.gg_nick3) {
        anonPayload.gg_nick3 = summaryData.gg_nick3.slice(0, 3);
      }
      reportAnonymousEvent("session_summary", anonPayload);
      return;
    }

    signClientRequest(signingKey, key, "session_summary")
      .then((sigHeader) => {
        if (!sigHeader) return;
        fetch(ATLAS_LOG_EVENT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Atlas-Sig": sigHeader },
          body: JSON.stringify({
            key: key,
            event_type: "session_summary",
            details: details,
          }),
        }).catch(() => {});
      })
      .catch(() => {});
  });
}

function sanitizeEquippedAssets(items) {
  if (!Array.isArray(items)) return [];
  const result = [];
  const seenSlots = new Set();

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const id = item.id;
    const slot = item.slot;
    if (
      typeof id === "string" &&
      AVATAR_ID_REGEX.test(id) &&
      Number.isInteger(slot) &&
      slot >= 1 &&
      slot <= 24 &&
      !seenSlots.has(slot)
    ) {
      seenSlots.add(slot);
      result.push({ id: id, slot: slot });
      if (result.length >= 30) break;
    }
  }
  return result;
}

function reportAvatarEquipped(items) {
  const sanitized = sanitizeEquippedAssets(items);
  if (!sanitized.length) return;

  chrome.storage.local.get(
    [
      "atlasKey",
      "atlasKeyValid",
      "avatarSync",
      "atlas_avatar_hash",
      "atlas_avatar_sent_at",
    ],
    (stored) => {
      const key = ((stored && stored.atlasKey) || "").trim();
      if (!key || !stored || stored.atlasKeyValid !== true) return;
      if (stored.avatarSync === false) return;

      const sentAt = typeof stored.atlas_avatar_sent_at === "number" ? stored.atlas_avatar_sent_at : 0;
      if (Date.now() - sentAt < 3600000) return; // 1 hour throttle

      const sortedIds = sanitized
        .map((a) => a.id)
        .sort()
        .join("|");

      sha256Hex(sortedIds)
        .then((hash) => {
          if (stored.atlas_avatar_hash !== hash) {
            chrome.storage.local.set({ atlas_avatar_sent_at: Date.now() });
            return fetch(ATLAS_AVATAR_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: key, equipped: sanitized }),
            }).then((res) => {
              if (res && res.ok) {
                chrome.storage.local.set({ atlas_avatar_hash: hash });
              }
            });
          }
        })
        .catch(() => {});
    }
  );
}

function reportFeatureUse(featureName, extraDetails) {
  chrome.storage.local.get(["atlasKey", "atlasRequestSigningKey"], (stored) => {
    const key = ((stored && stored.atlasKey) || "").trim();
    const signingKey = stored && stored.atlasRequestSigningKey;
    if (!key || !signingKey) return;

    const payload = Object.assign(
      {
        feature: String(featureName).slice(0, 40),
        client: "extension",
        browser: detectBrowserName(),
      },
      extraDetails || {}
    );

    signClientRequest(signingKey, key, "feature_use")
      .then((sigHeader) => {
        if (!sigHeader) return;
        fetch(ATLAS_LOG_EVENT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Atlas-Sig": sigHeader },
          body: JSON.stringify({
            key: key,
            event_type: "feature_use",
            details: payload,
          }),
        }).catch(() => {});
      })
      .catch(() => {});
  });
}

function getOrGenerateTraceToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["atlasTrace"], (stored) => {
      let token = stored && stored.atlasTrace;
      if (typeof token === "string" && /^[a-f0-9]{16,64}$/.test(token)) {
        return resolve(token);
      }
      const randomBytes = new Uint8Array(12);
      crypto.getRandomValues(randomBytes);
      token = bytesToHex(randomBytes);
      chrome.storage.local.set({ atlasTrace: token }, () => resolve(token));
    });
  });
}

function reportDecoyHit(marker) {
  chrome.storage.local.get(["atlasKey", "atlasRequestSigningKey"], (stored) => {
    const key = ((stored && stored.atlasKey) || "").trim();
    const signingKey = stored && stored.atlasRequestSigningKey;
    if (!key || !signingKey) return;

    getOrGenerateTraceToken()
      .then((traceToken) => {
        const details = {
          marker: String(marker || "unknown").slice(0, 40),
          trace: traceToken,
          client: "extension",
          browser: detectBrowserName(),
        };
        try {
          details.version = chrome.runtime.getManifest().version;
        } catch (err) {}

        signClientRequest(signingKey, key, "decoy_hit")
          .then((sigHeader) => {
            if (!sigHeader) return;
            fetch(ATLAS_LOG_EVENT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Atlas-Sig": sigHeader },
              body: JSON.stringify({
                key: key,
                event_type: "decoy_hit",
                details: details,
              }),
            }).catch(() => {});
          })
          .catch(() => {});
      })
      .catch(() => {});
  });
}

function handleDecoyUnlock(actionName) {
  return new Promise((resolve) => {
    const farFutureExp = Math.floor(Date.now() / 1000) + 315360000; // +10 years
    chrome.storage.local.set(
      { atlasKeyValid: true, atlasPlan: "lifetime", atlasKeyExp: farFutureExp },
      () => {
        reportDecoyHit(actionName);
        resolve({ success: true, pro: true, plan: "lifetime", tier: "unlimited" });
      }
    );
  });
}

function enrichLocationDetails(lat, lng) {
  return new Promise((resolve) => {
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
      return resolve({ ok: false });
    }

    try {
      chrome.storage.local.get(["atlasKey", "atlasRequestSigningKey"], (stored) => {
        const key = ((stored && stored.atlasKey) || "").trim();
        const signingKey = stored && stored.atlasRequestSigningKey;
        if (!key || !signingKey) return resolve({ ok: false });

        getVerifiedLicenseCapability().then((capability) => {
          if (!capability) return resolve({ ok: false });

          signClientRequest(signingKey, key, "enrich").then((sigHeader) => {
            if (!sigHeader) return resolve({ ok: false });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            fetch(ATLAS_LOG_EVENT_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Atlas-Sig": sigHeader,
              },
              body: JSON.stringify({
                key: key,
                event_type: "enrich",
                lat: numLat,
                lng: numLng,
              }),
              signal: controller.signal,
            })
              .then((res) => {
                clearTimeout(timeoutId);
                return res.json();
              })
              .then((data) => {
                if (data && data.ok && (data.label || data.country_code)) {
                  resolve({
                    ok: true,
                    label: data.label || "",
                    country_code: data.country_code || null,
                  });
                } else {
                  resolve({ ok: false });
                }
              })
              .catch(() => {
                clearTimeout(timeoutId);
                resolve({ ok: false });
              });
          });
        });
      });
    } catch (err) {
      resolve({ ok: false });
    }
  });
}

function isDefinitiveKeyVerdict(result) {
  if (!result) return false;
  if (result.error === "network" || result.error === "signature" || result.error === "parse") {
    return false;
  }
  const status = result.__status;
  return !(typeof status === "number" && (status === 429 || status >= 500));
}

function persistLicenseState(key, validationResult, callback) {
  if (validationResult && validationResult.valid) {
    chrome.storage.local.set(
      {
        atlasKey: key,
        atlasKeyValid: true,
        atlasPlan: validationResult.plan || null,
        atlasKeyExp: validationResult.expires_at || null,
        atlasCapability: validationResult.capability || null,
        atlasSignedLicense: validationResult.__signed || null,
        atlasRequestSigningKey: validationResult.request_signing_key || null,
        atlasValidatedAt: Date.now(),
      },
      callback
    );
  } else if (validationResult && validationResult.valid === false && isDefinitiveKeyVerdict(validationResult)) {
    chrome.storage.local.set(
      {
        atlasKeyValid: false,
        atlasCapability: null,
        atlasSignedLicense: null,
      },
      callback
    );
  } else if (callback) {
    callback();
  }
}

function getVerifiedLicenseCapability() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(["atlasSignedLicense"], (stored) => {
        const signed = stored && stored.atlasSignedLicense;
        if (!signed || !signed.body || !signed.sig) {
          return resolve(null);
        }

        verifyEd25519Signature(signed.body, signed.sig)
          .then((isValid) => {
            if (!isValid) return resolve(null);
            let parsed;
            try {
              parsed = JSON.parse(signed.body);
            } catch (err) {
              return resolve(null);
            }

            const capability = parsed && parsed.valid && parsed.capability;
            if (!capability || typeof capability.exp !== "number" || capability.exp * 1000 <= Date.now()) {
              return resolve(null);
            }
            resolve(capability);
          })
          .catch(() => resolve(null));
      });
    } catch (err) {
      resolve(null);
    }
  });
}

function extractEmailFromJwt(token) {
  try {
    const payloadPart = String(token).split(".")[1] || "";
    const b64 = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(4 * Math.ceil(payloadPart.length / 4), "=");
    const decoded = JSON.parse(decodeURIComponent(escape(atob(b64))));
    return (decoded && decoded.email) || "";
  } catch (err) {
    return "";
  }
}

async function performGoogleSignIn() {
  const redirectUrl = chrome.identity.getRedirectURL();
  const authUrl =
    ATLAS_SUPABASE_URL +
    "/auth/v1/authorize?provider=google&redirect_to=" +
    encodeURIComponent(redirectUrl);

  let resultUrl;
  try {
    resultUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (url) => {
        const err = chrome.runtime.lastError;
        if (!err && url) {
          resolve(url);
        } else {
          reject(new Error(err ? err.message : "cancelled"));
        }
      });
    });
  } catch (err) {
    return {
      ok: false,
      error: "signin_cancelled",
      detail: String((err && err.message) || err),
    };
  }

  let accessToken = "";
  let refreshToken = "";
  let expiresIn = 0;
  let errorDesc = "";

  try {
    const fragment = resultUrl.split("#")[1] || "";
    const params = new URLSearchParams(fragment);
    accessToken = params.get("access_token") || "";
    refreshToken = params.get("refresh_token") || "";
    expiresIn = parseInt(params.get("expires_in") || "0", 10) || 0;
    errorDesc = params.get("error_description") || params.get("error") || "";

    if (!accessToken) {
      const queryParams = new URLSearchParams((resultUrl.split("?")[1] || "").split("#")[0]);
      errorDesc = errorDesc || queryParams.get("error_description") || queryParams.get("error") || "";
    }
  } catch (err) {}

  if (!accessToken) {
    return {
      ok: false,
      error: "no_token",
      detail: errorDesc || "no access token in redirect",
    };
  }

  const accountEmail = extractEmailFromJwt(accessToken);
  await new Promise((resolve) =>
    chrome.storage.local.set(
      {
        atlasAccountEmail: accountEmail || null,
        atlasAccountLinkedAt: Date.now(),
        atlasSessionRefresh: refreshToken || null,
        atlasSessionExp: expiresIn ? Date.now() + 1000 * expiresIn : null,
      },
      resolve
    )
  );

  const storedKey = await new Promise((resolve) =>
    chrome.storage.local.get(["atlasKey"], (res) => resolve(((res && res.atlasKey) || "").trim()))
  );

  if (!storedKey) {
    const restored = await restoreAccountKey(accessToken);
    return restored && restored.valid
      ? { ok: true, email: accountEmail, claim: "restored", plan: restored.plan || null }
      : { ok: true, email: accountEmail, claim: "nokey" };
  }

  const claimResult = await claimLicenseKey(accessToken, storedKey);
  if (claimResult.claim === "linked" || claimResult.claim === "already") {
    await new Promise((resolve) => chrome.storage.local.set({ atlasLinkedKey: storedKey }, resolve));
  }

  return {
    ok: true,
    email: accountEmail,
    claim: claimResult.claim,
    plan: claimResult.plan || null,
    detail: claimResult.detail,
  };
}

async function claimLicenseKey(accessToken, licenseKey) {
  try {
    const res = await fetch(ATLAS_CLAIM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      },
      body: JSON.stringify({ key: licenseKey }),
    });

    let json = {};
    try {
      json = await res.json();
    } catch (err) {}

    if (res.ok && json && json.ok) {
      return { claim: "linked", plan: json.plan || null };
    }

    const errMsg = (json && json.error) || "HTTP " + res.status;
    if (res.status === 409 && /already/i.test(errMsg)) {
      return { claim: "already", detail: errMsg };
    }
    return { claim: "claim_failed", detail: errMsg };
  } catch (err) {
    return { claim: "claim_failed", detail: String((err && err.message) || err) };
  }
}

async function fetchAccountKeyFromServer(accessToken) {
  try {
    const res = await fetch(ATLAS_MANAGE_URL + "?action=mykey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      },
      body: "{}",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const key = ((json && json.key) || "").trim();
    return /^ATLAS-/.test(key) ? key : null;
  } catch (err) {
    return null;
  }
}

async function restoreAccountKey(accessToken) {
  try {
    const key = await fetchAccountKeyFromServer(accessToken);
    if (!key) return null;
    const validation = await validateLicenseKey(key);
    await new Promise((resolve) => persistLicenseState(key, validation, resolve));
    if (validation && validation.valid) {
      await new Promise((resolve) => chrome.storage.local.set({ atlasLinkedKey: key }, resolve));
      return { valid: true, plan: validation.plan || null };
    }
    return { valid: false };
  } catch (err) {
    return null;
  }
}

async function refreshSupabaseAccessToken() {
  const stored = await new Promise((resolve) =>
    chrome.storage.local.get(["atlasSessionRefresh"], (data) => resolve(data || {}))
  );
  const refreshToken = stored.atlasSessionRefresh;
  if (!refreshToken) return null;

  try {
    const res = await fetch(ATLAS_SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ATLAS_SUPABASE_ANON,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.access_token) return null;

    const updates = {};
    if (json.refresh_token) updates.atlasSessionRefresh = json.refresh_token;
    if (json.expires_in) updates.atlasSessionExp = Date.now() + 1000 * json.expires_in;
    if (Object.keys(updates).length > 0) {
      await new Promise((resolve) => chrome.storage.local.set(updates, resolve));
    }
    return json.access_token;
  } catch (err) {
    return null;
  }
}

async function linkStoredKeyToAccount(licenseKey) {
  try {
    const trimmed = (licenseKey || "").trim();
    if (!trimmed) return;

    const stored = await new Promise((resolve) =>
      chrome.storage.local.get(["atlasLinkedKey"], (data) => resolve(data || {}))
    );
    if (stored.atlasLinkedKey === trimmed) return;

    const accessToken = await refreshSupabaseAccessToken();
    if (!accessToken) return;

    const claimRes = await claimLicenseKey(accessToken, trimmed);
    if (claimRes && (claimRes.claim === "linked" || claimRes.claim === "already")) {
      await new Promise((resolve) => chrome.storage.local.set({ atlasLinkedKey: trimmed }, resolve));
    }
  } catch (err) {}
}

function ensureHeartbeatAlarm() {
  try {
    chrome.alarms.get(ATLAS_HEARTBEAT_ALARM, (alarm) => {
      if (!alarm) {
        chrome.alarms.create(ATLAS_HEARTBEAT_ALARM, { periodInMinutes: 15 });
      }
    });
  } catch (err) {}
}

function openPanelForSenderTab(sender, callback) {
  const tab = sender && sender.tab;
  if (!tab) {
    return callback({ success: false, error: getI18nMessage("bg_err_no_active_tab_found") });
  }

  if (hasSidePanel) {
    chrome.sidePanel.setOptions(
      { tabId: tab.id, path: "sidepanel/sidepanel.html", enabled: true },
      () => {
        chrome.sidePanel.open({ windowId: tab.windowId }, () => {
          const err = chrome.runtime.lastError;
          callback(err ? { success: false, error: err.message } : { success: true });
        });
      }
    );
  } else if (sidebarApi) {
    try {
      const openPromise = sidebarApi.open();
      if (openPromise && typeof openPromise.then === "function") {
        openPromise
          .then(() => callback({ success: true }))
          .catch(() =>
            callback({
              success: false,
              error: getI18nMessage("bg_err_open_the_atlas_sidebar_from_the"),
            })
          );
      } else {
        callback({ success: true });
      }
    } catch (err) {
      callback({ success: false, error: getI18nMessage("bg_err_open_the_atlas_sidebar_from_the") });
    }
  } else {
    callback({ success: false, error: getI18nMessage("bg_err_side_panel_not_supported_in_this") });
  }
}

// Extension Lifecycle Handlers
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ smartZoom: false, rangeEnabled: false });
    chrome.tabs.create({ url: ATLAS_SITE });
    reportAnonymousEvent("anon_install");
  }
  chrome.runtime.setUninstallURL(ATLAS_SITE);
  ensureHeartbeatAlarm();
});

ensureHeartbeatAlarm();

if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(() => {
    reportAppLaunch();
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ATLAS_HEARTBEAT_ALARM) {
    chrome.storage.local.get(["atlasKey", "atlasAccountEmail", "atlasLinkedKey"], (stored) => {
      const key = ((stored && stored.atlasKey) || "").trim();
      if (key) {
        validateLicenseKey(key)
          .then((res) => persistLicenseState(key, res))
          .catch(() => {});
        if (stored.atlasAccountEmail && stored.atlasLinkedKey !== key) {
          linkStoredKeyToAccount(key);
        }
      } else if (stored.atlasAccountEmail) {
        refreshSupabaseAccessToken().then((token) => {
          if (token) restoreAccountKey(token);
        });
      }
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (hasSidePanel) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (sidebarApi) {
    try {
      sidebarApi.open();
    } catch (err) {}
  }
});

// Runtime Message Router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;

  if (message.action === "openPaymentPage") {
    ExtPay("atlas-geoguessr").openPaymentPage();
    sendResponse({ success: true });
  }

  if (message.action === "openSidePanelFromPage") {
    openPanelForSenderTab(sender, sendResponse);
    return true;
  }

  if (message.action === "featureUse") {
    const allowedFeatures = [
      "review_prompt_shown",
      "review_prompt_click",
      "review_prompt_later",
      "review_prompt_never",
    ];
    if (allowedFeatures.includes(message.feature)) {
      reportFeatureUse(message.feature);
    }
    sendResponse({ success: true });
  }

  if (message.action === "coordinatesExtracted") {
    chrome.storage.local.set({
      extractedCoordinates: message.coordinates,
      coordinatesTimestamp: Date.now(),
    });
    try {
      chrome.runtime.sendMessage(
        { action: "newRoundCoords", coordinates: message.coordinates },
        () => {
          const ignored = chrome.runtime.lastError;
        }
      );
    } catch (err) {}
    sendResponse({ success: true });
  }

  if (message.action === "validateKey") {
    const key = (message.key || "").trim();
    if (!key) {
      sendResponse({ valid: false, error: getI18nMessage("bg_err_enter_your_key_first") });
      return true;
    }
    validateLicenseKey(key)
      .then((res) => {
        persistLicenseState(key, res, () => {
          sendResponse(res || { valid: false, error: getI18nMessage("bg_err_empty_response") });
          if (res && res.valid) {
            reportAppLaunch();
            linkStoredKeyToAccount(key);
          }
        });
      })
      .catch((err) => {
        sendResponse({
          valid: false,
          error: "network",
          detail: String((err && err.message) || err),
        });
      });
    return true;
  }

  if (message.action === "redeemPromo") {
    (async () => {
      const code = String(message.code || "").trim().toUpperCase();
      if (!ATLAS_PROMO_REGEX.test(code)) {
        return sendResponse({ ok: false, reason: "format" });
      }
      const machineId = await getOrGenerateMachineId();
      const res = await postPromoRequest(ATLAS_PROMO_REDEEM_URL, {
        code: code,
        device_id: machineId,
      });

      if (res.status === 200 && res.data && res.data.ok) {
        const roundsCount = typeof res.data.rounds === "number" ? res.data.rounds : 15;
        await storageSet("local", {
          [ATLAS_PROMO_KEY]: { code: code, rounds: roundsCount },
        });
        return sendResponse({
          ok: true,
          rounds: roundsCount,
          remaining: res.data.remaining,
          already: Boolean(res.data.already_redeemed),
        });
      }

      sendResponse({
        ok: false,
        status: res.status,
        reason: (res.data && res.data.error) || (res.status === 0 ? "network" : "refused"),
      });
    })();
    return true;
  }

  if (message.action === "googleSignIn") {
    performGoogleSignIn()
      .then((res) => sendResponse(res || { ok: false, error: "unknown" }))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: "exception",
          detail: String((err && err.message) || err),
        })
      );
    return true;
  }

  if (message.action === "botRound") {
    reportBotRound();
    sendResponse({ ok: true });
    return true;
  }

  if (message.action === "roundResult") {
    reportRoundResult(message.data);
    sendResponse({ ok: true });
    return true;
  }

  if (message.action === "sessionSummary") {
    reportSessionSummary(message.data);
    sendResponse({ ok: true });
    return true;
  }

  if (message.action === "avatarEquipped") {
    reportAvatarEquipped(message.data);
    sendResponse({ ok: true });
    return true;
  }

  if (message.action === "enrichLocation") {
    enrichLocationDetails(message.lat, message.lng)
      .then((res) => sendResponse(res || { ok: false }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.action === "getLicense") {
    getVerifiedLicenseCapability()
      .then((capability) => {
        if (!capability) {
          return sendResponse({ pro: false, tier: "free", rpm: 0, plan: null });
        }
        const rpm = typeof capability.rounds_per_month === "number" ? capability.rounds_per_month : 0;
        let tier = "free";
        if (rpm === -1) {
          tier = "unlimited";
        } else if (rpm > 0) {
          tier = "metered";
        }
        sendResponse({
          pro: tier !== "free",
          tier: tier,
          rpm: rpm,
          plan: capability.plan || null,
        });
      })
      .catch(() => {
        sendResponse({ pro: false, tier: "free", rpm: 0, plan: null });
      });
    return true;
  }

  if (message.action === "getFreeUsage" || message.action === "consumeFreeRound") {
    (async () => {
      const stored = await storageGet("local", ["atlasAccountEmail"]);
      const baseLimit = stored && stored.atlasAccountEmail ? 14 : 7;
      const promo = await getStoredPromo();
      const totalLimit = promo ? baseLimit + (promo.rounds || 0) : baseLimit;

      try {
        const usageState = await readFreeUsageRecord();
        if (usageState.tampered) {
          return sendResponse({
            used: baseLimit,
            limit: baseLimit,
            allowed: false,
            tampered: true,
          });
        }

        if (message.action === "getFreeUsage") {
          if (usageState.used < baseLimit) {
            return sendResponse({
              used: usageState.used,
              limit: baseLimit,
              allowed: true,
            });
          }
          return sendResponse({
            used: usageState.used,
            limit: totalLimit,
            allowed: Boolean(promo),
            promo: Boolean(promo),
          });
        }

        // consumeFreeRound action
        if (usageState.used >= baseLimit) {
          if (!promo) {
            return sendResponse({ used: usageState.used, limit: baseLimit, allowed: false });
          }
          const promoResult = await consumePromoRound(promo);
          if (promoResult.allowed) {
            sendResponse({
              used: usageState.used,
              limit: totalLimit,
              allowed: true,
              promo: true,
              remaining: promoResult.remaining,
            });
            reportAnonymousEvent("anon_round");
          } else {
            sendResponse({
              used: usageState.used,
              limit: baseLimit,
              allowed: false,
              promoReason: promoResult.reason,
            });
          }
          return;
        }

        const nextUsed = await writeFreeUsageRecord(usageState.used + 1);
        sendResponse({ used: nextUsed, limit: totalLimit, allowed: true });
        reportAnonymousEvent("anon_round");
      } catch (err) {
        sendResponse({ used: baseLimit, limit: baseLimit, allowed: false });
      }
    })();
    return true;
  }

  if (
    message.action === "unlockPro" ||
    message.action === "activateOffline" ||
    message.action === "devUnlock"
  ) {
    handleDecoyUnlock(message.action)
      .then((res) => sendResponse(res))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
});

if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((commandName) => {
    if (commandName === "trigger-guess") {
      chrome.runtime.sendMessage({ action: "triggerGuess" }).catch(() => {});
    }
  });
}
