import { brand } from '../theme/brand';

export const TAWK_PROPERTY_ID_DEFAULT = '6a38286a0f2eba1d56794e32';
export const TAWK_WIDGET_ID_DEFAULT = '1jrllrok0';

export const buildTawkChatUrl = (propertyId, widgetId) =>
  `https://tawk.to/chat/${propertyId}/${widgetId}`;

export const isTawkDomain = (url = '') => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'tawk.to' || host.endsWith('.tawk.to');
  } catch {
    return url.includes('tawk.to');
  }
};

export const isTawkConfigured = (propertyId, widgetId) =>
  Boolean(propertyId && widgetId && widgetId !== 'default');

/**
 * Embedded Tawk widget for in-app WebView — notifies RN via postMessage when ready.
 */
export const buildTawkEmbeddedHtml = (propertyId, widgetId, visitor = {}) => {
  const attrs = {};
  if (visitor.name) attrs.name = visitor.name;
  if (visitor.email) attrs.email = visitor.email;
  const attrsJson = JSON.stringify(attrs);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      background: ${brand.white};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #tawk-container {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .pingload-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: ${brand.white};
    }
    .pingload-loader__ring {
      width: 56px;
      height: 56px;
      border: 3px solid ${brand.orange};
      border-top-color: transparent;
      border-left-color: ${brand.blue};
      border-radius: 50%;
      animation: pingload-spin 1.2s linear infinite;
    }
    .pingload-loader__text {
      margin-top: 16px;
      font-size: 14px;
      font-weight: 700;
      color: ${brand.blue};
    }
    @keyframes pingload-spin { to { transform: rotate(360deg); } }
    /* Tawk embedded widget fills container */
    #tawk-container iframe,
    #tawk-container .tawk-min-container,
    #tawk-container .tawk-button {
      max-width: 100% !important;
    }
  </style>
</head>
<body>
  <div id="tawk-container">
    <div class="pingload-loader" id="pingload-loader">
      <div class="pingload-loader__ring"></div>
      <p class="pingload-loader__text">Connecting to Pingload Support...</p>
    </div>
  </div>
  <script>
    function notify(type, detail) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, detail: detail || null }));
      }
    }
    function hideLoader() {
      var loader = document.getElementById('pingload-loader');
      if (loader) loader.style.display = 'none';
    }
    var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
    Tawk_API.embedded = 'tawk-container';
    Tawk_API.onLoad = function () {
      hideLoader();
      var attrs = ${attrsJson};
      if (Object.keys(attrs).length && Tawk_API.setAttributes) {
        Tawk_API.setAttributes(attrs, function () {});
      }
      if (Tawk_API.maximize) Tawk_API.maximize();
      notify('tawk-loaded');
    };
    Tawk_API.onChatMaximized = function () { notify('tawk-loaded'); };
    setTimeout(function () {
      if (document.getElementById('pingload-loader') &&
          document.getElementById('pingload-loader').style.display !== 'none') {
        notify('tawk-timeout');
      }
    }, 22000);
    (function () {
      var s1 = document.createElement('script'), s0 = document.getElementsByTagName('script')[0];
      s1.async = true;
      s1.src = 'https://embed.tawk.to/${propertyId}/${widgetId}';
      s1.charset = 'UTF-8';
      s1.setAttribute('crossorigin', '*');
      s1.onerror = function () {
        hideLoader();
        notify('tawk-error', 'script');
      };
      s0.parentNode.insertBefore(s1, s0);
    })();
  </script>
</body>
</html>`;
};
