# Ultraviolet runtime

The four runtime files `uv.bundle.js`, `uv.client.js`, `uv.handler.js` and
`uv.sw.js` are from the same npm release, `@titaniumnetwork-dev/ultraviolet`
3.2.10 (MIT). The license is included as `LICENSE.ultraviolet`.

Package: https://registry.npmjs.org/@titaniumnetwork-dev/ultraviolet/-/ultraviolet-3.2.10.tgz

The previous runtime mixed incompatible WebSocket interceptor interfaces:
the client emitted an `args` event while the handler expected `url` and
`protocols`. Do not update these files individually.

One local compatibility patch is appended to `uv.client.js`: standard
`postMessage(message, options)` dictionary overloads are normalized before
UV intercepts them, including dynamically wrapped other windows. Transfer
lists are retained. This changes no URL, fingerprint, CAPTCHA or origin policy.

`sw.js`, `uv.config.js` and `blank.html` are application-owned entry points.
They are not replaced by npm's example config.

`uv.config.js` also aligns `rewriteImport(base, specifier)` with the argument
order emitted by 3.2.10's `ImportExpression` rewriter. Without this correction,
dynamic imports can fetch the importing module again instead of their chunk.

The application's existing page-created blob compatibility fix is retained in
`uv.config.js`, rather than modifying the vendor handler. Known virtual blob
URLs resolve through the page's `blobUrls` map; physical local blob URLs are
not sent through the remote Wisp transport.
