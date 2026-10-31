import "server-only";
import Redis from "ioredis";
import { getEnvironment } from "@/server/env";
export interface KeyStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  replaceIfExists(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  delete(key: string): Promise<void>;
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  release(key: string, owner: string): Promise<void>;
  increment(key: string, ttlSeconds: number): Promise<number>;
}
export class MemoryStore implements KeyStore {
  private readonly values = new Map<string, { value: string; expires: number }>();
  async get(key: string): Promise<string | null> {
    const item = this.values.get(key);
    if (!item || item.expires <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    return item.value;
  }
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    for (const [entry, item] of this.values)
      if (item.expires <= Date.now()) this.values.delete(entry);
    if (this.values.size >= 10000 && !this.values.has(key))
      throw new Error("Local session store capacity exceeded");
    this.values.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
  async replaceIfExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const current = this.values.get(key);
    if (!current || current.expires <= Date.now()) return false;
    this.values.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    return true;
  }
  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const existing = this.values.get(key);
    if (existing && existing.expires > Date.now()) return false;
    this.values.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    return true;
  }
  async release(key: string, owner: string): Promise<void> {
    if ((await this.get(key)) === owner) await this.delete(key);
  }
  async increment(key: string, ttlSeconds: number): Promise<number> {
    const item = this.values.get(key);
    const active = item && item.expires > Date.now() ? item : undefined;
    const value = Number(active?.value ?? "0") + 1;
    this.values.set(key, {
      value: String(value),
      expires: active?.expires ?? Date.now() + ttlSeconds * 1000,
    });
    return value;
  }
}
class RedisStore implements KeyStore {
  constructor(private readonly redis: Redis) {}
  get(key: string): Promise<string | null> {
    return this.redis.get(`kheleo:web:${key}`);
  }
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`kheleo:web:${key}`, value, "EX", ttlSeconds);
  }
  async delete(key: string): Promise<void> {
    await this.redis.del(`kheleo:web:${key}`);
  }
  async replaceIfExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    return (await this.redis.set(`kheleo:web:${key}`, value, "EX", ttlSeconds, "XX")) === "OK";
  }
  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    return (await this.redis.set(`kheleo:web:${key}`, value, "EX", ttlSeconds, "NX")) === "OK";
  }
  async release(key: string, owner: string): Promise<void> {
    await this.redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      `kheleo:web:${key}`,
      owner,
    );
  }
  async increment(key: string, ttlSeconds: number): Promise<number> {
    return Number(
      await this.redis.eval(
        "local v = redis.call('incr', KEYS[1]); if v == 1 then redis.call('expire', KEYS[1], ARGV[1]) end; return v",
        1,
        `kheleo:web:${key}`,
        ttlSeconds,
      ),
    );
  }
}
const globalStore = globalThis as typeof globalThis & { kheleoStore?: KeyStore };
export function getStore(): KeyStore {
  if (!globalStore.kheleoStore) {
    const env = getEnvironment();
    globalStore.kheleoStore =
      env.SESSION_STORE === "memory"
        ? new MemoryStore()
        : new RedisStore(
            new Redis(env.REDIS_URL!, {
              lazyConnect: true,
              maxRetriesPerRequest: 1,
              commandTimeout: 5000,
              connectTimeout: 3000,
              retryStrategy: () => null,
            }),
          );
  }
  return globalStore.kheleoStore;
}
