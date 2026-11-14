export type SessionTokenStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** A browser demo token lives only in this tab's session storage. Normal web
 * previews remain memory-only; native credentials never use this helper. */
export function createBrowserIdentity(options: {
  demo: boolean;
  scope: string;
  storage(): SessionTokenStorage | null;
  digest(value: string): Promise<string>;
}) {
  const key = `aamu.presenter-demo.identity.v1:${options.scope}`;
  let token: string | null | undefined;
  let fingerprint: { token: string; value: Promise<string> } | undefined;
  const listeners = new Set<(hash: string) => void>();
  function getToken(): string | null {
    if (token !== undefined) return token;
    token = null;
    if (options.demo) {
      try { token = options.storage()?.getItem(key) || null; } catch { /* Memory-only if browser storage is denied. */ }
    }
    return token;
  }
  async function getHash(): Promise<string | null> {
    const current = getToken();
    if (!options.demo || !current) return null;
    if (fingerprint?.token !== current) fingerprint = { token: current, value: options.digest(`${options.scope}\0${current}`) };
    return fingerprint.value;
  }
  return {
    getToken, getHash,
    async setToken(value: string): Promise<void> {
      token = value;
      if (options.demo) {
        try { options.storage()?.setItem(key, value); } catch { /* Keep this launch usable without claiming refresh persistence. */ }
        const hash = await getHash();
        if (hash) for (const listener of listeners) listener(hash);
      }
    },
    subscribe(listener: (hash: string) => void): () => void {
      listeners.add(listener); return () => { listeners.delete(listener); };
    },
  };
}
