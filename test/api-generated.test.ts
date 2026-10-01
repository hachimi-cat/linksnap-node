import { describe, it, expect } from 'vitest';
import { LinkSnapClient } from '../src/index.js';

// client.api: every feature route, generated from the API spec (scripts/apigen.sh).
describe('client.api (generated from the spec)', () => {
  function capture() {
    const seen: Array<{ url: string; method: string; body?: string; auth?: string | null }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push({
        url: typeof input === 'string' ? input : input.toString(),
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? init.body : undefined,
        auth: new Headers(init?.headers).get('authorization'),
      });
      return new Response(JSON.stringify({ data: { ok: true }, error: null, meta: { requestId: 'r', timestamp: '' } }), {
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
    return { seen, fetchImpl };
  }

  it('creates a link with the fields LinkSnap reads, with the client credentials', async () => {
    const { seen, fetchImpl } = capture();
    const client = new LinkSnapClient({ apiKey: 'lsk_live_test', baseUrl: 'https://linksnap.test', fetchImpl });
    await client.api.linksCreate({ url: 'https://example.com', slug: 'spring', tags: ['promo'] });
    expect(seen[0]!.method).toBe('POST');
    expect(seen[0]!.url).toBe('https://linksnap.test/api/v1/links');
    expect(JSON.parse(seen[0]!.body!)).toEqual({ url: 'https://example.com', slug: 'spring', tags: ['promo'] });
    // The same header every other method of this SDK sends: the key as the server reads it.
    expect(seen[0]!.auth).toBe('ApiKey lsk_live_test');
  });

  it('puts path parameters in the path and query fields in the query', async () => {
    const { seen, fetchImpl } = capture();
    const client = new LinkSnapClient({ apiKey: 'k', baseUrl: 'https://linksnap.test', fetchImpl });
    await client.api.linksGet('a b');
    await client.api.linksList({ limit: 5, tag: 'promo' });
    expect(seen[0]!.url).toBe('https://linksnap.test/api/v1/links/a%20b');
    const listed = new URL(seen[1]!.url);
    expect(listed.pathname).toBe('/api/v1/links');
    expect(Object.fromEntries(listed.searchParams)).toEqual({ limit: '5', tag: 'promo' });
    expect(seen[1]!.body).toBeUndefined();
  });

  it('keeps the raw HTTP verbs on client.api', async () => {
    const { seen, fetchImpl } = capture();
    const client = new LinkSnapClient({ baseUrl: 'https://linksnap.test', fetchImpl });
    await client.api.patch('/api/v1/links/spring', { domainId: 'dom_1' }, { authToken: 'tok' });
    expect(seen[0]!.method).toBe('PATCH');
    expect(seen[0]!.url).toBe('https://linksnap.test/api/v1/links/spring');
    expect(seen[0]!.auth).toBe('Bearer tok');
    expect(client.api.baseUrl).toBe('https://linksnap.test');
  });

  it('has a method for every feature route', () => {
    const client = new LinkSnapClient({ baseUrl: 'https://linksnap.test' });
    const proto = Object.getPrototypeOf(Object.getPrototypeOf(client.api));
    const methods = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor' && n !== 'call');
    expect(methods.length).toBeGreaterThanOrEqual(50);
    expect(methods).toContain('qrCodesCreate');
  });
});
