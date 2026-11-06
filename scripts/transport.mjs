// All pages share BareMux. Reopening a tab must not reset active game sockets.
export async function ensureProxyTransport(connection, path, options, { reuseExisting = false } = {}) {
  if (!['/proxy/prxy/epoxy/index.mjs', '/proxy/prxy/libcurl/index.mjs'].includes(path))
    throw new Error('Transport inconnu');
  const label = 'webos-v43:' + JSON.stringify([path, options]);
  const configure = async () => {
    const current = await connection.getTransport();
    if (current && (reuseExisting || current === label)) return false;
    const factory = `const { default: Transport } = await import(${JSON.stringify(path)}); return [Transport, ${JSON.stringify(label)}];`;
    await connection.setManualTransport(factory, options);
    return true;
  };
  if (globalThis.navigator?.locks?.request)
    return navigator.locks.request('webos-baremux-transport', configure);
  return configure();
}
