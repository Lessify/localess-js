/**
 * A cache the client can read and write.
 *
 * Every method may return either a value or a promise, so a Redis- or KV-backed cache is
 * expressible without wrapping. The bundled implementations are all synchronous.
 */
export interface ICache<V> {
  set(key: string, value: V): void | Promise<void>;
  get(key: string): V | undefined | Promise<V | undefined>;
  has(key: string): boolean | Promise<boolean>;
}

export class Cache<V> implements ICache<V> {
  private cache: Map<string, V> = new Map();
  set(key: string, value: V) {
    this.cache.set(key, value);
  }

  get(key: string): V | undefined {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

export class NoCache<V> implements ICache<V> {
  set(key: string, value: V): void {
    // No-op
  }

  get(key: string): V | undefined {
    return undefined;
  }

  has(key: string): boolean {
    return false;
  }
}

export class TTLCache<V> implements ICache<V> {
  private cache = new Map<string, { value: V; expiresAt: number }>();

  /**
   * Creates a TTLCache with a specified time-to-live (TTL) for each entry.
   * default is 5 minutes (300000 ms).
   * @param ttlMs
   */
  constructor(private ttlMs: number = 300000) {}

  set(key: string, value: V) {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  get(key: string): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
}
