import type { ComponentNamingStrategy } from '@localess/vue';
import { normalizeComponentKey } from '@localess/vue';

/** One discovered `.vue` file and the registry key it produces. */
export interface DevtoolsComponent {
  /** File name without extension, e.g. `page` for `page.vue`. */
  file: string;
  /** Key it is registered under — the file name verbatim. */
  key: string;
  /** What `data._schema` must normalize to in order to resolve it. */
  resolvesAs: string;
  /** `true` when this entry came from the `components` override map. */
  override?: boolean;
}

/** Everything the panel renders. Deliberately contains no token values. */
export interface DevtoolsPayload {
  origin: string;
  spaceId: string;
  /** Whether a public token is configured — never the value. */
  hasPublicToken: boolean;
  /** Whether a secret server token is configured — never the value. */
  hasServerToken: boolean;
  componentNaming: ComponentNamingStrategy;
  componentsDir: string;
  components: DevtoolsComponent[];
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Builds the payload the panel renders from the module's resolved options and
 * the files discovered under `componentsDir`.
 *
 * `resolvesAs` is the whole point of the component table: it is the value a
 * content `_schema` must normalize to under the configured strategy, so a
 * mismatch between a file name and a schema name is visible instead of showing
 * up as a silent "could not find component" at render time.
 */
export function buildDevtoolsPayload(options: {
  origin: string;
  spaceId: string;
  token?: string;
  serverToken?: string;
  componentNaming: ComponentNamingStrategy;
  componentsDir: string;
  files: string[];
  overrides: Record<string, string>;
}): DevtoolsPayload {
  const discovered: DevtoolsComponent[] = options.files.map(file => {
    const key = file
      .split(/[\\/]/)
      .pop()!
      .replace(/\.vue$/, '');
    return { file, key, resolvesAs: normalizeComponentKey(key, options.componentNaming) };
  });

  const overrides: DevtoolsComponent[] = Object.entries(options.overrides).map(([key, path]) => ({
    file: path,
    key,
    resolvesAs: normalizeComponentKey(key, options.componentNaming),
    override: true,
  }));

  return {
    origin: options.origin,
    spaceId: options.spaceId,
    hasPublicToken: Boolean(options.token),
    hasServerToken: Boolean(options.serverToken),
    componentNaming: options.componentNaming,
    componentsDir: options.componentsDir,
    components: [...discovered, ...overrides],
  };
}

/** Registry keys that collapse onto the same `resolvesAs` value. */
export function findDevtoolsCollisions(components: DevtoolsComponent[]): Array<{ resolvesAs: string; keys: string[] }> {
  const seen = new Map<string, string[]>();
  for (const component of components) {
    const existing = seen.get(component.resolvesAs);
    if (existing) existing.push(component.key);
    else seen.set(component.resolvesAs, [component.key]);
  }
  return [...seen.entries()].filter(([, keys]) => keys.length > 1).map(([resolvesAs, keys]) => ({ resolvesAs, keys }));
}

/**
 * Renders the panel as a standalone HTML document.
 *
 * Self-contained — no scripts, no external assets — so it is safe to serve from
 * a dev-only route and cheap to render on every request, which keeps it in sync
 * with the component directory as files are added or removed.
 */
export function renderDevtoolsPage(payload: DevtoolsPayload): string {
  const collisions = findDevtoolsCollisions(payload.components);

  const tokenRow = (label: string, present: boolean, note: string) =>
    `<tr><th>${label}</th><td>${present ? '<span class="ok">configured</span>' : '<span class="off">not set</span>'} <span class="note">${escapeHtml(note)}</span></td></tr>`;

  const componentRows = payload.components.length
    ? payload.components
        .map(
          component =>
            `<tr>
              <td><code>${escapeHtml(component.key)}</code>${component.override ? ' <span class="tag">override</span>' : ''}</td>
              <td><code>${escapeHtml(component.resolvesAs)}</code></td>
              <td class="muted">${escapeHtml(component.file)}</td>
            </tr>`
        )
        .join('')
    : `<tr><td colspan="3" class="muted">No components found under <code>${escapeHtml(payload.componentsDir)}</code>.</td></tr>`;

  const collisionBlock = collisions.length
    ? `<div class="warn"><strong>Naming collision.</strong> These keys resolve to the same component key, so only the first wins:
        <ul>${collisions.map(c => `<li><code>${escapeHtml(c.keys.join(', '))}</code> &rarr; <code>${escapeHtml(c.resolvesAs)}</code></li>`).join('')}</ul>
      </div>`
    : '';

  const studioUrl = `${payload.origin.replace(/\/+$/, '')}/spaces/${encodeURIComponent(payload.spaceId)}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Localess</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 13px/1.5 ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 16px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; opacity: .6; margin: 24px 0 8px; }
  h2:first-of-type { margin-top: 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid color-mix(in oklab, currentColor 12%, transparent); vertical-align: top; }
  th { width: 160px; font-weight: 600; opacity: .7; }
  thead th { width: auto; }
  code { font-family: ui-monospace, monospace; font-size: 12px; }
  .muted { opacity: .6; }
  .note { opacity: .55; }
  .ok { color: #16a34a; font-weight: 600; }
  .off { opacity: .6; }
  .tag { font-size: 11px; border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; opacity: .6; }
  .warn { border: 1px solid #f59e0b; background: color-mix(in oklab, #f59e0b 12%, transparent); padding: 10px 12px; border-radius: 6px; margin: 12px 0; }
  .warn ul { margin: 6px 0 0; padding-left: 18px; }
  a { color: inherit; }
</style>
</head>
<body>
  <h2>Configuration</h2>
  <table>
    <tr><th>Origin</th><td><code>${escapeHtml(payload.origin)}</code></td></tr>
    <tr><th>Space</th><td><code>${escapeHtml(payload.spaceId)}</code> &middot; <a href="${escapeHtml(studioUrl)}" target="_blank" rel="noreferrer">open in Studio</a></td></tr>
    ${tokenRow('Public token', payload.hasPublicToken, 'reaches the browser; enables useLocaless()')}
    ${tokenRow('Server token', payload.hasServerToken, 'server only; enables useLocalessServerClient()')}
    <tr><th>Component naming</th><td><code>${escapeHtml(payload.componentNaming)}</code></td></tr>
    <tr><th>Components dir</th><td><code>${escapeHtml(payload.componentsDir)}</code></td></tr>
  </table>

  <h2>Component registry</h2>
  ${collisionBlock}
  <p class="muted">A content block renders when its <code>_schema</code> resolves to the middle column.</p>
  <table>
    <thead><tr><th>Registered key</th><th>Resolves as</th><th>Source</th></tr></thead>
    <tbody>${componentRows}</tbody>
  </table>
</body>
</html>`;
}
