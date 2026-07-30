import { provideLocalessBrowser } from './localess.providers';

describe('provideLocalessBrowser', () => {
  it('throws when origin is missing', () => {
    expect(() => provideLocalessBrowser({ origin: '', spaceId: 'space-1' })).toThrowError("Localess Origin can't be empty");
  });

  it('throws when spaceId is missing', () => {
    expect(() => provideLocalessBrowser({ origin: 'https://cms.example.com', spaceId: '' })).toThrowError(
      "Localess Space ID can't be empty"
    );
  });

  it('returns providers when options are valid', () => {
    const providers = provideLocalessBrowser({ origin: 'https://cms.example.com', spaceId: 'space-1' });
    expect(providers.length).toBeGreaterThan(0);
  });
});
