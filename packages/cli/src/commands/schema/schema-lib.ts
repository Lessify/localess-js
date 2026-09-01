// Single point where the CLI depends on @localess/schema at runtime (CLAUDE.md rule 7).
export type { LocalessSchemaConfig, ValidationIssue, ValidationResult } from '@localess/schema';
export { toSchemaExport, validate } from '@localess/schema';
