import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyDemoSession, type DemoSession } from '../../../shared/demo/session';

const key = 'aamu.demo.v1'; // Deliberately separate from aamu.local.v1 and user identity.
let snapshot = { session: emptyDemoSession(), ready: false, error: false };
let loading: Promise<void> | null = null;
let writes = Promise.resolve();
const listeners = new Set<() => void>();
const emit = () => { for (const listener of listeners) listener(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => snapshot;
async function load() {
  if (snapshot.ready || loading) return loading;
  loading = (async () => {
    try {
      const value = await AsyncStorage.getItem(key);
      const session = value ? JSON.parse(value) as DemoSession : emptyDemoSession();
      if (session.version !== 1 || !Array.isArray(session.history) || !Array.isArray(session.restedMessageIds)) throw Error();
      snapshot = { session, ready: true, error: false };
    } catch { snapshot = { ...snapshot, ready: true, error: true }; }
    finally { loading = null; emit(); }
  })();
  return loading;
}
export function changeDemo(change: (session: DemoSession) => DemoSession) {
  const session = change(snapshot.session); if (session === snapshot.session) return;
  snapshot = { ...snapshot, session, ready: true }; emit();
  const serialized = JSON.stringify(session);
  writes = writes.then(() => AsyncStorage.setItem(key, serialized)).then(() => {
    if (snapshot.error) { snapshot = { ...snapshot, error: false }; emit(); }
  }).catch(() => { snapshot = { ...snapshot, error: true }; emit(); });
}
export function resetDemo() { changeDemo(() => emptyDemoSession()); }
export function useDemoSession(enabled: boolean) {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { if (enabled) void load(); }, [enabled]);
  return value;
}
