import type { LocalessRichTextDocument } from './model';

/**
 * What to do with input that has no representation in the Localess rich text
 * model — the model is closed and matches the Studio editor exactly, so a
 * `<table>` or a blockquote has nowhere to go.
 *
 * - `unwrap` — keep the text content, drop the wrapper (default)
 * - `skip` — drop the element and everything inside it
 * - `throw` — throw {@link RichTextParseError} naming the element
 */
export type RichTextUnsupportedPolicy = 'unwrap' | 'skip' | 'throw';

/** Options accepted by both parsers. */
export interface RichTextParseOptions {
  /**
   * Handling for elements the model cannot represent.
   *
   * @default 'unwrap'
   */
  unsupported?: RichTextUnsupportedPolicy;
}

/** One unsupported element type, and what the parser did with it. */
export interface RichTextUnsupportedReport {
  /** Element or construct name, e.g. `table`, `blockquote`, `img`. */
  element: string;
  action: 'unwrapped' | 'skipped';
  /** How many times it occurred in this parse. */
  count: number;
}

/** What both parsers return. */
export interface RichTextParseResult {
  doc: LocalessRichTextDocument;
  /**
   * Every element that could not be represented, with its handling and count.
   * Empty when the input was fully representable.
   *
   * Returned rather than only warned so a migration can surface "347 tables
   * were unwrapped" and decide whether to proceed before committing a write.
   */
  unsupported: RichTextUnsupportedReport[];
}

/** Thrown by both parsers when `unsupported: 'throw'` meets an unrepresentable element. */
export class RichTextParseError extends Error {
  /** The element that could not be represented. */
  readonly element: string;

  constructor(element: string) {
    super(
      `[@localess/richtext] "${element}" has no representation in the Localess rich text model. ` +
        `Use { unsupported: 'unwrap' } to keep its text, or { unsupported: 'skip' } to drop it.`
    );
    this.name = 'RichTextParseError';
    this.element = element;
  }
}

/**
 * Records unsupported elements for the result report, warns once per element
 * type per parse, and applies the configured policy.
 *
 * Mirrors the renderer's forward-compat behaviour, which warns once per unknown
 * type per render and stays silent in production.
 */
export class UnsupportedTracker {
  private readonly policy: RichTextUnsupportedPolicy;
  private readonly counts = new Map<string, number>();
  private readonly warned = new Set<string>();

  constructor(options: RichTextParseOptions = {}) {
    this.policy = options.unsupported ?? 'unwrap';
  }

  /**
   * Records one occurrence and returns whether the caller should keep the
   * element's children.
   *
   * @throws {RichTextParseError} When the policy is `throw`.
   */
  record(element: string): 'unwrap' | 'skip' {
    if (this.policy === 'throw') throw new RichTextParseError(element);

    this.counts.set(element, (this.counts.get(element) ?? 0) + 1);
    this.warn(element);
    return this.policy;
  }

  /** The report, in first-seen order. */
  report(): RichTextUnsupportedReport[] {
    const action = this.policy === 'skip' ? 'skipped' : 'unwrapped';
    return [...this.counts.entries()].map(([element, count]) => ({ element, action, count }));
  }

  private warn(element: string): void {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
    if (this.warned.has(element)) return;
    this.warned.add(element);
    const verb = this.policy === 'skip' ? 'skipped' : 'unwrapped';
    console.warn(`[@localess/richtext] "${element}" has no representation in the Localess rich text model and was ${verb}.`);
  }
}

/** An empty document — what both parsers return for empty, `null`, or `undefined` input. */
export function emptyDocument(): LocalessRichTextDocument {
  return { type: 'doc', content: [] };
}
