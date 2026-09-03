import chalk from 'chalk';

export type DiffStatus = 'create' | 'update' | 'unchanged' | 'stale';

export interface DiffEntry {
  label: string;
  status: DiffStatus;
}

export interface DiffCounts {
  created: number;
  updated: number;
  stale: number;
  drift: number;
}

const STATUS_ORDER: DiffStatus[] = ['create', 'update', 'stale', 'unchanged'];

const STATUS_STYLE: Record<DiffStatus, { symbol: string; label: string; color: typeof chalk.green }> = {
  create: { symbol: '+', label: 'Create', color: chalk.green },
  update: { symbol: '~', label: 'Update', color: chalk.yellow },
  stale: { symbol: '-', label: 'Stale', color: chalk.red },
  unchanged: { symbol: '=', label: 'Unchanged', color: chalk.dim },
};

/**
 * Prints a grouped, color-coded diff report (create/update/stale sections, `+`/`~`/`-` symbols)
 * followed by a summary line. `unchanged` entries are collapsed to a count unless `all` is set.
 * Returns the per-status counts so the caller can decide the exit code.
 */
export function printDiffReport(entries: DiffEntry[], options: { all?: boolean; noun: string }): DiffCounts {
  const byStatus = new Map<DiffStatus, DiffEntry[]>();
  for (const entry of entries) {
    const group = byStatus.get(entry.status) ?? [];
    group.push(entry);
    byStatus.set(entry.status, group);
  }

  for (const status of STATUS_ORDER) {
    if (status === 'unchanged' && !options.all) continue;
    const group = byStatus.get(status);
    if (!group || group.length === 0) continue;
    const style = STATUS_STYLE[status];
    console.log(style.color.bold(`\n${style.label} (${group.length})`));
    for (const item of group) {
      console.log(style.color(`  ${style.symbol} ${item.label}`));
    }
  }

  const unchangedCount = byStatus.get('unchanged')?.length ?? 0;
  if (!options.all && unchangedCount > 0) {
    console.log(chalk.dim(`\n${unchangedCount} unchanged (use --all to show)`));
  }

  const created = byStatus.get('create')?.length ?? 0;
  const updated = byStatus.get('update')?.length ?? 0;
  const stale = byStatus.get('stale')?.length ?? 0;
  const drift = created + updated + stale;

  if (drift > 0) {
    console.log(
      `\n${drift} ${options.noun}(s) differ: ${chalk.green(`${created} created`)}, ${chalk.yellow(`${updated} updated`)}, ${chalk.red(`${stale} stale`)}.`
    );
  } else {
    console.log(chalk.green('\nIn sync.'));
  }

  return { created, updated, stale, drift };
}
