import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { apiGet, getUserToken, liveUrl } from './api';
import { localDate, useStore } from './store';
import { createPartnerDiscovery } from '../../shared/partner/discovery';

const refreshRequests = new Set<() => void>();
export function requestPartnerRefresh() { for (const refresh of refreshRequests) refresh(); }

type PartnerState = { paired: boolean; partnerUpToday: boolean; localDate: string };
const Context = createContext<PartnerState>({ paired: false, partnerUpToday: false, localDate: '' });
export function PartnerProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const { state } = useStore();
  const [partner, setPartner] = useState<PartnerState>(() => ({ paired: false, partnerUpToday: false, localDate: localDate() }));
  useEffect(() => {
    if (!enabled || !state.setupComplete) return;
    let alive = true; let foreground = AppState.currentState === 'active'; let paired = false;
    let socket: WebSocket | null = null; let reconnect: ReturnType<typeof setTimeout> | null = null;
    let retry = 0; let connectedDay = localDate();
    function apply(up: boolean, date: string) {
      setPartner(previous => {
        const partnerUpToday = (previous.localDate === date && previous.partnerUpToday) || up;
        return previous.paired === paired && previous.partnerUpToday === partnerUpToday && previous.localDate === date
          ? previous : { paired, partnerUpToday, localDate: date };
      });
    }
    async function connect() {
      if (!alive || !foreground || !paired || socket || Platform.OS === 'web') return;
      const token = await getUserToken(); if (!token || !alive || !foreground || socket) return;
      // React Native supports request headers as the third constructor argument;
      // DOM WebSocket typings do not. This branch is never used on web.
      const NativeSocket = WebSocket as unknown as new (url: string, protocols: undefined, options: { headers: Record<string, string> }) => WebSocket;
      const ws = new NativeSocket(liveUrl, undefined, { headers: { Authorization: `Bearer ${token}` } }); socket = ws;
      ws.onopen = () => { retry = 0; };
      ws.onmessage = event => {
        try {
          const payload = JSON.parse(String(event.data));
          if (payload.type === 'partner_up' && payload.localDate === localDate()) apply(true, payload.localDate);
        } catch { /* Ignore unknown messages; never expose server payloads to logs. */ }
      };
      ws.onerror = () => { ws.close(); };
      ws.onclose = () => {
        if (socket === ws) socket = null;
        if (alive && foreground && paired) reconnect = setTimeout(() => { void connect(); }, Math.min(30_000, 1000 * 2 ** retry++));
      };
    }
    const discovery = createPartnerDiscovery({ localDate,
      fetch: (day, signal) => apiGet<{ paired: boolean; partnerUpToday: boolean }>(`/partner?localDate=${day}`, signal),
      accept(result, day) {
        paired = result.paired; connectedDay = day; apply(result.partnerUpToday, day); void connect();
      },
    }, foreground);
    const refresh = () => { void discovery.refresh(true); };
    refreshRequests.add(refresh); void discovery.refresh();
    const polling = setInterval(() => {
      if (connectedDay !== localDate()) { connectedDay = localDate(); apply(false, connectedDay); }
      void discovery.refresh();
    }, 5000);
    const lifecycle = AppState.addEventListener('change', next => {
      foreground = next === 'active';
      discovery.setForeground(foreground);
      if (!foreground) { if (reconnect) clearTimeout(reconnect); socket?.close(); socket = null; }
    });
    return () => { alive = false; discovery.dispose(); refreshRequests.delete(refresh); clearInterval(polling); if (reconnect) clearTimeout(reconnect); lifecycle.remove(); socket?.close(); };
  }, [enabled, state.setupComplete]);
  return <Context.Provider value={partner}>{children}</Context.Provider>;
}
export const usePartner = () => useContext(Context);
