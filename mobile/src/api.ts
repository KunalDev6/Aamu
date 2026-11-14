import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { GoalSyncRequest, GoalSyncResponse } from '../../src/goals/sync';
import { demoEnabled } from './demo/config';
import { demoDataHeaders } from './demo/seed';

const baseUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const tokenKey = 'aamu.user-token';
let webToken: string | null = null;
let creatingIdentity: Promise<string> | null = null;
export class ConnectionError extends Error {
  constructor() { super('Aamu could not connect. Please try again.'); }
}
export async function getUserToken(): Promise<string | null> {
  return Platform.OS === 'web' ? webToken : SecureStore.getItemAsync(tokenKey);
}
export async function storeUserToken(token: string): Promise<void> {
  if (Platform.OS === 'web') webToken = token;
  else await SecureStore.setItemAsync(tokenKey, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
async function verifyDemoNamespace(token: string, signal?: AbortSignal): Promise<void> {
  // Old listeners may ignore an unknown header. Probe read-only and fail closed
  // before any fixture replacement/upload until the isolated API is deployed.
  const response = await fetch(`${baseUrl}/goals/revision`, { signal,
    headers: { Authorization: `Bearer ${token}`, 'X-Aamu-Demo': 'true' } });
  if (!response.ok) throw new ConnectionError();
  const body = await response.json();
  if (body.demo !== true || !Number.isSafeInteger(body.revision)) throw new ConnectionError();
}
async function request<T>(path: string, method: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const token = await ensureIdentity();
  if (method === 'PUT' && Object.keys(demoDataHeaders(path, demoEnabled)).length) await verifyDemoNamespace(token, signal);
  const response = await fetch(`${baseUrl}${path}`, {
    method, signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...demoDataHeaders(path, demoEnabled) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new ConnectionError();
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (demoEnabled && path === '/goals/revision' && result.demo !== true) throw new ConnectionError();
  return result;
}
export async function ensureIdentity(): Promise<string> {
  const existing = await getUserToken();
  if (existing) return existing;
  if (!creatingIdentity) creatingIdentity = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${baseUrl}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: controller.signal });
      if (!response.ok) throw new ConnectionError();
      const body = await response.json();
      if (typeof body.token !== 'string' || !body.token) throw new ConnectionError();
      await storeUserToken(body.token);
      return body.token;
    } finally { clearTimeout(timeout); creatingIdentity = null; }
  })();
  return creatingIdentity;
}
export function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, 'POST', body, signal);
}
export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, 'GET', undefined, signal);
}
export function apiPut<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, 'PUT', body, signal);
}
export const liveUrl = `${baseUrl.replace(/^http/, 'ws')}/live`;
export async function apiPutGoals(snapshot: GoalSyncRequest, signal: AbortSignal): Promise<GoalSyncResponse> {
  const token = await ensureIdentity();
  if (demoEnabled) await verifyDemoNamespace(token, signal);
  const response = await fetch(`${baseUrl}/goals`, { method: 'PUT', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...demoDataHeaders('/goals', demoEnabled) }, body: JSON.stringify(snapshot) });
  if (!response.ok && response.status !== 409) throw new ConnectionError();
  const body = await response.json();
  if (!Number.isSafeInteger(body.revision) || body.revision < 0) throw new ConnectionError();
  return { status: response.status === 409 ? 'conflict' : 'applied', revision: body.revision };
}
export async function checkConnection(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    return response.ok;
  } catch { return false; } finally { clearTimeout(timeout); }
}
