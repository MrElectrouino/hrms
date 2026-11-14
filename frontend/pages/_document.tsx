import { Html, Head, Main, NextScript } from 'next/document';

// Runs before the page is painted: re-applies the last known branding (colours, tab title, favicon)
// from this browser's cache, so a refresh does not flash the default look first. The app then
// refreshes it from the server (lib/branding.tsx). Keep the cache key and shape in sync with that file.
const APPLY_CACHED_BRANDING = `
(function () {
  try {
    var raw = localStorage.getItem('hrms.branding');
    if (!raw) return;
    var c = JSON.parse(raw);
    var root = document.documentElement;
    for (var k in c.vars) root.style.setProperty(k, c.vars[k]);
    if (c.branding && c.branding.appName) document.title = c.branding.appName;
    if (c.faviconHref) {
      var link = document.querySelector('link[rel="icon"]') || document.head.appendChild(document.createElement('link'));
      link.rel = 'icon';
      link.href = c.faviconHref;
    }
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_CACHED_BRANDING }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
