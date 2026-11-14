import test from 'node:test';
import assert from 'node:assert/strict';
import type { Redis } from 'ioredis';
import { createValkeyStore } from '../src/runtime/valkey.ts';

// Adapter command contract only; live Valkey acceptance is separate.
test('until-used code uses NX without expiry; positive TTL still uses EX and duplicate codes never overwrite', async () => {
  const values = new Map<string, string>(); const commands: unknown[][] = [];
  const client = { async set(key: string, value: string, ...options: unknown[]) {
    commands.push([key, value, ...options]);
    if (values.has(key)) return null; values.set(key, value); return 'OK';
  } } as unknown as Redis;
  const subscriber = { on() {} } as unknown as Redis;
  const store = createValkeyStore(client, subscriber);
  assert.equal(await store.createCode('ABC234', 'owner', 0), true);
  assert.deepEqual(commands[0], ['aamu:pair-code:ABC234', 'owner', 'NX']);
  assert.equal(await store.createCode('ABC234', 'different-owner', 0), false);
  assert.equal(values.get('aamu:pair-code:ABC234'), 'owner');
  assert.equal(await store.createCode('BCD345', 'owner', 300), true);
  assert.deepEqual(commands.at(-1), ['aamu:pair-code:BCD345', 'owner', 'EX', 300, 'NX']);
});

test('atomic owner-checked consumption cannot delete another owner or redeem the same code twice', async () => {
  const values = new Map([['aamu:pair-code:ABC234', 'owner']]); const scripts: string[] = [];
  const client = { async eval(script: string, keyCount: number, key: string, owner: string) {
    scripts.push(script); assert.equal(keyCount, 1);
    if (values.get(key) !== owner) return 0; values.delete(key); return 1;
  } } as unknown as Redis;
  const store = createValkeyStore(client, { on() {} } as unknown as Redis);
  assert.equal(await store.consumeCode('ABC234', 'wrong-owner'), false);
  assert.equal(values.has('aamu:pair-code:ABC234'), true);
  assert.deepEqual(await Promise.all([store.consumeCode('ABC234', 'owner'), store.consumeCode('ABC234', 'owner')]), [true, false]);
  assert.equal(values.has('aamu:pair-code:ABC234'), false);
  assert.ok(scripts.every(script => /GET.*ARGV\[1\].*DEL/.test(script)));
});
