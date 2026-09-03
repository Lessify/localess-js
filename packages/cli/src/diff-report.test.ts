import { beforeEach, describe, expect, it, vi } from 'vitest';

import { printDiffReport } from './diff-report';

describe('printDiffReport', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('returns zeroed counts and prints "In sync." for an empty diff', () => {
    const result = printDiffReport([], { noun: 'item' });
    expect(result).toEqual({ created: 0, updated: 0, stale: 0, drift: 0 });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('In sync.'));
  });

  it('groups entries by status and returns per-status counts', () => {
    const result = printDiffReport(
      [
        { label: 'new.key', status: 'create' },
        { label: 'changed.key', status: 'update' },
        { label: 'same.key', status: 'unchanged' },
        { label: 'stale.key', status: 'stale' },
      ],
      { noun: 'item' }
    );

    expect(result).toEqual({ created: 1, updated: 1, stale: 1, drift: 3 });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Create (1)'))).toBe(true);
    expect(logs.some(line => line.includes('new.key'))).toBe(true);
    expect(logs.some(line => line.includes('Update (1)'))).toBe(true);
    expect(logs.some(line => line.includes('changed.key'))).toBe(true);
    expect(logs.some(line => line.includes('Stale (1)'))).toBe(true);
    expect(logs.some(line => line.includes('stale.key'))).toBe(true);
    expect(logs.some(line => line.includes('Unchanged'))).toBe(false);
    expect(logs.some(line => line.includes('same.key'))).toBe(false);
    expect(logs.some(line => line.includes('1 unchanged (use --all to show)'))).toBe(true);
    expect(logs.some(line => line.includes('3 item(s) differ'))).toBe(true);
  });

  it('also prints unchanged entries when all is set', () => {
    printDiffReport([{ label: 'same.key', status: 'unchanged' }], { all: true, noun: 'item' });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Unchanged (1)'))).toBe(true);
    expect(logs.some(line => line.includes('same.key'))).toBe(true);
  });
});
