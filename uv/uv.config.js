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

self.__uv$config = {
  prefix: "/proxy/uv/service/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: "/proxy/uv/uv.handler.js",
  client: "/proxy/uv/uv.client.js",
  bundle: "/proxy/uv/uv.bundle.js",
  config: "/proxy/uv/uv.config.js",
  sw: "/proxy/uv/uv.sw.js",
  /* Correctif « carrés blancs » : les srcset dont les URLs contiennent des
     virgules (Cloudflare Image, utilisé par Poki et d'autres sites) sont mal
     réécrits par le client UV → URLs tronquées → images en échec. Ce petit
     script, injecté dans chaque page proxifiée, recharge les images en échec
     avec leur URL complète (attribut src d'origine, intact). */
  inject: [
    {
      host: ".",
      injectTo: "head",
      html: '<scr' + 'ipt>(function(){if(window.__wosImgFix)return;window.__wosImgFix=1;function fix(img){try{var raw=img.getAttribute("src")||"";if(!/^https?:\\/\\//.test(raw))return;if(img.getAttribute("data-wos-fixed"))return;img.setAttribute("data-wos-fixed","1");if(img.getAttribute("srcset"))img.removeAttribute("srcset");img.src=raw;}catch(e){}}document.addEventListener("error",function(e){if(e.target&&e.target.tagName==="IMG")fix(e.target);},true);setInterval(function(){try{for(var i=0;i<document.images.length;i++){var im=document.images[i];if(im.complete&&im.naturalWidth===0)fix(im);}}catch(e){}},2500);})();</scr' + 'ipt>'
    }
  ]
};
