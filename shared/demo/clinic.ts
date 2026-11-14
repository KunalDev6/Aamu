export type ClinicSharing = { enabled: boolean; code: string; revision: number; syncedRevision?: number;
  syncPending: boolean; callbackRequestedAt?: number };
export type ClinicState = { clinicSharing?: ClinicSharing };

export function clinicSharingPayload(sharing: ClinicSharing) {
  return { enabled: sharing.enabled, ...(sharing.enabled ? { code: sharing.code.trim().toUpperCase() } : {}) };
}
export function changeClinicSharing<T extends ClinicState>(state: T, enabled: boolean, code: string): T {
  const previous = state.clinicSharing;
  const normalized = code.trim().toUpperCase();
  if (previous?.enabled === enabled && previous.code === normalized && !previous.syncPending) return state;
  return { ...state, clinicSharing: { ...previous, enabled, code: normalized,
    revision: (previous?.revision ?? 0) + 1, syncPending: true } };
}
export function acknowledgeClinicSharing<T extends ClinicState>(state: T, sent: ClinicSharing): T {
  const current = state.clinicSharing;
  if (!current || current.revision !== sent.revision || current.enabled !== sent.enabled || current.code !== sent.code) return state;
  return { ...state, clinicSharing: { ...current, syncPending: false, syncedRevision: sent.revision } };
}

/** One serialized queue per store. A failed request stays pending for retry. */
export function createClinicSynchronizer<T extends ClinicState>(ports: {
  read(): T; update(change: (state: T) => T): void;
  put(payload: ReturnType<typeof clinicSharingPayload>, signal: AbortSignal): Promise<{ demo: true; enabled: boolean }>;
}) {
  let active: Promise<boolean> | null = null;
  async function run(): Promise<boolean> {
    while (ports.read().clinicSharing?.syncPending) {
      const sent = ports.read().clinicSharing!;
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 5_000);
      try {
        const result = await ports.put(clinicSharingPayload(sent), controller.signal);
        if (result.demo !== true || result.enabled !== sent.enabled) return false;
        ports.update(state => acknowledgeClinicSharing(state, sent));
      } catch { return false; }
      finally { clearTimeout(timeout); }
    }
    return true;
  }
  return { flush(): Promise<boolean> {
    if (!active) active = run().finally(() => { active = null; });
    return active;
  } };
}
