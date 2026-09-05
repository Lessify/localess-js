import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalessApiError, localessClient, LocalessNetworkError } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/**
 * A fetch mock that never settles on its own — it only rejects when its signal aborts.
 *
 * Mirrors real `fetch`: an already-aborted signal rejects immediately rather than waiting for an
 * `abort` event that has already fired.
 */
function pendingFetch() {
  return vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          reject(signal.reason);
          return;
        }
        signal?.addEventListener('abort', () => reject(signal.reason));
      })
  );
}

describe('localessClient resilience', () => {
  const baseOptions = {
    origin: 'https://cms.example.com',
    spaceId: 'space-1',
    token: 'token-123',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    // Order matters: a `setTimeout` spy taken while fake timers are installed must be restored
    // before switching back, or later tests inherit a `setTimeout` that never fires.
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('retry', () => {
    it('retries a 503 and resolves, issuing exactly two requests', async () => {
      (fetch as any).mockResolvedValueOnce(jsonResponse({}, 503)).mockResolvedValueOnce(jsonResponse({ ok: true }));
      const client = localessClient({ ...baseOptions, retry: { baseDelayMs: 1 } });

      await expect(client.getLinks()).resolves.toEqual({ ok: true });
      expect((fetch as any).mock.calls).toHaveLength(2);
    });

    it('retries a network failure and resolves', async () => {
      (fetch as any).mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(jsonResponse({ ok: true }));
      const client = localessClient({ ...baseOptions, retry: { baseDelayMs: 1 } });

      await expect(client.getLinks()).resolves.toEqual({ ok: true });
      expect((fetch as any).mock.calls).toHaveLength(2);
    });

    it('does not retry a 401 — a bad token will not fix itself', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({ message: 'Unauthenticated' }, 401));
      const client = localessClient({ ...baseOptions, retry: { baseDelayMs: 1 } });

      await expect(client.getLinks()).rejects.toBeInstanceOf(LocalessApiError);
      expect((fetch as any).mock.calls).toHaveLength(1);
    });

    it('does not retry a 404', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({}, 404));
      const client = localessClient({ ...baseOptions, retry: { baseDelayMs: 1 } });

      await expect(client.getLinks()).rejects.toBeInstanceOf(LocalessApiError);
      expect((fetch as any).mock.calls).toHaveLength(1);
    });

    it('gives up after the configured attempts and throws the last error', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({}, 503));
      const client = localessClient({ ...baseOptions, retry: { attempts: 3, baseDelayMs: 1 } });

      await expect(client.getLinks()).rejects.toBeInstanceOf(LocalessApiError);
      expect((fetch as any).mock.calls).toHaveLength(3);
    });

    it('disables retries with retry: false', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({}, 503));
      const client = localessClient({ ...baseOptions, retry: false });

      await expect(client.getLinks()).rejects.toBeInstanceOf(LocalessApiError);
      expect((fetch as any).mock.calls).toHaveLength(1);
    });

    it('disables retries with attempts: 1', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({}, 503));
      const client = localessClient({ ...baseOptions, retry: { attempts: 1 } });

      await expect(client.getLinks()).rejects.toBeInstanceOf(LocalessApiError);
      expect((fetch as any).mock.calls).toHaveLength(1);
    });

    it('reports the attempt count on an API error', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({}, 503));
      const client = localessClient({ ...baseOptions, retry: { attempts: 3, baseDelayMs: 1 } });

      await expect(client.getLinks()).rejects.toMatchObject({ attempts: 3 });
    });

    it('reports the attempt count on a network error', async () => {
      (fetch as any).mockRejectedValue(new TypeError('fetch failed'));
      const client = localessClient({ ...baseOptions, retry: { attempts: 2, baseDelayMs: 1 } });

      await expect(client.getLinks()).rejects.toMatchObject({ attempts: 2 });
    });

    it('reports a single attempt when retries are off', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({}, 500));
      const client = localessClient({ ...baseOptions, retry: false });

      await expect(client.getLinks()).rejects.toMatchObject({ attempts: 1 });
    });
  });

  describe('backoff', () => {
    it('honours Retry-After seconds, in preference to the computed backoff', async () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      (fetch as any)
        .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '2' } }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));
      const client = localessClient({ ...baseOptions, retry: { baseDelayMs: 1, maxDelayMs: 10_000 } });

      const promise = client.getLinks();
      await vi.advanceTimersByTimeAsync(2_000);

      await expect(promise).resolves.toEqual({ ok: true });
      expect(setTimeoutSpy.mock.calls.some(call => call[1] === 2_000)).toBe(true);
    });

    it('clamps a Retry-After longer than maxDelayMs', async () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      (fetch as any)
        .mockResolvedValueOnce(new Response('{}', { status: 503, headers: { 'Retry-After': '600' } }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));
      const client = localessClient({ ...baseOptions, retry: { baseDelayMs: 1, maxDelayMs: 5_000 } });

      const promise = client.getLinks();
      await vi.advanceTimersByTimeAsync(5_000);

      await expect(promise).resolves.toEqual({ ok: true });
      expect(setTimeoutSpy.mock.calls.every(call => (call[1] as number) <= 5_000)).toBe(true);
    });

    it('ignores an unparseable Retry-After and falls back to the computed backoff', async () => {
      vi.useFakeTimers();
      (fetch as any)
        .mockResolvedValueOnce(new Response('{}', { status: 503, headers: { 'Retry-After': 'soon' } }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));
      const client = localessClient({ ...baseOptions, retry: { baseDelayMs: 10, maxDelayMs: 100 } });

      const promise = client.getLinks();
      await vi.advanceTimersByTimeAsync(1_000);

      await expect(promise).resolves.toEqual({ ok: true });
    });

    it('keeps every delay within maxDelayMs', async () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      (fetch as any).mockResolvedValue(jsonResponse({}, 503));
      const client = localessClient({ ...baseOptions, retry: { attempts: 5, baseDelayMs: 1_000, maxDelayMs: 2_000 } });

      const promise = client.getLinks().catch(() => undefined);
      await vi.advanceTimersByTimeAsync(60_000);
      await promise;

      const delays = setTimeoutSpy.mock.calls.map(call => call[1] as number);
      expect(delays.length).toBeGreaterThan(0);
      expect(delays.every(ms => ms <= 2_000)).toBe(true);
    });

    it('jitters the backoff, so concurrent clients do not retry in lockstep', async () => {
      const seen = new Set<number>();

      for (let run = 0; run < 8; run++) {
        vi.useFakeTimers();
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
        (fetch as any).mockResolvedValue(jsonResponse({}, 503));
        const client = localessClient({ ...baseOptions, retry: { attempts: 2, baseDelayMs: 1_000, maxDelayMs: 5_000 } });

        const promise = client.getLinks().catch(() => undefined);
        await vi.advanceTimersByTimeAsync(30_000);
        await promise;

        setTimeoutSpy.mock.calls.forEach(call => seen.add(call[1] as number));
        vi.restoreAllMocks();
        vi.useRealTimers();
        vi.stubGlobal('fetch', vi.fn());
      }

      // Full jitter over a 1000ms window: eight runs all landing on one value would mean no jitter.
      expect(seen.size).toBeGreaterThan(1);
    });
  });

  describe('timeout and cancellation', () => {
    it('times out a hanging request as a network error', async () => {
      vi.stubGlobal('fetch', pendingFetch());
      const client = localessClient({ ...baseOptions, timeoutMs: 20, retry: false });

      await expect(client.getLinks()).rejects.toBeInstanceOf(LocalessNetworkError);
    });

    it('does not time out when timeoutMs is false', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({ ok: true }));
      const client = localessClient({ ...baseOptions, timeoutMs: false });

      await expect(client.getLinks()).resolves.toEqual({ ok: true });
      const init = (fetch as any).mock.calls[0][1] as RequestInit;
      expect(init.signal).toBeUndefined();
    });

    it('aborts on a caller-supplied signal and does not retry', async () => {
      const mock = pendingFetch();
      vi.stubGlobal('fetch', mock);
      const controller = new AbortController();
      const client = localessClient({ ...baseOptions, retry: { attempts: 3, baseDelayMs: 1 } });

      const promise = client.getLinks({ signal: controller.signal });
      controller.abort();

      await expect(promise).rejects.toBeInstanceOf(LocalessNetworkError);
      expect(mock.mock.calls).toHaveLength(1);
    });

    it('rejects immediately when handed an already-aborted signal', async () => {
      const mock = pendingFetch();
      vi.stubGlobal('fetch', mock);
      const client = localessClient({ ...baseOptions, retry: { attempts: 3, baseDelayMs: 1 } });

      await expect(client.getLinks({ signal: AbortSignal.abort() })).rejects.toBeInstanceOf(LocalessNetworkError);
      expect(mock.mock.calls).toHaveLength(1);
    });

    it('accepts a signal on every fetching method', async () => {
      // A Response body can only be consumed once, so build a fresh one per call.
      (fetch as any).mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));
      const client = localessClient(baseOptions);
      const signal = new AbortController().signal;

      await client.getLinks({ signal });
      await client.getContentBySlug('home', { signal });
      await client.getContentById('id-1', { signal });
      await client.getTranslations('en', { signal });

      expect((fetch as any).mock.calls).toHaveLength(4);
    });
  });

  describe('injected fetch', () => {
    it('uses the injected fetch instead of the global one, and passes it a signal', async () => {
      const injected = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
      const client = localessClient({ ...baseOptions, fetch: injected as unknown as typeof globalThis.fetch });

      await expect(client.getLinks()).resolves.toEqual({ ok: true });
      expect(injected).toHaveBeenCalledTimes(1);
      expect((fetch as any).mock.calls).toHaveLength(0);
      expect((injected.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
    });

    it('retries through the injected fetch', async () => {
      const injected = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({}, 503))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));
      const client = localessClient({
        ...baseOptions,
        fetch: injected as unknown as typeof globalThis.fetch,
        retry: { baseDelayMs: 1 },
      });

      await expect(client.getLinks()).resolves.toEqual({ ok: true });
      expect(injected).toHaveBeenCalledTimes(2);
    });
  });

  describe('caching interaction', () => {
    it('does not cache a failed response', async () => {
      (fetch as any).mockResolvedValueOnce(jsonResponse({}, 500)).mockResolvedValueOnce(jsonResponse({ ok: true }));
      const client = localessClient({ ...baseOptions, retry: false });

      await expect(client.getLinks()).rejects.toBeInstanceOf(LocalessApiError);
      await expect(client.getLinks()).resolves.toEqual({ ok: true });
      expect((fetch as any).mock.calls).toHaveLength(2);
    });

    it('caches a response that succeeded only after a retry, storing it once', async () => {
      (fetch as any).mockResolvedValueOnce(jsonResponse({}, 503)).mockResolvedValueOnce(jsonResponse({ ok: true }));
      const client = localessClient({ ...baseOptions, retry: { baseDelayMs: 1 } });

      await client.getLinks();
      await client.getLinks();

      expect((fetch as any).mock.calls).toHaveLength(2);
    });
  });
});
