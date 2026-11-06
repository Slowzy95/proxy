// UV config

// L bare stealers, we use wisp ;)
//  ⠀⠀⠀       ⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⠟⢻⡀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠹⣿⣳⠖⠳⣄⡀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⡤⠒⠀⠂⡾⠉⠀⠀⠀⠀⠀⠀⠉⢳⡄⣄⡀⠀⠀
//  ⠀⠀⠀⢸⡥⠀⣀⡼⢁⠀⢰⡄⠀⡄⠀⠀⣧⠀⠙⡆⠀
//  ⠀⢀⣠⠼⠗⠚⠉⠠⠋⠀⠀⢷⣣⣧⠀⠀⠈⠳⢤⣇⠀
//  ⠀⣾⣟⠒⠦⣄⠀⠀⠀⠀⣠⡴⠋⠁⢈⠛⢦⣄⣠⣴⣾⣷
//  ⢀⡟⠙⢶⣤⠬⠷⣼⡏⠉⠉⢩⡍⠹⠦⢤⣿⣤⣨⣿⠈
//  ⡾⣡⠆⠁⠀⠀⠀⢠⡀⠀⠀⠀⢱⡀⠀⠂⠙⠎⠻⡅⠀
//  ⢿⠁⠒⣤⠤⣤⣀⠀⢧⠀⠀⠀⣸⠃⠀⠀⠀⡶⣤⣽⠀
//  ⠈⠳⣴⡇⠀⠀⠈⠛⢦⣄⣠⠾⢿⣄⣀⣠⠾⣡⠞⠁⠀
//  ⠀⠀⠈⠉⠉⠉⠁⢧⢠⠟⣽⠀⢿⠁⢧⢰⡈⠀⠀⠀⠀⠀

// Preserve the application's blob compatibility fix without editing the
// vendor handler. A page-created blob belongs to this browser, not Wisp.
(() => {
  const uvRewriteURL = Ultraviolet.prototype.rewriteUrl;
  Ultraviolet.prototype.rewriteUrl = function (input, meta) {
    const url = typeof input === "string" ? input : input?.href || input?.url;
    if (typeof url === "string" && url.startsWith("blob:")) {
      if (this.blobUrls?.has(url)) return this.blobUrls.get(url);
      if (url.startsWith("blob:" + location.origin + "/")) return url;
    }
    return uvRewriteURL.call(this, input, meta);
  };
})();

// UV's ImportExpression rewriter emits rewriteImport(base, specifier), whereas
// the 3.2.10 runtime method interprets those arguments in the opposite order.
// Resolve the specifier against the importing module, not the document URL.
Ultraviolet.prototype.rewriteImport = function (base, specifier, meta = this.meta) {
  return this.rewriteUrl(specifier, { ...meta, base });
};

self.__uv$config = {
  prefix: "/proxy/uv/service/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: "/proxy/uv/uv.handler.js?v=43",
  client: "/proxy/uv/uv.client.js?v=43",
  bundle: "/proxy/uv/uv.bundle.js?v=43",
  config: "/proxy/uv/uv.config.js?v=43",
  sw: "/proxy/uv/uv.sw.js?v=43",
};
