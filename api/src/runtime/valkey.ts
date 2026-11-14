import { Redis } from 'ioredis';
import type { LiveStore, PartnerEvent } from './contracts.ts';

const codeKey = (code: string) => `aamu:pair-code:${code}`;
const channel = 'aamu:partner-events';
export function createValkeyStore(client: Redis, subscriber: Redis): LiveStore & { start(): Promise<void>; close(): Promise<void> } {
  const listeners = new Set<(userId: string, event: PartnerEvent) => void>();
  subscriber.on('message', (source, payload) => {
    if (source !== channel) return;
    try {
      const value = JSON.parse(payload);
      if (typeof value.userId !== 'string' || value.event?.type !== 'partner_up' || typeof value.event.localDate !== 'string') return;
      for (const listener of listeners) listener(value.userId, { type: 'partner_up', localDate: value.event.localDate });
    } catch { /* Never log malformed data or personal payloads. */ }
  });
  return {
    async start() { await Promise.all([client.connect(), subscriber.connect()]); await subscriber.subscribe(channel); },
    async close() { client.disconnect(); subscriber.disconnect(); },
    async health() { await Promise.all([client.ping(), subscriber.ping()]); },
    async createCode(code, ownerId, ttlSeconds) {
      // Explicit zero means valid until redeemed; never pass EX 0 to Valkey.
      return (ttlSeconds === 0
        ? await client.set(codeKey(code), ownerId, 'NX')
        : await client.set(codeKey(code), ownerId, 'EX', ttlSeconds, 'NX')) === 'OK';
    },
    codeOwner: code => client.get(codeKey(code)),
    async consumeCode(code, ownerId) {
      return await client.eval("if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end", 1, codeKey(code), ownerId) === 1;
    },
    async publish(userId, event) { await client.publish(channel, JSON.stringify({ userId, event })); },
    onEvent(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
