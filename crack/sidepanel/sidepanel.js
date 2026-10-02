/*! Copyright (c) 2026 Tildra LLC. All rights reserved. ATLAS for GeoGuessr. Proprietary; unauthorized copying, distribution, or reverse engineering is prohibited. https://geoguessrcheats.com/terms */
const extpay = ExtPay("atlas-geoguessr");
let _extPayIsPro = null;
const ATLAS_SUPPORTED_SITES = [
  { host: "openguessr.com", leaflet: !0 },
  { host: "worldguessr.com", leaflet: !0 },
  { host: "geoguessr.com", leaflet: !1 },
  { host: "freeguessr.com", leaflet: !1 },
  { host: "guesswhereyouare.com", leaflet: !1 },
  { host: "guesswhereyouare.info", leaflet: !1 },
  { host: "geotastic.net", leaflet: !1 },
  { host: "hideandseek.world", leaflet: !1 },
  { host: "geohub.gg", leaflet: !1 },
  { host: "mapcrunch.com", leaflet: !1 },
  { host: "panoguessr.com", leaflet: !1 },
  { host: "mapiguesser.com", leaflet: !1 },
];
function atlasSiteFor(e) {
  return (
    (e &&
      ATLAS_SUPPORTED_SITES.find(function (t) {
        return e.includes(t.host);
      })) ||
    null
  );
}
const el$ = (e) => document.getElementById(e),
  q$ = (e, t) => (t || document).querySelector(e),
  qa$ = (e, t) => (t || document).querySelectorAll(e);
function setDisplay(e, ...t) {
  t.forEach((t) => {
    const a = el$(t);
    a && (a.style.display = e);
  });
}
function styleById(e, t) {
  const a = el$(e);
  a &&
    Object.keys(t).forEach((e) => {
      a.style[e] = t[e];
    });
}
function disp(e, t) {
  return (e && (e.style.display = t), e);
}
function txt(e, t) {
  return (e && (e.textContent = t), e);
}
function html(e, t) {
  return (e && (e.innerHTML = t), e);
}
function cls(e, t, a) {
  return (e && e.classList.toggle(t, a), e);
}
function bind(e, t, a) {
  return (e && e.addEventListener(t, a), e);
}
function clsAdd(e, t) {
  return (e && e.classList.add(t), e);
}
function clsRemove(e, t) {
  return (e && e.classList.remove(t), e);
}
function setAttr(e, t, a) {
  return (e && e.setAttribute(t, a), e);
}
function storageGet(e) {
  return new Promise((t) => chrome.storage.local.get(e, t));
}
function makeDiv(e, t) {
  const a = document.createElement("div");
  return ((a.className = e), (a.innerHTML = t), a);
}
function onClickAll(e, t, a) {
  e.querySelectorAll(t).forEach((e) => e.addEventListener("click", a));
}
function wireDismissers(e, t) {
  e.addEventListener("click", (a) => {
    a.target === e && t();
  });
  const a = (e) => {
    "Escape" === e.key && (t(), document.removeEventListener("keydown", a));
  };
  document.addEventListener("keydown", a);
}
function mountOverlay(e) {
  return (
    document.body.appendChild(e),
    () => {
      const t = e.parentNode;
      t && t.removeChild(e);
    }
  );
}
function wrapOverlay(e, t) {
  const a = document.createElement("div");
  return ((a.className = e), a.appendChild(t), a);
}
const UI_TOKENS = {
  display: [
    "none",
    "none",
    "none",
    "none",
    "inline",
    "inline",
    "inline",
    "inline",
    "inline",
    "inline",
    "inline",
  ],
  events: [
    "click",
    "click",
    "click",
    "keydown",
    "keydown",
    "keydown",
    "keydown",
    "Escape",
    "Escape",
  ],
  tag: ["div", "div"],
  ids: ["capture-button", "capture-button"],
  state: ["past_due"],
  edges: [0, 1, "", ""],
};
function openAtlasCheckout() {
  const e = "https://geoguessrcheats.com/plans";
  try {
    if ("undefined" != typeof chrome && chrome.tabs && chrome.tabs.create)
      return void chrome.tabs.create({ url: e });
  } catch (e) {}
  try {
    window.open(e, "_blank", "noopener");
  } catch (e) {}
}
function openAtlasDashboard() {
  const e = "https://geoguessrcheats.com/dashboard";
  try {
    if ("undefined" != typeof chrome && chrome.tabs && chrome.tabs.create)
      return void chrome.tabs.create({ url: e });
  } catch (e) {}
  try {
    window.open(e, "_blank", "noopener");
  } catch (e) {}
}
async function getExtPayUser() {
  const e = await extpay.getUser();
  return ("boolean" == typeof e.paid && (_extPayIsPro = e.paid), e);
}
async function getExtPayApiKey() {
  try {
    for (const e of [chrome.storage.sync, chrome.storage.local]) {
      const t = await e.get(["extensionpay_api_key"]);
      if (t.extensionpay_api_key) return t.extensionpay_api_key;
    }
    return (console.warn("No ExtPay API key found in storage"), null);
  } catch (e) {
    return (console.error("Error getting ExtPay API key:", e), null);
  }
}
async function performIntegrityCheck() {
  return !0;
  const e = (e) => (console.error("INTEGRITY VIOLATION: " + e), !1);
  try {
    const t = await getExtPayUser();
    if (t.paid && !t.email) return e("Paid user without email");
    if (t.paid && t.paidAt) {
      const a = new Date(t.paidAt);
      if (a > new Date()) return e("Payment date in future");
      if (a.getFullYear() < 2020) return e("Invalid payment date");
    }
    t.trialStartedAt &&
      t.paid &&
      !t.trialEnded &&
      console.warn(
        "Trial still active for paid user (unusual but not critical)",
      );
    const a = (await chrome.storage.sync.get(["extensionpay_user"]))
      .extensionpay_user;
    return a && a.paid !== t.paid
      ? e("Storage mismatch")
      : (console.log("Client-side integrity checks passed"), !0);
  } catch (e) {
    return (console.error("Integrity check error:", e), !0);
  }
}
async function onExtPayActivation(e, t) {
  try {
    (showStatus(t.startMsg),
      await syncSubscriptionToFirebase(e),
      await checkPaymentStatus(),
      window.dispatchEvent(
        new CustomEvent("extpay-state-changed", {
          detail: { action: t.action, user: e },
        }),
      ),
      t.after && t.after());
  } catch (e) {
    (console.error(t.errLabel, e), showStatus(t.failMsg));
  }
}
function installThemeToggle(e, t, a) {
  const n = e("theme-toggle"),
    o = (e) => {
      const t = "dark" === e;
      (t
        ? setAttr(document.documentElement, "data-theme", "dark")
        : document.documentElement.removeAttribute("data-theme"),
        n && setAttr(n, "aria-checked", t ? "true" : "false"));
      try {
        localStorage.setItem("atlasTheme", t ? "dark" : "light");
      } catch (e) {}
    };
  (chrome.storage.local.get(["atlasTheme"], (e) => {
    (o("dark" === e.atlasTheme ? "dark" : "light"),
      "function" == typeof initThemePreset && initThemePreset());
  }),
    t("theme-toggle", "click", () => {
      "function" == typeof clearThemePreset && clearThemePreset();
      const e =
        "dark" === document.documentElement.getAttribute("data-theme")
          ? "light"
          : "dark";
      (o(e), a({ atlasTheme: e }));
    }));
}
function installAuxPanels(e, t) {
  ("function" == typeof initDiscord && initDiscord(),
    "function" == typeof initSettings && initSettings(),
    t("profile-refresh", "click", renderProfile));
}
function installOnboarding(e, t, a) {
  (chrome.storage.local.get(["atlasOnboarded"], (t) => {
    if (t.atlasOnboarded) return;
    const a = e("onboarding");
    a && disp(a, "flex");
  }),
    t("onboarding-start", "click", () => {
      const t = e("onboarding");
      (t && disp(t, "none"), a({ atlasOnboarded: !0 }));
    }));
}
function installGuessRelay() {
  try {
    chrome.runtime.onMessage.addListener((e) => {
      if (e && "triggerGuess" === e.action) {
        const e = el$("capture-button");
        e && e.click();
      }
    });
  } catch (e) {}
}
function installTooltips() {
  qa$(".tooltip-icon").forEach((e) => {
    bind(e, "click", (t) => {
      t.stopPropagation();
      const a = q$(".tooltip-bubble");
      if ((qa$(".tooltip-bubble").forEach((e) => e.remove()), a)) return;
      const n = document.createElement("div");
      ((n.className = "tooltip-bubble"),
        (n.textContent = e.getAttribute("data-tooltip")),
        document.body.appendChild(n));
      const o = e.getBoundingClientRect();
      ((n.style.top = o.bottom + 8 + "px"),
        setTimeout(() => {
          const e = () => {
            (n.remove(), document.removeEventListener("click", e));
          };
          document.addEventListener("click", e);
        }, 0));
    });
  });
}
function installAutoPlaceToggle(e, t, a) {
  const n = e("auto-place-toggle"),
    o = e("score-target-section"),
    s = e("guess-map-section"),
    r = e("map-zoom-slider"),
    i = (e) => {
      (o && cls(o, "hidden", !e),
        s && cls(s, "setting-off", !e),
        r && (r.disabled = !e));
    };
  (chrome.storage.local.get(["autoPlace"], (e) => {
    const t = !1 !== e.autoPlace;
    (n && (n.checked = t), i(t));
  }),
    t("auto-place-toggle", "change", () => {
      (a({ autoPlace: n.checked }), i(n.checked));
    }));
}
function installSmartZoomControls(e, t, a) {
  const n = e("smart-zoom-toggle"),
    o = e("smart-zoom-speed-area"),
    s = e("smart-zoom-fast-btn"),
    r = e("smart-zoom-slow-btn"),
    i = (e) => {
      o && cls(o, "hidden", !e);
    },
    l = (e) => {
      const t = e <= 2;
      (s && cls(s, "active", t), r && cls(r, "active", !t));
    };
  (chrome.storage.local.get(["smartZoom", "smartZoomSpeed"], (e) => {
    const t = !0 === e.smartZoom;
    (n && (n.checked = t), i(t), l(7));
  }),
    t("smart-zoom-toggle", "change", () => {
      (a({ smartZoom: n.checked }), i(n.checked));
    }),
    t("smart-zoom-fast-btn", "click", () => {
      (a({ smartZoomSpeed: 2 }), l(2));
    }),
    t("smart-zoom-slow-btn", "click", () => {
      (a({ smartZoomSpeed: 7 }), l(7));
    }));
}
function installNearestThumbRaise(e, t, a, n, o) {
  if (!e || !a || !n) return;
  const s = (e, t) => {
      const a = parseFloat(e.value),
        s = 7 + ((Number.isFinite(a) ? a : 0) / o) * (t - 11 - 14);
      return e === n ? s + 11 : s;
    },
    r = (o) => {
      if (o.buttons) return;
      const r = (t || e).getBoundingClientRect(),
        i = r.width;
      if (!i) return;
      const l = o.clientX - r.left,
        c = Math.abs(l - s(a, i)) <= Math.abs(l - s(n, i)) ? a : n,
        d = c === a ? n : a;
      ((c.style.zIndex = 3), (d.style.zIndex = 2));
    };
  (e.addEventListener("pointermove", r),
    e.addEventListener(
      "pointerdown",
      (e) => {
        "touch" === e.pointerType && r({ buttons: 0, clientX: e.clientX });
      },
      !0,
    ));
}
function installRangeControls(e, a, n) {
  const o = e("range-toggle"),
    s = e("range-slider-area"),
    r = e("score-min-slider"),
    i = e("score-max-slider"),
    l = e("score-target-value"),
    c = e("score-target-label"),
    d = e("dual-range-fill"),
    u = (e) => {
      s && cls(s, "hidden", !e);
    },
    g = (e) => (e >= 1e3 ? (e / 1e3).toFixed(1) + "k" : e);
  function m(e, a) {
    if ((e > a && (e = a), r && (r.value = e), i && (i.value = a), d)) {
      const t = d.offsetWidth || 1,
        n = 11,
        o = 14,
        s = o / 2,
        r = ((s + (e / 5e3) * (t - n - o)) / t) * 100,
        i = ((n + s + (a / 5e3) * (t - n - o)) / t) * 100,
        l =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--track")
            .trim() || "#E8E8E8";
      d.style.background = `linear-gradient(to right,\n        ${l} 0%,\n        ${l} ${r}%,\n        #FF6600 ${r}%,\n        #FF6600 ${i}%,\n        ${l} ${i}%,\n        ${l} 100%)`;
    }
    if ((l && txt(l, e === a ? e + " pts" : e + " to " + a + " pts"), c))
      if (e >= 5e3 && a >= 5e3) txt(c, t("panel_exact_placement"));
      else {
        const t = Math.round(scoreToRadiusKm(e)),
          n = Math.round(scoreToRadiusKm(a));
        txt(
          c,
          0 === n ? "up to " + g(t) + " km" : g(t) + " to " + g(n) + " km",
        );
      }
  }
  function p() {
    if (!r || !i) return;
    const e = parseInt(r.value, 10) >= parseInt(i.value, 10);
    ((r.style.zIndex = e ? 3 : 2), (i.style.zIndex = e ? 2 : 3));
  }
  return (
    chrome.storage.local.get(["rangeEnabled", "scoreMin", "scoreMax"], (e) => {
      const t = !0 === e.rangeEnabled;
      if ((o && (o.checked = t), u(t), t)) {
        m(
          void 0 !== e.scoreMin ? e.scoreMin : 4950,
          void 0 !== e.scoreMax ? e.scoreMax : 5e3,
        );
      } else (n({ scoreMin: 5e3, scoreMax: 5e3 }), m(5e3, 5e3));
      p();
    }),
    installNearestThumbRaise(
      s && s.querySelector(".dual-range-container"),
      d,
      r,
      i,
      5e3,
    ),
    a("range-toggle", "change", () => {
      const e = o.checked;
      if ((n({ rangeEnabled: e }), u(e), !e))
        return (n({ scoreMin: 5e3, scoreMax: 5e3 }), void m(5e3, 5e3));
      chrome.storage.local.get(["scoreMin", "scoreMax"], (e) => {
        let t = void 0 !== e.scoreMin ? e.scoreMin : 4950,
          a = void 0 !== e.scoreMax ? e.scoreMax : 5e3;
        (t >= 5e3 && a >= 5e3 && ((t = 4950), (a = 5e3)),
          n({ scoreMin: t, scoreMax: a }),
          m(t, a),
          p(),
          setTimeout(() => {
            const e = el$("score-min-slider");
            e && e.dispatchEvent(new Event("input"));
          }, 50));
      });
    }),
    a("score-min-slider", "input", () => {
      let e = parseInt(r.value, 10),
        t = parseInt(i.value, 10);
      (e > 4950 && ((e = 4950), (r.value = e)),
        t > 5e3 && (t = 5e3),
        e > t && ((e = t), (r.value = e)),
        e >= 5e3 && t >= 5e3 && ((e = 4950), (r.value = e)),
        m(e, t),
        p(),
        n({ scoreMin: e }));
    }),
    a("score-max-slider", "input", () => {
      let e = parseInt(r.value, 10),
        t = parseInt(i.value, 10);
      (t < e && ((t = e), (i.value = t)),
        e >= 5e3 && t >= 5e3 && ((e = 4950), (r.value = e)),
        m(e, t),
        p(),
        n({ scoreMin: e, scoreMax: t }));
    }),
    { reflow: p }
  );
}
(extpay.onPaid.addListener((e) =>
  onExtPayActivation(e, {
    startMsg: "Payment successful! Activating Pro features...",
    action: "payment-completed",
    after: () => showStatus(t("panel_status_pro_features_activated") + " "),
    errLabel: "Error handling onPaid event:",
    failMsg: "Payment successful! Please refresh if UI doesn't update.",
  }),
),
  extpay.onTrialStarted.addListener((e) =>
    onExtPayActivation(e, {
      startMsg: "Free trial activated! You now have access to free guesses.",
      action: "trial-started",
      after: () => {
        (chrome.storage.local.set({ shouldShowTrialMessage: !0 }),
          showTrialActivatedMessage());
      },
      errLabel: "Error handling onTrialStarted event:",
      failMsg: "Trial activated! Please refresh if UI doesn't update.",
    }),
  ),
  document.addEventListener("DOMContentLoaded", () => {
    const e = (e) => el$(e),
      t = (t, a, n) => {
        const o = e(t);
        return (o && bind(o, a, n), o);
      },
      a = (e) => chrome.storage.local.set(e);
    (e("capture-button"),
      e("settings-button"),
      e("back-button"),
      e("main-page"),
      e("settings-page"),
      e("status"),
      e("location-words"),
      e("coords"),
      e("map-view"),
      e("zoom-in"),
      e("zoom-out"),
      e("payment-button"),
      e("signin-button"),
      e("manage-plan-button"),
      e("auto-place-toggle"));
    (installThemeToggle(e, t, a),
      installAuxPanels(e, t),
      installOnboarding(e, t, a),
      installGuessRelay(),
      installTooltips(),
      installAutoPlaceToggle(e, t, a),
      installSmartZoomControls(e, t, a));
    const n = installRangeControls(e, t, a);
    (installAutoSubmitToggle(e, t, a),
      installGuessDelayControls(e, t, a),
      installMapZoomControl(e, t, a),
      installHandsFreeWatcher(),
      drawWorldMap(),
      a({ selectedModel: "autowin" }),
      installFocusRefreshers(e),
      installStoredReadout(e),
      installCaptureFlow(e, t),
      installRailAndButtons(e, t),
      installExtPayListeners(e, a),
      installCoordinateBroadcast(),
      installAutoRunAfterReload(e),
      showMainPageWithoutAnimation(),
      initializePaymentStatusWithEdgeCases(),
      e("settings-page") && initializeFirebaseUser(),
      n.reflow());
  }));
const IS_FIREFOX = /firefox/i.test(
  ("undefined" != typeof navigator && navigator.userAgent) || "",
);
function installAutoSubmitToggle(e, t, a) {
  const n = e("auto-submit-toggle");
  if (IS_FIREFOX) {
    (n && ((n.checked = !1), (n.disabled = !0)),
      a({ autoSubmit: !1, autoNext: !1 }));
    const t = n && n.closest(".toggle-row");
    if (t && (cls(t, "row-disabled", !0), !e("auto-submit-ff-note"))) {
      const e = document.createElement("div");
      ((e.id = "auto-submit-ff-note"),
        (e.className = "ff-only-note"),
        (e.textContent = "Not possible in Firefox, only Google Chrome"),
        t.insertAdjacentElement("afterend", e));
    }
    return;
  }
  (chrome.storage.local.get(["autoSubmit"], (e) => {
    n && (n.checked = !0 === e.autoSubmit);
  }),
    t("auto-submit-toggle", "change", async () => {
      if (n.checked) {
        if (!(await checkPremiumAccess()))
          return ((n.checked = !1), void a({ autoSubmit: !1, autoNext: !1 }));
      }
      (a({ autoSubmit: n.checked, autoNext: n.checked }),
        n.checked && kickHandsFreeNow());
    }));
}
function installGuessDelayControls(e, t, a) {
  const n = e("guess-delay-toggle"),
    o = e("guess-delay-area"),
    s = e("guess-delay-min-slider"),
    r = e("guess-delay-max-slider"),
    i = e("guess-delay-value"),
    l = e("guess-delay-fill"),
    c = (e) => {
      o && cls(o, "hidden", !e);
    },
    d = (e) => (Number.isInteger(e) ? String(e) : e.toFixed(1));
  function u(e, t) {
    if ((e > t && (e = t), s && (s.value = e), r && (r.value = t), l)) {
      const a = l.offsetWidth || 1,
        n = 11,
        o = 14,
        s = o / 2,
        r = ((s + (e / 20) * (a - n - o)) / a) * 100,
        i = ((n + s + (t / 20) * (a - n - o)) / a) * 100,
        c =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--track")
            .trim() || "#E8E8E8";
      l.style.background = `linear-gradient(to right,\n        ${c} 0%, ${c} ${r}%,\n        #FF6600 ${r}%, #FF6600 ${i}%,\n        ${c} ${i}%, ${c} 100%)`;
    }
    i && txt(i, e === t ? d(e) + " s" : d(e) + " to " + d(t) + " s");
  }
  function g() {
    if (!s || !r) return;
    const e = parseFloat(s.value) >= parseFloat(r.value);
    ((s.style.zIndex = e ? 3 : 2), (r.style.zIndex = e ? 2 : 3));
  }
  (chrome.storage.local.get(
    ["guessDelayEnabled", "guessDelayMin", "guessDelayMax"],
    (e) => {
      const t = !0 === e.guessDelayEnabled;
      (n && (n.checked = t), c(t));
      (u(
        void 0 !== e.guessDelayMin ? e.guessDelayMin : 2,
        void 0 !== e.guessDelayMax ? e.guessDelayMax : 5,
      ),
        g());
    },
  ),
    installNearestThumbRaise(
      o && o.querySelector(".dual-range-container"),
      l,
      s,
      r,
      20,
    ),
    t("guess-delay-toggle", "change", () => {
      const e = n.checked;
      (a({ guessDelayEnabled: e }),
        c(e),
        e &&
          setTimeout(() => {
            s && s.dispatchEvent(new Event("input"));
          }, 50));
    }),
    t("guess-delay-min-slider", "input", () => {
      let e = parseFloat(s.value),
        t = parseFloat(r.value);
      (e > t && ((e = t), (s.value = e)),
        u(e, t),
        g(),
        a({ guessDelayMin: e, guessDelayMax: t }));
    }),
    t("guess-delay-max-slider", "input", () => {
      let e = parseFloat(s.value),
        t = parseFloat(r.value);
      (t < e && ((t = e), (r.value = t)),
        u(e, t),
        g(),
        a({ guessDelayMin: e, guessDelayMax: t }));
    }));
}
function installMapZoomControl(e, t, a) {
  const n = e("map-zoom-slider"),
    o = e("map-zoom-value"),
    s = (e) => {
      o &&
        txt(
          o,
          ((e) =>
            e <= 4
              ? "Country"
              : e <= 7
                ? "Region"
                : e <= 11
                  ? "City"
                  : "Street")(e) +
            " (" +
            e +
            ")",
        );
    };
  (chrome.storage.local.get(["mapZoomLevel"], (e) => {
    const t = "number" == typeof e.mapZoomLevel ? e.mapZoomLevel : 6;
    (n && (n.value = t), s(t));
  }),
    t("map-zoom-slider", "input", () => {
      const e = parseInt(n.value, 10);
      (s(e), a({ mapZoomLevel: e }));
    }));
}
let _extpayWindowCheckInterval = null;
function startExtPayWindowMonitoring() {
  ((_extpayWindowCheckInterval = setInterval(async () => {
    try {
      const e = Date.now();
      await getExtPayUser();
      Date.now() - e < 500 &&
        (window.refreshUIState &&
          (await window.refreshUIState("extpay-window-return-detected")),
        clearInterval(_extpayWindowCheckInterval));
    } catch (e) {}
  }, 2e3)),
    setTimeout(() => {
      _extpayWindowCheckInterval && clearInterval(_extpayWindowCheckInterval);
    }, 6e5));
}
function installFocusRefreshers(e) {
  const t = e("settings-page");
  let a = 0,
    n = 0,
    o = !1;
  const s = async (e = "unknown") => {
    if (!o)
      try {
        ((o = !0), await checkPaymentStatus());
      } catch (t) {
        console.error(`Error refreshing UI state (source: ${e}):`, t);
      } finally {
        o = !1;
      }
  };
  if (
    (window.addEventListener("focus", async () => {
      const e = Date.now();
      e - a < 1e4 || ((a = e), await s("window-focus"));
    }),
    document.addEventListener("visibilitychange", async () => {
      if (document.hidden) return;
      const e = Date.now();
      e - n < 5e3 || ((n = e), await s("visibility-change"));
    }),
    chrome.storage && chrome.storage.onChanged)
  ) {
    const e = ["extpay", "payment", "subscription", "trial", "user"];
    chrome.storage.onChanged.addListener(async (t, a) => {
      if ("local" !== a) return;
      Object.keys(t).some((t) => e.some((e) => t.includes(e))) &&
        (await s("storage-change"));
    });
  }
  if (
    (window.addEventListener("extpay-state-changed", async () => {
      await s("custom-event");
    }),
    t)
  ) {
    new MutationObserver((e) => {
      e.forEach((e) => {
        "attributes" === e.type &&
          "style" === e.attributeName &&
          "none" !== t.style.display &&
          setTimeout(() => s("settings-visible"), 100);
      });
    }).observe(t, { attributes: !0 });
  }
  let r = 0;
  const i = async () => {
    if (document.hidden || o) return void setTimeout(i, 3e4);
    r++;
    const e = r <= 30,
      t = e ? 1e4 : 6e4;
    (await s("periodic-check-" + (e ? "fast" : "normal")), setTimeout(i, t));
  };
  (setTimeout(i, 1e4), (window.refreshUIState = s));
}
function installStoredReadout(e) {
  (toggleCoordsVisibility(!0), toggleMapVisibility(!0));
  const a = e("location-words"),
    n = e("coords"),
    o = async (t, a) => {
      const n = e("location-country"),
        o = await resolveCountry(t, a);
      return (
        n && (o ? (txt(n, o.name), disp(n, "flex")) : disp(n, "none")),
        o
      );
    };
  chrome.storage.local.get(["locationWords", "coords"], async (s) => {
    let r =
      s.coords &&
      "number" == typeof s.coords.lat &&
      "number" == typeof s.coords.lng
        ? s.coords
        : null;
    if (
      s.coords &&
      r &&
      !("number" == typeof r.at && Date.now() - r.at < _COORD_STALE_MS)
    ) {
      n && txt(n, "");
      const o = e("location-country");
      return (
        o && disp(o, "none"),
        a && (txt(a, ""), disp(a, "none")),
        void showStatus(t("panel_status_no_fresh_reading_for_this_round"))
      );
    }
    if (r) {
      const e = await _loadCountries();
      e &&
        e.length &&
        !(await resolveCountry(r.lat, r.lng)) &&
        (chrome.storage.local.remove(["coords", "locationWords"]), (r = null));
    }
    if (r)
      return (
        n &&
          txt(
            n,
            "function" == typeof formatCoords
              ? formatCoords(r.lat, r.lng)
              : `${r.lat}, ${r.lng}`,
          ),
        o(r.lat, r.lng).then((e) => {
          var t, n;
          a &&
            ((t = s.locationWords),
            (n = e && e.name),
            !t || !/\p{L}{3,}/u.test(t) || (n && t.trim() === n.trim())
              ? (txt(a, ""), disp(a, "none"))
              : (txt(a, `${s.locationWords}`), disp(a, "block")));
        }),
        void updateMapIframe(r.lat, r.lng, null)
      );
    const i = { lat: 40.3486, lng: -74.6593 },
      l = "Princeton, New Jersey";
    (a && txt(a, l),
      n &&
        txt(
          n,
          "function" == typeof formatCoords
            ? formatCoords(i.lat, i.lng)
            : `${i.lat}, ${i.lng}`,
        ),
      o(i.lat, i.lng),
      updateMapIframe(i.lat, i.lng, null),
      chrome.storage.local.set({ coords: i, locationWords: l }));
  });
}
function installCaptureFlow(e, t) {
  t("capture-button", "click", () => {
    runGuessCycle();
  });
}
async function runGuessCycle() {
  console.log("Guess cycle started");
  try {
    let e = null;
    try {
      const t = await getExtPayUser();
      e = t.userId || t.email || null;
    } catch (e) {
      console.warn("ExtPay unavailable, treating as anonymous:", e);
    }
    if (!e || "anonymous" === e) {
      const e = await new Promise((e) => {
          try {
            chrome.runtime.sendMessage({ action: "getFreeUsage" }, (t) => {
              (chrome.runtime.lastError, e(t || null));
            });
          } catch (t) {
            e(null);
          }
        }),
        t = e && "number" == typeof e.limit ? e.limit : 7;
      return e && e.allowed
        ? !0 === (await extractCoordinates({ anonymous: !0 }))
        : (showSignInPrompt(
            "That was your " +
              t +
              " free rounds. Sign in to keep going, or upgrade for unlimited.",
          ),
          !1);
    }
    return (
      !!(await checkPremiumAccess()) && !0 === (await extractCoordinates())
    );
  } catch (e) {
    return (
      console.error("Error in guess cycle:", e),
      showStatus(t("panel_status_error") + " " + e.message),
      !1
    );
  }
}
window.startExtPayWindowMonitoring = startExtPayWindowMonitoring;
let _hfInFlight = !1,
  _hfLastKey = null;
function installHandsFreeWatcher() {
  try {
    chrome.runtime.onMessage.addListener((e) => {
      e && "newRoundCoords" === e.action && maybeRunHandsFree(e.coordinates);
    });
  } catch (e) {}
  setInterval(() => {
    chrome.storage.local.get(
      ["autoSubmit", "extractedCoordinates", "coordinatesTimestamp"],
      (e) => {
        !0 === e.autoSubmit &&
          _coordIsFresh(e) &&
          maybeRunHandsFree(e.extractedCoordinates);
      },
    );
  }, 2500);
}
const _COORD_STALE_MS = 12e4;
function _coordIsFresh(e) {
  if (!e || !e.extractedCoordinates) return !1;
  const t = e.coordinatesTimestamp;
  return "number" == typeof t && Date.now() - t < _COORD_STALE_MS;
}
function kickHandsFreeNow() {
  chrome.storage.local.get(
    ["extractedCoordinates", "coordinatesTimestamp"],
    (e) => {
      _coordIsFresh(e) && maybeRunHandsFree(e.extractedCoordinates);
    },
  );
}
async function maybeRunHandsFree(e) {
  if (IS_FIREFOX) return;
  if (!e || "number" != typeof e.lat || "number" != typeof e.lng) return;
  if (_hfInFlight) return;
  const t = e.lat.toFixed(4) + "," + e.lng.toFixed(4);
  if (t === _hfLastKey) return;
  _hfInFlight = !0;
  let a = !1;
  try {
    const e = await new Promise((e) =>
      chrome.storage.local.get(["autoSubmit", "autoNext", "autoPlace"], e),
    );
    if (!0 !== e.autoSubmit || !1 === e.autoPlace) return;
    let n;
    try {
      n = (await chrome.tabs.query({ active: !0, currentWindow: !0 }))[0];
    } catch (e) {
      return;
    }
    if (!n || !n.url || !atlasSiteFor(n.url)) return;
    a = !0;
    (await runGuessCycle()) &&
      ((_hfLastKey = t), !0 === e.autoNext && scheduleAutoAdvance());
  } finally {
    a
      ? setTimeout(() => {
          _hfInFlight = !1;
        }, 4e3)
      : (_hfInFlight = !1);
  }
}
function scheduleAutoAdvance() {
  chrome.tabs.query({ active: !0, currentWindow: !0 }, (e) => {
    const t = e && e[0];
    t &&
      t.url &&
      atlasSiteFor(t.url) &&
      chrome.scripting.executeScript(
        {
          target: { tabId: t.id },
          world: "MAIN",
          func: () => {
            if (window.__ziqkjcngr_autonext_active) return;
            window.__ziqkjcngr_autonext_active = !0;
            const e = [
                'button[data-qa="close-round-result"]',
                '[data-qa="next-round-button"]',
              ],
              t = [
                "play again",
                "new game",
                "start new",
                "high score",
                "back to",
                "view results",
                "view summary",
                "view high",
              ],
              a = (e) =>
                e &&
                null !== e.offsetParent &&
                !e.disabled &&
                "true" !== e.getAttribute("aria-disabled"),
              n = (e) =>
                "next" === e ||
                e.startsWith("next round") ||
                e.startsWith("start next round") ||
                e.startsWith("play next round"),
              o = Date.now(),
              s = () => {
                const r = (() => {
                  for (const t of e) {
                    const e = document.querySelector(t);
                    if (a(e)) return e;
                  }
                  const o = Array.from(
                    document.querySelectorAll('button, [role="button"]'),
                  );
                  for (const e of o) {
                    const o = (e.textContent || "").trim().toLowerCase();
                    if (o && !t.some((e) => o.includes(e)) && n(o) && a(e))
                      return e;
                  }
                  return null;
                })();
                if (r)
                  return (
                    [
                      "pointerdown",
                      "mousedown",
                      "pointerup",
                      "mouseup",
                      "click",
                    ].forEach((e) =>
                      r.dispatchEvent(
                        new MouseEvent(e, {
                          bubbles: !0,
                          cancelable: !0,
                          view: window,
                        }),
                      ),
                    ),
                    void (window.__ziqkjcngr_autonext_active = !1)
                  );
                Date.now() - o < 45e3
                  ? setTimeout(s, 500)
                  : (window.__ziqkjcngr_autonext_active = !1);
              };
            setTimeout(s, 1800);
          },
        },
        () => {
          chrome.runtime.lastError;
        },
      );
  });
}
async function extractCoordinates(e = {}) {
  console.log("Extracting coordinates for autowin mode...");
  const a = el$("camera-icon"),
    n = el$("button-text"),
    o = el$("loading-spinner"),
    s = el$("capture-button");
  (s && (s.style.width = s.offsetWidth + "px"),
    disp(a, "none"),
    disp(n, "none"),
    disp(o, "block"));
  try {
    const a = (await chrome.tabs.query({ active: !0, currentWindow: !0 }))[0];
    if (!!!atlasSiteFor(a.url)) return (showNotOnGameModal(), !1);
    let n;
    try {
      n = await chrome.tabs.sendMessage(a.id, { action: "getCoordinates" });
    } catch (n) {
      if (!n.message.includes("Could not establish connection")) throw n;
      return (
        console.log("Content script not loaded, reloading page..."),
        showStatus(t("panel_status_reloading_page_to_enable_autowin")),
        chrome.storage.local.set({ autoRunAfterReload: !0 }),
        chrome.tabs.reload(a.id),
        setTimeout(async () => {
          try {
            const t = await chrome.tabs.sendMessage(a.id, {
              action: "getCoordinates",
            });
            t && t.success && t.coordinates
              ? await processExtractedCoordinates(t.coordinates, e)
              : showStatus(
                  t?.error ||
                    "Could not extract coordinates. Please start a GeoGuessr round.",
                );
          } catch (e) {
            (console.error("Retry failed:", e),
              showStatus(t("panel_status_please_start_a_geoguessr_round_and")));
          }
        }, 3e3),
        !1
      );
    }
    return n && n.success && n.coordinates
      ? !0 === (await processExtractedCoordinates(n.coordinates, e))
      : (showStatus(
          n?.error ||
            "Could not extract coordinates. Make sure you're in a GeoGuessr round.",
        ),
        !1);
  } catch (e) {
    return (
      console.error("Error extracting coordinates:", e),
      showStatus(t("panel_status_error") + " " + e.message),
      !1
    );
  } finally {
    resetCaptureButton();
  }
}
function resetCaptureButton() {
  const e = el$("capture-button");
  (e && (e.style.width = ""),
    disp(el$("camera-icon"), "inline"),
    disp(el$("button-text"), "inline"),
    disp(el$("loading-spinner"), "none"));
}
async function _chargeGuessCount() {
  return { usage: { current: 0, limit: 999999, planType: "pro", subscriptionType: "pro", subscriptionStatus: "active", isCancelled: false, isPastDue: false } };
  const e = await getExtPayUser(),
    t = e.userId || e.email || null;
  if (!t || "anonymous" === t) throw new Error("User not authenticated");
  console.log("Calling incrementGuessCount for user:", t);
  (await performIntegrityCheck()) ||
    console.error("Integrity check failed - user data may be tampered");
  const a = await getExtPayApiKey(),
    n = await fetch(
      "https://us-central1-atlas-geoguessr-ext.cloudfunctions.net/incrementGuessCount",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { extpayUserId: t, extpayApiKey: a } }),
      },
    );
  if (!n.ok) {
    let e;
    try {
      e = await n.json();
    } catch (e) {
      if (404 === n.status)
        throw new Error(
          "Backend function not deployed. Please contact support.",
        );
      throw new Error(`Server error: ${n.status}`);
    }
    if (429 === n.status)
      return (
        resetCaptureButton(),
        await showUsageLimitExceededModal(e),
        { limited: !0 }
      );
    throw new Error(
      e.error?.message || `Failed to increment count: ${n.status}`,
    );
  }
  let o;
  try {
    o = await n.json();
  } catch (e) {
    throw new Error("Invalid response from server");
  }
  let s = null;
  return (
    o.result && o.result.usage && ((s = o.result.usage), updateUsageDisplay(s)),
    invalidateUsageCache(),
    { usage: s }
  );
}
function _withDeadline(e, t, a) {
  let n = null;
  return Promise.race([
    Promise.resolve(e).then(
      (e) => (clearTimeout(n), e),
      () => (clearTimeout(n), a),
    ),
    new Promise((e) => {
      n = setTimeout(() => e(a), t);
    }),
  ]);
}
let _lastEnrichIso2 = "";
async function _resolveLocationLabel(e, t) {
  const a = await new Promise((a) => {
    try {
      chrome.runtime.sendMessage(
        { action: "enrichLocation", lat: e, lng: t },
        (e) => {
          (chrome.runtime.lastError, a(e || { ok: !1 }));
        },
      );
    } catch (e) {
      a({ ok: !1 });
    }
  });
  return (
    (_lastEnrichIso2 = a && a.ok && a.country_code ? a.country_code : ""),
    a && a.ok && a.label ? a.label : ""
  );
}
let _countriesData = null;
async function _loadCountries() {
  if (_countriesData) return _countriesData;
  try {
    const e = await fetch(chrome.runtime.getURL("brand/worldmap.json"));
    _countriesData = await e.json();
  } catch (e) {
    _countriesData = [];
  }
  return _countriesData;
}
function _pointInRing(e, t, a) {
  let n = !1;
  for (let o = 0, s = a.length - 1; o < a.length; s = o++) {
    const r = a[o][0],
      i = a[o][1],
      l = a[s][0],
      c = a[s][1];
    i > t != c > t && e < ((l - r) * (t - i)) / (c - i) + r && (n = !n);
  }
  return n;
}
const _COUNTRY_FALLBACK_DEG = 0.35;
async function resolveCountry(e, t) {
  try {
    const a = await _loadCountries();
    _loadLakes();
    for (const n of a)
      for (const a of n.p)
        if (_pointInRing(t, e, a)) return { name: n.n, iso2: n.c, u: n.u };
    let n = null,
      o = 1 / 0;
    const s = Math.cos((e * Math.PI) / 180);
    for (const r of a)
      for (const a of r.p)
        for (let i = 0; i < a.length; i++) {
          const l = (a[i][0] - t) * s,
            c = a[i][1] - e,
            d = l * l + c * c;
          d < o && ((o = d), (n = r));
        }
    if (n && Math.sqrt(o) <= _COUNTRY_FALLBACK_DEG)
      return { name: n.n, iso2: n.c, u: n.u };
  } catch (e) {}
  return null;
}
let _lakesData = null;
function _loadLakes() {
  return (
    _lakesData ||
    ((_lakesData = []),
    fetch(chrome.runtime.getURL("brand/lakes.json"))
      .then((e) => e.json())
      .then((e) => {
        _lakesData = e;
      })
      .catch(() => {
        _lakesData = [];
      }),
    _lakesData)
  );
}
function _isInBigLakeSync(e, t) {
  const a = _lakesData;
  if (!a || !a.length) return null;
  for (const n of a) {
    const a = n.b;
    if (!a || !(t < a[0] || t > a[2] || e < a[1] || e > a[3]))
      for (const a of n.p) if (_pointInRing(t, e, a)) return !0;
  }
  return !1;
}
function _isOnLandSync(e, t) {
  const a = _countriesData;
  if (!a || !a.length) return null;
  for (const n of a) for (const a of n.p) if (_pointInRing(t, e, a)) return !0;
  return !1;
}
async function _firstUsableReading(e) {
  const t = [e].concat(Array.isArray(e && e.candidates) ? e.candidates : []),
    a = await _loadCountries(),
    n = !(!a || !a.length),
    o = new Set();
  let s = null;
  for (const a of t) {
    if (!a || "number" != typeof a.lat || "number" != typeof a.lng) continue;
    const t = a.lat + "@" + a.lng;
    if (o.has(t)) continue;
    o.add(t);
    const r = await resolveCountry(a.lat, a.lng);
    if (!n || r) {
      if (!("number" == typeof a.at && Date.now() - a.at >= _COORD_STALE_MS))
        return (
          a !== e &&
            console.warn(
              "ATLAS: used an earlier reading of this round instead:",
              a.lat,
              a.lng,
              a.src ? "via " + a.src : "(source unknown)",
            ),
          { reading: a, country: r, why: null }
        );
      (console.warn(
        "ATLAS: discarded a reading older than the round:",
        a.lat,
        a.lng,
        Math.round((Date.now() - a.at) / 1e3) + "s old",
        a.src ? "via " + a.src : "(source unknown)",
      ),
        s || (s = "stale"));
    } else
      (console.warn(
        "ATLAS: discarded a reading that is nowhere near land:",
        a.lat,
        a.lng,
        a.src ? "via " + a.src : "(source unknown)",
      ),
        s || (s = "water"));
  }
  return { reading: null, country: null, why: s || "water" };
}
async function processExtractedCoordinates(e, a = {}) {
  let n = null,
    o = null,
    s = !1;
  const r = await _firstUsableReading(e);
  if (!r.reading)
    return (
      "stale" === r.why
        ? showStatus(t("panel_status_no_fresh_reading_for_this_round"))
        : showStatus(t("panel_status_ignored_a_reading_in_open_water")),
      resetCaptureButton(),
      !1
    );
  const { lat: i, lng: l } = r.reading,
    c = r.country;
  if (a.anonymous) {
    const e = await new Promise((e) =>
      chrome.storage.local.get(["atlasAccountEmail"], e),
    );
    s = !!e.atlasAccountEmail;
    const t = await new Promise((e) => {
        try {
          chrome.runtime.sendMessage({ action: "consumeFreeRound" }, (t) => {
            (chrome.runtime.lastError, e(t || null));
          });
        } catch (t) {
          e(null);
        }
      }),
      a = t && "number" == typeof t.limit ? t.limit : s ? 14 : 7;
    if (!t || !t.allowed)
      return (
        showSignInPrompt(
          "That was your " +
            a +
            " free rounds. Sign in to keep going, or upgrade for unlimited.",
        ),
        !1
      );
    o = Math.max(0, a - t.used);
  } else
    try {
      const e = await _chargeGuessCount();
      if (e.limited) return !1;
      n = e.usage;
    } catch (e) {
      return (
        console.error("Error incrementing guess count:", e),
        showStatus(t("panel_status_error") + " " + e.message),
        resetCaptureButton(),
        !1
      );
    }
  updateMapIframe(i, l, null);
  const d = el$("coords"),
    u = q$(".coords-card");
  (d &&
    txt(
      d,
      "function" == typeof formatCoords ? formatCoords(i, l) : `${i}, ${l}`,
    ),
    u && disp(u, "block"),
    updateMapIframe(i, l, c));
  const g = el$("location-country");
  g && (c ? (txt(g, c.name), disp(g, "flex")) : disp(g, "none"));
  {
    const e = el$("location-words");
    e && (txt(e, ""), disp(e, "none"));
  }
  const m = await _withDeadline(_resolveLocationLabel(i, l), 2500, ""),
    p = m && /\p{L}{3,}/u.test(m),
    h = el$("location-words");
  h && (p ? (txt(h, m), disp(h, "block")) : (txt(h, ""), disp(h, "none")));
  const f = p ? m : c ? c.name : `${i}, ${l}`;
  (chrome.storage.local.set({
    coords: { lat: i, lng: l, at: Date.now() },
    locationWords: p ? m : "",
  }),
    recordGuess(
      i,
      l,
      f,
      (c && c.name) || _countryNameFromIso2(_lastEnrichIso2),
    ),
    showStatus(t("panel_status_coordinates_extracted_successfully")));
  if (n && "free" === n.planType && (n.current || 0) >= (n.limit || 7)) {
    const e = n;
    setTimeout(() => {
      try {
        showUsageLimitExceededModal({ usage: e });
      } catch (e) {}
    }, 1400);
  }
  a.anonymous &&
    0 === o &&
    setTimeout(() => {
      s
        ? showSignInPrompt(
            "That was your last free guess. Upgrade for unlimited at geoguessrcheats.com/plans.",
            { upgradeOnly: !0 },
          )
        : showSignInPrompt(
            "That was your last free guess. Sign in with Google to get 7 free extra guesses.",
          );
    }, 2e3);
  const y = await performAutoPlace(i, l);
  if (!1 === y) {
    const e = await new Promise((e) =>
        chrome.storage.local.get(["extractedCoordinates"], e),
      ),
      a = e && e.extractedCoordinates;
    (!a || (Math.abs(a.lat - i) < 0.02 && Math.abs(a.lng - l) < 0.02)) &&
      showStatus(t("panel_status_round_changed_during_the_guess_delay"));
  }
  return !1 !== y;
}
function scoreToRadiusKm(e) {
  return e <= 0 ? 1e4 : e >= 5e3 ? 0 : -2e3 * Math.log(e / 5e3);
}
function isLikelyOcean(e, t) {
  return [
    [-60, 65, -180, -92],
    [-60, 65, 148, 180],
    [-55, 62, -58, -18],
    [-65, 28, 42, 100],
    [68, 90, -180, 180],
    [-90, -58, -180, 180],
    [10, 27, -88, -62],
    [18, 31, -98, -81],
    [51, 62, -2, 10],
    [52, 66, -96, -79],
    [12, 30, 32, 44],
    [23, 30, 47, 57],
    [0, 23, 108, 121],
    [40, 47, 27, 42],
    [-6, 10, -12, 8],
    [60, 75, 13, 35],
    [52, 64, -65, -55],
  ].some(([a, n, o, s]) => e >= a && e <= n && t >= o && t <= s);
}
function randomPointInRing(e, t, a, n) {
  const o = a / 6371,
    s = n / 6371;
  for (let a = 0; a < 24; a++) {
    const a = Math.sqrt(Math.random() * (s * s - o * o) + o * o),
      n = 2 * Math.random() * Math.PI,
      r = (e * Math.PI) / 180,
      i = (t * Math.PI) / 180,
      l = Math.asin(
        Math.sin(r) * Math.cos(a) + Math.cos(r) * Math.sin(a) * Math.cos(n),
      ),
      c =
        i +
        Math.atan2(
          Math.sin(n) * Math.sin(a) * Math.cos(r),
          Math.cos(a) - Math.sin(r) * Math.sin(l),
        ),
      d = Math.max(-85, Math.min(85, (180 * l) / Math.PI)),
      u = (((180 * c) / Math.PI + 540) % 360) - 180,
      g = _isOnLandSync(d, u),
      m = !0 === _isInBigLakeSync(d, u);
    if (!0 === g && !m) return { lat: d, lng: u };
    if (null === g && !m && !isLikelyOcean(d, u)) return { lat: d, lng: u };
  }
  return { lat: e, lng: t };
}
const SMART_ZOOM_SPREAD_DEG = 1.5,
  SMART_ZOOM_MARGIN_DEG = 0.4;
function _countryCodeSync(e, t) {
  const a = _countriesData;
  if (!a || !a.length) return null;
  for (const n of a)
    for (const a of n.p) if (_pointInRing(t, e, a)) return n.c || n.n || "?";
  return "";
}
function _hasInlandMargin(e, t, a) {
  const n = [
    [e + a, t],
    [e - a, t],
    [e, t + a],
    [e, t - a],
  ];
  for (const e of n) {
    const t = e[0];
    if (t > 85 || t < -85) return !1;
    const a = _countryCodeSync(t, ((e[1] + 540) % 360) - 180);
    if (null === a) return !0;
    if (!a) return !1;
  }
  return !0;
}
function smartZoomWaypoint(e, t, a) {
  const n = (e) => 2 * (Math.random() - 0.5) * e,
    o = _countryCodeSync(e, t);
  for (let s = 0; s < 15; s++) {
    const r = 1 - 0.06 * s,
      i = Math.max(-85, Math.min(85, e + n(a * r))),
      l = ((t + n(a * r * 1.4) + 540) % 360) - 180;
    if (!0 === _isInBigLakeSync(i, l)) continue;
    const c = _countryCodeSync(i, l);
    if (null !== c) {
      if (c && (!o || c === o) && _hasInlandMargin(i, l, 0.4))
        return { lat: i, lng: l };
    } else if (!isLikelyOcean(i, l)) return { lat: i, lng: l };
  }
  return null;
}
function guessDelayWaitMs(e, t, a) {
  if (!e || !0 !== e.guessDelayEnabled) return 0;
  var n = Math.max(0, Number(e.guessDelayMin) || 0),
    o = Math.max(n, Number(e.guessDelayMax) || n),
    s = 1e3 * (n + Math.random() * (o - n)),
    r = t ? Number(t) : NaN;
  if (!Number.isFinite(r) || r > a) return Math.round(s);
  var i = s - (a - r),
    l = 250 + 500 * Math.random();
  return Math.round(Math.max(l, i));
}
async function performAutoPlace(e, t) {
  const a = await new Promise((e) =>
    chrome.storage.local.get(
      [
        "autoPlace",
        "rangeEnabled",
        "scoreMin",
        "scoreMax",
        "smartZoom",
        "smartZoomSpeed",
        "autoSubmit",
        "guessDelayEnabled",
        "guessDelayMin",
        "guessDelayMax",
        "mapZoomLevel",
        "coordinatesTimestamp",
      ],
      e,
    ),
  );
  if (!1 === a.autoPlace) return;
  {
    const n = guessDelayWaitMs(a, a.coordinatesTimestamp, Date.now());
    if (n > 0) {
      await new Promise((e) => setTimeout(e, n));
      const a = await new Promise((e) =>
          chrome.storage.local.get(["extractedCoordinates"], e),
        ),
        o = a && a.extractedCoordinates;
      if (o && (Math.abs(o.lat - e) > 0.02 || Math.abs(o.lng - t) > 0.02))
        return !1;
    }
  }
  if (!0 === a.rangeEnabled) {
    const n = void 0 !== a.scoreMin ? a.scoreMin : 4950,
      o = void 0 !== a.scoreMax ? a.scoreMax : 5e3;
    if (n < 5e3 || o < 5e3) {
      const a = randomPointInRing(e, t, scoreToRadiusKm(o), scoreToRadiusKm(n));
      ((e = a.lat), (t = a.lng));
    }
  }
  let n;
  try {
    n = (await chrome.tabs.query({ active: !0, currentWindow: !0 }))[0];
  } catch (e) {
    return void console.warn("Auto-place error:", e.message);
  }
  if (!n || !n.url) return;
  const o = atlasSiteFor(n.url);
  if (!o) return;
  const s = o.leaflet;
  try {
    const o = await chrome.scripting.executeScript({
        target: { tabId: n.id },
        world: "MAIN",
        func: (e, t, a, n, o, s, r, i) => {
          const l = (e) => 2 * (Math.random() - 0.5) * e,
            c = (e) => Math.max(-85, Math.min(85, e)),
            d = (e) => ((e + 540) % 360) - 180,
            u = (e, t) => setTimeout(t, e),
            g = [
              "Smart Zooming...",
              "Smart Zooming..",
              "Smart Zooming.",
              "Smart Zooming..",
            ];
          function m(e) {
            const t = document.getElementById("__ziqkjcngr_sz_style"),
              a = document.getElementById("confirmButton"),
              n = document.getElementById("guessText");
            if (e) {
              if (!t) {
                const e = document.createElement("style");
                ((e.id = "__ziqkjcngr_sz_style"),
                  (e.textContent =
                    '@keyframes __ziqkjcngr_dots{0%{content:"Smart Zooming..."}25%{content:"Smart Zooming.."}50%{content:"Smart Zooming."}75%{content:"Smart Zooming.."}}button[data-qa="perform-guess"]{opacity:0.45!important;pointer-events:none!important;}button[data-qa="perform-guess"] [class*="button_label"],button[data-qa="perform-guess"] span{font-size:0!important;}button[data-qa="perform-guess"] [class*="button_label"]::after,button[data-qa="perform-guess"] span::after{content:"Smart Zooming...";font-size:14px;animation:__ziqkjcngr_dots 1.2s steps(1,end) infinite;}'),
                  document.head.appendChild(e));
              }
              if (
                (window.__ziqkjcngr_dotInterval &&
                  clearInterval(window.__ziqkjcngr_dotInterval),
                a &&
                  ((a.style.opacity = "0.45"),
                  (a.style.pointerEvents = "none")),
                n)
              ) {
                let e = 0;
                ((n.textContent = g[0]),
                  (window.__ziqkjcngr_dotInterval = setInterval(() => {
                    ((e = (e + 1) % g.length), (n.textContent = g[e]));
                  }, 350)));
              }
            } else
              (t && t.remove(),
                window.__ziqkjcngr_dotInterval &&
                  (clearInterval(window.__ziqkjcngr_dotInterval),
                  (window.__ziqkjcngr_dotInterval = null)),
                a && ((a.style.opacity = ""), (a.style.pointerEvents = "")),
                n && (n.textContent = "Guess"));
          }
          function p() {
            if (!s) return;
            m(!1);
            const e = window.__ziqkjcngr_gen;
            let t = 0;
            const a = () => {
              if (
                void 0 !== window.__ziqkjcngr_gen &&
                window.__ziqkjcngr_gen !== e
              )
                return;
              let n = document.querySelector('button[data-qa="perform-guess"]');
              if (
                (n &&
                  (n.disabled || "true" === n.getAttribute("aria-disabled")) &&
                  (n = null),
                !n)
              ) {
                const e = document.getElementById("confirmButton");
                e && !e.disabled && null !== e.offsetParent && (n = e);
              }
              if (n) {
                if (window.__ziqkjcngr_submitting) return;
                return (
                  (window.__ziqkjcngr_submitting = !0),
                  setTimeout(() => {
                    window.__ziqkjcngr_submitting = !1;
                  }, 1500),
                  void [
                    "pointerdown",
                    "mousedown",
                    "pointerup",
                    "mouseup",
                    "click",
                  ].forEach((e) =>
                    n.dispatchEvent(
                      new MouseEvent(e, {
                        bubbles: !0,
                        cancelable: !0,
                        view: window,
                      }),
                    ),
                  )
                );
              }
              t++ < 40 && setTimeout(a, 100);
            };
            setTimeout(a, 250);
          }
          const h = (e) => {
            try {
              return (
                null != e &&
                "object" == typeof e &&
                "function" == typeof e.setView &&
                "function" == typeof e.panTo &&
                "function" == typeof e.getZoom &&
                "function" == typeof e.fire &&
                "function" == typeof e.on
              );
            } catch (e) {
              return !1;
            }
          };
          if (
            a ||
            (window.__ziqkjcngr_leaflet_map &&
              "function" == typeof window.__ziqkjcngr_leaflet_map.setView)
          ) {
            const a = (e, t) => {
                const a = document.querySelector(".leaflet-container");
                if (!a)
                  return { success: !1, error: "No Leaflet container found" };
                let n = null,
                  o = null,
                  s = null,
                  r = null;
                for (const e of a.querySelectorAll(
                  "img.leaflet-tile-loaded, img.leaflet-tile",
                )) {
                  const t = (e.src || "").match(
                    /\/([0-9]+)\/([0-9]+)\/([0-9]+)(?:[^/]*)?$/,
                  );
                  if (t) {
                    ((n = +t[1]), (o = +t[2]), (s = +t[3]), (r = e));
                    break;
                  }
                }
                if (null === n)
                  return { success: !1, error: "Could not read tile zoom" };
                const i = 256 * Math.pow(2, n),
                  l = a.getBoundingClientRect(),
                  c = r.getBoundingClientRect(),
                  d = 256 * o - (c.left - l.left),
                  u = 256 * s - (c.top - l.top),
                  g = ((e, t) => {
                    const a = Math.sin((e * Math.PI) / 180);
                    return {
                      x: ((t + 180) / 360) * i,
                      y:
                        (0.5 - Math.log((1 + a) / (1 - a)) / (4 * Math.PI)) * i,
                    };
                  })(e, t),
                  m = Math.max(4, Math.min(l.width - 4, g.x - d)),
                  p = Math.max(4, Math.min(l.height - 4, g.y - u)),
                  h = l.left + m,
                  f = l.top + p;
                return (
                  (document.elementFromPoint(h, f) || a).dispatchEvent(
                    new MouseEvent("click", {
                      bubbles: !0,
                      cancelable: !0,
                      view: window,
                      clientX: h,
                      clientY: f,
                    }),
                  ),
                  { success: !0 }
                );
              },
              s = (() => {
                if (h(window.__ziqkjcngr_leaflet_map))
                  return window.__ziqkjcngr_leaflet_map;
                for (const e of [
                  "gameMap",
                  "map",
                  "leafletMap",
                  "guessMap",
                  "mapInstance",
                ])
                  try {
                    if (h(window[e])) return window[e];
                  } catch (e) {}
                for (const e of Object.keys(window))
                  try {
                    if (h(window[e])) return window[e];
                  } catch (e) {}
                return null;
              })();
            if (!s) return a(e, t);
            try {
              const a = { lat: e, lng: t },
                g = (e) =>
                  s.fire("click", {
                    latlng: e,
                    layerPoint: s.latLngToLayerPoint
                      ? s.latLngToLayerPoint(e)
                      : { x: 0, y: 0 },
                    containerPoint: s.latLngToContainerPoint
                      ? s.latLngToContainerPoint(e)
                      : { x: 0, y: 0 },
                    originalEvent: new MouseEvent("click", { bubbles: !0 }),
                  }),
                h = s.getContainer
                  ? s.getContainer()
                  : document.querySelector(".leaflet-container");
              if (h) {
                if (!document.getElementById("__ziqkjcngr_og_expand")) {
                  const e = document.createElement("style");
                  ((e.id = "__ziqkjcngr_og_expand"),
                    (e.textContent =
                      ".leaflet-container, .leaflet-container * { opacity: 1 !important; pointer-events: auto !important; }"),
                    document.head.appendChild(e),
                    setTimeout(() => e.remove(), 8e3));
                }
                for (let e = h; e && e !== document.body; e = e.parentElement)
                  for (const t of [
                    "mouseenter",
                    "mouseover",
                    "pointerenter",
                    "pointerover",
                  ])
                    try {
                      e.dispatchEvent(
                        new MouseEvent(t, {
                          bubbles: !0,
                          cancelable: !0,
                          view: window,
                        }),
                      );
                    } catch (e) {}
                s.invalidateSize();
              }
              let f = 0;
              if (n && i) {
                m(!0);
                const a = 3 + Math.floor(3 * Math.random()),
                  n = i.lat,
                  r = i.lng,
                  p = 700 + 600 * o + Math.floor(600 * Math.random()),
                  h = 0.5 + 0.2 * o + 0.3 * Math.random(),
                  y = Math.min(14.5, a + 2.5 + 1.5 * Math.random()),
                  _ = Math.max(a, y - 2 - 1 * Math.random()),
                  b = { lat: n, lng: r },
                  w = Math.floor(p * (0.2 + 0.12 * Math.random())),
                  v = Math.floor(p * (0.42 + 0.1 * Math.random())),
                  k = Math.floor(p * (0.65 + 0.1 * Math.random()));
                (u(f, () => s.flyTo([n, r], a, { animate: !0, duration: h })),
                  u(f + w, () =>
                    s.flyTo([n, r], y, {
                      animate: !0,
                      duration: 0.8 + 0.5 * Math.random(),
                      easeLinearity: 0.25 + 0.2 * Math.random(),
                    }),
                  ),
                  u(f + v, () => g(b)),
                  u(f + k, () =>
                    s.flyTo([n, r], _, {
                      animate: !0,
                      duration: 1.1 + 0.8 * Math.random(),
                      easeLinearity: 0.3 + 0.2 * Math.random(),
                    }),
                  ),
                  (f += p));
                const S = 300 + Math.floor(250 * Math.random());
                (u(f, () => s.panTo([c(e + l(0.08)), d(t + l(0.12))])),
                  (f += S + Math.floor(200 * Math.random())));
              }
              return (
                u(f + 500 + Math.floor(400 * Math.random()), () => {
                  (s.flyTo(a, r, {
                    animate: !0,
                    duration: 2.5,
                    easeLinearity: 0.15,
                  }),
                    (window.__ziqkjcngr_leaflet_map = s));
                  const n = [
                    {
                      lat: e + 0.008 * (Math.random() - 0.5),
                      lng: t + 0.01 * (Math.random() - 0.5),
                    },
                    {
                      lat: e + 0.003 * (Math.random() - 0.5),
                      lng: t + 0.004 * (Math.random() - 0.5),
                    },
                  ];
                  let o = 2800 + Math.floor(200 * Math.random());
                  (n.forEach((e) => {
                    (u(o, () => g(e)),
                      (o += 280 + Math.floor(320 * Math.random())));
                  }),
                    u(o + 80 + Math.floor(180 * Math.random()), () => {
                      (g(a), m(!1), p());
                    }));
                }),
                { success: !0 }
              );
            } catch (e) {
              return { success: !1, error: e.message };
            }
          }
          if (!window.google || !window.google.maps)
            return { success: !1, error: "Google Maps API not available" };
          const f = (() => {
            const e = [
              '[data-qa="guess-map-canvas"]',
              ".guess-map_canvas__cvpqv",
              ".guess-map_canvasContainer__s7oJp",
              'div[aria-roledescription="carte"]',
              'div[aria-roledescription="map"]',
              'div[role="region"][aria-roledescription]',
            ];
            for (const t of e) {
              const e = document.querySelector(t);
              if (!e) continue;
              const a = e.querySelectorAll("div");
              for (let e = 0; e < a.length && e < 300; e++) {
                const t = a[e];
                if (t.__gm && t.__gm.map) return t.__gm.map;
                if (
                  "function" == typeof t.getCenter &&
                  "function" == typeof t.getZoom
                )
                  return t;
              }
              const n = Object.keys(e).find((e) =>
                e.startsWith("__reactFiber$"),
              );
              if (n) {
                let t = e[n],
                  a = 0;
                for (; t && a < 30;) {
                  const e = t.memoizedProps || t.pendingProps;
                  if (e && e.map && "function" == typeof e.map.getCenter)
                    return e.map;
                  ((t = t.return), a++);
                }
              }
            }
            return null;
          })();
          if (!f)
            return {
              success: !1,
              error: "Could not find guess map, make sure it is visible",
            };
          try {
            const a = new google.maps.LatLng(e, t),
              s = f.getDiv(),
              g =
                document.querySelector('[class*="guess-map_canvas"]') ||
                document.querySelector('[data-qa="guess-map"]') ||
                s.closest('[class*="guess-map"]');
            (g &&
              (g.dispatchEvent(new MouseEvent("mouseenter", { bubbles: !0 })),
              g.dispatchEvent(new MouseEvent("mouseover", { bubbles: !0 }))),
              void 0 !== window.__ziqkjcngr_gen && m(!1),
              (window.__ziqkjcngr_gen = (window.__ziqkjcngr_gen || 0) + 1));
            const h = window.__ziqkjcngr_gen,
              y = () => window.__ziqkjcngr_gen === h,
              _ = () => {
                if (y())
                  try {
                    const e = s.getBoundingClientRect();
                    s.dispatchEvent(
                      new MouseEvent("mousemove", {
                        bubbles: !0,
                        cancelable: !0,
                        view: window,
                        clientX: e.left + 10 + Math.random() * (e.width - 20),
                        clientY: e.top + 10 + Math.random() * (e.height - 20),
                      }),
                    );
                  } catch (e) {}
              },
              b = (e, t, a) => {
                if (!y()) return;
                const n = f.getCenter(),
                  o = n.lat(),
                  s = n.lng(),
                  r = e.lat();
                let i = e.lng() - s;
                (i > 180 && (i -= 360), i < -180 && (i += 360));
                const l = performance.now();
                !(function e(n) {
                  if (!y()) return;
                  const c = Math.min(1, (n - l) / t),
                    d = ((e) => (e < 0.5 ? 2 * e * e : (4 - 2 * e) * e - 1))(c);
                  (f.setCenter(
                    new google.maps.LatLng(o + (r - o) * d, s + i * d),
                  ),
                    c < 1 ? requestAnimationFrame(e) : a && a());
                })(l);
              };
            let w = null;
            const v = (e, t, a) => {
                if ((null !== w && (clearTimeout(w), (w = null)), !y())) return;
                const n = Math.round(f.getZoom() || 2),
                  o = Math.round(e);
                if (n === o) return void (a && a());
                const s = o > n ? 1 : -1,
                  r = Math.abs(o - n);
                let i = 0;
                !(function e() {
                  if (y()) {
                    if (i >= r) return ((w = null), void (a && a()));
                    (i++, f.setZoom(n + s * i), (w = setTimeout(e, t)));
                  } else w = null;
                })();
              },
              k = (e) =>
                google.maps.event.trigger(f, "click", {
                  latLng: e,
                  domEvent: new MouseEvent("click", { bubbles: !0 }),
                  pixel: null,
                  stop: function () {},
                });
            let S = 0;
            if (n && i) {
              m(!0);
              const a = 3 + Math.floor(3 * Math.random()),
                n = i.lat,
                s = i.lng,
                r = new google.maps.LatLng(n, s),
                g = 700 + 600 * o + Math.floor(600 * Math.random()),
                p = Math.min(15, a + 3 + Math.floor(2 * Math.random())),
                h = p - 1,
                f = Math.max(a + 1, p - 2 - Math.floor(2 * Math.random())),
                w = Math.floor(g * (0.16 + 0.06 * Math.random())),
                x = Math.floor(g * (0.25 + 0.1 * Math.random())),
                E = Math.floor(g * (0.46 + 0.1 * Math.random())),
                A = Math.floor(g * (0.64 + 0.08 * Math.random())),
                C = Math.floor(g * (0.78 + 0.08 * Math.random())),
                M = Math.floor(g * (0.91 + 0.06 * Math.random())),
                L = () => {
                  y() && (k(r), _());
                };
              (u(S, () => {
                y() && b(r, w, () => v(a, 200, _));
              }),
                u(S + x, () => {
                  y() && v(p, 250 + Math.floor(80 * Math.random()), _);
                }),
                u(S + E, L),
                u(S + A, () => {
                  y() && v(h, 220 + Math.floor(80 * Math.random()), _);
                }),
                u(S + C, () => {
                  y() && v(f, 220 + Math.floor(80 * Math.random()), _);
                }),
                u(S + M, _),
                (S += g));
              const P = 300 + Math.floor(250 * Math.random()),
                T = new google.maps.LatLng(c(e + l(0.08)), d(t + l(0.12)));
              (u(S, () => {
                y() && b(T, Math.floor(0.5 * P + 80 * Math.random()), _);
              }),
                (S += P + Math.floor(200 * Math.random())));
            }
            return (
              u(S + (n ? 600 + Math.floor(500 * Math.random()) : 0), () => {
                y() &&
                  (n
                    ? b(a, 700 + Math.floor(200 * Math.random()), () => {
                        v(r, 350, () => {
                          const n = [
                            new google.maps.LatLng(
                              e + 0.008 * (Math.random() - 0.5),
                              t + 0.01 * (Math.random() - 0.5),
                            ),
                            new google.maps.LatLng(
                              e + 0.003 * (Math.random() - 0.5),
                              t + 0.004 * (Math.random() - 0.5),
                            ),
                          ];
                          let o = 150 + Math.floor(200 * Math.random());
                          (n.forEach((e) => {
                            (u(o, () => {
                              y() && k(e);
                            }),
                              (o += 280 + Math.floor(320 * Math.random())));
                          }),
                            u(o + 80 + Math.floor(180 * Math.random()), () => {
                              y() && (k(a), m(!1), p());
                            }));
                        });
                      })
                    : (k(a),
                      u(220 + Math.floor(140 * Math.random()), () => {
                        if (!y()) return;
                        let e = !1;
                        const t = () => {
                            e || ((e = !0), p());
                          },
                          n =
                            Math.abs(
                              Math.round(r) - Math.round(f.getZoom() || 2),
                            ) || 1,
                          o = 1100 + Math.floor(400 * Math.random()),
                          s = Math.max(70, Math.floor(o / n));
                        try {
                          (f.panTo(a), v(r, s, t));
                        } catch (e) {
                          t();
                        }
                        u(o + s + 400, () => {
                          y() && t();
                        });
                      })));
              }),
              { success: !0 }
            );
          } catch (e) {
            return { success: !1, error: e.message };
          }
        },
        args: [
          e,
          t,
          s,
          !0 === a.smartZoom,
          7,
          !0 === a.autoSubmit,
          "number" == typeof a.mapZoomLevel ? a.mapZoomLevel : 6,
          !0 === a.smartZoom
            ? smartZoomWaypoint(e, t, SMART_ZOOM_SPREAD_DEG)
            : null,
        ],
      }),
      r = o && o[0] && o[0].result;
    r && r.success
      ? console.log("Pin placed on map automatically")
      : console.warn("Auto-place could not place pin:", r && r.error);
  } catch (e) {
    console.warn("Auto-place error:", e.message);
  }
}
function showNotOnGameModal() {
  const e = el$("autowin-geoguessr-modal");
  e && e.remove();
  const t = makeDiv(
    "atl-md-scrim",
    '\n    <div class="atl-md-card">\n      <button class="atl-md-x" id="close-autowin-modal" aria-label="Close">&times;</button>\n      <div class="atl-md-head">\n        <span class="atl-md-badge" aria-hidden="true">\n          <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>\n        </span>\n        <div class="atl-md-heads">\n          <h3 class="atl-md-title">Open a round first</h3>\n          <p class="atl-md-sub">This works on a supported game. Open an active round on GeoGuessr, OpenGuessr, WorldGuessr and more, then press GUESS to reveal the exact location.</p>\n        </div>\n      </div>\n      <div class="atl-md-cta">\n        <button class="atl-md-primary" id="close-autowin-notice-btn">Got it</button>\n      </div>\n    </div>\n  ',
  );
  t.id = "autowin-geoguessr-modal";
  const a = () => t.remove();
  (document.body.appendChild(t),
    onClickAll(t, "#close-autowin-modal, #close-autowin-notice-btn", a),
    wireDismissers(t, a));
}
function installRailAndButtons(e, t) {
  (qa$(".rail-btn").forEach((e) => {
    bind(e, "click", () => showPage(e.getAttribute("data-page")));
  }),
    t("settings-button", "click", () => {
      (showSettingsPage(), setTimeout(() => initializeFirebaseUser(), 300));
    }),
    t("back-button", "click", () => showMainPage()),
    t("stats-refresh", "click", renderStats),
    t("stats-clear", "click", clearHistory),
    t("history-refresh", "click", renderHistory),
    t("change-key-btn", "click", () => {
      const e = q$(".key-activate-row");
      e && disp(e, "flex");
      const t = el$("key-input");
      if (t) {
        t.focus();
        try {
          t.select();
        } catch (e) {}
      }
    }),
    t("payment-button", "click", () => {
      (startExtPayWindowMonitoring(), openAtlasCheckout());
    }),
    t("signin-button", "click", () => showSignInPrompt()),
    t("signup-settings-button", "click", () => openAtlasCheckout()),
    t("login-settings-button", "click", () => openAtlasDashboard()),
    t("manage-plan-button", "click", () => openAtlasCheckout()));
}
function installExtPayListeners(e, a) {
  (extpay.onPaid.addListener((e) => {
    (syncSubscriptionToFirebase(e),
      setTimeout(() => checkPaymentStatus(), 1e3),
      showStatus(
        t("panel_status_payment_successful_premium_features_unlocked"),
      ));
  }),
    extpay.onTrialStarted.addListener((t) => {
      const a = e("signin-button");
      (a && disp(a, "none"),
        syncSubscriptionToFirebase(t),
        chrome.storage.local.set({ shouldShowTrialMessage: !0 }, () => {
          (checkPaymentStatus(), showTrialActivatedMessage());
        }));
    }));
}
function installCoordinateBroadcast() {
  chrome.storage.onChanged.addListener((e, a) => {
    if ("local" !== a || !e.extractedCoordinates) return;
    const n = e.extractedCoordinates.newValue;
    n &&
      (console.log("Received extracted coordinates:", n),
      showStatus(t("panel_status_new_coordinates_detected_click_extract_to")));
  });
}
function installAutoRunAfterReload(e) {
  chrome.storage.local.get(["autoRunAfterReload"], (t) => {
    t.autoRunAfterReload &&
      (console.log("Auto-running after reload..."),
      chrome.storage.local.remove("autoRunAfterReload"),
      setTimeout(() => {
        const t = e("capture-button");
        t && t.click();
      }, 1e3));
  });
}
const PAGE_RENDER_HOOKS = [
  [
    "settings",
    () => {
      const e = el$("score-min-slider");
      e && e.dispatchEvent(new Event("input"));
    },
  ],
  [
    "account",
    () => {
      setTimeout(() => {
        try {
          initializeFirebaseUser();
        } catch (e) {}
      }, 50);
    },
  ],
  ["stats", () => renderStats()],
  ["history", () => renderHistory()],
  ["profile", () => renderProfile()],
  ["learn", () => renderLearn()],
];
function showPage(e) {
  qa$(".pages .page").forEach((e) => e.classList.remove("active"));
  const t = el$(e + "-page");
  (t && clsAdd(t, "active"),
    qa$(".rail-btn").forEach((t) => {
      cls(t, "active", t.getAttribute("data-page") === e);
    }));
  const a = PAGE_RENDER_HOOKS.find((t) => t[0] === e);
  a && a[1]();
  try {
    window.scrollTo(0, 0);
  } catch (e) {}
}
function showMainPage() {
  showPage("main");
}
function showSettingsPage() {
  showPage("settings");
}
function showMainPageWithoutAnimation() {
  showPage("main");
}
const ATLAS_HISTORY_KEY = "atlasHistory",
  ATLAS_HISTORY_CAP = 300,
  _HTML_ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
function _esc(e) {
  return String(null == e ? "" : e).replace(
    /[&<>"']/g,
    (e) => _HTML_ESCAPES[e],
  );
}
function _countryNameFromIso2(e) {
  if (!e || !_countriesData) return "";
  const t = String(e).toUpperCase();
  for (let e = 0; e < _countriesData.length; e++)
    if (_countriesData[e].c === t) return _countriesData[e].n;
  return "";
}
function _timeAgo(e) {
  const t = Math.max(0, Math.floor((Date.now() - e) / 1e3));
  if (t < 60) return t + "s ago";
  const a = Math.floor(t / 60);
  if (a < 60) return a + "m ago";
  const n = Math.floor(a / 60);
  return n < 24 ? n + "h ago" : Math.floor(n / 24) + "d ago";
}
function _loadHistory(e) {
  chrome.storage.local.get([ATLAS_HISTORY_KEY], (t) => {
    e(Array.isArray(t[ATLAS_HISTORY_KEY]) ? t[ATLAS_HISTORY_KEY] : []);
  });
}
function recordGuess(e, t, a, n) {
  try {
    const o = parseFloat(e),
      s = parseFloat(t);
    if (!isFinite(o) || !isFinite(s)) return;
    const r = n || "";
    if (
      ("function" == typeof noteReviewRound && noteReviewRound(),
      "function" == typeof maybeShowReviewAsk && maybeShowReviewAsk(),
      sendDiscordGuess(o, s, a, r),
      void 0 !== _atlasCfg &&
        _atlasCfg.autoCopy &&
        "function" == typeof formatCoords)
    )
      try {
        navigator.clipboard.writeText(formatCoords(o, s));
      } catch (e) {}
    if (void 0 !== _atlasCfg && !1 === _atlasCfg.historyEnabled) return;
    chrome.storage.local.get([ATLAS_HISTORY_KEY], (e) => {
      const t = Array.isArray(e[ATLAS_HISTORY_KEY]) ? e[ATLAS_HISTORY_KEY] : [],
        n = t[t.length - 1];
      if (n && Math.abs(n.lat - o) < 1e-6 && Math.abs(n.lng - s) < 1e-6) return;
      t.push({ t: Date.now(), lat: o, lng: s, loc: a || "", country: r });
      const i =
        (void 0 !== _atlasCfg && _atlasCfg.historyCap) || ATLAS_HISTORY_CAP;
      for (; t.length > i;) t.shift();
      chrome.storage.local.set({ [ATLAS_HISTORY_KEY]: t });
      const l = el$("stats-page"),
        c = el$("history-page");
      (l && l.classList.contains("active") && renderStats(),
        c && c.classList.contains("active") && renderHistory());
    });
  } catch (e) {}
}
function clearHistory() {
  chrome.storage.local.set({ [ATLAS_HISTORY_KEY]: [] }, () => {
    (renderStats(), renderHistory());
  });
}
function _summariseHistory(e) {
  const t = Date.now(),
    a = 864e5,
    n = {};
  let o = 0,
    s = 0,
    r = 0;
  e.forEach((e) => {
    const i = e.country || "Unknown";
    ((n[i] = (n[i] || 0) + 1),
      t - e.t < a && o++,
      t - e.t < 7 * a && s++,
      e.t > r && (r = e.t));
  });
  let i = "-",
    l = 0;
  return (
    Object.keys(n).forEach((e) => {
      n[e] > l && ((l = n[e]), (i = e));
    }),
    {
      total: e.length,
      distinct: Object.keys(n).length,
      today: o,
      week: s,
      topCountry: i,
      last: e.length ? _timeAgo(r) : "-",
    }
  );
}
function renderStats() {
  (drawStatsBasemap(),
    _loadHistory((e) => {
      const t = el$("stat-grid");
      if (!t) return;
      const a = _summariseHistory(e);
      html(
        t,
        [
          {
            label: "Total Guesses",
            value: String(a.total),
            color: "var(--orange)",
          },
          {
            label: "Countries",
            value: String(a.distinct),
            color: "var(--turq)",
          },
          { label: "This Week", value: String(a.week), color: "var(--green)" },
          { label: "Today", value: String(a.today), color: "var(--yellow)" },
          {
            label: "Top Country",
            value: a.topCountry,
            color: "var(--green)",
            small: !0,
          },
          {
            label: "Last Guess",
            value: a.last,
            color: "var(--red)",
            small: !0,
          },
        ]
          .map(
            (e) =>
              '<div class="stat-card"><span class="stat-label">' +
              _esc(e.label) +
              '</span><span class="stat-value' +
              (e.small ? " small" : "") +
              '" style="color:' +
              e.color +
              '">' +
              _esc(e.value) +
              "</span></div>",
          )
          .join(""),
      );
      const n = el$("stats-heat");
      n &&
        html(
          n,
          e
            .map(
              (e) =>
                '<span class="heat-dot" style="left:' +
                ((e.lng + 180) / 360) * 100 +
                "%;top:" +
                ((90 - e.lat) / 180) * 100 +
                '%"></span>',
            )
            .join(""),
        );
    }));
}
function renderHistory() {
  _loadHistory((e) => {
    const t = el$("history-body"),
      a = el$("history-empty"),
      n = el$("history-count");
    if (!t) return;
    const o = e
      .slice()
      .sort((e, t) => (t.t || 0) - (e.t || 0))
      .slice(0, 50);
    if ((n && txt(n, e.length ? "(" + e.length + ")" : ""), !o.length))
      return (html(t, ""), void (a && disp(a, "block")));
    (a && disp(a, "none"),
      html(
        t,
        o
          .map((e) => {
            const t = (e.loc || "").split(",").slice(0, 2).join(", ") || "-",
              a =
                "function" == typeof formatCoords
                  ? formatCoords(e.lat, e.lng)
                  : e.lat.toFixed(3) + ", " + e.lng.toFixed(3);
            return (
              '<tr><td class="loc">' +
              _esc(t) +
              "</td><td>" +
              _esc(e.country || "-") +
              '</td><td class="mono">' +
              _esc(a) +
              "</td><td>" +
              _esc(_timeAgo(e.t)) +
              "</td></tr>"
            );
          })
          .join(""),
      ));
  });
}
const THEME_PRESET_VARS = [
    "--bg",
    "--bg-card",
    "--bg-card2",
    "--bg-code",
    "--border",
    "--border-lt",
    "--orange",
    "--orange-lt",
    "--orange-dim",
    "--accent-strong",
    "--text",
    "--text-mid",
    "--text-dim",
    "--text-muted",
    "--green",
    "--yellow",
    "--red",
    "--turq",
  ],
  THEME_PRESETS = {
    Ocean: {
      base: "dark",
      v: {
        "--bg": "#0A1628",
        "--bg-card": "#162A4A",
        "--bg-card2": "#0F1E36",
        "--bg-code": "#1E3558",
        "--border": "#1E3558",
        "--border-lt": "#2A4A70",
        "--orange": "#00B4D8",
        "--orange-lt": "#48CAE4",
        "--orange-dim": "#0096B4",
        "--accent-strong": "#00B4D8",
        "--turq": "#90E0EF",
      },
    },
    Forest: {
      base: "dark",
      v: {
        "--bg": "#0A1A0A",
        "--bg-card": "#1A3018",
        "--bg-card2": "#0F240F",
        "--bg-code": "#253D22",
        "--border": "#253D22",
        "--border-lt": "#3A5A35",
        "--orange": "#4ADE80",
        "--orange-lt": "#86EFAC",
        "--orange-dim": "#22C55E",
        "--accent-strong": "#4ADE80",
        "--green": "#4ADE80",
      },
    },
    Sunset: {
      base: "dark",
      v: {
        "--bg": "#1A0A14",
        "--bg-card": "#301828",
        "--bg-card2": "#24101C",
        "--bg-code": "#3D2035",
        "--border": "#3D2035",
        "--border-lt": "#5A3550",
        "--orange": "#F472B6",
        "--orange-lt": "#F9A8D4",
        "--orange-dim": "#EC4899",
        "--accent-strong": "#F472B6",
        "--red": "#FB7185",
      },
    },
    Cyberpunk: {
      base: "dark",
      v: {
        "--bg": "#0D0221",
        "--bg-card": "#1A0A3E",
        "--bg-card2": "#150530",
        "--bg-code": "#22104A",
        "--border": "#2E1660",
        "--border-lt": "#441E80",
        "--orange": "#FF2A6D",
        "--orange-lt": "#FF6B9D",
        "--orange-dim": "#D91E5A",
        "--accent-strong": "#FF2A6D",
        "--green": "#05D9E8",
        "--turq": "#05D9E8",
        "--yellow": "#F6F740",
      },
    },
    Nord: {
      base: "dark",
      v: {
        "--bg": "#2E3440",
        "--bg-card": "#434C5E",
        "--bg-card2": "#3B4252",
        "--bg-code": "#4C566A",
        "--border": "#4C566A",
        "--border-lt": "#616E88",
        "--orange": "#88C0D0",
        "--orange-lt": "#8FBCBB",
        "--orange-dim": "#81A1C1",
        "--accent-strong": "#88C0D0",
        "--text": "#ECEFF4",
        "--text-mid": "#D8DEE9",
        "--text-dim": "#9DA5B4",
        "--text-muted": "#9DA5B4",
        "--green": "#A3BE8C",
        "--yellow": "#EBCB8B",
        "--red": "#BF616A",
        "--turq": "#8FBCBB",
      },
    },
    Dracula: {
      base: "dark",
      v: {
        "--bg": "#282A36",
        "--bg-card": "#383A4A",
        "--bg-card2": "#2E303E",
        "--bg-code": "#44475A",
        "--border": "#44475A",
        "--border-lt": "#6272A4",
        "--orange": "#BD93F9",
        "--orange-lt": "#CAA9FA",
        "--orange-dim": "#A77BF3",
        "--accent-strong": "#BD93F9",
        "--text": "#F8F8F2",
        "--text-mid": "#D0D0D0",
        "--text-dim": "#6272A4",
        "--text-muted": "#6272A4",
        "--green": "#50FA7B",
        "--yellow": "#F1FA8C",
        "--red": "#FF5555",
        "--turq": "#8BE9FD",
      },
    },
    "Midnight Gold": {
      base: "dark",
      v: {
        "--bg": "#0C0C14",
        "--bg-card": "#1A1A2E",
        "--bg-card2": "#12121E",
        "--bg-code": "#222238",
        "--border": "#2A2A44",
        "--border-lt": "#3A3A5C",
        "--orange": "#FFD700",
        "--orange-lt": "#FFE44D",
        "--orange-dim": "#E6C300",
        "--accent-strong": "#FFD700",
        "--green": "#50C878",
        "--yellow": "#FFD700",
        "--red": "#FF4444",
        "--turq": "#7EC8E3",
      },
    },
    Emerald: {
      base: "dark",
      v: {
        "--bg": "#021A12",
        "--bg-card": "#0C3424",
        "--bg-card2": "#06261A",
        "--bg-code": "#14402E",
        "--border": "#1C4C38",
        "--border-lt": "#2C6A50",
        "--orange": "#34D399",
        "--orange-lt": "#6EE7B7",
        "--orange-dim": "#2AB880",
        "--accent-strong": "#34D399",
        "--green": "#6EE7B7",
        "--yellow": "#FCD34D",
        "--red": "#F87171",
        "--turq": "#5EEAD4",
      },
    },
    "Cherry Blossom": {
      base: "light",
      v: {
        "--bg": "#FFF0F5",
        "--bg-card": "#FFFFFF",
        "--bg-card2": "#FFF5F8",
        "--bg-code": "#FFF0F3",
        "--border": "#F5C2D0",
        "--border-lt": "#FADCE5",
        "--orange": "#E84393",
        "--orange-lt": "#F06AAF",
        "--orange-dim": "#D63384",
        "--accent-strong": "#D63384",
        "--text": "#3D2028",
        "--text-mid": "#6B4050",
        "--text-dim": "#B88A9A",
        "--text-muted": "#B88A9A",
        "--green": "#2ECC71",
        "--yellow": "#F39C12",
        "--red": "#E74C3C",
        "--turq": "#00CEC9",
      },
    },
    Lavender: {
      base: "light",
      v: {
        "--bg": "#F0EBF8",
        "--bg-card": "#FFFFFF",
        "--bg-card2": "#F5F0FC",
        "--bg-code": "#EDE5F5",
        "--border": "#D4C4E8",
        "--border-lt": "#E2D8F0",
        "--orange": "#7C3AED",
        "--orange-lt": "#A78BFA",
        "--orange-dim": "#6D28D9",
        "--accent-strong": "#6D28D9",
        "--text": "#2E1065",
        "--text-mid": "#4C1D95",
        "--text-dim": "#8B7AAF",
        "--text-muted": "#8B7AAF",
        "--green": "#10B981",
        "--yellow": "#F59E0B",
        "--red": "#EF4444",
        "--turq": "#06B6D4",
      },
    },
  };
function _setBaseTheme(e) {
  "dark" === e
    ? setAttr(document.documentElement, "data-theme", "dark")
    : document.documentElement.removeAttribute("data-theme");
  try {
    localStorage.setItem("atlasTheme", e);
  } catch (e) {}
  chrome.storage.local.set({ atlasTheme: e });
  const t = el$("theme-toggle");
  t && setAttr(t, "aria-checked", "dark" === e ? "true" : "false");
}
function applyThemePreset(e) {
  const t = document.documentElement;
  THEME_PRESET_VARS.forEach((e) => t.style.removeProperty(e));
  const a = THEME_PRESETS[e];
  a && Object.keys(a.v).forEach((e) => t.style.setProperty(e, a.v[e]));
}
function clearThemePreset() {
  (applyThemePreset(""), chrome.storage.local.set({ atlasThemePreset: "" }));
  const e = el$("theme-preset");
  e && (e.value = "");
}
function initThemePreset() {
  const e = el$("theme-preset");
  (chrome.storage.local.get(["atlasThemePreset"], (t) => {
    const a = t.atlasThemePreset || "";
    (e && (e.value = THEME_PRESETS[a] ? a : ""),
      a && THEME_PRESETS[a] && applyThemePreset(a));
  }),
    e &&
      bind(e, "change", () => {
        const t = e.value;
        if (t && THEME_PRESETS[t])
          return (
            chrome.storage.local.set({ atlasThemePreset: t }),
            _setBaseTheme(THEME_PRESETS[t].base),
            void applyThemePreset(t)
          );
        (chrome.storage.local.set({ atlasThemePreset: "" }),
          applyThemePreset(""),
          chrome.storage.local.get(["atlasTheme"], (e) =>
            _setBaseTheme("dark" === e.atlasTheme ? "dark" : "light"),
          ));
      }));
}
function _discordEls() {
  return {
    url: el$("discord-webhook"),
    status: el$("discord-status"),
    notify: el$("discord-notify-guess"),
    coords: el$("discord-incl-coords"),
    country: el$("discord-incl-country"),
  };
}
function _discordValid(e) {
  return /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(e || "");
}
function _discordPost(e, t) {
  return fetch(e, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t),
  }).then(
    (e) => !(!e.ok && 204 !== e.status) || Promise.reject("http " + e.status),
  );
}
function _discordPaintStatus(e, t, a) {
  if (!e) return;
  const n = _discordValid(t);
  if (a)
    (txt(
      e,
      t
        ? n
          ? "Webhook saved"
          : "Saved, but this does not look like a Discord webhook URL"
        : "Cleared",
    ),
      (e.className = "field-status" + (n ? " ok" : t ? " err" : "")));
  else {
    const a = !!t;
    (txt(e, a ? "Webhook saved" : "Not connected"),
      (e.className = "field-status" + (a ? " ok" : "")));
  }
}
function initDiscord() {
  const e = _discordEls();
  if (!e.url) return;
  chrome.storage.local.get(
    [
      "discordWebhook",
      "discordNotifyGuess",
      "discordInclCoords",
      "discordInclCountry",
    ],
    (t) => {
      ((e.url.value = t.discordWebhook || ""),
        e.notify && (e.notify.checked = !0 === t.discordNotifyGuess),
        e.coords && (e.coords.checked = !1 !== t.discordInclCoords),
        e.country && (e.country.checked = !1 !== t.discordInclCountry),
        _discordPaintStatus(e.status, t.discordWebhook, !1));
    },
  );
  const a = el$("discord-show");
  a &&
    bind(a, "click", () => {
      const t = "password" === e.url.type;
      ((e.url.type = t ? "text" : "password"),
        (a.textContent = t ? "Hide" : "Show"));
    });
  const n = el$("discord-save");
  (n &&
    bind(n, "click", () => {
      const t = (e.url.value || "").trim();
      (chrome.storage.local.set({
        discordWebhook: t,
        discordNotifyGuess: e.notify.checked,
        discordInclCoords: e.coords.checked,
        discordInclCountry: e.country.checked,
      }),
        _discordPaintStatus(e.status, t, !0));
    }),
    [e.notify, e.coords, e.country].forEach((t) => {
      t &&
        bind(t, "change", () => {
          chrome.storage.local.set({
            discordNotifyGuess: e.notify.checked,
            discordInclCoords: e.coords.checked,
            discordInclCountry: e.country.checked,
          });
        });
    }));
  const o = el$("discord-test");
  o &&
    bind(o, "click", () => {
      const a = (e.url.value || "").trim();
      _discordValid(a)
        ? (e.status &&
            ((e.status.textContent = "Sending test..."),
            (e.status.className = "field-status")),
          _discordPost(a, {
            embeds: [
              {
                title: t("panel_notif_atlas_connected"),
                description: "Test message from the ATLAS side panel.",
                color: 16737792,
              },
            ],
          })
            .then(() => {
              e.status &&
                ((e.status.textContent = "Test sent"),
                (e.status.className = "field-status ok"));
            })
            .catch((t) => {
              e.status &&
                ((e.status.textContent = "Failed: " + t),
                (e.status.className = "field-status err"));
            }))
        : e.status &&
          ((e.status.textContent = "Enter a valid Discord webhook URL first"),
          (e.status.className = "field-status err"));
    });
}
function sendDiscordGuess(e, a, n, o) {
  try {
    chrome.storage.local.get(
      [
        "discordWebhook",
        "discordNotifyGuess",
        "discordInclCoords",
        "discordInclCountry",
      ],
      (s) => {
        if (!s.discordWebhook || !0 !== s.discordNotifyGuess) return;
        const r = [];
        (!1 !== s.discordInclCountry &&
          o &&
          r.push({ name: "Country", value: String(o), inline: !0 }),
          !1 !== s.discordInclCoords &&
            r.push({
              name: "Coordinates",
              value: e.toFixed(5) + ", " + a.toFixed(5),
              inline: !0,
            }));
        const i = (n || "").split(",").slice(0, 2).join(", ");
        _discordPost(s.discordWebhook, {
          embeds: [
            {
              title: t("panel_notif_atlas_guess"),
              description: i || void 0,
              color: 16737792,
              fields: r,
            },
          ],
        }).catch(() => {});
      },
    );
  } catch (e) {}
}
function fetchGeoProfile() {
  return new Promise((e) => {
    try {
      chrome.tabs.query({ url: ["*://*.geoguessr.com/*"] }, (t) => {
        !chrome.runtime.lastError && t && t.length
          ? chrome.tabs.sendMessage(
              t[0].id,
              { action: "atlasFetchProfile" },
              (t) => {
                chrome.runtime.lastError
                  ? e({ success: !1, error: chrome.runtime.lastError.message })
                  : e(t || { success: !1, error: "no-response" });
              },
            )
          : e({ success: !1, error: "no-tab" });
      });
    } catch (t) {
      e({ success: !1, error: String((t && t.message) || t) });
    }
  });
}
function _pick(e, t) {
  for (let a = 0; a < t.length; a++) {
    const n = t[a].split(".");
    let o = e,
      s = !0;
    for (let e = 0; e < n.length; e++) {
      if (!o || "object" != typeof o || !(n[e] in o)) {
        s = !1;
        break;
      }
      o = o[n[e]];
    }
    if (s && null != o && "" !== o) return o;
  }
  return null;
}
function _profileAvatarUrl(e) {
  let t = String(e);
  return "/" === t.charAt(0)
    ? "https://www.geoguessr.com" + t
    : 0 !== t.indexOf("http")
      ? "https://www.geoguessr.com/images/" + t
      : t;
}
function _profileFailure(e) {
  const t = String((e && e.error) || "");
  return "http 401" === t || "http 403" === t
    ? {
        signedOut: !0,
        titleKey: "panel_not_signed_in",
        title: "Not signed in",
        detailKey: "panel_profile_signed_out_hint",
        detail: "Sign in to GeoGuessr in your browser, then press Refresh.",
      }
    : "no-tab" === t || "not-geoguessr" === t
      ? {
          signedOut: !1,
          titleKey: "panel_profile_unavailable",
          title: "Profile unavailable",
          detailKey: "panel_profile_open_tab_hint",
          detail: "Open a GeoGuessr tab, then press Refresh.",
        }
      : {
          signedOut: !1,
          titleKey: "panel_profile_unavailable",
          title: "Profile unavailable",
          detailKey: "panel_profile_reload_tab_hint",
          detail:
            "Reload your GeoGuessr tab so the panel can read it, then press Refresh.",
        };
}
function _profileText(e, a) {
  try {
    const n = t(e);
    return n && n !== e ? n : a;
  } catch (e) {
    return a;
  }
}
function renderProfile() {
  const e = el$("profile-name"),
    a = el$("profile-sub"),
    n = el$("profile-avatar"),
    o = el$("profile-stats"),
    s = el$("profile-empty");
  (a && txt(a, t("panel_ui_loading")),
    fetchGeoProfile().then((t) => {
      if (!t || !t.success) {
        const r = _profileFailure(t);
        return (
          t && t.error && console.warn("profile fetch failed:", t.error),
          e && txt(e, _profileText(r.titleKey, r.title)),
          a && txt(a, _profileText(r.detailKey, r.detail)),
          o && html(o, ""),
          s && disp(s, "block"),
          void (n && txt(n, "?"))
        );
      }
      const r = t.profile || {},
        i =
          _pick(r, ["nick", "user.nick", "name", "user.name"]) ||
          "GeoGuessr player";
      e && txt(e, i);
      const l = _pick(r, ["countryCode", "user.countryCode"]);
      (a && txt(a, l ? "Country: " + String(l).toUpperCase() : "Signed in"),
        s && disp(s, "none"));
      const c = _pick(r, [
        "pin.url",
        "user.pin.url",
        "avatar.url",
        "user.avatar.url",
        "avatar",
      ]);
      if (n)
        if (c) {
          html(n, "");
          const e = document.createElement("img");
          ((e.alt = ""),
            (e.onerror = () => {
              txt(n, i.charAt(0).toUpperCase());
            }),
            (e.src = _profileAvatarUrl(c)),
            n.appendChild(e));
        } else txt(n, i.charAt(0).toUpperCase());
      const d = [
        ["Level", _pick(r, ["br.level", "progress.level", "level"])],
        ["XP", _pick(r, ["xp", "progress.xp", "totalXp"])],
        [
          "Duels",
          _pick(r, ["competitive.rating", "competitive.elo", "br.rating"]),
        ],
        [
          "Pro",
          (() => {
            const e = _pick(r, ["isProUser", "user.isProUser"]);
            return null == e ? null : e ? "Yes" : "No";
          })(),
        ],
        ["Country", l ? String(l).toUpperCase() : null],
        [
          "Member since",
          (() => {
            const e = _pick(r, ["created", "user.created"]);
            return e ? String(e).slice(0, 10) : null;
          })(),
        ],
      ].filter((e) => null != e[1]);
      o &&
        html(
          o,
          d
            .slice(0, 6)
            .map((e, t) => {
              const a = [
                  "var(--orange)",
                  "var(--turq)",
                  "var(--green)",
                  "var(--yellow)",
                  "var(--green)",
                  "var(--red)",
                ][t % 6],
                n = String(e[1]).length > 6;
              return (
                '<div class="stat-card"><span class="stat-label">' +
                _esc(e[0]) +
                '</span><span class="stat-value' +
                (n ? " small" : "") +
                '" style="color:' +
                a +
                '">' +
                _esc(String(e[1])) +
                "</span></div>"
              );
            })
            .join(""),
        );
    }));
}
const _atlasCfg = {
  coordFormat: "decimal",
  coordPrecision: 5,
  autoCopy: !1,
  historyEnabled: !0,
  historyCap: 200,
};
function loadAtlasCfg(e) {
  chrome.storage.local.get(
    [
      "coordFormat",
      "coordPrecision",
      "autoCopyCoords",
      "historyEnabled",
      "historyCap",
    ],
    (t) => {
      ((_atlasCfg.coordFormat = "dms" === t.coordFormat ? "dms" : "decimal"),
        (_atlasCfg.coordPrecision =
          -1 !== [3, 5, 6].indexOf(t.coordPrecision) ? t.coordPrecision : 5),
        (_atlasCfg.autoCopy = !0 === t.autoCopyCoords),
        (_atlasCfg.historyEnabled = !1 !== t.historyEnabled),
        (_atlasCfg.historyCap =
          -1 !== [50, 200, 1e3].indexOf(t.historyCap) ? t.historyCap : 200),
        e && e());
    },
  );
}
function _toDMS(e, t) {
  const a = e < 0 ? (t ? "S" : "W") : t ? "N" : "E",
    n = Math.abs(Number(e)),
    o = Math.floor(n),
    s = 60 * (n - o),
    r = Math.floor(s);
  return o + " " + r + "' " + (60 * (s - r)).toFixed(1) + '" ' + a;
}
function formatCoords(e, t) {
  const a = Number(e),
    n = Number(t);
  return isFinite(a) && isFinite(n)
    ? "dms" === _atlasCfg.coordFormat
      ? _toDMS(a, !0) + ", " + _toDMS(n, !1)
      : a.toFixed(_atlasCfg.coordPrecision) +
        ", " +
        n.toFixed(_atlasCfg.coordPrecision)
    : "";
}
function refreshCoordsDisplay() {
  const e = (e, t) => {
      const a = el$("coords");
      a && txt(a, formatCoords(e, t));
    },
    t = () => {
      const e = el$("history-page");
      e && e.classList.contains("active") && renderHistory();
    };
  if (_lastPainted) return (e(_lastPainted.lat, _lastPainted.lng), void t());
  chrome.storage.local.get(["coords"], (a) => {
    (a.coords &&
      "number" == typeof a.coords.lat &&
      e(a.coords.lat, a.coords.lng),
      t());
  });
}
function _segWire(e, t, a) {
  const n = el$(e);
  n &&
    bind(n, "click", (e) => {
      const o = e.target.closest ? e.target.closest(".seg-btn") : null;
      o &&
        (n
          .querySelectorAll(".seg-btn")
          .forEach((e) => e.classList.remove("active")),
        clsAdd(o, "active"),
        a(o.getAttribute(t)));
    });
}
function _segSelect(e, t, a) {
  const n = el$(e);
  n &&
    n
      .querySelectorAll(".seg-btn")
      .forEach((e) =>
        e.classList.toggle("active", e.getAttribute(t) === String(a)),
      );
}
function applyAccent(e) {
  const t = document.documentElement;
  e
    ? (t.style.setProperty("--orange", e),
      t.style.setProperty("--accent-strong", e),
      t.style.setProperty("--orange-lt", e),
      t.style.setProperty("--orange-dim", e))
    : ["--orange", "--accent-strong", "--orange-lt", "--orange-dim"].forEach(
        (e) => t.style.removeProperty(e),
      );
}
function applyAppearance() {
  chrome.storage.local.get(["density", "textSize", "accentColor"], (e) => {
    const t = document.documentElement;
    ("compact" === e.density
      ? setAttr(t, "data-density", "compact")
      : t.removeAttribute("data-density"),
      "small" === e.textSize || "large" === e.textSize
        ? setAttr(t, "data-size", e.textSize)
        : t.removeAttribute("data-size"),
      e.accentColor && applyAccent(e.accentColor),
      _segSelect("seg-density", "data-density", e.density || "comfortable"),
      _segSelect("seg-textsize", "data-size", e.textSize || "normal"));
    const a = el$("accent-color");
    a && e.accentColor && (a.value = e.accentColor);
  });
}
function initAppearance() {
  (applyAppearance(),
    _segWire("seg-density", "data-density", (e) => {
      const t = document.documentElement;
      ("compact" === e
        ? setAttr(t, "data-density", "compact")
        : t.removeAttribute("data-density"),
        chrome.storage.local.set({ density: e }));
    }),
    _segWire("seg-textsize", "data-size", (e) => {
      const t = document.documentElement;
      ("small" === e || "large" === e
        ? setAttr(t, "data-size", e)
        : t.removeAttribute("data-size"),
        chrome.storage.local.set({ textSize: e }));
    }));
  const e = el$("accent-color");
  e &&
    bind(e, "input", () => {
      (applyAccent(e.value),
        chrome.storage.local.set({ accentColor: e.value }));
    });
  const t = el$("accent-reset");
  t &&
    bind(t, "click", () => {
      (applyAccent(""),
        chrome.storage.local.set({ accentColor: "" }),
        e && (e.value = "#FF6600"));
    });
}
function initCoordinates() {
  (_segSelect("seg-coordfmt", "data-fmt", _atlasCfg.coordFormat),
    _segSelect("seg-precision", "data-prec", _atlasCfg.coordPrecision));
  const e = el$("auto-copy-toggle");
  (e && (e.checked = _atlasCfg.autoCopy),
    _segWire("seg-coordfmt", "data-fmt", (e) => {
      ((_atlasCfg.coordFormat = e),
        chrome.storage.local.set({ coordFormat: e }),
        refreshCoordsDisplay());
    }),
    _segWire("seg-precision", "data-prec", (e) => {
      ((_atlasCfg.coordPrecision = parseInt(e, 10)),
        chrome.storage.local.set({ coordPrecision: parseInt(e, 10) }),
        refreshCoordsDisplay());
    }),
    e &&
      bind(e, "change", () => {
        ((_atlasCfg.autoCopy = e.checked),
          chrome.storage.local.set({ autoCopyCoords: e.checked }));
      }));
}
function _download(e, t, a) {
  try {
    const n = new Blob([t], { type: a }),
      o = URL.createObjectURL(n),
      s = document.createElement("a");
    ((s.href = o),
      (s.download = e),
      document.body.appendChild(s),
      s.click(),
      document.body.removeChild(s),
      setTimeout(() => URL.revokeObjectURL(o), 2e3));
  } catch (e) {}
}
function initDataPrivacy() {
  const e = el$("history-toggle");
  (e && (e.checked = _atlasCfg.historyEnabled),
    _segSelect("seg-retention", "data-keep", _atlasCfg.historyCap),
    e &&
      bind(e, "change", () => {
        ((_atlasCfg.historyEnabled = e.checked),
          chrome.storage.local.set({ historyEnabled: e.checked }));
      }));
  const t = el$("avatar-sync-toggle");
  (t &&
    (chrome.storage.local.get(["avatarSync"], (e) => {
      t.checked = !1 !== e.avatarSync;
    }),
    bind(t, "change", () =>
      chrome.storage.local.set({ avatarSync: t.checked }),
    )),
    _segWire("seg-retention", "data-keep", (e) => {
      const t = parseInt(e, 10);
      ((_atlasCfg.historyCap = t),
        chrome.storage.local.set({ historyCap: t }),
        chrome.storage.local.get([ATLAS_HISTORY_KEY], (e) => {
          const a = Array.isArray(e[ATLAS_HISTORY_KEY])
            ? e[ATLAS_HISTORY_KEY]
            : [];
          for (; a.length > t;) a.shift();
          chrome.storage.local.set({ [ATLAS_HISTORY_KEY]: a });
          const n = el$("stats-page"),
            o = el$("history-page");
          (n && n.classList.contains("active") && renderStats(),
            o && o.classList.contains("active") && renderHistory());
        }));
    }));
  const a = el$("export-json");
  a &&
    bind(a, "click", () => {
      _loadHistory((e) =>
        _download(
          "atlas-history.json",
          JSON.stringify(e, null, 2),
          "application/json",
        ),
      );
    });
  const n = el$("export-csv");
  n &&
    bind(n, "click", () => {
      _loadHistory((e) => {
        const t = [["time", "lat", "lng", "location", "country"]];
        (e.forEach((e) =>
          t.push([
            new Date(e.t).toISOString(),
            e.lat,
            e.lng,
            '"' + String(e.loc || "").replace(/"/g, '""') + '"',
            '"' + String(e.country || "").replace(/"/g, '""') + '"',
          ]),
        ),
          _download(
            "atlas-history.csv",
            t.map((e) => e.join(",")).join("\n"),
            "text/csv",
          ));
      });
    });
  const o = el$("clear-data");
  o && bind(o, "click", () => clearHistory());
}
function initAccess() {
  chrome.storage.local.get(
    ["showLauncher", "platformGG", "platformOG"],
    (e) => {
      const t = el$("launcher-toggle");
      t && (t.checked = !0 === e.showLauncher);
      const a = el$("platform-gg");
      a && (a.checked = !1 !== e.platformGG);
      const n = el$("platform-og");
      n && (n.checked = !1 !== e.platformOG);
    },
  );
  const e = el$("launcher-toggle");
  e &&
    bind(e, "change", () =>
      chrome.storage.local.set({ showLauncher: e.checked }),
    );
  const t = el$("platform-gg");
  t &&
    bind(t, "change", () =>
      chrome.storage.local.set({ platformGG: t.checked }),
    );
  const a = el$("platform-og");
  a &&
    bind(a, "change", () =>
      chrome.storage.local.set({ platformOG: a.checked }),
    );
  const n = el$("shortcut-btn");
  n &&
    bind(n, "click", () => {
      try {
        chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
      } catch (e) {}
    });
}
function _planLabel(e) {
  return e ? (e.charAt(0).toUpperCase() + e.slice(1)).replace(/_/g, " ") : "";
}
let _badgeKeyPlan = null,
  _badgeKeyValid = !1,
  _badgeUsage = null;
function _modeBadgeLabel(e, t, a) {
  if (t && e) return _planLabel(e) + " Mode";
  const n = a && a.planType ? String(a.planType) : "";
  if (n && "free" !== n) return _planLabel(n) + " Mode";
  const o = a ? a.limit : void 0;
  return 999999 === o || -1 === o ? "Pro Mode" : "Free Mode";
}
function _modeBadgeIsPaid(e, t, a) {
  return "Free Mode" !== _modeBadgeLabel(e, t, a);
}
function _paintModeBadge() {
  const e = el$("usage-mode-badge");
  e &&
    (txt(e, _modeBadgeLabel(_badgeKeyPlan, _badgeKeyValid, _badgeUsage)),
    cls(
      e,
      "is-pro",
      _modeBadgeIsPaid(_badgeKeyPlan, _badgeKeyValid, _badgeUsage),
    ));
}
function _setPlanUI(e, a) {
  const n = el$("key-status");
  ((_badgeKeyPlan = e || null),
    (_badgeKeyValid = !!a),
    _paintModeBadge(),
    n &&
      a &&
      (txt(n, t("panel_ui_activated") + " " + _planLabel(e) + " plan"),
      (n.className = "field-status ok")),
    _applyAccountLayout(!!a));
}
function _maskKey(e) {
  const t = String(e || "")
    .trim()
    .split("-");
  return t.length <= 2
    ? String(e || "")
    : t.map((e, t) => (t <= 1 ? e : "••••")).join("-");
}
function _applyAccountLayout(e) {
  const t = q$(".key-activate-row"),
    a = q$(".acct-key-actions"),
    n = el$("key-display"),
    o = el$("acct-key-text"),
    s = el$("get-key-btn"),
    r = q$(".acct-google-hint"),
    i = el$("promo-discord"),
    l = el$("key-status");
  chrome.storage.local.get(["atlasKey"], (c) => {
    const d = ((c && c.atlasKey) || "").trim(),
      u = e && !!d;
    (t && disp(t, u ? "none" : "flex"),
      a && disp(a, u ? "flex" : "none"),
      n && disp(n, u ? "flex" : "none"),
      u && o && txt(o, _maskKey(d)),
      s && disp(s, u ? "none" : "block"),
      r && disp(r, u ? "none" : "block"),
      i && disp(i, u ? "none" : "flex"),
      u && l && (txt(l, ""), (l.className = "field-status")));
  });
}
function _refreshUsageAfterKeyChange() {
  try {
    (invalidateUsageCache(), loadUsageInformation("local-user"));
  } catch (e) {}
}
const KEY_OFFLINE_GRACE_MS = 6048e5;
function _keyStateFromResponse(e, t, a) {
  const n = "number" == typeof a ? a : Date.now();
  if (e && e.valid) return { state: "valid", msg: "" };
  const o = e && e.error,
    s = e && e.__status;
  if (!(
    !e ||
    "network" === o ||
    "signature" === o ||
    "parse" === o ||
    ("number" == typeof s && (429 === s || s >= 500))
  )) {
    return {
      state: "invalid",
      msg: (o && String(o)) || "This key was refused.",
    };
  }
  return ("number" == typeof t && t > 0 ? n - t : 1 / 0) > 6048e5
    ? {
        state: "stale",
        msg: "Could not reach the licence server for over a week. Open the panel while online, or re-enter your key.",
      }
    : {
        state: "unknown",
        msg: "Could not check your key just now. Your plan is unchanged.",
      };
}
function _setKeyInvalidUI(e) {
  ((_badgeKeyValid = !1), _paintModeBadge());
  const t = el$("key-status");
  (t && e && (txt(t, e), (t.className = "field-status err")),
    _applyAccountLayout(!1));
}
function _revalidateStoredKey() {
  chrome.storage.local.get(["atlasKey", "atlasValidatedAt"], (e) => {
    const t = (e.atlasKey || "").trim();
    if (!t) return;
    const a = Number(e.atlasValidatedAt || 0);
    chrome.runtime.sendMessage({ action: "validateKey", key: t }, (e) => {
      const t = chrome.runtime.lastError ? null : e,
        n = _keyStateFromResponse(t, a, Date.now());
      if ("valid" === n.state) _setPlanUI(t.plan, !0);
      else {
        if ("unknown" === n.state) return void _setKeyCheckPending(n.msg);
        _setKeyInvalidUI(n.msg);
      }
      _refreshUsageAfterKeyChange();
    });
  });
}
function _setKeyCheckPending(e) {
  const t = el$("key-status");
  t && e && (txt(t, e), (t.className = "field-status"));
}
function _confirmAccountLink(e, t) {
  chrome.storage.local.get(["atlasAccountEmail"], (a) => {
    const n = a && a.atlasAccountEmail;
    if (!n) return;
    t &&
      ((t.textContent = "Key activated. Linking to your account..."),
      (t.className = "field-status"));
    let o = 0;
    const s = () =>
      chrome.storage.local.get(["atlasLinkedKey"], (a) => {
        a && a.atlasLinkedKey === e
          ? t &&
            ((t.textContent = "Key linked to " + n + "."),
            (t.className = "field-status ok"))
          : ++o < 6
            ? setTimeout(s, 700)
            : t &&
              ((t.textContent = "Key activated."),
              (t.className = "field-status ok"));
      });
    setTimeout(s, 700);
  });
}
function initKeyActivation() {
  const e = el$("key-input"),
    t = el$("key-activate-btn"),
    a = el$("key-status");
  chrome.storage.local.get(["atlasKey", "atlasPlan", "atlasKeyValid"], (t) => {
    (e && t.atlasKey && (e.value = t.atlasKey),
      t.atlasKeyValid && t.atlasPlan
        ? _setPlanUI(t.atlasPlan, !0)
        : _setPlanUI(null, !1),
      _revalidateStoredKey());
  });
  const n = el$("acct-key-copy");
  (n &&
    bind(n, "click", () => {
      chrome.storage.local.get(["atlasKey"], (e) => {
        const t = ((e && e.atlasKey) || "").trim();
        if (t) {
          try {
            navigator.clipboard.writeText(t);
          } catch (e) {}
          (n.classList.add("copied"),
            setTimeout(() => n.classList.remove("copied"), 1200));
        }
      });
    }),
    initGoogleAccount(),
    t &&
      bind(t, "click", () => {
        const n = ((e && e.value) || "").trim();
        n
          ? (a &&
              ((a.textContent = "Activating..."),
              (a.className = "field-status")),
            (t.disabled = !0),
            chrome.storage.local.get(["atlasValidatedAt"], (e) => {
              const o = Number((e && e.atlasValidatedAt) || 0);
              chrome.runtime.sendMessage(
                { action: "validateKey", key: n },
                (e) => {
                  t.disabled = !1;
                  const s = chrome.runtime.lastError ? null : e,
                    r = _keyStateFromResponse(s, o, Date.now());
                  if ("valid" === r.state)
                    (_setPlanUI(s.plan, !0), _confirmAccountLink(n, a));
                  else {
                    if ("unknown" === r.state)
                      return void (
                        a && (txt(a, r.msg), (a.className = "field-status"))
                      );
                    _setKeyInvalidUI(r.msg);
                  }
                  _refreshUsageAfterKeyChange();
                },
              );
            }))
          : a &&
            ((a.textContent = "Enter your key first"),
            (a.className = "field-status err"));
      }));
}
function _renderAccountIdentity(e) {
  const t = el$("account-identity"),
    a = el$("google-signin-row"),
    n = el$("google-status");
  if (e) {
    const o = el$("account-avatar"),
      s = el$("account-identity-email");
    (o && txt(o, String(e).trim()[0] || "A"),
      s && txt(s, e),
      t && disp(t, "flex"),
      a && disp(a, "none"),
      n && (txt(n, ""), (n.className = "field-status")));
  } else (t && disp(t, "none"), a && disp(a, "block"));
}
function initGoogleAccount() {
  const e = el$("google-signin-btn"),
    a = el$("google-status");
  e &&
    (chrome.storage.local.get(["atlasAccountEmail"], (e) => {
      _renderAccountIdentity(e && e.atlasAccountEmail);
    }),
    bind(e, "click", () => {
      (a &&
        (txt(a, t("panel_status_opening_google_sign_in")),
        (a.className = "field-status")),
        (e.disabled = !0),
        chrome.runtime.sendMessage({ action: "googleSignIn" }, (t) => {
          if (((e.disabled = !1), chrome.runtime.lastError || !t || !t.ok)) {
            const e = (t && t.detail) || (t && t.error) || "Sign-in failed";
            return void (
              a &&
              (txt(
                a,
                /cancel/i.test(String(e))
                  ? "Sign-in cancelled."
                  : "Sign-in failed. Try again.",
              ),
              (a.className = "field-status err"))
            );
          }
          let n;
          if (
            (_renderAccountIdentity(t.email || "your account"),
            "linked" === t.claim)
          )
            n = "Key linked to your account.";
          else if ("already" === t.claim)
            n = "Your account already has an active license.";
          else if ("restored" === t.claim) {
            n = "License restored from your account.";
            try {
              chrome.storage.local.get(["atlasKey", "atlasPlan"], (e) => {
                const t = el$("key-input");
                (t && e.atlasKey && (t.value = e.atlasKey),
                  e.atlasPlan && _setPlanUI(e.atlasPlan, !0));
              });
            } catch (e) {}
          } else
            n =
              "nokey" === t.claim
                ? "You've unlocked 7 free extra guesses."
                : "Signed in. Key could not be linked automatically.";
          a &&
            (txt(a, n),
            (a.className =
              "field-status " + ("claim_failed" === t.claim ? "err" : "ok")));
          try {
            _refreshUsageAfterKeyChange();
          } catch (e) {}
        }));
    }));
}
function initPromoRedeem() {
  const e = el$("promo-input"),
    a = el$("promo-redeem-btn"),
    n = el$("promo-status");
  if (!a) return;
  const o = /^PROMO-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/;
  bind(a, "click", () => {
    const s = ((e && e.value) || "").trim().toUpperCase();
    s
      ? o.test(s)
        ? (n &&
            (txt(n, t("panel_status_redeeming")),
            (n.className = "field-status")),
          (a.disabled = !0),
          chrome.runtime.sendMessage(
            { action: "redeemPromo", code: s },
            (o) => {
              if (((a.disabled = !1), chrome.runtime.lastError || !o))
                return void (
                  n &&
                  (txt(n, t("panel_status_could_not_reach_the_server_try")),
                  (n.className = "field-status err"))
                );
              if (o.ok) {
                const a =
                  "number" == typeof o.remaining ? o.remaining : o.rounds;
                return (
                  n &&
                    (txt(
                      n,
                      t("panel_status_code_accepted_1_rounds_left", [
                        String(a),
                      ]),
                    ),
                    (n.className = "field-status ok")),
                  e && (e.value = ""),
                  void _refreshUsageAfterKeyChange()
                );
              }
              const s = {
                format: "panel_status_that_does_not_look_like_a",
                network: "panel_status_could_not_reach_the_server_try",
              }[o.reason];
              let r;
              ((r = s
                ? t(s)
                : 404 === o.status
                  ? t("panel_status_that_code_does_not_exist")
                  : 409 === o.status
                    ? t("panel_status_that_code_is_already_used_on")
                    : 410 === o.status
                      ? t("panel_status_that_code_has_expired")
                      : 429 === o.status
                        ? t("panel_status_too_many_tries_wait_an_hour")
                        : t("panel_status_that_code_was_refused")),
                n && (txt(n, r), (n.className = "field-status err")));
            },
          ))
        : n &&
          (txt(n, t("panel_status_that_does_not_look_like_a")),
          (n.className = "field-status err"))
      : n &&
        (txt(n, t("panel_status_enter_your_code_first")),
        (n.className = "field-status err"));
  });
}
function initSettings() {
  (loadAtlasCfg(() => {
    (initCoordinates(), initDataPrivacy());
  }),
    initAppearance(),
    initAccess(),
    initKeyActivation(),
    initPromoRedeem());
}
var LEARN_QUICKID = [
    ["Driving side", "left vs right halves the map instantly"],
    ["Script / alphabet", "Latin, Cyrillic, Thai, Arabic, special characters"],
    ["Road-line colour", "yellow centre (Americas, Japan) vs white (Europe)"],
    ["Bollards", "roadside post design is standardised per country"],
    ["License-plate colour", "blue EU strip, yellow rear, plate shape"],
    ["Vegetation and soil", "red soil, arid scrub, lush tropical"],
    ["Utility poles", "shape and colour pattern narrow the region"],
    ["Signs and language", "warning-sign borders and text confirm it"],
  ],
  LEARN_CATS = [
    {
      key: "driving",
      title: "Driving side",
      tier: "Beginner",
      time: "2 min",
      note: "Which side traffic drives on is the fastest first cut: it roughly halves the candidate map. Read it from oncoming cars, the Google car, or which side parked cars face.",
      ex: [
        {
          c: "Left",
          clue: "UK, Ireland, Japan, Australia, India, South Africa, Thailand, Indonesia",
        },
        {
          c: "Right",
          clue: "US, most of Europe, Brazil, China, Russia, all of continental Americas except a few",
        },
      ],
    },
    {
      key: "bollards",
      title: "Bollards (roadside posts)",
      tier: "Beginner",
      time: "4 min",
      note: "Delineator posts are government-standardised, so their shape and reflector layout is one of the single most reliable learnable clues. Focus on the top shape and the reflector band.",
      ex: [
        {
          c: "France",
          clue: "Rounded concrete post with a red reflector band near the top",
        },
        { c: "Netherlands", clue: "White post with a small red or grey top" },
        { c: "Poland", clue: "Flat single-face white post" },
        { c: "Denmark", clue: "Wrap-around reflectors" },
      ],
    },
    {
      key: "poles",
      title: "Utility / power poles",
      tier: "Advanced",
      time: "5 min",
      note: "Pole material, cross-section and insulator layout vary sharply by country. A strong disambiguator once you know a few signatures.",
      ex: [
        { c: "Mexico", clue: "Octagonal concrete poles (also Colombia)" },
        {
          c: "South Korea",
          clue: "Yellow-and-black striped poles (also Japan, Taiwan)",
        },
        { c: "Brazil", clue: "Poles with a ladder-like base" },
        { c: "Uruguay", clue: "Trident three-bulb streetlights" },
      ],
    },
    {
      key: "roadlines",
      title: "Road lines and markings",
      tier: "Beginner",
      time: "3 min",
      note: "The centre-line colour is a quick regional filter, and missing markings tell you a lot too.",
      ex: [
        {
          c: "Yellow centre line",
          clue: "The Americas plus Japan and South Korea",
        },
        {
          c: "White centre line",
          clue: "Most of Europe, Oceania, much of Asia",
        },
        {
          c: "No or patchy lines",
          clue: "Rural Eastern Europe, Central Asia, much of Africa",
        },
      ],
    },
    {
      key: "camera",
      title: "Camera and car meta",
      tier: "Advanced",
      time: "6 min",
      note: "The Street View camera generation and the Google car itself leak the country. Look at image quality, the sky, and any part of the car you can see.",
      ex: [
        {
          c: "Gen 1 (low quality)",
          clue: "Only the US, Australia and New Zealand",
        },
        {
          c: "Gen 2 (sun halo)",
          clue: "A bright halo around the sun plus purple blur under the car",
        },
        {
          c: "Car cues",
          clue: "Snorkel, roof rack or antenna, for example a black snorkel SUV plus red soil suggests Kenya",
        },
      ],
    },
    {
      key: "plates",
      title: "License plates",
      tier: "Beginner",
      time: "3 min",
      note: "Even blurred, the plate colour, shape and any coloured strip narrow the region.",
      ex: [
        { c: "Blue strip on the left", clue: "European Union countries" },
        {
          c: "Yellow rear plate",
          clue: "Netherlands, Luxembourg, United Kingdom",
        },
        {
          c: "Square plate",
          clue: "North America, versus the long narrow European shape",
        },
      ],
    },
    {
      key: "script",
      title: "Script and language",
      tier: "Beginner",
      time: "4 min",
      note: "The alphabet and special characters on signs and shops pin down the region fast.",
      ex: [
        { c: "Cyrillic", clue: "Russia, Bulgaria, Serbia, Ukraine" },
        { c: "Special chars o with slash, ae", clue: "Norway and Denmark" },
        {
          c: "Special chars a-ring, a-umlaut, o-umlaut",
          clue: "Sweden and Finland",
        },
        {
          c: "Thai, Khmer, Lao scripts",
          clue: "Distinguish the Southeast Asian neighbours",
        },
      ],
    },
    {
      key: "signs",
      title: "Warning and directional signs",
      tier: "Advanced",
      time: "5 min",
      note: "Sign shape, border thickness and background colour are standardised per country and separate very similar-looking neighbours.",
      ex: [
        {
          c: "Nordic warning signs",
          clue: "Border thickness and background colour tell the four Nordics apart",
        },
        {
          c: "Directional-sign colour",
          clue: "Blue vs green vs white varies by country",
        },
      ],
    },
    {
      key: "vegetation",
      title: "Vegetation, climate and soil",
      tier: "Intermediate",
      time: "3 min",
      note: "A weak clue on its own, best combined with road width and plates, but soil colour and plant type quickly rule regions in or out.",
      ex: [
        { c: "Red soil", clue: "Kenya, parts of Australia and Brazil" },
        { c: "Arid scrub", clue: "Interior Australia, southern Africa" },
        { c: "Lush tropical", clue: "Southeast Asia, equatorial Africa" },
      ],
    },
    {
      key: "sun",
      title: "Sun and hemisphere",
      tier: "Intermediate",
      time: "2 min",
      note: "The sun position gives the hemisphere. Use the in-game compass to read it. Unreliable near the equator.",
      ex: [
        { c: "Sun in the south", clue: "Northern hemisphere" },
        { c: "Sun in the north", clue: "Southern hemisphere" },
      ],
    },
    {
      key: "roadnames",
      title: "Road names and numbers",
      tier: "Advanced",
      time: "5 min",
      note: "Street-name suffixes and route-number shields are near-unique identifiers where visible.",
      ex: [
        { c: "Suffix iela", clue: "Latvia" },
        { c: "Suffix g.", clue: "Lithuania" },
        { c: "Suffix -tee", clue: "Estonia" },
        { c: "US highway shields", clue: "Near-unique per state" },
      ],
    },
    {
      key: "architecture",
      title: "Architecture and infrastructure",
      tier: "Advanced",
      time: "4 min",
      note: "Guardrails, traffic-signal mounting and petrol-station branding act as regional confirmers layered on the primary clues.",
      ex: [
        { c: "YPF stations", clue: "Argentina" },
        { c: "Orlen stations", clue: "Poland" },
        {
          c: "Signal mounting",
          clue: "Horizontal vs vertical varies by country",
        },
      ],
    },
  ],
  LEARN_CLUSTERS = [
    {
      title: "The Nordics",
      sub: "Norway, Sweden, Denmark, Finland",
      note: "They look alike but their signs and special characters differ.",
      rows: [
        {
          c: "Norway",
          tell: "o-with-slash and ae characters, wide red warning-sign border, mountainous",
        },
        {
          c: "Sweden",
          tell: "a-ring, a-umlaut, o-umlaut, yellow-and-blue accents",
        },
        { c: "Denmark", tell: "Flat farmland, wrap-around bollard reflectors" },
        {
          c: "Finland",
          tell: "Dense forest, bilingual Finnish and Swedish signs",
        },
      ],
    },
    {
      title: "The Baltics",
      sub: "Estonia, Latvia, Lithuania",
      note: "Street-name suffixes are the cleanest separator.",
      rows: [
        { c: "Estonia", tell: "Road names ending -tee, Estonian language" },
        { c: "Latvia", tell: "Road names ending iela" },
        { c: "Lithuania", tell: "Road names ending g., special characters" },
      ],
    },
    {
      title: "Southern Cone",
      sub: "Brazil, Argentina, Uruguay",
      note: "Poles and road lines split these South American neighbours.",
      rows: [
        {
          c: "Brazil",
          tell: "Ladder-base poles, yellow centre lines, Portuguese",
        },
        {
          c: "Argentina",
          tell: "YPF petrol stations, Spanish, red-dirt roads inland",
        },
        {
          c: "Uruguay",
          tell: "Trident three-bulb streetlights, distinctive triple road line",
        },
      ],
    },
    {
      title: "Southeast Asia",
      sub: "Thailand, Cambodia, Laos, Vietnam",
      note: "Script and driving side are the fastest tells.",
      rows: [
        { c: "Thailand", tell: "Thai script, drives on the left" },
        { c: "Cambodia", tell: "Khmer script, drives on the right" },
        { c: "Laos", tell: "Lao script, drives on the right" },
        { c: "Vietnam", tell: "Latin script with tone marks, many scooters" },
      ],
    },
    {
      title: "US states",
      sub: "a sub-taxonomy of its own",
      note: "Country ID is easy in the US, state ID needs different clues.",
      rows: [
        {
          c: "Highway shields",
          tell: "State route shields are near-unique per state",
        },
        {
          c: "Plates",
          tell: "Front-plate requirement and colours vary by state",
        },
        { c: "Vegetation", tell: "Arid west vs green east vs southern pines" },
      ],
    },
  ],
  LEARN_COUNTRY_TIPS = {
    France: "Rounded concrete bollards with a red reflector band.",
    "United Kingdom":
      "Drives on the left, yellow rear plates, double yellow kerb lines.",
    Japan: "Drives on the left, yellow-black poles, blue-on-white road names.",
    Australia: "Drives on the left, Gen 1 or Gen 4 camera, red soil inland.",
    Brazil: "Ladder-base poles, yellow centre lines, Portuguese signage.",
    "United States of America":
      "Square plates, state highway shields, yellow centre lines.",
    Russia: "Cyrillic script, wide roads, often patchy markings.",
    Kenya: "Red soil, Gen 2 sun halo, black snorkel car.",
    Mexico: "Octagonal concrete poles, topes speed bumps, Spanish.",
    "South Korea": "Yellow-and-black striped poles, Hangul script.",
    Uruguay: "Trident three-bulb streetlights, triple road line.",
    Argentina: "YPF petrol stations, Spanish, red-dirt rural roads.",
    Norway: "o-with-slash and ae characters, wide red sign borders, fjords.",
    Sweden: "a-ring and umlaut characters, yellow-blue accents.",
    Denmark: "Flat farmland, wrap-around bollard reflectors.",
    Finland: "Forest everywhere, bilingual Finnish and Swedish signs.",
    Estonia: "Road names ending -tee.",
    Latvia: "Road names ending iela.",
    Lithuania: "Road names ending g.",
    Poland: "Flat single-face bollards, Orlen stations, Polish.",
    Netherlands: "Yellow plates, many bikes, white bollards with red top.",
    Thailand: "Thai script, drives on the left.",
    Canada: "Bilingual or French signs in Quebec, maple context, yellow lines.",
    Spain: "Kilometre posts, Spanish, EU plates.",
    Italy: "Narrow roads, Italian, EU plates.",
    Germany: "Autobahn, German, EU plates, orderly signage.",
    Indonesia: "Drives on the left, tropical, Indonesian language.",
    "South Africa":
      "Drives on the left, red or yellow soil, English and Afrikaans.",
  },
  LEARN_QUIZ = [
    { clue: "Octagonal concrete utility poles", a: "Mexico" },
    { clue: "Yellow-and-black striped utility poles", a: "South Korea" },
    { clue: "Trident three-bulb streetlights", a: "Uruguay" },
    { clue: "Rounded concrete bollard with a red reflector band", a: "France" },
    { clue: "Cyrillic script on the road signs", a: "Russia" },
    { clue: "Red soil, sun halo and a black snorkel car", a: "Kenya" },
    { clue: "Road names ending in iela", a: "Latvia" },
    { clue: "Road names ending in g.", a: "Lithuania" },
    { clue: "Road names ending in -tee", a: "Estonia" },
    { clue: "YPF petrol stations", a: "Argentina" },
    { clue: "Ladder-base poles and Portuguese signage", a: "Brazil" },
    {
      clue: "Yellow rear license plate and drives on the left",
      a: "United Kingdom",
    },
    { clue: "o-with-slash and ae special characters", a: "Norway" },
    { clue: "Yellow license plates and lots of bicycles", a: "Netherlands" },
    { clue: "Thai script, drives on the left", a: "Thailand" },
    { clue: "Hangul script and striped poles", a: "South Korea" },
    { clue: "Bilingual French signs (in one province)", a: "Canada" },
    { clue: "Topes speed bumps and octagonal poles", a: "Mexico" },
    { clue: "State highway shields on the roads", a: "United States" },
    { clue: "Fjords and wide red warning-sign borders", a: "Norway" },
  ],
  LEARN_RESOURCES = [
    {
      l: "Plonk It",
      u: "https://www.plonkit.net/guide",
      n: "the gold-standard per-country guide",
    },
    { l: "GeoHints", u: "https://geohints.com/", n: "per clue-type reference" },
    {
      l: "Geometas",
      u: "https://geometas.com/",
      n: "categories, regions and quizzes",
    },
    { l: "GeoTips", u: "https://geotips.net/", n: "free guide by top players" },
    { l: "Geomastr", u: "https://geomastr.com/", n: "per-country clue cards" },
    {
      l: "A Learnable Meta",
      u: "https://learnablemeta.com/",
      n: "learn by playing",
    },
    {
      l: "Rainbolt (YouTube)",
      u: "https://www.youtube.com/@georainbolt",
      n: "the famous teacher",
    },
    {
      l: "zi8gzag (YouTube)",
      u: "https://www.youtube.com/channel/UCqcxR9B59H4DT1e6hg1Smiw",
      n: "bite-size lessons",
    },
    {
      l: "WIRED: every trick a pro uses",
      u: "https://www.youtube.com/watch?v=0p5Eb4OSZCs",
      n: "video primer",
    },
    {
      l: "Cheatography quick sheet",
      u: "https://cheatography.com/davechild/cheat-sheets/geoguessr-country-identification/",
      n: "printable cheat sheet",
    },
  ];
function _learnShow(e) {
  (disp(el$("learn-guide"), "guide" === e ? "block" : "none"),
    disp(el$("learn-practice"), "practice" === e ? "block" : "none"),
    disp(el$("learn-detail"), "detail" === e ? "block" : "none"));
}
function _learnDetailCat(e) {
  let t = '<div class="detail-title">' + _esc(e.title) + "</div>";
  ((t += '<div class="detail-note">' + _esc(e.note) + "</div>"),
    (t +=
      '<div class="detail-ex">' +
      e.ex
        .map(
          (e) =>
            '<div class="detail-ex-row"><div class="dx-c">' +
            _esc(e.c) +
            '</div><div class="dx-clue">' +
            _esc(e.clue) +
            "</div></div>",
        )
        .join("") +
      "</div>"),
    html(el$("learn-detail-body"), t),
    _learnShow("detail"));
}
function _learnDetailCluster(e) {
  let t = '<div class="detail-title">' + _esc(e.title) + "</div>";
  ((t += '<div class="detail-note">' + _esc(e.note) + "</div>"),
    (t +=
      '<div class="detail-ex">' +
      e.rows
        .map(
          (e) =>
            '<div class="detail-ex-row"><div class="dx-c">' +
            _esc(e.c) +
            '</div><div class="dx-clue">' +
            _esc(e.tell) +
            "</div></div>",
        )
        .join("") +
      "</div>"),
    html(el$("learn-detail-body"), t),
    _learnShow("detail"));
}
let _learnBuilt = !1;
function buildLearn() {
  if (_learnBuilt) return;
  ((_learnBuilt = !0),
    html(
      el$("learn-quickid"),
      LEARN_QUICKID.map(
        (e) =>
          "<li><strong>" + _esc(e[0]) + "</strong>: " + _esc(e[1]) + "</li>",
      ).join(""),
    ));
  const e = el$("learn-cats");
  (html(
    e,
    LEARN_CATS.map(
      (e, t) =>
        '<button class="learn-cat" data-cat="' +
        t +
        '" type="button"><span class="lc-title">' +
        _esc(e.title) +
        '</span><span class="lc-tier">' +
        _esc(e.tier) +
        " . " +
        _esc(e.time) +
        "</span></button>",
    ).join(""),
  ),
    bind(e, "click", (e) => {
      const t = e.target.closest ? e.target.closest(".learn-cat") : null;
      t &&
        _learnDetailCat(LEARN_CATS[parseInt(t.getAttribute("data-cat"), 10)]);
    }));
  const t = el$("learn-clusters");
  (html(
    t,
    LEARN_CLUSTERS.map(
      (e, t) =>
        '<button class="learn-row" data-cl="' +
        t +
        '" type="button"><span class="lr-title">' +
        _esc(e.title) +
        '</span><span class="lr-sub">' +
        _esc(e.sub) +
        "</span></button>",
    ).join(""),
  ),
    bind(t, "click", (e) => {
      const t = e.target.closest ? e.target.closest(".learn-row") : null;
      t &&
        _learnDetailCluster(
          LEARN_CLUSTERS[parseInt(t.getAttribute("data-cl"), 10)],
        );
    }),
    html(
      el$("learn-resources"),
      LEARN_RESOURCES.map(
        (e) =>
          '<a href="' +
          _esc(e.u) +
          '" target="_blank" rel="noopener">' +
          _esc(e.l) +
          ' <span class="ll-note">' +
          _esc(e.n) +
          "</span></a>",
      ).join(""),
    ));
  const a = el$("learn-mode");
  (a &&
    bind(a, "click", (e) => {
      const t = e.target.closest ? e.target.closest(".seg-btn") : null;
      t &&
        (a
          .querySelectorAll(".seg-btn")
          .forEach((e) => e.classList.remove("active")),
        clsAdd(t, "active"),
        "practice" === t.getAttribute("data-mode")
          ? (_learnShow("practice"), quizNext())
          : _learnShow("guide"));
    }),
    bind(el$("learn-back"), "click", () => _learnShow("guide")),
    bind(el$("quiz-next"), "click", quizNext));
}
function renderLearnSeen() {
  _loadHistory((e) => {
    const t = {};
    e.forEach((e) => {
      e.country && (t[e.country] = !0);
    });
    const a = Object.keys(t),
      n = el$("learn-seen"),
      o = el$("learn-seen-card");
    a.length
      ? (o && disp(o, ""),
        html(
          n,
          a
            .slice(0, 40)
            .map((e) => {
              const t = LEARN_COUNTRY_TIPS[e],
                a = t ? _esc(t) : "See Plonk It for this country.";
              return (
                '<a class="learn-row" style="text-decoration:none" href="https://www.plonkit.net/guide" target="_blank" rel="noopener"><span class="lr-title">' +
                _esc(e) +
                '</span><span class="lr-sub">' +
                a +
                "</span></a>"
              );
            })
            .join(""),
        ))
      : o && disp(o, "none");
  });
}
function renderLearn() {
  (buildLearn(), renderLearnSeen());
  const e = q$("#learn-mode .seg-btn.active");
  e && "practice" === e.getAttribute("data-mode")
    ? _learnShow("practice")
    : _learnShow("guide");
}
let _quizScore = 0,
  _quizTotal = 0;
function _quizPool() {
  const e = {};
  return (
    LEARN_QUIZ.forEach((t) => {
      e[t.a] = !0;
    }),
    Object.keys(e)
  );
}
function _shuffle(e) {
  for (let t = e.length - 1; t > 0; t--) {
    const a = Math.floor(Math.random() * (t + 1)),
      n = e[t];
    ((e[t] = e[a]), (e[a] = n));
  }
  return e;
}
function quizNext() {
  const e = LEARN_QUIZ[Math.floor(Math.random() * LEARN_QUIZ.length)],
    t = _shuffle(_quizPool().filter((t) => t !== e.a)).slice(0, 3),
    a = _shuffle(t.concat([e.a]));
  (txt(el$("quiz-clue"), e.clue),
    txt(el$("quiz-feedback"), ""),
    disp(el$("quiz-next"), "none"));
  const n = el$("quiz-options");
  (html(
    n,
    a
      .map(
        (e) =>
          '<button class="quiz-opt" type="button">' + _esc(e) + "</button>",
      )
      .join(""),
  ),
    n.querySelectorAll(".quiz-opt").forEach((t) => {
      bind(t, "click", () => {
        const a = t.textContent;
        (_quizTotal++,
          n.querySelectorAll(".quiz-opt").forEach((a) => {
            ((a.disabled = !0),
              a.textContent === e.a
                ? clsAdd(a, "correct")
                : a === t && clsAdd(a, "wrong"));
          }),
          a === e.a
            ? (_quizScore++, (el$("quiz-feedback").textContent = "Correct."))
            : (el$("quiz-feedback").textContent = "It was " + e.a + "."));
        const o = el$("quiz-score");
        (o && (o.textContent = _quizScore + " / " + _quizTotal),
          (el$("quiz-next").style.display = "inline-flex"));
      });
    }));
}
function showStatus(e) {
  const t = el$("status");
  t &&
    (txt(t, e),
    setTimeout(() => {
      txt(t, "");
    }, 3e3));
  const a = el$("status-bar");
  if (a && e) {
    txt(a, e);
    const t = e.toLowerCase(),
      n = -1 !== t.indexOf("error") || -1 !== t.indexOf("fail"),
      o =
        -1 !== t.indexOf("success") ||
        -1 !== t.indexOf("extract") ||
        -1 !== t.indexOf("captur");
    (cls(a, "error", n), cls(a, "running", o));
  }
}
function toggleCoordsVisibility(e) {
  const t = q$(".coords-card");
  t && disp(t, e ? "block" : "none");
}
function toggleMapVisibility(e) {
  const t = el$("map-container");
  t && disp(t, e ? "block" : "none");
}
function countryBounds(e) {
  if (!e || !e.length) return null;
  var t,
    a,
    n,
    o,
    s = 180,
    r = -180,
    i = 90,
    l = -90;
  for (t = 0; t < e.length; t++)
    for (n = e[t], a = 0; a < n.length; a++)
      ((o = n[a])[0] < s && (s = o[0]),
        o[0] > r && (r = o[0]),
        o[1] < i && (i = o[1]),
        o[1] > l && (l = o[1]));
  if (r - s > 180) {
    var c = 360,
      d = -360;
    for (t = 0; t < e.length; t++)
      for (n = e[t], a = 0; a < n.length; a++) {
        var u = n[a][0] < 0 ? n[a][0] + 360 : n[a][0];
        (u < c && (c = u), u > d && (d = u));
      }
    d - c < r - s && ((s = c), (r = d));
  }
  return { minLng: s, maxLng: r, minLat: i, maxLat: l };
}
const _RING_LINK_DEG = 8;
function ringsNear(e, t, a) {
  if (!e || !e.length) return e;
  if (1 === e.length) return e;
  var n,
    o,
    s = [];
  for (n = 0; n < e.length; n++) {
    var r = e[n],
      i = { minLng: 180, maxLng: -180, minLat: 90, maxLat: -90 };
    for (o = 0; o < r.length; o++)
      (r[o][0] < i.minLng && (i.minLng = r[o][0]),
        r[o][0] > i.maxLng && (i.maxLng = r[o][0]),
        r[o][1] < i.minLat && (i.minLat = r[o][1]),
        r[o][1] > i.maxLat && (i.maxLat = r[o][1]));
    s.push(i);
  }
  var l = -1;
  for (n = 0; n < e.length; n++)
    if (_pointInRing(a, t, e[n])) {
      l = n;
      break;
    }
  if (-1 === l) {
    var c = 1 / 0,
      d = Math.max(0.05, Math.cos((t * Math.PI) / 180));
    for (n = 0; n < e.length; n++) {
      var u = s[n],
        g = Math.max(u.minLng - a, 0, a - u.maxLng);
      (g > 180 && (g = 360 - g), (g *= d));
      var m = Math.max(u.minLat - t, 0, t - u.maxLat),
        p = g * g + m * m;
      p < c && ((c = p), (l = n));
    }
  }
  for (
    var h = [l],
      f = {
        minLng: s[l].minLng,
        maxLng: s[l].maxLng,
        minLat: s[l].minLat,
        maxLat: s[l].maxLat,
      },
      y = !0;
    y;
  )
    for (y = !1, n = 0; n < e.length; n++)
      if (-1 === h.indexOf(n)) {
        var _ = s[n],
          b = Math.max(_.minLng - f.maxLng, f.minLng - _.maxLng, 0),
          w = Math.max(_.minLat - f.maxLat, f.minLat - _.maxLat, 0);
        b > 8 ||
          w > 8 ||
          (h.push(n),
          _.minLng < f.minLng && (f.minLng = _.minLng),
          _.maxLng > f.maxLng && (f.maxLng = _.maxLng),
          _.minLat < f.minLat && (f.minLat = _.minLat),
          _.maxLat > f.maxLat && (f.maxLat = _.maxLat),
          (y = !0));
      }
  var v = [];
  for (o = 0; o < e.length; o++) -1 !== h.indexOf(o) && v.push(e[o]);
  return v;
}
function panelZoomForBounds(e) {
  if (!e) return 1;
  var t = Math.max(0.05, e.maxLng - e.minLng),
    a = Math.max(0.05, e.maxLat - e.minLat),
    n = Math.min(288 / t, 144 / a);
  return Math.max(4, Math.min(8, n));
}
function panelPan(e, t, a) {
  var n = function (e) {
    return Math.max(1 - a, Math.min(0, e));
  };
  return { x: n(0.5 - e * a), y: n(0.5 - t * a) };
}
function panelLabelRing(e, t, a) {
  var n = { w: 0, h: 0, a: 0 };
  if (!e || !e.length) return n;
  var o,
    s,
    r,
    i,
    l = -1,
    c = -1;
  for (o = 0; o < e.length; o++)
    if (_pointInRing(t, a, e[o])) {
      c = o;
      break;
    }
  for (o = 0; o < e.length; o++)
    if ((s = countryBounds([e[o]]))) {
      if (((r = s.maxLng - s.minLng), (i = s.maxLat - s.minLat), o === c))
        return { w: r, h: i, a: r * i };
      r * i > l && ((l = r * i), (n = { w: r, h: i, a: r * i }));
    }
  return n;
}
function panelLabelLayout(e, t) {
  function a(e) {
    var t,
      a,
      n = 0;
    for (t = 0; t < e.length; t++)
      ((a = e.charAt(t)),
        -1 !== " iljtfrI.'-".indexOf(a)
          ? (n += 0.35)
          : -1 !== "mwMW".indexOf(a)
            ? (n += 0.95)
            : (n += a >= "A" && a <= "Z" ? 0.72 : 0.62));
    return n;
  }
  var n,
    o,
    s,
    r,
    i,
    l,
    c,
    d,
    u,
    g,
    m,
    p,
    h = t.s,
    f = t.pad,
    y = t.fit,
    _ =
      "number" == typeof t.maxRank
        ? t.maxRank
        : h < 1.5
          ? 2
          : h < 3
            ? 4
            : h < 4.5
              ? 5
              : 7,
    b = [];
  for (n = 0; n < e.length; n++)
    (!(o = e[n]).hit && o.rank > _) ||
      ((s = o.hit ? t.hitPx : t.px),
      (r = a(o.name) * s),
      (i = 0.48 * s + f),
      (l = (/[gjpqy]/.test(o.name) ? 0.47 : 0.28) * s + f),
      (u = {
        x0: (c = o.x * h) - r / 2 - f,
        y0: (d = o.y * h) - i,
        x1: c + r / 2 + f,
        y1: d + l,
      }),
      (t.window &&
        !o.hit &&
        (u.x0 < t.window.x0 * h ||
          u.x1 > t.window.x1 * h ||
          u.y0 < t.window.y0 * h ||
          u.y1 > t.window.y1 * h)) ||
        (!o.hit && r > y * Math.max(o.w, o.h) * h) ||
        ((g = o.hit
          ? -1
          : t.origin
            ? (m = o.x - t.origin.x) * m + (p = o.y - t.origin.y) * p
            : -o.a),
        b.push({ i: n, it: o, r: u, tw: r, top: i, bot: l, key: g })));
  b.sort(function (e, t) {
    return (
      (t.it.hit ? 1 : 0) - (e.it.hit ? 1 : 0) ||
      e.key - t.key ||
      e.it.rank - t.it.rank ||
      e.i - t.i
    );
  });
  var w,
    v,
    k,
    S,
    x,
    E,
    A,
    C,
    M,
    L,
    P,
    T,
    I = [],
    D = "number" == typeof t.pinRadius ? t.pinRadius : 5;
  for (
    t.origin &&
      I.push({
        i: -1,
        dx: 0,
        dy: 0,
        w: 0,
        x0: t.origin.x * h - D,
        y0: t.origin.y * h - D,
        x1: t.origin.x * h + D,
        y1: t.origin.y * h + D,
      }),
      n = 0;
    n < b.length;
    n++
  )
    for (
      v = (w = b[n]).top + w.bot + 1,
        k = Math.max(6, 0.35 * w.it.w * h),
        S = Math.max(6, 0.35 * w.it.h * h),
        x = w.it.hit
          ? [[0, 0]]
          : [
              [0, 0],
              [0, v],
              [0, -v],
              [0, v / 2],
              [0, -v / 2],
              [-k, 0],
              [k, 0],
              [k, v / 2],
              [-k, v / 2],
              [k, -v / 2],
              [-k, -v / 2],
              [k, v],
              [-k, v],
              [k, -v],
              [-k, -v],
            ],
        E = 0;
      E < x.length;
      E++
    )
      if (
        ((A = x[E][0]),
        (C = x[E][1]),
        ((0 === A && 0 === C) || !(Math.abs(C) > S || Math.abs(A) > k)) &&
          ((M = {
            x0: w.r.x0 + A,
            y0: w.r.y0 + C,
            x1: w.r.x1 + A,
            y1: w.r.y1 + C,
          }),
          !t.window ||
            w.it.hit ||
            (0 === A && 0 === C) ||
            !(
              M.x0 < t.window.x0 * h ||
              M.x1 > t.window.x1 * h ||
              M.y0 < t.window.y0 * h ||
              M.y1 > t.window.y1 * h
            )))
      ) {
        for (L = !0, P = 0; P < I.length; P++)
          if (
            (-1 !== (T = I[P]).i || !w.it.hit) &&
            M.x0 < T.x1 &&
            M.x1 > T.x0 &&
            M.y0 < T.y1 &&
            M.y1 > T.y0
          ) {
            L = !1;
            break;
          }
        if (L) {
          I.push({
            i: w.i,
            dx: A,
            dy: C,
            x0: M.x0,
            y0: M.y0,
            x1: M.x1,
            y1: M.y1,
            w: w.tw,
          });
          break;
        }
      }
  var R = [];
  for (n = 0; n < I.length; n++) I[n].i >= 0 && R.push(I[n]);
  return R;
}
function ringsToPath(e) {
  if (!e || !e.length) return "";
  for (var t = [], a = 0; a < e.length; a++) {
    var n = e[a];
    if (n && !(n.length < 2)) {
      for (var o = [], s = 0; s < n.length; s++) {
        var r = Math.round(10 * (n[s][0] + 180)) / 10,
          i = Math.round(10 * (90 - n[s][1])) / 10;
        o.push((0 === s ? "M" : "L") + r + " " + i);
      }
      t.push(o.join(" ") + " Z");
    }
  }
  return t.join(" ");
}
function _countryRings(e) {
  if (!e || !_countriesData) return null;
  for (var t = 0; t < _countriesData.length; t++)
    if (_countriesData[t].u === e) return _countriesData[t].p;
  return null;
}
let _mapDrawn = !1,
  _mapPaintSeq = 0,
  _lastPainted = null,
  _mapLabelLast = null,
  _mapResizeObs = null;
const _MAP_LABEL_PX = 8,
  _MAP_LABEL_HIT_PX = 9,
  _MAP_PARALLEL_LABEL_PX = 7,
  _MAP_LABEL_FIT = 2.6,
  _MAP_LABEL_PAD = 1.5,
  _MAP_LABEL_SHORT = {
    "United States of America": "United States",
    "People's Republic of China": "China",
    "Democratic Republic of the Congo": "DR Congo",
    "Republic of the Congo": "Congo",
    "Central African Republic": "Central African Rep.",
    "United Arab Emirates": "UAE",
    "Dominican Republic": "Dominican Rep.",
    "Bosnia and Herzegovina": "Bosnia and Herz.",
  },
  _MAP_PARALLELS = [
    { lat: 66.5, name: "Arctic Circle" },
    { lat: 23.4, name: "Tropic of Cancer" },
    { lat: 0, name: "Equator" },
    { lat: -23.4, name: "Tropic of Capricorn" },
    { lat: -66.5, name: "Antarctic Circle" },
  ];
function _svgEl(e, t) {
  const a = document.createElementNS("http://www.w3.org/2000/svg", e);
  for (const e in t) a.setAttribute(e, t[e]);
  return a;
}
function buildWorldMapInto(e, t) {
  if (!e || !_countriesData || !_countriesData.length) return !1;
  for (; e.firstChild;) e.removeChild(e.firstChild);
  const a = _svgEl("g", { id: t.idPrefix + "-lands" });
  for (let e = _countriesData.length - 1; e >= 0; e--) {
    const t = _countriesData[e],
      n = ringsToPath(t.p);
    if (!n) continue;
    const o = _svgEl("path", { d: n, class: "mc mc" + (t.k || 1) });
    (t.c && o.setAttribute("data-c", t.c), a.appendChild(o));
  }
  e.appendChild(a);
  const n = _svgEl("g", { id: t.idPrefix + "-grid" });
  for (const e of _MAP_PARALLELS) {
    const a = 90 - e.lat;
    if (
      (n.appendChild(
        _svgEl("line", {
          x1: 0,
          y1: a,
          x2: 360,
          y2: a,
          class: 0 === e.lat ? "par par-eq" : "par",
        }),
      ),
      t.labels)
    ) {
      const t = _svgEl("text", { x: 3, y: a - 1.2, class: "par-label" });
      ((t.textContent = e.name), n.appendChild(t));
    }
  }
  if ((e.appendChild(n), t.labels)) {
    const a = _svgEl("g", { id: t.idPrefix + "-labels" });
    for (let e = _countriesData.length - 1; e >= 0; e--) {
      const t = _countriesData[e];
      if (!t.l || !t.n) continue;
      const n = panelLabelRing(t.p, t.l[0], t.l[1]),
        o = _svgEl("text", {
          x: t.l[0] + 180,
          y: 90 - t.l[1],
          "data-r": "number" == typeof t.r ? t.r : 7,
          "data-u": t.u || "",
          "data-w": n.w.toFixed(2),
          "data-h": n.h.toFixed(2),
          "data-a": n.a.toFixed(2),
          class: "cl",
        });
      ((o.style.display = "none"),
        (o.textContent = t.n),
        _MAP_LABEL_SHORT[t.n] && (o.textContent = _MAP_LABEL_SHORT[t.n]),
        a.appendChild(o));
    }
    e.appendChild(a);
  }
  return !0;
}
async function drawWorldMap() {
  _mapDrawn ||
    (await _loadCountries(),
    buildWorldMapInto(el$("map-outline"), { labels: !0, idPrefix: "map" }) &&
      (_mapDrawn = !0));
}
let _statsMapDrawn = !1;
async function drawStatsBasemap() {
  if (_statsMapDrawn) return;
  const e = el$("stats-basemap");
  e &&
    (await _loadCountries(),
    buildWorldMapInto(e, { labels: !1, idPrefix: "stats" }) &&
      (_statsMapDrawn = !0));
}
function _applyMapLabelScale(e, t) {
  const a = el$("map-outline"),
    n = el$("map-view"),
    o = Math.max(1e-4, e || 1),
    s = (n && n.clientWidth) || 360,
    r = (e) => (360 * e) / (s * o),
    i = t || {};
  if (a) {
    const e = a.style;
    (e.setProperty("--map-sw", String(r(0.55))),
      e.setProperty("--map-sw-hit", String(r(1.1))),
      e.setProperty("--map-sw-par", String(r(0.4))),
      e.setProperty("--map-sw-label", String(r(0.5))),
      e.setProperty("--map-dash", String(r(2))));
  }
  const l = el$("map-grid");
  if (l) {
    const e = r(7) + "px",
      t = l.getElementsByTagName("text");
    for (let a = 0; a < t.length; a++) t[a].style.fontSize = e;
  }
  const c = el$("map-labels");
  if (!c) return;
  _mapLabelLast = { k: o, ctx: i, w: s };
  const d = (s * o) / 360,
    u = c.childNodes,
    g = [];
  for (let e = 0; e < u.length; e++) {
    const t = u[e];
    g.push({
      name: t.textContent || "",
      x: parseFloat(t.getAttribute("x")) || 0,
      y: parseFloat(t.getAttribute("y")) || 0,
      w: parseFloat(t.getAttribute("data-w")) || 0,
      h: parseFloat(t.getAttribute("data-h")) || 0,
      a: parseFloat(t.getAttribute("data-a")) || 0,
      rank: parseInt(t.getAttribute("data-r"), 10) || 7,
      hit: !!i.hitU && t.getAttribute("data-u") === i.hitU,
    });
  }
  const m = i.pan
      ? {
          x0: (360 * -i.pan.x) / o,
          y0: (180 * -i.pan.y) / o,
          x1: (360 * (1 - i.pan.x)) / o,
          y1: (180 * (1 - i.pan.y)) / o,
        }
      : null,
    p = panelLabelLayout(g, {
      s: d,
      px: 8,
      hitPx: 9,
      fit: 2.6,
      pad: 1.5,
      origin: i.pin || null,
      window: m,
    }),
    h = {};
  for (let e = 0; e < p.length; e++) h[p[e].i] = p[e];
  for (let e = 0; e < u.length; e++) {
    const t = u[e],
      a = h[e],
      n = g[e].hit;
    ((t.style.fontSize = r(n ? 9 : 8) + "px"),
      t.classList && t.classList.toggle("cl-hit", n),
      a
        ? ((t.style.display = ""),
          t.setAttribute("dx", String(a.dx / d)),
          t.setAttribute("dy", String(a.dy / d)),
          t.setAttribute("data-est-w", String(a.w)))
        : (t.style.display = "none"));
  }
}
function updateMapIframe(e, t, a) {
  const n = ++_mapPaintSeq,
    o = el$("map-marker"),
    s = el$("map-view");
  if (!o || !s) return;
  const r = parseFloat(e),
    i = parseFloat(t);
  if (!isFinite(r) || !isFinite(i)) return void disp(o, "none");
  _lastPainted = { lat: r, lng: i };
  const l = Math.max(0, Math.min(100, ((i + 180) / 360) * 100)),
    c = Math.max(0, Math.min(100, ((90 - r) / 180) * 100));
  ((o.style.left = l + "%"), (o.style.top = c + "%"), disp(o, "block"));
  const d = el$("map-stage") || s,
    u = el$("map-outline"),
    g = a && a.u ? _countryRings(a.u) : null,
    m = panelZoomForBounds(g ? countryBounds(ringsNear(g, r, i)) : null),
    p = l / 100,
    h = c / 100,
    f = panelPan(p, h, m),
    y = {
      hitU: a && a.u ? a.u : null,
      pan: d !== s ? f : null,
      pin: { x: 360 * p, y: 180 * h },
    };
  if (
    (_mapResizeObs ||
      "function" != typeof ResizeObserver ||
      ((_mapResizeObs = new ResizeObserver(() => {
        if (!_mapLabelLast) return;
        const e = s.clientWidth;
        e &&
          e !== _mapLabelLast.w &&
          _applyMapLabelScale(_mapLabelLast.k, _mapLabelLast.ctx);
      })),
      _mapResizeObs.observe(s)),
    u)
  ) {
    disp(u, "block");
    const e = () => {
      if (n !== _mapPaintSeq) return;
      const e = u.querySelectorAll("path.hit");
      for (let t = 0; t < e.length; t++) e[t].classList.remove("hit");
      if (a && a.iso2) {
        const e = u.querySelectorAll('path[data-c="' + a.iso2 + '"]');
        for (let t = 0; t < e.length; t++) e[t].classList.add("hit");
      }
      _applyMapLabelScale(m, y);
    };
    (e(), drawWorldMap().then(e));
  }
  (d !== s &&
    ((d.style.transformOrigin = "0 0"),
    (d.style.transform =
      "translate(" + 100 * f.x + "%, " + 100 * f.y + "%) scale(" + m + ")")),
    (o.style.transform = "translate(-50%, -50%) scale(" + 1 / m + ")"));
}
let _usageCache = null,
  _usageCacheTime = 0;
const USAGE_CACHE_TTL = 3e4;
function invalidateUsageCache() {
  _usageCacheTime = 0;
}
const CLOUD_FN_BASE =
  "https://us-central1-atlas-geoguessr-ext.cloudfunctions.net/";
function callCloudFn(e, t) {
  const a = chrome.runtime.id,
    n = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return fetch(CLOUD_FN_BASE + e, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: `chrome-extension://${a}`,
      "X-Extension-Id": a,
      "X-Request-Id": n,
      "X-Timestamp": Date.now().toString(),
    },
    body: JSON.stringify({ data: t }),
  });
}
async function loadUsageInformation(e, t = 0) {
  if (_usageCache && Date.now() - _usageCacheTime < USAGE_CACHE_TTL)
    updateUsageDisplay(_usageCache);
  else
    try {
      const a = await callCloudFn("getUserUsage", { extpayUserId: e });
      if (429 === a.status)
        return _usageCache
          ? void updateUsageDisplay(_usageCache)
          : void (
              t < 3 &&
              setTimeout(
                () => loadUsageInformation(e, t + 1),
                3e3 * Math.pow(2, t),
              )
            );
      if (!a.ok)
        return void console.error(
          "Failed to load usage information:",
          a.status,
        );
      const n = (await a.json()).result;
      try {
        const e = await getExtPayUser();
        (e.paid && ((n.subscriptionType = "pro"), (n.planType = "pro")),
          updatePaymentUI(e),
          updateUpgradeCardHeader(e));
      } catch (e) {
        console.error("Error updating UI with ExtPay flags:", e);
      }
      ((_usageCache = n),
        (_usageCacheTime = Date.now()),
        (window.backendSubscriptionFlags = {
          isCancelled: n.isCancelled,
          isPastDue: n.isPastDue,
          subscriptionType: n.subscriptionType,
          subscriptionStatus: n.subscriptionStatus,
        }),
        updateUsageDisplay(n));
    } catch (e) {
      console.error("Error loading usage information:", e);
    }
}
async function initializeFirebaseUser() {
  try {
    await new Promise((e) => setTimeout(e, 1e3));
    const e = await getExtPayUser(),
      t = e.userId || e.email || "anonymous";
    (callCloudFn("createUser", { extpayUserId: t, email: e.email }).catch(
      () => {},
    ),
      setTimeout(() => loadUsageInformation(t), 500));
  } catch (e) {
    console.error("Error initializing Firebase user:", e);
  }
}
function reorderSettingsSections() {
  const e = el$("account-page");
  if (!e) return;
  const t = e.querySelector(".payment-section"),
    a = el$("usage-section");
  if (!t || !a) return;
  const n = e.querySelector(".upgrade-card"),
    o = n && n.classList.contains("pro-active");
  (t.parentNode !== e && e.appendChild(t),
    a.parentNode !== e && e.appendChild(a),
    o
      ? a.nextElementSibling !== t && e.insertBefore(a, t)
      : t.nextElementSibling !== a && e.insertBefore(t, a));
}
async function updateUsageDisplay(e) {
  if (e)
    try {
      let t = el$("usage-section");
      (t ||
        ((t = document.createElement("div")),
        (t.id = "usage-section"),
        (t.className = "settings-section"),
        html(
          t,
          '\n      <div class="usage-compact">\n        <div class="usage-compact-top">\n          <span class="usage-mode-badge" id="usage-mode-badge">Free Mode</span>\n          <span class="usage-compact-value" id="usage-summary">0/3</span>\n        </div>\n        <div class="usage-progress" aria-hidden="true">\n          <div class="usage-progress-fill" id="usage-progress-fill"></div>\n        </div>\n      </div>\n    ',
        )),
        t &&
          !t.querySelector("#usage-mode-badge") &&
          html(
            t,
            '\n      <div class="usage-compact">\n        <div class="usage-compact-top">\n          <span class="usage-mode-badge" id="usage-mode-badge">Free Mode</span>\n          <span class="usage-compact-value" id="usage-summary">0/3</span>\n        </div>\n        <div class="usage-progress" aria-hidden="true">\n          <div class="usage-progress-fill" id="usage-progress-fill"></div>\n        </div>\n      </div>\n    ',
          ));
      const a = el$("account-page");
      (a && !a.contains(t) && a.appendChild(t),
        reorderSettingsSections(),
        disp(t, "block"));
      const n = el$("usage-summary"),
        o = el$("usage-progress-fill"),
        s = e.current || 0,
        r = e.limit,
        i =
          999999 === r ||
          -1 === r ||
          "pro" === e.planType ||
          "standard" === e.planType,
        l = r || 7,
        c = i ? "Unlimited" : l,
        d = i ? 0 : Math.min((s / l) * 100, 100);
      (n && txt(n, `${s}/${c}`),
        (_badgeUsage = e),
        _paintModeBadge(),
        o && ((o.style.width = `${d}%`), cls(o, "is-unlimited", i)));
    } catch (e) {
      console.error("Error updating usage display:", e);
      const t = el$("usage-section");
      t && disp(t, "none");
    }
}
async function syncSubscriptionToFirebase(e) {
  try {
    const t = e.userId || e.email || "anonymous";
    let a = "free",
      n = "inactive";
    e.paid && "past_due" === e.subscriptionStatus
      ? (n = "past_due")
      : e.paid
        ? ((a = "pro"), (n = e.subscriptionStatus || "active"))
        : e.trialStartedAt && !e.trialEnded && (n = "trial");
    const o = {
        extpayUserId: t,
        subscriptionStatus: n,
        subscriptionType: a,
        isCancelled: "canceled" === e.subscriptionStatus,
        isPastDue: "past_due" === e.subscriptionStatus,
      },
      s = await fetch(CLOUD_FN_BASE + "updateSubscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: o }),
      });
    if (s.ok) setTimeout(() => loadUsageInformation(t), 1e3);
    else {
      const e = await s.json().catch(() => ({}));
      console.error(
        "Failed to sync subscription:",
        (e && e.error && e.error.message) || JSON.stringify(e),
      );
    }
  } catch (e) {
    console.error("Error syncing subscription to Firebase:", e);
  }
}
function capitalizeFirst(e) {
  return e.charAt(0).toUpperCase() + e.slice(1);
}
async function initializePaymentStatus() {
  try {
    const e = await getExtPayUser();
    (updatePaymentUI(e),
      chrome.storage.local.get(["shouldShowTrialMessage"], (t) => {
        t.shouldShowTrialMessage &&
          e.trialStartedAt &&
          (showTrialActivatedMessage(),
          chrome.storage.local.remove("shouldShowTrialMessage"));
      }));
    return (
      (e.paid &&
        (!e.subscriptionStatus ||
          ("past_due" !== e.subscriptionStatus &&
            "canceled" !== e.subscriptionStatus))) ||
      e.trialStartedAt
    );
  } catch (e) {
    return (
      console.error("Error checking payment status:", e),
      updatePaymentUI({ paid: !1, trialStarted: !1 }),
      !1
    );
  }
}
function _resetPaymentButtons() {
  const e = el$("payment-button"),
    t = el$("signin-button"),
    a = el$("manage-plan-button"),
    n = el$("auth-buttons-container"),
    o = q$(".payment-section"),
    s = q$(".settings-footer");
  return (
    disp(e, "none"),
    disp(t, "none"),
    disp(a, "none"),
    o && disp(o, ""),
    n && disp(n, "none"),
    s && clsRemove(s, "has-manage-plan"),
    {
      paymentButton: e,
      signInButton: t,
      managePlanButton: a,
      authButtonsContainer: n,
      paymentSection: o,
      settingsFooter: s,
    }
  );
}
function subState(e) {
  const t = window.backendSubscriptionFlags,
    a = (t && t.isPastDue) || (e.paid && "past_due" === e.subscriptionStatus),
    n = (t && t.isCancelled) || (e.paid && "canceled" === e.subscriptionStatus);
  return {
    pastDue: Boolean(a),
    cancelled: Boolean(n),
    active: Boolean(e.paid && !a),
    trial: Boolean(e.trialStartedAt && !e.paid),
    backendPastDue: Boolean(t && !0 === t.isPastDue),
  };
}
function updatePaymentUI(e) {
  const a = _resetPaymentButtons(),
    n = Boolean(e?.userId || e?.email);
  (updateUpgradeCardHeader(e), checkCancelledSubscriptionWarning(e));
  const o = subState(e),
    s = o.pastDue;
  if (o.active)
    return (
      a.paymentSection && disp(a.paymentSection, "none"),
      a.paymentButton.classList.remove("trial-active", "premium-active"),
      disp(a.managePlanButton, "flex"),
      void (a.settingsFooter && clsAdd(a.settingsFooter, "has-manage-plan"))
    );
  if ((e.trialStartedAt && !e.paid) || n) {
    const e = o.backendPastDue;
    return (
      html(a.paymentButton, e ? "Renew Pro" : "Upgrade"),
      clsRemove(a.paymentButton, "premium-active"),
      clsAdd(a.paymentButton, "trial-active"),
      (a.paymentButton.disabled = !1),
      disp(a.paymentButton, "flex"),
      void disp(a.signInButton, "none")
    );
  }
  if (s)
    return (
      html(a.paymentButton, t("panel_ui_renew_pro")),
      clsRemove(a.paymentButton, "premium-active"),
      clsAdd(a.paymentButton, "trial-active"),
      (a.paymentButton.disabled = !1),
      disp(a.paymentButton, "flex"),
      void disp(a.signInButton, "none")
    );
  (disp(a.paymentButton, "none"),
    disp(a.signInButton, "none"),
    a.authButtonsContainer && disp(a.authButtonsContainer, "flex"));
}
async function checkPremiumAccess() {
  return !0;
  try {
    const e = await getExtPayUser(),
      a = subState(e);
    return (
      !(!a.active && !a.trial) ||
      ((e.paid || e.trialStartedAt) && "past_due" === e.subscriptionStatus
        ? showStatus(t("panel_status_your_subscription_payment_is_past_due"))
        : showStatus(
            t("panel_status_this_feature_requires_premium_access_please"),
          ),
      !1)
    );
  } catch (e) {
    return (
      console.error("Error checking premium access:", e),
      showStatus(
        t("panel_status_error_checking_subscription_status_please_try"),
      ),
      !1
    );
  }
}
function updateUpgradeCardHeader(e) {
  const a = q$(".upgrade-header h3"),
    n = q$(".upgrade-header"),
    o = q$(".upgrade-icon"),
    s = q$(".upgrade-card");
  if (!a || !n || !s) return;
  (s.classList.remove("pro-active", "trial-active"),
    clsRemove(n, "pro-active"));
  const r = subState(e),
    i = r.pastDue;
  if (r.active)
    (txt(a, t("panel_ui_pro_mode_enabled")),
      clsAdd(n, "pro-active"),
      clsAdd(s, "pro-active"),
      o && html(o, ""));
  else if (e.trialStartedAt && !e.paid) {
    (txt(a, r.backendPastDue ? "Renew Pro" : "Upgrade"),
      clsAdd(s, "trial-active"),
      o && html(o, ""));
  } else
    i
      ? (txt(a, t("panel_ui_renew_pro")),
        clsAdd(s, "trial-active"),
        o && html(o, ""))
      : (txt(a, t("panel_upgrade")), o && html(o, ""));
  reorderSettingsSections();
}
function checkCancelledSubscriptionWarning(e) {
  removeCancelledSubscriptionWarning();
}
function showCancelledSubscriptionWarning(e) {
  removeCancelledSubscriptionWarning();
  const t = document.createElement("div");
  ((t.id = "cancelled-subscription-warning"),
    (t.className = "subscription-warning cancelled-warning"));
  const a = e.subscriptionEndDate || e.expirationDate;
  html(
    t,
    `\n    <div class="warning-content">\n      <div class="warning-icon">\n        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">\n          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>\n        </svg>\n      </div>\n      <div class="warning-text">\n        <h4>Subscription Cancelled</h4>\n        <p>Your Pro subscription will expire on <strong>${a ? new Date(a).toLocaleDateString() : "your next billing date"}</strong>. You can reactivate anytime to continue after expiration.</p>\n      </div>\n      <div class="warning-actions">\n        <button class="reactivate-btn" id="reactivate-subscription-btn">Reactivate</button>\n        <button class="dismiss-btn" id="dismiss-warning-btn">Dismiss</button>\n      </div>\n    </div>\n  `,
  );
  const n = el$("settings-page");
  n && n.insertBefore(t, n.firstChild);
  const o = el$("reactivate-subscription-btn"),
    s = el$("dismiss-warning-btn");
  (o && bind(o, "click", () => openAtlasCheckout()),
    s && bind(s, "click", () => removeCancelledSubscriptionWarning()));
}
function removeCancelledSubscriptionWarning() {
  const e = el$("cancelled-subscription-warning");
  e && e.remove();
}
const _DISCORD_URL = "https://discord.gg/zwYXRgRRHc",
  _DISCORD_MARK =
    '<svg class="atl-dc-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.052a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>';
function discordRoundsBlock() {
  return (
    '<a class="atl-dc" href="' +
    _DISCORD_URL +
    '" target="_blank" rel="noopener">' +
    _DISCORD_MARK +
    '<span class="atl-dc-text"><span class="atl-dc-title">' +
    _esc(t("panel_15_free_rounds_in_the_discord")) +
    '</span><span class="atl-dc-line">' +
    _esc(t("panel_join_pick_geoguessr_and_redeem_the")) +
    '</span></span><span class="atl-dc-go">' +
    _esc(t("panel_join")) +
    "</span></a>"
  );
}
function _storeReviewUrl() {
  const e = ("undefined" != typeof navigator && navigator.userAgent) || "";
  return /Firefox\//i.test(e)
    ? "https://addons.mozilla.org/en-US/firefox/addon/geoguesser-cheats-hack/reviews/"
    : /OPR\//i.test(e)
      ? ""
      : /Edg\//i.test(e)
        ? "https://microsoftedge.microsoft.com/addons/detail/chlfjoingmolckhnekinjeodlgaopjjd"
        : /Chrome\//i.test(e)
          ? "https://chromewebstore.google.com/detail/geoguesser-cheats-geogues/mggpkondmigmgbgafalghhkagkldinkj/reviews"
          : "";
}
function storeReviewBlock() {
  const e = _storeReviewUrl();
  return e
    ? '<a class="atl-sr" href="' +
        e +
        '" target="_blank" rel="noopener"><span class="atl-sr-text"><span class="atl-sr-title">' +
        _esc(t("panel_has_this_been_useful")) +
        '</span><span class="atl-sr-line">' +
        _esc(t("panel_a_short_review_on_the_store")) +
        '</span></span><span class="atl-sr-go">' +
        _esc(t("panel_open_the_store")) +
        "</span></a>"
    : "";
}
async function showUsageLimitExceededModal(e) {
  const t = el$("usage-limit-modal");
  t && t.remove();
  const a = (() => {
    const t = e?.usage;
    if (t) return t;
    const a = e?.error?.message;
    if (!a) return null;
    try {
      return JSON.parse(a)?.usage || null;
    } catch (e) {
      return null;
    }
  })();
  a && updateUsageDisplay(a);
  const n = await getExtPayUser().catch(
      (e) => (
        console.error("Error getting user for usage modal:", e),
        { paid: !1, trialStartedAt: null }
      ),
    ),
    o = subState(n).active,
    s = (n.trialStartedAt && n.paid, a || {}),
    r = o && s.planType && "free" !== s.planType && "pro" !== s.planType,
    i = s.limit ? Number(s.limit).toLocaleString() : "your monthly",
    l = r
      ? {
          heading: "You are climbing fast",
          lead:
            "You have used all " +
            i +
            " rounds this month. Go unlimited with Pro and keep the streak going.",
          ctaLabel: "Upgrade to Pro",
          isFreeTrial: !1,
        }
      : {
          heading: "One plan away from your next rank",
          lead: "That was your last free round, and ATLAS just placed the exact location for you. Get your key and keep climbing with unlimited rounds.",
          ctaLabel: "Get your key",
          isFreeTrial: !0,
        },
    { heading: c, lead: d, ctaLabel: u } = l,
    g = makeDiv(
      "atl-md-scrim",
      `\n    <div class="atl-md-card">\n      <button class="atl-md-x" id="close-usage-modal" aria-label="Close">&times;</button>\n      <div class="atl-md-head">\n        <span class="atl-md-badge" aria-hidden="true">\n          <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>\n        </span>\n        <div class="atl-md-heads">\n          <h3 class="atl-md-title">${c}</h3>\n          <p class="atl-md-sub">${d}</p>\n        </div>\n      </div>\n      <ul class="atl-md-perks">\n        <li>Unlimited guesses</li>\n        <li>Instant exact coordinates</li>\n        <li>Automatic pin placement</li>\n      </ul>\n      <p class="atl-md-fine">Plans from EUR 14.99. One-time payment, nothing auto-renews.</p>\n      ${l.isFreeTrial ? discordRoundsBlock() : ""}\n      ${l.isFreeTrial ? storeReviewBlock() : ""}\n      <div class="atl-md-cta">\n        <button class="atl-md-primary" id="upgrade-modal-btn">${u}</button>\n        <button class="atl-md-later" id="close-usage-limit-btn">Maybe later</button>\n      </div>\n    </div>\n  `,
    );
  g.id = "usage-limit-modal";
  const m = () => g.remove();
  (document.body.appendChild(g),
    onClickAll(g, "#close-usage-modal, #close-usage-limit-btn", m));
  const p = g.querySelector("#upgrade-modal-btn");
  (p &&
    bind(p, "click", () => {
      m();
      try {
        chrome.tabs.create({ url: "https://geoguessrcheats.com/plans" });
      } catch (e) {}
    }),
    wireDismissers(g, m));
}
window.removeCancelledSubscriptionWarning = removeCancelledSubscriptionWarning;
const EDGE_NOTES = {
  "trial-expired": {
    title: t("panel_notif_trial_expired"),
    message: t("panel_notif_your_free_trial_has_ended_upgrade"),
    type: "warning",
    action: t("panel_notif_upgrade_now"),
  },
  "payment-failed": {
    title: t("panel_notif_payment_failed"),
    message: t("panel_notif_your_payment_could_not_be_processed"),
    type: "error",
    action: t("panel_notif_retry_payment"),
  },
  "past-due": {
    title: t("panel_notif_payment_past_due"),
    message: t("panel_notif_your_subscription_payment_is_past_due"),
    type: "warning",
    action: t("panel_notif_update_payment"),
  },
  cancelled: {
    title: t("panel_notif_subscription_cancelled"),
    type: "info",
    action: t("panel_notif_reactivate"),
    dated: !0,
  },
  expired: {
    title: t("panel_notif_subscription_expired"),
    message: t("panel_notif_your_subscription_has_expired_renew_to"),
    type: "warning",
    action: t("panel_notif_renew_now"),
  },
  "many-attempts": {
    title: t("panel_notif_payment_issues_detected"),
    message: t("panel_notif_multiple_payment_attempts_detected_please_contact"),
    type: "warning",
    action: t("panel_notif_contact_support"),
    contact: !0,
  },
};
function emitEdgeNote(e, t) {
  const a = EDGE_NOTES[e];
  if (!a) return;
  const n = a.dated
    ? `Your subscription is cancelled but active until ${new Date(t).toLocaleDateString()}.`
    : a.message;
  showNotification(e, {
    title: a.title,
    message: n,
    type: a.type,
    action: a.action,
    callback: a.contact
      ? () => window.open("mailto:support@geoguessrcheats.com")
      : () => openAtlasCheckout(),
  });
}
async function handleExtPayEdgeCases() {
  let e;
  try {
    e = await getExtPayUser();
  } catch (e) {
    console.error("ExtPay error:", e);
    return (
      showStatus(
        (e.message || "").includes("ExtPay not initialized")
          ? "Payment system initialization failed. Please reload the extension."
          : 429 === e.status
            ? "Too many requests. Please wait a moment and try again."
            : "Payment system error. Please try again or contact support.",
      ),
      { paid: !1, trialStarted: !1 }
    );
  }
  if (navigator.onLine)
    return e
      ? (e.trialStartedAt && e.trialEnded && !e.paid
          ? emitEdgeNote("trial-expired")
          : e.paymentFailed
            ? emitEdgeNote("payment-failed")
            : e.paid && "past_due" === e.subscriptionStatus
              ? emitEdgeNote("past-due")
              : e.paid && "canceled" === e.subscriptionStatus
                ? emitEdgeNote("cancelled")
                : e.paid && e.subscriptionCancelled
                  ? emitEdgeNote("cancelled", e.subscriptionEndDate)
                  : e.subscriptionExpired
                    ? emitEdgeNote("expired")
                    : e.multiplePaymentAttempts &&
                      emitEdgeNote("many-attempts"),
        e)
      : (showStatus(
          t("panel_status_payment_service_temporarily_unavailable_please_try"),
        ),
        { paid: !1, trialStarted: !1 });
  showStatus(t("panel_status_no_internet_connection_please_check_your"));
}
async function checkPaymentStatus() {
  try {
    const e = await getExtPayUser();
    (await syncSubscriptionToFirebase(e),
      updatePaymentUI(e),
      updateUpgradeCardHeader(e));
    const t = e.userId || e.email;
    return (
      t && "anonymous" !== t && (await loadUsageInformation(t)),
      checkCancelledSubscriptionWarning(e),
      !0
    );
  } catch (e) {
    return (console.error("Error in checkPaymentStatus:", e), !1);
  }
}
async function initializePaymentStatusWithEdgeCases() {
  const e = await handleExtPayEdgeCases();
  if (!e) return !1;
  (updatePaymentUI(e),
    updateUpgradeCardHeader(e),
    chrome.storage.local.get(["shouldShowTrialMessage"], (t) => {
      t.shouldShowTrialMessage &&
        e.trialStartedAt &&
        !e.trialEnded &&
        (showTrialActivatedMessage(),
        chrome.storage.local.remove("shouldShowTrialMessage"));
    }));
  return (
    (e.paid &&
      (!e.subscriptionStatus ||
        ("past_due" !== e.subscriptionStatus &&
          "canceled" !== e.subscriptionStatus))) ||
    (e.trialStartedAt && !e.trialEnded)
  );
}
function showNotification(e, t) {
  const a = el$(`notification-${e}`);
  a && a.remove();
  const n = document.createElement("div");
  ((n.id = `notification-${e}`),
    (n.className = `edge-case-notification ${t.type}`),
    html(
      n,
      `\n    <div class="notification-content">\n      <div class="notification-text">\n        <strong>${t.title}</strong>\n        <p>${t.message}</p>\n      </div>\n      <div class="notification-actions">\n        ${t.action ? `<button class="notification-action" onclick="this.closest('.edge-case-notification').remove(); (${t.callback.toString()})();">${t.action}</button>` : ""}\n        <button class="notification-close" onclick="this.closest('.edge-case-notification').remove();">x</button>\n      </div>\n    </div>\n  `,
    ));
  const o = el$("main-page").querySelector(".header");
  (o.parentNode.insertBefore(n, o.nextSibling),
    "error" !== t.type &&
      setTimeout(() => {
        n.parentNode && n.remove();
      }, 1e4));
}
function showTrialActivatedMessage() {}
function showSignInPrompt(e, a) {
  const n = !!(a = a || {}).upgradeOnly,
    o = document.createElement("div");
  o.className = "atl-md-scrim";
  const s = document.createElement("div");
  s.className = "atl-md-card";
  const r = n
    ? '<button class="atl-md-primary" id="signin-upgrade-btn">Upgrade</button>'
    : '<button class="atl-md-primary" id="signin-google-btn">Continue with Google</button><button class="atl-md-ghost" id="signin-upgrade-btn">Upgrade</button>';
  (html(
    s,
    `\n    <button class="atl-md-x" id="close-signin-modal" aria-label="Close">&times;</button>\n    <div class="atl-md-head">\n      <span class="atl-md-badge" aria-hidden="true">\n        <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>\n      </span>\n      <div class="atl-md-heads">\n        <h3 class="atl-md-title">${n ? "Upgrade to keep going" : e ? "Sign in to continue" : "Sign in required"}</h3>\n        <p class="atl-md-sub">${e || "Free to start, no download and no card."}</p>\n      </div>\n    </div>\n    <ul class="atl-md-perks">\n      <li>${n ? "Unlimited guesses" : "7 free extra guesses when you sign in"}</li>\n      <li>Instant exact coordinates</li>\n      <li>Automatic pin placement</li>\n    </ul>\n    ${discordRoundsBlock()}\n    ${storeReviewBlock()}\n    <div class="atl-md-cta">\n      ${r}\n    </div>\n  `,
  ),
    o.appendChild(s),
    document.body.appendChild(o));
  const i = s.querySelector("#close-signin-modal"),
    l = s.querySelector("#signin-google-btn"),
    c = s.querySelector("#signin-upgrade-btn"),
    d = () => {
      o && o.parentNode && o.parentNode.removeChild(o);
    };
  (bind(i, "click", d),
    bind(o, "click", (e) => {
      e.target === o && d();
    }),
    l &&
      bind(l, "click", () => {
        showStatus(t("panel_status_opening_google_sign_in"));
        try {
          chrome.runtime.sendMessage({ action: "googleSignIn" }, (e) => {
            if (chrome.runtime.lastError || !e || !e.ok)
              return void showStatus(
                t("panel_status_sign_in_failed_please_try_again"),
              );
            d();
            let a = "Signed in" + (e.email ? " as " + e.email : "") + ". ";
            if (
              ("restored" === e.claim
                ? (a += "License restored from your account.")
                : "linked" === e.claim
                  ? (a += "Your key is now linked to your account.")
                  : (a += "You've unlocked 7 free extra guesses."),
              showStatus(a),
              window.refreshUIState)
            )
              try {
                window.refreshUIState("google-signin");
              } catch (e) {}
          });
        } catch (e) {
          showStatus(t("panel_status_sign_in_failed_please_try_again"));
        }
      }),
    c &&
      bind(c, "click", () => {
        d();
        try {
          chrome.tabs.create({ url: "https://geoguessrcheats.com/plans" });
        } catch (e) {}
      }));
  const u = (e) => {
    "Escape" === e.key && (d(), document.removeEventListener("keydown", u));
  };
  document.addEventListener("keydown", u);
}
const REVIEW_ASK_KEY = "reviewAsk",
  REVIEW_MIN_ROUNDS = 15,
  REVIEW_MIN_DAYS = 7,
  REVIEW_SNOOZE_DAYS = 30,
  REVIEW_MAX_SHOWN = 2,
  REVIEW_DASHBOARD_URL = "https://geoguessrcheats.com/?page=dashboard",
  DAY_MS = 864e5;
function _reviewState(e) {
  chrome.storage.local.get(
    ["reviewAsk", "atlasKey", "atlasLinkedKey", "atlasInstalledAt"],
    (t) => {
      const a = (t && t.reviewAsk) || {};
      e({
        state: a.state || "idle",
        at: a.at || 0,
        shown: a.shown || 0,
        rounds: a.rounds || 0,
        key: ((t && t.atlasKey) || "").trim(),
        linked: ((t && t.atlasLinkedKey) || "").trim(),
        installedAt: (t && t.atlasInstalledAt) || 0,
      });
    },
  );
}
function _reviewSave(e, t) {
  chrome.storage.local.get(["reviewAsk"], (a) => {
    const n = Object.assign({}, a && a.reviewAsk, e);
    chrome.storage.local.set({ [REVIEW_ASK_KEY]: n }, () => {
      t && t(n);
    });
  });
}
function noteReviewRound() {
  try {
    _reviewState((e) => {
      "never" !== e.state &&
        "clicked" !== e.state &&
        (_reviewSave({ rounds: e.rounds + 1 }),
        e.installedAt ||
          chrome.storage.local.set({ atlasInstalledAt: Date.now() }));
    });
  } catch (e) {}
}
function _reviewEligible(e) {
  if (!e.key || e.linked !== e.key) return !1;
  if ("never" === e.state || "clicked" === e.state) return !1;
  if (e.shown >= 2) return !1;
  if ("later" === e.state && Date.now() - e.at < 30 * DAY_MS) return !1;
  const t = !!e.installedAt && Date.now() - e.installedAt >= 7 * DAY_MS;
  return e.rounds >= 15 || t;
}
function _fireReview(e) {
  try {
    chrome.runtime.sendMessage({ action: "featureUse", feature: e });
  } catch (e) {}
}
function maybeShowReviewAsk() {
  const e = document.getElementById("review-ask");
  e &&
    e.hidden &&
    _reviewState((t) => {
      _reviewEligible(t) &&
        ((e.hidden = !1),
        _reviewSave({ shown: t.shown + 1, at: Date.now() }),
        _fireReview("review_prompt_shown"));
    });
}
function initReviewAsk() {
  const e = document.getElementById("review-ask");
  if (!e) return;
  const t = document.getElementById("review-ask-go"),
    a = document.getElementById("review-ask-later"),
    n = document.getElementById("review-ask-never"),
    o = (t, a) => {
      ((e.hidden = !0),
        _reviewSave({ state: t, at: Date.now() }),
        _fireReview(a));
    };
  (t &&
    t.addEventListener("click", () => {
      o("clicked", "review_prompt_click");
      try {
        chrome.tabs.create({ url: REVIEW_DASHBOARD_URL });
      } catch (e) {}
    }),
    a && a.addEventListener("click", () => o("later", "review_prompt_later")),
    n && n.addEventListener("click", () => o("never", "review_prompt_never")));
}
"loading" === document.readyState
  ? document.addEventListener("DOMContentLoaded", initReviewAsk)
  : initReviewAsk();
