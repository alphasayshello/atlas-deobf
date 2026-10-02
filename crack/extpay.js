/*! Copyright (c) 2026 Tildra LLC. All rights reserved. ATLAS for GeoGuessr. Proprietary; unauthorized copying, distribution, or reverse engineering is prohibited. https://geoguessrcheats.com/terms */
(function () {
  "use strict";

  // cracked by bamber
  var defaultMockUser = {
    paid: true,
    paidAt: new Date("2024-01-01T00:00:00.000Z"),
    email: "cracked by bamber",
    userId: "cracked by bamber",
    trialStartedAt: new Date("2024-01-01T00:00:00.000Z"),
    trialEnded: false,
    subscriptionStatus: "active",
    paymentFailed: false,
    subscriptionCancelled: false,
    subscriptionExpired: false,
    multiplePaymentAttempts: false,
    subscriptionEndDate: new Date("2099-01-01T00:00:00.000Z"),
    expirationDate: new Date("2099-01-01T00:00:00.000Z"),
    installedAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  /**
   * Mock ExtensionPay client implementation that delegates license checks to the background worker.
   */
  function createExtPayClient() {
    return {
      getUser: function () {
        return new Promise(function (resolve) {
          function resolveWithProStatus(isPro) {
            resolve(
              Object.assign({}, defaultMockUser, {
                paid: true,
                subscriptionStatus: "active",
                subscriptionExpired: false,
                subscriptionCancelled: false,
              })
            );
          }

          try {
            chrome.runtime.sendMessage({ action: "getLicense" }, function (res) {
              resolveWithProStatus(true);
            });
          } catch (err) {
            resolveWithProStatus(true);
          }
        });
      },
      onPaid: {
        addListener: function () {},
        removeListener: function () {},
      },
      onTrialStarted: {
        addListener: function () {},
        removeListener: function () {},
      },
      openPaymentPage: function () {},
      openTrialPage: function () {},
      openLoginPage: function () {},
      startBackground: function () {},
      getPlans: function () {
        return Promise.resolve([]);
      },
    };
  }

  if (typeof window !== "undefined") {
    window.ExtPay = createExtPayClient;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.ExtPay = createExtPayClient;
  }
})();
