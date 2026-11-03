/*global UVServiceWorker,__uv$config*/
/*
 * Stock service worker script.
 * Users can provide their own sw.js if they need to extend the functionality of the service worker.
 * Ideally, this will be registered under the scope in uv.config.js so it will not need to be modified.
 * However, if a user changes the location of uv.bundle.js/uv.config.js or sw.js is not relative to them, they will need to modify this script locally.
 */
importScripts('uv.bundle.js');
importScripts('uv.config.js?v=4'); /* v4 — correctif images déplacé côté page proxy */
importScripts(__uv$config.sw || 'uv.sw.js');

const uv = new UVServiceWorker();

async function handleRequest(event) {
    if (uv.route(event)) {
        /* Le site a calculé une URL contre l'origine RÉELLE du proxy (ex: Bloxd.io
           « window.location.origin » → http://…/index/metrics/cookies) : la cible
           décodée est notre propre origine. On la redirige vers le vrai site. */
        try {
            const rq = event.request;
            const encPart = new URL(rq.url).pathname.slice(__uv$config.prefix.length);
            const dec = new URL(__uv$config.decodeUrl(encPart.split('/')[0]) + (encPart.indexOf('/') > -1 ? encPart.slice(encPart.indexOf('/')) : '') + new URL(rq.url).search);
            if (dec.origin === location.origin && !dec.pathname.startsWith('/proxy/')) {
                let ref1 = rq.referrer || '';
                if (!ref1.startsWith(location.origin + __uv$config.prefix)) {
                    const c1 = event.clientId ? await self.clients.get(event.clientId) : null;
                    if (c1 && c1.url.startsWith(location.origin + __uv$config.prefix)) ref1 = c1.url;
                }
                if (ref1.startsWith(location.origin + __uv$config.prefix)) {
                    const e1 = new URL(ref1).pathname.slice(__uv$config.prefix.length).split('/')[0];
                    const site1 = new URL(__uv$config.decodeUrl(e1));
                    if (site1.origin !== location.origin) {
                        const real1 = new URL(dec.pathname + dec.search, site1.origin + '/');
                        return Response.redirect(location.origin + __uv$config.prefix + __uv$config.encodeUrl(real1.href), 307);
                    }
                }
            }
        } catch (err) {}
        return await uv.fetch(event);
    }

    /* Rattrapage « fichiers perdus » : certains sites (ex: Bloxd.io) calculent
       des URLs de scripts RELATIVES qui, une fois proxifiés, sortent du préfixe
       du proxy (ex: /proxy/static/js/... → 404). Si la requête vient d'une page
       affichée via le proxy (referer encodé) et renvoie un 404, on reconstruit
       la vraie URL (page d'origine + chemin relatif) et on redirige vers sa
       version proxifiée — les scripts du jeu se chargent alors. */
    try {
        const req = event.request;
        {
            const url0 = new URL(req.url);
            if (
                url0.origin === location.origin &&
                !url0.pathname.startsWith(__uv$config.prefix) &&
                !url0.pathname.startsWith('/proxy/') &&
                (req.method !== 'GET' || url0.pathname.startsWith('/index/'))
            ) {
                /* Requête d'API calculée contre la vraie origine du proxy (ex: Bloxd.io
                   « /index/metrics/cookies » → « Can't connect to Bloxd ») : on la
                   renvoie vers le vrai site, via le proxy (307 = méthode et corps conservés). */
                let ref0 = req.referrer || '';
                if (!ref0.startsWith(location.origin + __uv$config.prefix)) {
                    const c0 = event.clientId ? await self.clients.get(event.clientId) : null;
                    if (c0 && c0.url.startsWith(location.origin + __uv$config.prefix)) ref0 = c0.url;
                }
                if (ref0.startsWith(location.origin + __uv$config.prefix)) {
                    const enc0 = new URL(ref0).pathname.slice(__uv$config.prefix.length).split('/')[0];
                    if (enc0) {
                        const site0 = new URL(__uv$config.decodeUrl(enc0));
                        const real0 = new URL(url0.pathname + url0.search, site0.origin + '/');
                        return Response.redirect(location.origin + __uv$config.prefix + __uv$config.encodeUrl(real0.href), 307);
                    }
                }
            }
        }
        if (req.method === 'GET') {
            const url = new URL(req.url);
            if (
                url.origin === location.origin &&
                !url.pathname.startsWith(__uv$config.prefix)
            ) {
                /* Le WebOS envoie les requêtes sans referer (no-referrer) :
                   on identifie la page d'origine via le CLIENT de la requête
                   (l'URL de l'iframe qui la fait = l'URL encodée du site). */
                let ref = req.referrer || '';
                if (!ref.startsWith(location.origin + __uv$config.prefix)) {
                    const client = event.clientId
                        ? await self.clients.get(event.clientId)
                        : null;
                    if (client && client.url.startsWith(location.origin + __uv$config.prefix))
                        ref = client.url;
                }
                if (ref.startsWith(location.origin + __uv$config.prefix)) {
                    const res = await fetch(req);
                    if (res.status === 404) {
                        const refUrl = new URL(ref);
                        const enc = refUrl.pathname
                            .slice(__uv$config.prefix.length)
                            .split('/')[0];
                        if (enc) {
                            const pageUrl = __uv$config.decodeUrl(enc);
                            /* Le site a résolu son chemin relatif contre la
                               racine du proxy (/proxy/) : on remplace par la
                               racine du VRAI site (ex: /proxy/static/js/x.js
                               → https://bloxd.io/static/js/x.js). */
                            const rel = url.pathname.startsWith('/proxy/')
                                ? url.pathname.slice('/proxy/'.length)
                                : url.pathname.replace(/^\//, '');
                            const real = new URL(
                                rel,
                                new URL(pageUrl).origin + '/'
                            );
                            const target =
                                location.origin +
                                __uv$config.prefix +
                                __uv$config.encodeUrl(real.href);
                            return Response.redirect(target, 302);
                        }
                    }
                    return res;
                }
            }
        }
    } catch (err) {}

    return await fetch(event.request)
}

self.addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
});

/* Mises à jour immédiates : la nouvelle version du Service Worker
   s'active dès son installation (pas d'attente des anciens clients). */
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });