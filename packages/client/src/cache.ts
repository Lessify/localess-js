import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface ICache<V> {
  set(key: string, value: V): void;
  get(key: string): V | undefined;
  has(key: string): boolean;
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

export class TTLCache<V> {
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

export class FileSystemCache<V> implements ICache<V> {
  private dir: string;
  private ttlMs: number;

  /**
   * Creates a FileSystemCache that persists entries as JSON files on disk.
   * Shared across all processes that point to the same directory, making it
   * suitable for Next.js parallel build workers.
   * @param dir  Directory to store cache files. Default: '.localess-cache'
   * @param ttlMs  Time-to-live in ms. Default: 5 minutes (300000 ms).
   */
  constructor(dir: string = '.localess/cache', ttlMs: number = 300000) {
    this.dir = dir;
    this.ttlMs = ttlMs;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private keyToPath(key: string): string {
    const hash = createHash('md5').update(key).digest('hex');
    return join(this.dir, `${hash}.json`);
  }

  set(key: string, value: V): void {
    try {
      writeFileSync(this.keyToPath(key), JSON.stringify({ value, expiresAt: Date.now() + this.ttlMs }));
    } catch {
      // ignore write errors
    }
  }

  get(key: string): V | undefined {
    try {
      const raw = readFileSync(this.keyToPath(key), 'utf-8');
      const entry = JSON.parse(raw) as { value: V; expiresAt: number };
      if (Date.now() > entry.expiresAt) {
        try {
          unlinkSync(this.keyToPath(key));
        } catch {
          /* ignore */
        }
        return undefined;
      }
      return entry.value;
    } catch {
      return undefined;
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
}
