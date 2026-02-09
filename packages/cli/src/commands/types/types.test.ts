import {afterEach, beforeEach, describe, it} from 'vitest';
import {typesCommand} from "./index";
import {clearSession} from "../../session";

describe('types command', () => {
  beforeEach(() => {
    // Set environment variables for testing
    process.env.LOCALESS_ORIGIN = 'https://demo.localess.org';
    process.env.LOCALESS_SPACE = 'MmaT4DL0kJ6nXIILUcQF';
    process.env.LOCALESS_TOKEN = 'flXVeAzOYCarsy3pYZt8';
  });

  afterEach(() => {
    // Clear environment variables after each test
    delete process.env.LOCALESS_TOKEN;
    delete process.env.LOCALESS_ORIGIN;
    delete process.env.LOCALESS_SPACE;
  });

  it('should run types with options', async () => {
    await typesCommand.parseAsync([], {from: 'user'});
  });
});
