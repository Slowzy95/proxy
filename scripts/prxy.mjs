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
let wispUrl = WISP_SERVERS[0];
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
    if (ok) { wispUrl = u; return u; }
  }
  return wispUrl;
}

export async function getUV(input) {
  try {
    await registerSW();
    rAlert("SW ✓");
  } catch (err) {
    rAlert(`SW failed to register.<br>${err.toString()}`);
    throw err;
  }

  let url = search(input, "https://html.duckduckgo.com/html?t=h_&q=%s");

  wispUrl = await pickWisp();
  /* Transport Epoxy (standard Ultraviolet) — toujours réappliqué avec le Wisp choisi */
  await connection.setTransport("/proxy/prxy/epoxy/index.mjs", [
    { wisp: wispUrl },
  ]);

  let viewUrl = __uv$config.prefix + __uv$config.encodeUrl(url);

  return viewUrl;
}
