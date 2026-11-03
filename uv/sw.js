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
                            const real = new URL(url.pathname.slice(1), pageUrl);
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