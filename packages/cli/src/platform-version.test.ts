import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from './session';

vi.mock('./session', () => ({ getSession: vi.fn() }));

import { checkPlatformCompatibility, fetchPlatformVersion, incompatibilityReason, isAtLeast } from './platform-version';

const LOGGED_IN = { isLoggedIn: true as const, token: 't', space: 's', origin: 'https://cms.example.com' };

/** Responds to the version asset with a body, or a status when the number form is used. */
function mockVersionAsset(body: unknown | number) {
  vi.mocked(fetch).mockImplementation(() => {
    if (typeof body === 'number') return Promise.resolve({ ok: false, status: body } as Response);
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
  });
}

describe('isAtLeast', () => {
  it('accepts an equal version', () => {
    expect(isAtLeast('4.0.0', '4.0.0')).toBe(true);
  });

  it('accepts higher minor and patch', () => {
    expect(isAtLeast('4.1.0', '4.0.0')).toBe(true);
    expect(isAtLeast('4.0.1', '4.0.0')).toBe(true);
  });

  it('rejects lower minor and patch', () => {
    expect(isAtLeast('4.0.0', '4.1.0')).toBe(false);
    expect(isAtLeast('4.0.0', '4.0.1')).toBe(false);
  });

  it('treats a dev build as satisfying its own version', () => {
    expect(isAtLeast('4.0.0-dev.20260513180146', '4.0.0')).toBe(true);
  });
});

describe('incompatibilityReason', () => {
  it('passes when majors match and the minimum is met', () => {
    expect(incompatibilityReason('4.0.0', '4.2.0', '4.0.0')).toBeNull();
  });

  it('reports a major mismatch in either direction', () => {
    expect(incompatibilityReason('4.0.0', '3.9.9', '4.0.0')).toBe('major-mismatch');
    expect(incompatibilityReason('3.0.0', '4.0.0', '3.0.0')).toBe('major-mismatch');
  });

  // Not reachable through the matrix today, since every minimum is 4.0.0 and the major must
  // match — so this guards the rule for when a command's minimum is first raised.
  it('reports a platform below the command minimum', () => {
    expect(incompatibilityReason('4.3.0', '4.1.0', '4.2.0')).toBe('below-minimum');
  });

  it('checks the major before the minimum', () => {
    expect(incompatibilityReason('4.0.0', '3.0.0', '9.9.9')).toBe('major-mismatch');
  });
});

describe('fetchPlatformVersion', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('reads the version from the published asset', async () => {
    mockVersionAsset({ version: '4.0.0', gitCommitSha: 'abc', buildDate: '2026-09-06T10:32:27.535Z' });

    await expect(fetchPlatformVersion('https://cms.example.com')).resolves.toBe('4.0.0');
  });

  it('requests the asset path against the given origin', async () => {
    mockVersionAsset({ version: '4.0.0' });

    await fetchPlatformVersion('https://cms.example.com');

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://cms.example.com/assets/version.json');
  });

  it('does not double the slash when the origin has a trailing one', async () => {
    mockVersionAsset({ version: '4.0.0' });

    await fetchPlatformVersion('https://cms.example.com/');

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://cms.example.com/assets/version.json');
  });

  it('returns null on a 404, which is how an API-only deployment answers', async () => {
    mockVersionAsset(404);

    await expect(fetchPlatformVersion('https://cms.example.com')).resolves.toBeNull();
  });

  it('returns null when the body has no usable version', async () => {
    mockVersionAsset({ buildDate: '2026-09-06T10:32:27.535Z' });
    await expect(fetchPlatformVersion('https://cms.example.com')).resolves.toBeNull();

    mockVersionAsset({ version: '' });
    await expect(fetchPlatformVersion('https://cms.example.com')).resolves.toBeNull();

    mockVersionAsset({ version: 42 });
    await expect(fetchPlatformVersion('https://cms.example.com')).resolves.toBeNull();
  });

  it('returns null when the body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.reject(new Error('invalid json')) } as Response);

    await expect(fetchPlatformVersion('https://cms.example.com')).resolves.toBeNull();
  });

  it('returns null when the host is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ENOTFOUND'));

    await expect(fetchPlatformVersion('https://cms.example.com')).resolves.toBeNull();
  });
});

describe('checkPlatformCompatibility', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(getSession).mockResolvedValue(LOGGED_IN);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    delete process.env.LOCALESS_SKIP_VERSION_CHECK;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.LOCALESS_SKIP_VERSION_CHECK;
  });

  it('reports ok on a matching major without printing', async () => {
    mockVersionAsset({ version: '4.2.0' });

    await expect(checkPlatformCompatibility('schema pull', '4.0.0')).resolves.toBe('ok');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('blocks every platform-facing command on a major mismatch, reads included', async () => {
    mockVersionAsset({ version: '3.9.0' });

    for (const command of [
      'schema pull',
      'schema diff',
      'schema push',
      'translation pull',
      'translation push',
      'translation diff',
      'type generate',
    ]) {
      await expect(checkPlatformCompatibility(command, '4.0.0'), command).resolves.toBe('blocked');
    }
  });

  it('names the command, both versions and an actionable install command', async () => {
    mockVersionAsset({ version: '3.9.0' });

    await checkPlatformCompatibility('schema push', '4.0.0');

    const message = vi.mocked(console.error).mock.calls[0][0] as string;
    expect(message).toContain('schema push');
    expect(message).toContain('4.0.0');
    expect(message).toContain('3.9.0');
    expect(message).toContain('@localess/cli@3');
    expect(message).toContain('LOCALESS_SKIP_VERSION_CHECK');
  });

  it('proceeds when the platform version is unknown, so an old deployment is never bricked', async () => {
    mockVersionAsset(404);

    await expect(checkPlatformCompatibility('schema push', '4.0.0')).resolves.toBe('unknown');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('skips the commands that never talk to the platform', async () => {
    mockVersionAsset({ version: '3.9.0' });

    for (const command of ['login', 'logout', 'schema validate']) {
      await expect(checkPlatformCompatibility(command, '4.0.0'), command).resolves.toBe('skipped');
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips an unrecognised command path rather than guessing, e.g. --help', async () => {
    mockVersionAsset({ version: '3.9.0' });

    await expect(checkPlatformCompatibility('', '4.0.0')).resolves.toBe('skipped');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips when no credentials are configured, leaving the command to report that', async () => {
    vi.mocked(getSession).mockResolvedValue({ isLoggedIn: false });
    mockVersionAsset({ version: '3.9.0' });

    await expect(checkPlatformCompatibility('schema push', '4.0.0')).resolves.toBe('skipped');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips entirely when the bypass variable is set', async () => {
    process.env.LOCALESS_SKIP_VERSION_CHECK = '1';
    mockVersionAsset({ version: '3.9.0' });

    await expect(checkPlatformCompatibility('schema push', '4.0.0')).resolves.toBe('skipped');
    expect(fetch).not.toHaveBeenCalled();
  });
});
