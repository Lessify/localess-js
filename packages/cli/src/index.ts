#!/usr/bin/env node
import { program } from './program';

// `parseAsync` rather than `parse` because the `preAction` hook and every command action are
// async, which is the case Commander documents `parseAsync` for: it returns the promise this
// file attaches a rejection handler to. The compatibility gate itself holds under the
// synchronous `parse()` as well — Commander chains the hook ahead of the action either way —
// but a rejection from an action that doesn't catch its own errors would escape as an
// unhandled rejection instead of reaching the handler below.
program.parseAsync(process.argv).catch(e => {
  console.error('Error executing command:', e instanceof Error ? e.message : e);
  process.exit(1);
});
