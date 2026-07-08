/**
 * Report Layout Editor - Bridge that exposes Studio functions as globals
 *
 * This file bridges the window.Studio module (from report_card_studio.js)
 * to make all functions available as globals for HTML onclick handlers.
 *
 * Order matters: report_card_studio.js must be loaded BEFORE this file.
 */

document.addEventListener("DOMContentLoaded", function () {
  // Wait a tick to ensure Studio is defined
  if (typeof window.Studio === "undefined") {
    console.error(
      "[ReportLayout] Studio module not loaded! Make sure report_card_studio.js is included before report_layout.js",
    );
    return;
  }

  const S = window.Studio;

  // Copy all Studio methods to the global scope
  // so HTML onclick="addBlock(...)" etc. work without needing "Studio."
  Object.keys(S).forEach(function (key) {
    if (key === "blocks" || key === "selectedIds") {
      // These are getter functions, not methods — expose as properties
      window[key] = S[key];
    } else if (typeof S[key] === "function") {
      window[key] = S[key];
    }
  });

  // Expose shortcuts for special functions the HTML expects
  window.savePage = function () {
    return S.saveToServer();
  };
  window.loadPage = function () {
    const configId = window.STUDIO_DATA?.currentConfigId;
    if (configId) {
      S.loadFromServer(configId);
    } else {
      S.loadDefaults();
    }
  };

  console.log("[ReportLayout] Studio functions exposed globally");
});
