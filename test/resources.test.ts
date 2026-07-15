import { describe, it, expect, beforeEach } from 'vitest';
import { LinkSnapClient } from '../src/index.js';

function makeClient() {
  const captured: Array<{ url: string; method: string; body?: string; headers: Record<string, string> }> = [];
  const fetchImpl: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured.push({
      url: typeof input === 'string' ? input : input.toString(),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? init.body : undefined,
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    return new Response(
      JSON.stringify({ data: { ok: true }, error: null, meta: { requestId: 'r', timestamp: '' } }),
      { headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;
  const client = new LinkSnapClient({ baseUrl: 'https://linksnap.test', apiKey: 'lk_test', fetchImpl });
  return { client, captured };
}

describe('LinkSnapClient', () => {
  let h: ReturnType<typeof makeClient>;
  beforeEach(() => { h = makeClient(); });

  it('links.create POSTs', async () => {
    await h.client.links.create({ url: 'https://example.com' });
    expect(h.captured[0]!.method).toBe('POST');
    expect(h.captured[0]!.url).toContain('/api/v1/links');
  });
  it('links.update PATCHes', async () => {
    await h.client.links.update('slug_1', { title: 'New' });
    expect(h.captured[0]!.method).toBe('PATCH');
    expect(h.captured[0]!.url).toContain('/api/v1/links/slug_1');
  });
  it('links.bulk POSTs', async () => {
    await h.client.links.bulk('delete', ['l_1', 'l_2']);
    expect(h.captured[0]!.url).toContain('/api/v1/links/bulk');
  });
  it('stats.show GETs', async () => {
    await h.client.stats.show('slug_1');
    expect(h.captured[0]!.url).toContain('/api/v1/links/slug_1/stats');
  });
  it('qr.create POSTs', async () => {
    await h.client.qr.create({ url: 'https://x.com' });
    expect(h.captured[0]!.url).toContain('/api/v1/qr-codes');
  });
  it('domains.verify POSTs', async () => {
    await h.client.domains.verify('dom_1');
    expect(h.captured[0]!.url).toContain('/api/v1/domains/dom_1/verify');
  });
  it('billing.checkout POSTs', async () => {
    await h.client.billing.checkout({ planId: 'pro' });
    expect(h.captured[0]!.url).toContain('/api/v1/billing/checkout');
  });
  it('workspace.members.add POSTs', async () => {
    await h.client.workspace.members.add({ email: 'a@b.com', role: 'admin' });
    expect(h.captured[0]!.url).toContain('/api/v1/workspaces/current/members');
  });
  it('workspace.members.remove DELETEs', async () => {
    await h.client.workspace.members.remove('m_1');
    expect(h.captured[0]!.method).toBe('DELETE');
  });
  it('apiKeys.create POSTs', async () => {
    await h.client.apiKeys.create({ name: 'CI key' });
    expect(h.captured[0]!.url).toContain('/api/v1/auth/api-keys');
  });
  it('account.changePassword POSTs', async () => {
    await h.client.account.changePassword({ currentPassword: 'a', newPassword: 'b' });
    expect(h.captured[0]!.url).toContain('/api/v1/auth/change-password');
  });
  it('attaches Bearer from apiKey constructor opt', async () => {
    await h.client.links.list();
    expect(h.captured[0]!.headers.authorization).toBe('Bearer lk_test');
  });
  it('per-call authToken overrides constructor key', async () => {
    await h.client.links.list({}, 'override_tok');
    expect(h.captured[0]!.headers.authorization).toBe('Bearer override_tok');
  });
  it('health() requires no auth — uses session-or-key path', async () => {
    await h.client.health();
    expect(h.captured[0]!.url).toContain('/api/v1/health');
  });
});
