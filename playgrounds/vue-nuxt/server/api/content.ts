import { localessClient } from '@localess/client';

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event);
  const slug = (getQuery(event).slug as string) || 'home';
  const client = localessClient({
    origin: config.localessOrigin,
    spaceId: config.localessSpaceId,
    token: config.localessToken, // secret — never leaves this server-only file
  });
  return client.getContentBySlug(slug);
});
