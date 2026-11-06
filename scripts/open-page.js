/* Shared popup routing for both proxy engines. No credentials or page contents
   are sent to the parent: only the destination URL of a new navigation. */
(function () {
  'use strict';
  window.wosOpenPage = function (value) {
    let url;
    try {
      url = new URL(String(value));
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    } catch (e) { return null; }
    if (window.parent !== window && window.parent === window.parent.parent) {
      parent.postMessage({ wosNewTab: url.href }, location.origin);
      return null;
    }
    const destination = new URL(location.href);
    destination.searchParams.set('url', url.href);
    return window.open(destination.href, '_blank', 'noopener,noreferrer');
  };
})();
