/*! Copyright (c) 2026 Tildra LLC. All rights reserved. ATLAS for GeoGuessr. Proprietary; unauthorized copying, distribution, or reverse engineering is prohibited. https://geoguessrcheats.com/terms */
(function () {
  "use strict";

  function sendRuntimeMessage(actionName) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage({ action: actionName }, function (response) {
          if (!chrome.runtime.lastError && response) {
            resolve(response);
          } else {
            resolve(null);
          }
        });
      } catch (err) {
        resolve(null);
      }
    });
  }

  function createUnlimitedUsage(currentCount) {
    return {
      current: typeof currentCount === "number" ? currentCount : 0,
      limit: 999999,
      planType: "pro",
      subscriptionType: "pro",
      subscriptionStatus: "active",
      isCancelled: false,
      isPastDue: false,
    };
  }

  function createMeteredUsage(currentCount, limitCount, planName) {
    return {
      current: typeof currentCount === "number" ? currentCount : 0,
      limit: limitCount,
      planType: planName || "plan",
      subscriptionType: planName || "plan",
      subscriptionStatus: "active",
      isCancelled: false,
      isPastDue: false,
    };
  }

  function createFreeUsage(currentCount, limitCount) {
    return {
      current: typeof currentCount === "number" ? currentCount : 0,
      limit: typeof limitCount === "number" ? limitCount : 7,
      planType: "free",
      subscriptionType: "free",
      subscriptionStatus: "inactive",
      isCancelled: false,
      isPastDue: false,
    };
  }

  function getMonthKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function fetchLicenseAndUsageState() {
    return Promise.resolve({
      tier: "unlimited",
      rpm: -1,
      plan: "lifetime",
      freeUsed: 0,
      freeLimit: 999999,
      monthKey: getMonthKey(),
      monthRounds: 0,
    });
    return new Promise(function (resolve) {
      function processLicense(licenseData) {
        var tier = (licenseData && licenseData.tier) || "free";
        var rpm = licenseData && typeof licenseData.rpm === "number" ? licenseData.rpm : 0;
        var plan = (licenseData && licenseData.plan) || "plan";

        sendRuntimeMessage("getFreeUsage").then(function (freeUsage) {
          var freeUsed = freeUsage && typeof freeUsage.used === "number" ? freeUsage.used : 7;
          var freeLimit = freeUsage && typeof freeUsage.limit === "number" ? freeUsage.limit : 7;

          try {
            chrome.storage.local.get(["atlasUsageMonth", "atlasUsageRounds"], function (stored) {
              stored = stored || {};
              var currentMonth = getMonthKey();
              var monthRounds = (stored.atlasUsageMonth === currentMonth && stored.atlasUsageRounds) || 0;
              resolve({
                tier: tier,
                rpm: rpm,
                plan: plan,
                freeUsed: freeUsed,
                freeLimit: freeLimit,
                monthKey: currentMonth,
                monthRounds: monthRounds,
              });
            });
          } catch (err) {
            resolve({
              tier: tier,
              rpm: rpm,
              plan: plan,
              freeUsed: freeUsed,
              freeLimit: freeLimit,
              monthKey: getMonthKey(),
              monthRounds: 0,
            });
          }
        });
      }

      try {
        chrome.runtime.sendMessage({ action: "getLicense" }, function (res) {
          if (chrome.runtime.lastError || !res) {
            res = { tier: "free", rpm: 0, plan: "plan" };
          }
          processLicense(res);
        });
      } catch (err) {
        processLicense({ tier: "free", rpm: 0, plan: "plan" });
      }
    });
  }

  function getUsageObject(state) {
    if (state.tier === "unlimited") {
      return createUnlimitedUsage(0);
    }
    if (state.tier === "metered") {
      return createMeteredUsage(state.monthRounds, state.rpm, state.plan);
    }
    return createFreeUsage(state.freeUsed, state.freeLimit);
  }

  function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
      status: status || 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  function rateLimitExhaustedResponse(usage) {
    return new Response(
      JSON.stringify({
        error: { message: "Free limit reached", status: "RESOURCE_EXHAUSTED" },
        usage: usage,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Intercept Cloud Functions fetch calls to provide local offline emulation
  var originalFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";

    if (url.indexOf("cloudfunctions.net") === -1) {
      return originalFetch(input, init);
    }

    if (url.indexOf("createUser") !== -1) {
      return Promise.resolve(jsonResponse({ result: { success: true } }));
    }

    if (url.indexOf("getUserUsage") !== -1) {
      return fetchLicenseAndUsageState().then(function (state) {
        return jsonResponse({ result: getUsageObject(state) });
      });
    }

    if (url.indexOf("incrementGuessCount") !== -1) {
      return fetchLicenseAndUsageState().then(function (state) {
        if (state.tier === "unlimited") {
          return jsonResponse({ result: { usage: createUnlimitedUsage(0) } });
        }

        if (state.tier === "metered") {
          if (state.monthRounds >= state.rpm) {
            return rateLimitExhaustedResponse(
              createMeteredUsage(state.monthRounds, state.rpm, state.plan)
            );
          }
          var nextCount = state.monthRounds + 1;
          return new Promise(function (resolve) {
            var onDone = function () {
              try {
                chrome.runtime.sendMessage({ action: "botRound" }, function () {
                  var ignored = chrome.runtime.lastError;
                });
              } catch (err) {}
              resolve(jsonResponse({ result: { usage: createMeteredUsage(nextCount, state.rpm, state.plan) } }));
            };
            try {
              chrome.storage.local.set(
                { atlasUsageMonth: state.monthKey, atlasUsageRounds: nextCount },
                onDone
              );
            } catch (err) {
              onDone();
            }
          });
        }

        // Free tier round consumption
        return sendRuntimeMessage("consumeFreeRound").then(function (result) {
          if (result && result.allowed) {
            return jsonResponse({ result: { usage: createFreeUsage(result.used, result.limit) } });
          }
          return rateLimitExhaustedResponse(
            createFreeUsage(
              result && typeof result.used === "number" ? result.used : 7,
              result && typeof result.limit === "number" ? result.limit : 7
            )
          );
        });
      });
    }

    if (url.indexOf("updateSubscription") !== -1) {
      return Promise.resolve(jsonResponse({ result: { success: true } }));
    }

    if (url.indexOf("processGeolocation") !== -1) {
      return Promise.all([
        new Promise(function (resolve) {
          try {
            chrome.storage.local.get(["extractedCoordinates"], function (data) {
              var coords = data && data.extractedCoordinates;
              if (coords && typeof coords.lat === "number" && typeof coords.lng === "number") {
                resolve({ lat: coords.lat, lng: coords.lng });
              } else {
                resolve({ lat: 40.3487, lng: -74.6593 });
              }
            });
          } catch (err) {
            resolve({ lat: 40.3487, lng: -74.6593 });
          }
        }),
        fetchLicenseAndUsageState(),
      ]).then(function (results) {
        var coords = results[0];
        var state = results[1];
        return jsonResponse({
          result: {
            result: {
              coordinates: { lat: coords.lat, lng: coords.lng },
              location: "Atlas prediction",
            },
            usage: getUsageObject(state),
          },
        });
      });
    }

    // Default fallback for any other cloud function
    return fetchLicenseAndUsageState().then(function (state) {
      return jsonResponse({ result: getUsageObject(state) });
    });
  };
})();
