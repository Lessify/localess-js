#!/usr/bin/env node
import {program} from './program';

try {
  program.parse(process.argv);
} catch (e) {
  console.error('Error executing command:', e instanceof Error ? e.message : e);
  process.exit(1);
}
