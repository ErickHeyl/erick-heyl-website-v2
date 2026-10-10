import type { RedisLike } from "../src/lib/requestStore";

/** Minimal in-memory stand-in for the @upstash/redis commands RedisRequestStore uses. */
export class FakeRedis implements RedisLike {
  hashes = new Map<string, Map<string, string>>();
  strings = new Map<string, { value: number; expiresAt?: number }>();
  now = () => Date.now();

  private h(key: string) {
    let m = this.hashes.get(key);
    if (!m) this.hashes.set(key, (m = new Map()));
    return m;
  }
  async hget(key: string, field: string) {
    return this.hashes.get(key)?.get(field) ?? null;
  }
  async hgetall(key: string) {
    const m = this.hashes.get(key);
    return m && m.size ? Object.fromEntries(m) : null;
  }
  async hset(key: string, values: Record<string, string | number>) {
    const m = this.h(key);
    let added = 0;
    for (const [f, v] of Object.entries(values)) {
      if (!m.has(f)) added++;
      m.set(f, String(v));
    }
    return added;
  }
  async hsetnx(key: string, field: string, value: string) {
    const m = this.h(key);
    if (m.has(field)) return 0;
    m.set(field, value);
    return 1;
  }
  async hexists(key: string, field: string) {
    return this.hashes.get(key)?.has(field) ? 1 : 0;
  }
  async hincrby(key: string, field: string, increment: number) {
    const m = this.h(key);
    const v = Number(m.get(field) ?? 0) + increment;
    m.set(field, String(v));
    return v;
  }
  async hdel(key: string, ...fields: string[]) {
    const m = this.hashes.get(key);
    let n = 0;
    for (const f of fields) if (m?.delete(f)) n++;
    return n;
  }
  private live(key: string) {
    const s = this.strings.get(key);
    if (s?.expiresAt !== undefined && s.expiresAt <= this.now()) {
      this.strings.delete(key);
      return undefined;
    }
    return s;
  }
  async incr(key: string) {
    const s = this.live(key) ?? { value: 0 };
    s.value += 1;
    this.strings.set(key, s);
    return s.value;
  }
  async expire(key: string, seconds: number) {
    const s = this.live(key);
    if (!s) return 0;
    s.expiresAt = this.now() + seconds * 1000;
    return 1;
  }
  async ttl(key: string) {
    const s = this.live(key);
    if (!s) return -2;
    return s.expiresAt === undefined ? -1 : Math.ceil((s.expiresAt - this.now()) / 1000);
  }
  async del(...keys: string[]) {
    let n = 0;
    for (const k of keys) if (this.hashes.delete(k) || this.strings.delete(k)) n++;
    return n;
  }
}
