import { ApiClient, Session } from '@forjio/sdk';
import { GeneratedApi, type ApigenTransport } from './api.generated.js';
import type {
  Link,
  QRCode,
  Tag,
  Domain,
  Workspace,
  BillingPlan,
  BillingUsage,
  ApiKey,
  ClickStats,
} from './types.js';

export interface LinkSnapClientOptions {
  /** Base URL. Default https://linksnap.forjio.com. */
  baseUrl?: string;
  /** When set, the client auto-attaches the session's bearer token. */
  session?: Session;
  /** The workspace's API key (`lsk_live_…`, alternative to session — for CI/headless).
   *  Sent as `Authorization: ApiKey <key>` on every call (another token given here goes
   *  as `Bearer`); it takes precedence over `session`. */
  apiKey?: string;
  /** Test seam. */
  fetchImpl?: typeof fetch;
}

type R = Record<string, unknown>;

/**
 * `client.api`: every feature route, one method each (generated from the API spec:
 * api.generated.ts) — and, as before, the raw HTTP verbs of the underlying ApiClient
 * (`client.api.get('/api/v1/...')`), which the docs offer as the escape hatch.
 */
export class LinkSnapApi extends GeneratedApi {
  readonly get: ApiClient['get'];
  readonly post: ApiClient['post'];
  readonly patch: ApiClient['patch'];
  readonly put: ApiClient['put'];
  readonly delete: ApiClient['delete'];
  readonly paginate: ApiClient['paginate'];

  constructor(transport: ApigenTransport, private readonly http: ApiClient) {
    super(transport);
    this.get = http.get.bind(http);
    this.post = http.post.bind(http);
    this.patch = http.patch.bind(http);
    this.put = http.put.bind(http);
    this.delete = http.delete.bind(http);
    this.paginate = http.paginate.bind(http);
  }

  get baseUrl(): string {
    return this.http.baseUrl;
  }

  get session(): Session | undefined {
    return this.http.session;
  }
}

/** LinkSnap API keys are `lsk_live_…` / `lsk_test_…`. */
const isApiKey = (token: string): boolean => token.startsWith('lsk_');
const apiKeyHeader = (key: string): string => `ApiKey ${key}`;
const credentialHeader = (token: string): string => (isApiKey(token) ? apiKeyHeader(token) : `Bearer ${token}`);

export class LinkSnapClient {
  /** Every feature route (generated), plus the raw HTTP verbs. See LinkSnapApi. */
  readonly api: LinkSnapApi;
  private readonly http: ApiClient;

  constructor(opts: LinkSnapClientOptions = {}) {
    this.http = new ApiClient({
      baseUrl: opts.baseUrl ?? 'https://linksnap.forjio.com',
      // A key is the credential for every call (the raw verbs of client.api included).
      session: opts.apiKey ? undefined : opts.session,
      fetchImpl: opts.fetchImpl,
      defaultHeaders: opts.apiKey ? { authorization: credentialHeader(opts.apiKey) } : undefined,
    });
    this.api = new LinkSnapApi(this, this.http);
  }

  /** A per-call credential: an API key (`lsk_…`) as `ApiKey <key>`, which is what the
   *  server reads; a session / OIDC access token as `Bearer <token>`. */
  private a(token?: string) {
    if (!token) return {};
    return isApiKey(token) && !this.http.session ? { headers: { authorization: apiKeyHeader(token) } } : { authToken: token };
  }

  // ─── Links ────────────────────────────────────────────────
  links = {
    list: (query: { tag?: string; archived?: boolean; limit?: number; cursor?: string } = {}, authToken?: string) =>
      this.http.get<{ items: Link[]; nextCursor?: string } | Link[]>('/api/v1/links', { query: query as Record<string, string | number | boolean | undefined>, ...this.a(authToken) }),
    get: (idOrSlug: string, authToken?: string) =>
      this.http.get<Link>(`/api/v1/links/${idOrSlug}`, this.a(authToken)),
    create: (input: { url: string; slug?: string; title?: string; description?: string; tags?: string[]; expiresAt?: string }, authToken?: string) =>
      this.http.post<Link>('/api/v1/links', input, this.a(authToken)),
    update: (idOrSlug: string, patch: Partial<{ url: string; title: string; description: string; tags: string[]; expiresAt: string | null }>, authToken?: string) =>
      this.http.patch<Link>(`/api/v1/links/${idOrSlug}`, patch, this.a(authToken)),
    delete: (idOrSlug: string, authToken?: string) =>
      this.http.delete<void>(`/api/v1/links/${idOrSlug}`, this.a(authToken)),
    bulk: (action: 'delete' | 'archive' | 'tag', ids: string[], authToken?: string) =>
      this.http.post<{ affected: number }>('/api/v1/links/bulk', { action, ids }, this.a(authToken)),
    export: (authToken?: string) =>
      this.http.get<string>('/api/v1/links/export', this.a(authToken)),
    import: (input: { csv: string }, authToken?: string) =>
      this.http.post<{ imported: number }>('/api/v1/links/import', input, this.a(authToken)),
  };

  // ─── Stats / click analytics ─────────────────────────────
  stats = {
    show: (idOrSlug: string, query: { from?: string; to?: string } = {}, authToken?: string) =>
      this.http.get<ClickStats>(`/api/v1/links/${idOrSlug}/stats`, { query: query as Record<string, string | number | boolean | undefined>, ...this.a(authToken) }),
    export: (idOrSlug: string, authToken?: string) =>
      this.http.get<string>(`/api/v1/links/${idOrSlug}/stats/export`, this.a(authToken)),
    workspace: (query: { from?: string; to?: string } = {}, authToken?: string) =>
      this.http.get<ClickStats>('/api/v1/workspaces/current/stats', { query: query as Record<string, string | number | boolean | undefined>, ...this.a(authToken) }),
  };

  // ─── QR codes ─────────────────────────────────────────────
  qr = {
    list: (authToken?: string) => this.http.get<QRCode[]>('/api/v1/qr-codes', this.a(authToken)),
    get: (id: string, authToken?: string) => this.http.get<QRCode>(`/api/v1/qr-codes/${id}`, this.a(authToken)),
    create: (input: { url: string; label?: string }, authToken?: string) =>
      this.http.post<QRCode>('/api/v1/qr-codes', input, this.a(authToken)),
    delete: (id: string, authToken?: string) =>
      this.http.delete<void>(`/api/v1/qr-codes/${id}`, this.a(authToken)),
    download: (id: string, authToken?: string) =>
      this.http.get<string>(`/api/v1/qr-codes/${id}/download`, this.a(authToken)),
    stats: (id: string, authToken?: string) =>
      this.http.get<ClickStats>(`/api/v1/qr-codes/${id}/stats`, this.a(authToken)),
  };

  // ─── Tags ─────────────────────────────────────────────────
  tags = {
    list: (authToken?: string) => this.http.get<Tag[]>('/api/v1/tags', this.a(authToken)),
  };

  // ─── Domains ──────────────────────────────────────────────
  domains = {
    list: (authToken?: string) => this.http.get<Domain[]>('/api/v1/domains', this.a(authToken)),
    add: (input: { domain: string }, authToken?: string) =>
      this.http.post<Domain>('/api/v1/domains', input, this.a(authToken)),
    verify: (id: string, authToken?: string) =>
      this.http.post<Domain>(`/api/v1/domains/${id}/verify`, undefined, this.a(authToken)),
    remove: (id: string, authToken?: string) =>
      this.http.delete<void>(`/api/v1/domains/${id}`, this.a(authToken)),
  };

  // ─── Billing ──────────────────────────────────────────────
  billing = {
    plans: (authToken?: string) => this.http.get<BillingPlan[]>('/api/v1/billing/plans', this.a(authToken)),
    plan: (authToken?: string) => this.http.get<R>('/api/v1/billing/plan', this.a(authToken)),
    subscription: (authToken?: string) => this.http.get<R>('/api/v1/billing/subscription', this.a(authToken)),
    usage: (authToken?: string) => this.http.get<BillingUsage>('/api/v1/billing/usage', this.a(authToken)),
    history: (authToken?: string) => this.http.get<R[]>('/api/v1/billing/history', this.a(authToken)),
    invoices: (query: { limit?: number } = {}, authToken?: string) =>
      this.http.get<R[]>('/api/v1/billing/invoices', { query: query as Record<string, string | number | boolean | undefined>, ...this.a(authToken) }),
    /** Start a paid plan (`PRO` or `BUSINESS`): the server reads `plan`. */
    checkout: (input: { planId: string }, authToken?: string) =>
      this.http.post<{ checkoutUrl: string; sessionId: string; subscriptionId: string; invoiceId: string }>(
        '/api/v1/billing/checkout', { plan: input.planId }, this.a(authToken)),
    cancel: (authToken?: string) =>
      this.http.post<R>('/api/v1/billing/cancel', undefined, this.a(authToken)),
    downgrade: (input: { planId: string }, authToken?: string) =>
      this.http.post<R>('/api/v1/billing/downgrade', { plan: input.planId }, this.a(authToken)),
  };

  // ─── Workspace ────────────────────────────────────────────
  workspace = {
    show: (authToken?: string) => this.http.get<Workspace>('/api/v1/workspaces/current', this.a(authToken)),
    rename: (input: { name: string }, authToken?: string) =>
      this.http.patch<Workspace>('/api/v1/workspaces/current', input, this.a(authToken)),
    members: {
      list: (authToken?: string) => this.http.get<R[]>('/api/v1/workspaces/current/members', this.a(authToken)),
      add: (input: { email: string; role?: string }, authToken?: string) =>
        this.http.post<R>('/api/v1/workspaces/current/members', input, this.a(authToken)),
      remove: (memberId: string, authToken?: string) =>
        this.http.delete<void>(`/api/v1/workspaces/current/members/${memberId}`, this.a(authToken)),
    },
  };

  // ─── API keys (under /auth/api-keys) ─────────────────────
  apiKeys = {
    list: (authToken?: string) => this.http.get<ApiKey[]>('/api/v1/auth/api-keys', this.a(authToken)),
    create: (input: { name: string }, authToken?: string) =>
      this.http.post<ApiKey>('/api/v1/auth/api-keys', input, this.a(authToken)),
    delete: (id: string, authToken?: string) =>
      this.http.delete<void>(`/api/v1/auth/api-keys/${id}`, this.a(authToken)),
  };

  // ─── Profile (auth/me) ───────────────────────────────────
  account = {
    me: (authToken?: string) => this.http.get<R>('/api/v1/auth/me', this.a(authToken)),
    update: (patch: Partial<{ name: string; email: string }>, authToken?: string) =>
      this.http.patch<R>('/api/v1/auth/me', patch, this.a(authToken)),
    changePassword: (input: { currentPassword: string; newPassword: string }, authToken?: string) =>
      this.http.post<void>('/api/v1/auth/change-password', input, this.a(authToken)),
    delete: (authToken?: string) =>
      this.http.delete<void>('/api/v1/auth/account', this.a(authToken)),
  };

  /** The call behind `client.api.<area><Action>(...)`: the same ApiClient and
   *  credentials (session, or the constructor's apiKey) as every other method. */
  apigenRequest(method: string, path: string, query: Record<string, unknown> | undefined, body: unknown): Promise<unknown> {
    const ro = {
      ...this.a(),
      query: query
        ? Object.fromEntries(
            Object.entries(query).map(([k, v]): [string, string | number | boolean] => [
              k,
              typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : JSON.stringify(v),
            ]),
          )
        : undefined,
    };
    switch (method.toUpperCase()) {
      case 'GET':
        return this.http.get<unknown>(path, ro);
      case 'POST':
        return this.http.post<unknown>(path, body, ro);
      case 'PATCH':
        return this.http.patch<unknown>(path, body, ro);
      case 'PUT':
        return this.http.put<unknown>(path, body, ro);
      case 'DELETE':
        return this.http.delete<unknown>(path, ro);
      default:
        return Promise.reject(new Error(`unsupported method ${method}`));
    }
  }

  // ─── Health (no auth) ────────────────────────────────────
  health() {
    return this.http.get<{ status: string }>('/api/v1/health');
  }
}
