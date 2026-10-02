/*! Copyright (c) 2026 Tildra LLC. All rights reserved. ATLAS for GeoGuessr. Proprietary; unauthorized copying, distribution, or reverse engineering is prohibited. https://geoguessrcheats.com/terms */
(function () {
  "use strict";

  var i18nBackend =
    typeof chrome !== "undefined" && chrome.i18n
      ? chrome.i18n
      : typeof browser !== "undefined" && browser.i18n
        ? browser.i18n
        : null;

  /**
   * Retrieves a localized string by key using chrome.i18n.
   * Falls back to returning the key if translation is missing.
   */
  function translate(key, substitutions) {
    if (!i18nBackend) return key;
    var message = null;
    try {
      message = i18nBackend.getMessage(key, substitutions);
    } catch (err) {
      message = null;
    }
    return typeof message === "string" && message.length ? message : key;
  }

  // Maps data-i18n attributes to target HTML attributes (null means set text content)
  var ATTRIBUTE_MAP = {
    "data-i18n": null,
    "data-i18n-title": "title",
    "data-i18n-aria-label": "aria-label",
    "data-i18n-placeholder": "placeholder",
    "data-i18n-alt": "alt",
    "data-i18n-tooltip": "data-tooltip",
  };

  function updateElementText(element, translatedText) {
    if (element.children.length > 0) {
      var replaced = false;
      for (var i = 0; i < element.childNodes.length; i++) {
        var node = element.childNodes[i];
        if (node.nodeType === 3) {
          // Node.TEXT_NODE
          node.nodeValue = replaced ? "" : translatedText + " ";
          replaced = true;
        }
      }
      if (!replaced) {
        element.insertBefore(document.createTextNode(translatedText + " "), element.firstChild);
      }
    } else {
      element.textContent = translatedText;
    }
  }

  /**
   * Scans a DOM root and applies translations to all elements with data-i18n attributes.
   */
  function applyI18n(rootElement) {
    var root = rootElement || document;
    Object.keys(ATTRIBUTE_MAP).forEach(function (attrName) {
      var targetAttr = ATTRIBUTE_MAP[attrName];
      var matchingElements = root.querySelectorAll("[" + attrName + "]");
      for (var i = 0; i < matchingElements.length; i++) {
        var el = matchingElements[i];
        var i18nKey = el.getAttribute(attrName);
        if (i18nKey) {
          var translated = translate(i18nKey);
          if (targetAttr === null) {
            updateElementText(el, translated);
          } else {
            el.setAttribute(targetAttr, translated);
          }
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applyI18n(document);
    });
  } else {
    applyI18n(document);
  }

  window.t = translate;
  window.applyI18n = applyI18n;
})();
