/*! Copyright (c) 2026 Tildra LLC. All rights reserved. ATLAS for GeoGuessr. Proprietary; unauthorized copying, distribution, or reverse engineering is prohibited. https://geoguessrcheats.com/terms */
(function () {
  try {
    if (localStorage.getItem("atlasTheme") === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch (err) {}
})();
