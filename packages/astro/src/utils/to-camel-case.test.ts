import { describe, expect, it } from 'vitest';

import { toCamelCase } from './to-camel-case';

describe('toCamelCase', () => {
  it('converts kebab-case to camelCase', () => {
    expect(toCamelCase('hero-section')).toBe('heroSection');
  });

  it('converts snake_case to camelCase', () => {
    expect(toCamelCase('hero_section')).toBe('heroSection');
  });

  it('converts PascalCase filenames to camelCase', () => {
    expect(toCamelCase('HeroSection')).toBe('heroSection');
  });

  it('leaves an already-camelCase string unchanged', () => {
    expect(toCamelCase('heroSection')).toBe('heroSection');
  });
});
