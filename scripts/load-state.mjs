// Report document/application readiness, not just the iframe load event.
// No page text, credentials or account data are included in these signals.
export function inspectDocument(doc) {
  if (!doc || !doc.body || doc.URL === 'about:blank') return { phase: 'connecting', resources: 0 };
  const resources = doc.scripts.length + doc.querySelectorAll('link[rel="stylesheet"]').length;
  if (doc.title === 'Error' || /^(Reconnexion|Ultraviolet Error)/i.test(doc.title) ||
      (doc.title === 'Scramjet' && /Uh oh|error loading/i.test(doc.body.innerText || '')))
    return { phase: 'error', resources };
  const root = doc.querySelector('#app-mount, #root, #__next, #app');
  const area = root || doc.body;
  const controls = area.querySelector('input:not([type="hidden"]),button,canvas,[role="button"]');
  const populated = root ? root.children.length > 0 : doc.readyState !== 'loading';
  const staticContent = !root && doc.readyState !== 'loading' && (area.innerText || '').trim().length > 24;
  return { phase: (populated && controls) || staticContent ? 'ready' : 'preparing', resources };
}

export function monitorFrame(frame, {
  onState, maxMs = 90000, now = () => performance.now(), intervalMs = 1000
} = {}) {
  const started = now();
  let stopped = false, timer;
  const stop = () => {
    stopped = true;
    clearInterval(timer);
    frame.removeEventListener('load', check);
  };
  const check = () => {
    if (stopped) return;
    if (!frame.isConnected) { stop(); return; }
    let state = { phase: 'preparing', resources: 0 };
    try { state = inspectDocument(frame.contentDocument); } catch {}
    const elapsed = Math.max(0, Math.floor((now() - started) / 1000));
    if (!['ready', 'error'].includes(state.phase) && now() - started >= maxMs) state.phase = 'stalled';
    if (['ready', 'error', 'stalled'].includes(state.phase)) stop();
    onState?.({ ...state, elapsed });
  };
  frame.addEventListener('load', check);
  timer = setInterval(check, intervalMs);
  queueMicrotask(check);
  return { check, stop };
}

export function createLoadNotice({ target, onRetry, onStop }) {
  let active = true, lastState = { phase: 'connecting', elapsed: 0 };
  const box = document.createElement('aside');
  box.id = 'proxy-load-state';
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');
  box.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;max-width:560px;z-index:2147483646;padding:10px 12px;border:1px solid #475569;border-radius:10px;background:#111b2fee;color:#e2e8f0;font:12px/1.5 system-ui,sans-serif;box-shadow:0 4px 20px #0004';
  const text = document.createElement('div'), actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:6px';
  const retry = document.createElement('button'), stop = document.createElement('button'), official = document.createElement('a');
  retry.textContent = 'Réessayer'; stop.textContent = 'Arrêter'; official.textContent = 'Site officiel';
  official.href = target; official.target = '_blank'; official.rel = 'noopener noreferrer';
  for (const el of [retry, stop, official]) el.style.cssText = 'border:1px solid #64748b;background:#25324b;color:#fff;border-radius:6px;padding:4px 9px;font:inherit;text-decoration:none;cursor:pointer';
  retry.onclick = onRetry;
  stop.onclick = () => { onStop?.(); show({ phase: 'stalled', elapsed: 0, stopped: true }); };
  actions.append(stop, retry, official); box.append(text, actions); document.body.append(box);
  function show(state) {
    lastState = state;
    box.hidden = !active || state.phase === 'ready';
    box.style.display = box.hidden ? 'none' : 'block';
    if (box.hidden) return;
    const ended = state.phase === 'stalled' || state.phase === 'error';
    retry.hidden = !ended; stop.hidden = ended;
    retry.style.display = ended ? 'inline-block' : 'none';
    stop.style.display = ended ? 'none' : 'inline-block';
    text.textContent = ended
      ? (state.stopped ? 'Chargement interrompu. ' : 'Le site n’a pas terminé son démarrage. ') +
        'Le cadre est conservé : réessaie manuellement ou ouvre le site officiel.'
      : `Préparation de l’application · ${state.elapsed || 0} s` +
        (state.resources ? ` · ${state.resources} fichiers référencés` : '') +
        '. Discord peut prendre plusieurs minutes au premier chargement.';
  }
  show({ phase: 'connecting', elapsed: 0 });
  return {
    show,
    setActive: value => { active = value; show(lastState); },
    remove: () => box.remove()
  };
}
