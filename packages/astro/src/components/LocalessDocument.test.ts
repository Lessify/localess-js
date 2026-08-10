import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localessInit, registerComponent, setComponents } from '../state';
import FixturePage from './__fixtures__/FixturePage.astro';
import LocalessDocument from './LocalessDocument.astro';

describe('LocalessDocument', () => {
  afterEach(() => {
    setComponents({});
    vi.restoreAllMocks();
  });

  it('renders the document data through LocalessComponent', async () => {
    localessInit({ origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-1' });
    registerComponent('page', FixturePage);
    const container = await AstroContainer.create();

    const html = await container.renderToString(LocalessDocument, {
      props: { document: { data: { _id: '1', _schema: 'page' } } },
    });

    expect(html).toContain('data-ll-schema="page"');
  });

  it('does not render LocalessSync when enableSync is false', async () => {
    localessInit({ origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-1', enableSync: false });
    registerComponent('page', FixturePage);
    const container = await AstroContainer.create();

    const html = await container.renderToString(LocalessDocument, {
      props: { document: { data: { _id: '1', _schema: 'page' } } },
    });

    expect(html).not.toContain('<script');
  });

  it('renders LocalessSync when enableSync is true', async () => {
    localessInit({ origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-1', enableSync: true });
    registerComponent('page', FixturePage);
    const container = await AstroContainer.create();

    const html = await container.renderToString(LocalessDocument, {
      props: { document: { data: { _id: '1', _schema: 'page' } } },
    });

    expect(html).toContain('<script');
    expect(html).toContain('https://cms.example.com');
  });
});
