export type PartnerObservation = { paired: boolean; partnerUpToday: boolean };

/** Foreground discovery runs before pairing is known as well as afterward, so
 * remote code redemption and a failed initial request cannot strand the phone. */
export function createPartnerDiscovery(ports: {
  localDate(): string;
  fetch(date: string, signal: AbortSignal): Promise<PartnerObservation>;
  accept(observation: PartnerObservation, date: string): void;
}, initiallyForeground: boolean, timeoutMs = 5_000) {
  let foreground = initiallyForeground; let disposed = false;
  let active: Promise<void> | null = null; let controller: AbortController | null = null; let requestedAgain = false;
  function refresh(force = false): Promise<void> {
    if (disposed || !foreground) return Promise.resolve();
    if (active) { if (force) requestedAgain = true; return active; }
    const date = ports.localDate(); const requestController = new AbortController(); controller = requestController;
    active = (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const deadline = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => { requestController.abort(); reject(Error('Partner unavailable')); }, timeoutMs);
        });
        const result = await Promise.race([Promise.resolve().then(() => ports.fetch(date, requestController.signal)), deadline]);
        if (!disposed && foreground && !requestController.signal.aborted && date === ports.localDate()) ports.accept(result, date);
      } catch { /* Retry on the next foreground poll; never infer a negative state. */ }
      finally {
        clearTimeout(timer); controller = null; active = null;
        if (requestedAgain) { requestedAgain = false; void refresh(); }
      }
    })();
    return active;
  }
  return { refresh,
    setForeground(value: boolean) {
      foreground = value;
      if (!value) controller?.abort(); else void refresh(true);
    },
    dispose() { disposed = true; requestedAgain = false; controller?.abort(); },
  };
}
