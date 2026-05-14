import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkForUpdate, isNewer } from './version-check';

// ─── isNewer ────────────────────────────────────────────────────────────────

describe('isNewer — stable vs stable', () => {
  it('detects a newer major version', () => {
    expect(isNewer('4.0.0', '3.0.0')).toBe(true);
  });

  it('detects a newer minor version', () => {
    expect(isNewer('3.1.0', '3.0.0')).toBe(true);
  });

  it('detects a newer patch version', () => {
    expect(isNewer('3.0.8', '3.0.7')).toBe(true);
  });

  it('returns false for identical versions', () => {
    expect(isNewer('3.0.7', '3.0.7')).toBe(false);
  });

  it('returns false when candidate is older', () => {
    expect(isNewer('3.0.6', '3.0.7')).toBe(false);
  });
});

describe('isNewer — stable vs dev', () => {
  it('stable beats dev of same version', () => {
    expect(isNewer('3.0.7', '3.0.7-dev.20260513180146')).toBe(true);
  });

  it('dev does not beat stable of same version', () => {
    expect(isNewer('3.0.7-dev.20260513180146', '3.0.7')).toBe(false);
  });

  it('higher stable beats lower dev', () => {
    expect(isNewer('3.0.8', '3.0.7-dev.20260513180146')).toBe(true);
  });

  it('lower stable does not beat higher dev base', () => {
    expect(isNewer('3.0.7', '3.0.8-dev.20260513180146')).toBe(false);
  });
});

describe('isNewer — dev vs dev', () => {
  it('newer timestamp wins', () => {
    expect(isNewer('3.0.7-dev.20260513180147', '3.0.7-dev.20260513180146')).toBe(true);
  });

  it('older timestamp loses', () => {
    expect(isNewer('3.0.7-dev.20260513180145', '3.0.7-dev.20260513180146')).toBe(false);
  });

  it('same timestamp returns false', () => {
    expect(isNewer('3.0.7-dev.20260513180146', '3.0.7-dev.20260513180146')).toBe(false);
  });

  it('higher base version with older timestamp wins', () => {
    expect(isNewer('3.0.8-dev.20260101000000', '3.0.7-dev.20260513180146')).toBe(true);
  });
});

// ─── checkForUpdate ──────────────────────────────────────────────────────────

describe('checkForUpdate', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(responses: Record<string, string | null>) {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = input.toString();
      const tag = url.split('/').pop() as string;
      const version = responses[tag];
      if (version === null) {
        return Promise.resolve({ ok: false } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version }),
      } as Response);
    });
  }

  // Stable current version — only queries "latest"
  it('stable: notifies when a newer stable exists', async () => {
    mockFetch({ latest: '3.0.8' });
    const msg = await checkForUpdate('3.0.7');
    expect(msg).toContain('3.0.8');
    expect(msg).toContain('@latest');
  });

  it('stable: no notification when already on latest', async () => {
    mockFetch({ latest: '3.0.7' });
    expect(await checkForUpdate('3.0.7')).toBeNull();
  });

  it('stable: no notification when registry is older (should not happen but safe)', async () => {
    mockFetch({ latest: '3.0.6' });
    expect(await checkForUpdate('3.0.7')).toBeNull();
  });

  // Dev current version — queries both "latest" and "dev"
  it('dev: notifies about stable upgrade (prefers stable over dev)', async () => {
    mockFetch({ latest: '3.0.7', dev: '3.0.8-dev.20260513180200' });
    const msg = await checkForUpdate('3.0.7-dev.20260513180146');
    // Stable upgrade takes priority
    expect(msg).toContain('3.0.7');
    expect(msg).toContain('@latest');
    expect(msg).not.toContain('@dev');
  });

  it('dev: notifies about newer dev when no stable upgrade', async () => {
    mockFetch({ latest: '3.0.6', dev: '3.0.7-dev.20260513180200' });
    const msg = await checkForUpdate('3.0.7-dev.20260513180146');
    expect(msg).toContain('20260513180200');
    expect(msg).toContain('@dev');
    expect(msg).not.toContain('@latest');
  });

  it('dev: no notification when already on latest dev and stable is older', async () => {
    mockFetch({ latest: '3.0.6', dev: '3.0.7-dev.20260513180146' });
    expect(await checkForUpdate('3.0.7-dev.20260513180146')).toBeNull();
  });

  it('returns null when registry fetch fails', async () => {
    mockFetch({ latest: null, dev: null });
    expect(await checkForUpdate('3.0.7')).toBeNull();
  });
});
