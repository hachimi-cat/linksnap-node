import { describe, it, expect } from 'vitest';
import { LinkSnapClient } from '../src/index.js';

// The server reads a LinkSnap API key as `Authorization: ApiKey lsk_…` (it also takes
// `Bearer lsk_…`); a session or OIDC access token goes as `Bearer`.
function capture() {
  const auth: Array<string | null> = [];
  const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    auth.push(new Headers(init?.headers).get('authorization'));
    return new Response(JSON.stringify({ data: {}, error: null, meta: { requestId: 'r' } }), {
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { auth, fetchImpl };
}

describe('credentials', () => {
  it('sends the API key as `ApiKey <key>` on hand-written, generated and raw calls', async () => {
    const { auth, fetchImpl } = capture();
    const client = new LinkSnapClient({ apiKey: 'lsk_live_abc', baseUrl: 'https://linksnap.test', fetchImpl });
    await client.links.list();
    await client.api.tagsList();
    await client.api.get('/api/v1/domains');
    expect(auth).toEqual(['ApiKey lsk_live_abc', 'ApiKey lsk_live_abc', 'ApiKey lsk_live_abc']);
  });

  it('a per-call key goes as `ApiKey`, a per-call access token as `Bearer`', async () => {
    const { auth, fetchImpl } = capture();
    const client = new LinkSnapClient({ baseUrl: 'https://linksnap.test', fetchImpl });
    await client.links.list({}, 'lsk_test_xyz');
    await client.links.list({}, 'eyJhbGciOi.jwt');
    expect(auth).toEqual(['ApiKey lsk_test_xyz', 'Bearer eyJhbGciOi.jwt']);
  });
});
