/** Five-second foreground polling, with one request and no stale hidden responses. */
export function createClinicPolling({ load, onData, onError, onLoading = () => {}, visible = true,
  intervalMs = 5_000, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let disposed = false;
  let foreground = visible;
  let timer = null;
  let controller = null;
  let version = 0;
  let pending = null;
  function clear() { if (timer !== null) clearTimer(timer); timer = null; }
  function refresh() {
    if (disposed || !foreground) return Promise.resolve();
    if (pending) return pending;
    clear();
    const current = ++version;
    controller = new AbortController();
    const signal = controller.signal;
    onLoading(true);
    pending = Promise.resolve().then(() => load(signal)).then(data => {
      if (!disposed && foreground && current === version) onData(data);
    }).catch(() => {
      if (!disposed && foreground && current === version && !signal.aborted) onError();
    }).finally(() => {
      if (current !== version) return;
      pending = null; controller = null; onLoading(false);
      if (!disposed && foreground) timer = setTimer(() => { timer = null; void refresh(); }, intervalMs);
    });
    return pending;
  }
  function stopRequest() {
    clear(); version += 1; controller?.abort(); controller = null; pending = null; onLoading(false);
  }
  return {
    refresh,
    setVisible(value) {
      if (disposed || value === foreground) return;
      foreground = value;
      if (!foreground) stopRequest(); else void refresh();
    },
    dispose() { if (disposed) return; disposed = true; stopRequest(); },
  };
}
