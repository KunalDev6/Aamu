import type { ClinicState } from './clinic.ts';

type CallbackState = ClinicState & { demoIdentityHash?: string };

/** Rejoin before requesting, even if restored local settings say connected.
 * An old identity/setting response cannot confirm the current person's request. */
export async function requestClinicCallback<T extends CallbackState>(ports: {
  prepareIdentity(): Promise<void>;
  read(): T;
  update(change: (state: T) => T): void;
  flushSharing(): Promise<boolean>;
  post(): Promise<{ demo: true; callbackRequestedAt: number }>;
}): Promise<number> {
  await ports.prepareIdentity();
  if (!ports.read().clinicSharing?.enabled) throw Error('Clinic is not connected');
  ports.update(state => ({ ...state, clinicSharing: state.clinicSharing && {
    ...state.clinicSharing, revision: state.clinicSharing.revision + 1, syncPending: true,
    callbackRequestedAt: undefined,
  } }));
  if (!await ports.flushSharing()) throw Error('Clinic could not connect');
  const sent = ports.read();
  const sharing = sent.clinicSharing;
  if (!sharing?.enabled || sharing.syncPending) throw Error('Clinic is not connected');
  const response = await ports.post();
  if (response.demo !== true || !Number.isSafeInteger(response.callbackRequestedAt) || response.callbackRequestedAt <= 0) throw Error('Invalid clinic response');
  let accepted = false;
  ports.update(state => {
    const current = state.clinicSharing;
    if (state.demoIdentityHash !== sent.demoIdentityHash || !current?.enabled || current.syncPending ||
      current.revision !== sharing.revision || current.code !== sharing.code) return state;
    accepted = true;
    return { ...state, clinicSharing: { ...current, callbackRequestedAt: response.callbackRequestedAt } };
  });
  if (!accepted) throw Error('Clinic settings changed');
  return response.callbackRequestedAt;
}
