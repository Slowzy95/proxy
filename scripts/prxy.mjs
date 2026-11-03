import { registerSW } from "/proxy/prxy/register-sw.mjs";
import * as BareMux from "/proxy/prxy/baremux/index.mjs";
import { getFavicon, rAlert } from "./utils.mjs";

const connection = new BareMux.BareMuxConnection("/proxy/prxy/baremux/worker.js");

export function search(input, template) {
  try {
    return new URL(input).toString();
  } catch (err) {}

  try {
    const url = new URL(`http://${input}`);
    if (url.hostname.includes(".")) return url.toString();
  } catch (err) {}

  return template.replace("%s", encodeURIComponent(input));
}

/* Serveurs Wisp publics — le premier qui répond est utilisé (mercurywork.shop = officiel) */
const WISP_SERVERS = ["wss://wisp.mercurywork.shop/", "wss://anura.pro/wisp/"];
let wispIdx = 0;
let wispUrl = WISP_SERVERS[0];
let _transportSet = null; /* dernier serveur wisp appliqué au transport */
async function pickWisp() {
  for (const u of WISP_SERVERS) {
    const ok = await new Promise((res) => {
      try {
        const ws = new WebSocket(u);
        const t = setTimeout(() => { try { ws.close(); } catch (e) {} res(false); }, 6000);
        ws.onopen = () => { clearTimeout(t); try { ws.close(); } catch (e) {} res(true); };
        ws.onerror = () => { clearTimeout(t); res(false); };
      } catch (e) { res(false); }
    });
    if (ok) { wispUrl = u; wispIdx = WISP_SERVERS.indexOf(u); return u; }
  }
  return wispUrl;
}

/* Bascule vers le serveur wisp suivant (utilisé quand un site échoue sur le serveur actuel) */
export async function rotateWisp() {
  wispIdx = (wispIdx + 1) % WISP_SERVERS.length;
  wispUrl = WISP_SERVERS[wispIdx];
  try {
    await connection.setTransport("/proxy/prxy/epoxy/index.mjs", [{ wisp: wispUrl }]);
    _transportSet = wispUrl;
  } catch (e) {}
  return wispUrl;
}

/* Index du serveur wisp actuellement utilisé (pour recharger la page proxy
   sur le même serveur après un clic sur un lien) */
export function currentWispIndex() {
  return wispIdx;
}

/* Évite les blocages infinis : si une étape ne répond pas, on échoue
   proprement (le WebOS bascule alors de serveur wisp) */
const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label + " trop lent")), ms)),
  ]);

export async function getUV(input, wispForce) {
  try {
    await withTimeout(registerSW(), 8000, "enregistrement du service worker");
    rAlert("SW ✓");
  } catch (err) {
    rAlert(`SW failed to register.<br>${err.toString()}`);
    throw err;
  }

  let url = search(input, "https://html.duckduckgo.com/html?t=h_&q=%s");

  /* Serveur wisp forcé (?wisp=N) — utilisé par le WebOS quand un serveur
     est lent/bloqué : la page proxy doit REJOUER le chargement sur un
     autre serveur sans re-sonder tous les serveurs. */
  const forced = WISP_SERVERS[wispForce];
  if (typeof wispForce === "number" && wispForce >= 0 && forced) {
    wispUrl = forced;
    wispIdx = wispForce;
  } else {
    wispUrl = await pickWisp();
  }
  /* Transport Epoxy (standard Ultraviolet) — réappliqué SEULEMENT si le
   serveur a changé : reconfigurer le transport pendant qu'une page est
   affichée faisait planter le rendu (crash au clic sur les jeux). */
  if (_transportSet !== wispUrl) {
    await withTimeout(
      connection.setTransport("/proxy/prxy/epoxy/index.mjs", [{ wisp: wispUrl }]),
      10000,
      "connexion au serveur wisp"
    );
    _transportSet = wispUrl;
  }

  let viewUrl = __uv$config.prefix + __uv$config.encodeUrl(url);

  return viewUrl;
}
