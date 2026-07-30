import { provideLocalessServer } from './localess.providers';

describe('provideLocalessServer', () => {
  const validOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };

  it('throws when origin is missing', () => {
    expect(() => provideLocalessServer({ ...validOptions, origin: '' })).toThrowError("Localess Origin can't be empty");
  });

  it('throws when spaceId is missing', () => {
    expect(() => provideLocalessServer({ ...validOptions, spaceId: '' })).toThrowError("Localess Space ID can't be empty");
  });

  it('throws when token is missing', () => {
    expect(() => provideLocalessServer({ ...validOptions, token: '' })).toThrowError("Localess Token can't be empty");
  });

  it('returns providers when options are valid', () => {
    const providers = provideLocalessServer(validOptions);
    expect(providers.length).toBeGreaterThan(0);
  });
});
