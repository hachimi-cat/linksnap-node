import { ApiClient, Session } from '@forjio/sdk';
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
  /** Static API key (alternative to session — for CI/headless). */
  apiKey?: string;
  /** Test seam. */
  fetchImpl?: typeof fetch;
}

type R = Record<string, unknown>;

export class LinkSnapClient {
  readonly api: ApiClient;
  private readonly apiKey?: string;

  constructor(opts: LinkSnapClientOptions = {}) {
    this.api = new ApiClient({
      baseUrl: opts.baseUrl ?? 'https://linksnap.forjio.com',
      session: opts.session,
      fetchImpl: opts.fetchImpl,
    });
    this.apiKey = opts.apiKey;
  }

  private a(token?: string) {
    return { authToken: token ?? this.apiKey };
  }

  // ─── Links ────────────────────────────────────────────────
  links = {
    list: (query: { tag?: string; archived?: boolean; limit?: number; cursor?: string } = {}, authToken?: string) =>
      this.api.get<{ items: Link[]; nextCursor?: string } | Link[]>('/api/v1/links', { query: query as Record<string, string | number | boolean | undefined>, ...this.a(authToken) }),
    get: (idOrSlug: string, authToken?: string) =>
      this.api.get<Link>(`/api/v1/links/${idOrSlug}`, this.a(authToken)),
    create: (input: { url: string; slug?: string; title?: string; description?: string; tags?: string[]; expiresAt?: string }, authToken?: string) =>
      this.api.post<Link>('/api/v1/links', input, this.a(authToken)),
    update: (idOrSlug: string, patch: Partial<{ url: string; title: string; description: string; tags: string[]; expiresAt: string | null }>, authToken?: string) =>
      this.api.patch<Link>(`/api/v1/links/${idOrSlug}`, patch, this.a(authToken)),
    delete: (idOrSlug: string, authToken?: string) =>
      this.api.delete<void>(`/api/v1/links/${idOrSlug}`, this.a(authToken)),
    bulk: (action: 'delete' | 'archive' | 'tag', ids: string[], authToken?: string) =>
      this.api.post<{ affected: number }>('/api/v1/links/bulk', { action, ids }, this.a(authToken)),
    export: (authToken?: string) =>
      this.api.get<string>('/api/v1/links/export', this.a(authToken)),
    import: (input: { csv: string }, authToken?: string) =>
      this.api.post<{ imported: number }>('/api/v1/links/import', input, this.a(authToken)),
  };

  // ─── Stats / click analytics ─────────────────────────────
  stats = {
    show: (idOrSlug: string, query: { from?: string; to?: string } = {}, authToken?: string) =>
      this.api.get<ClickStats>(`/api/v1/links/${idOrSlug}/stats`, { query: query as Record<string, string | number | boolean | undefined>, ...this.a(authToken) }),
    export: (idOrSlug: string, authToken?: string) =>
      this.api.get<string>(`/api/v1/links/${idOrSlug}/stats/export`, this.a(authToken)),
    workspace: (query: { from?: string; to?: string } = {}, authToken?: string) =>
      this.api.get<ClickStats>('/api/v1/workspaces/current/stats', { query: query as Record<string, string | number | boolean | undefined>, ...this.a(authToken) }),
  };

  // ─── QR codes ─────────────────────────────────────────────
  qr = {
    list: (authToken?: string) => this.api.get<QRCode[]>('/api/v1/qr-codes', this.a(authToken)),
    get: (id: string, authToken?: string) => this.api.get<QRCode>(`/api/v1/qr-codes/${id}`, this.a(authToken)),
    create: (input: { url: string; label?: string }, authToken?: string) =>
      this.api.post<QRCode>('/api/v1/qr-codes', input, this.a(authToken)),
    delete: (id: string, authToken?: string) =>
      this.api.delete<void>(`/api/v1/qr-codes/${id}`, this.a(authToken)),
    download: (id: string, authToken?: string) =>
      this.api.get<string>(`/api/v1/qr-codes/${id}/download`, this.a(authToken)),
    stats: (id: string, authToken?: string) =>
      this.api.get<ClickStats>(`/api/v1/qr-codes/${id}/stats`, this.a(authToken)),
  };

  // ─── Tags ─────────────────────────────────────────────────
  tags = {
    list: (authToken?: string) => this.api.get<Tag[]>('/api/v1/tags', this.a(authToken)),
  };

  // ─── Domains ──────────────────────────────────────────────
  domains = {
    list: (authToken?: string) => this.api.get<Domain[]>('/api/v1/domains', this.a(authToken)),
    add: (input: { domain: string }, authToken?: string) =>
      this.api.post<Domain>('/api/v1/domains', input, this.a(authToken)),
    verify: (id: string, authToken?: string) =>
      this.api.post<Domain>(`/api/v1/domains/${id}/verify`, undefined, this.a(authToken)),
    remove: (id: string, authToken?: string) =>
      this.api.delete<void>(`/api/v1/domains/${id}`, this.a(authToken)),
  };

  // ─── Billing ──────────────────────────────────────────────
  billing = {
    plans: (authToken?: string) => this.api.get<BillingPlan[]>('/api/v1/billing/plans', this.a(authToken)),
    plan: (authToken?: string) => this.api.get<R>('/api/v1/billing/plan', this.a(authToken)),
    subscription: (authToken?: string) => this.api.get<R>('/api/v1/billing/subscription', this.a(authToken)),
    usage: (authToken?: string) => this.api.get<BillingUsage>('/api/v1/billing/usage', this.a(authToken)),
    history: (authToken?: string) => this.api.get<R[]>('/api/v1/billing/history', this.a(authToken)),
    invoices: (query: { limit?: number } = {}, authToken?: string) =>
      this.api.get<R[]>('/api/v1/billing/invoices', { query: query as Record<string, string | number | boolean | undefined>, ...this.a(authToken) }),
    checkout: (input: { planId: string }, authToken?: string) =>
      this.api.post<{ url: string }>('/api/v1/billing/checkout', input, this.a(authToken)),
    cancel: (authToken?: string) =>
      this.api.post<R>('/api/v1/billing/cancel', undefined, this.a(authToken)),
    downgrade: (input: { planId: string }, authToken?: string) =>
      this.api.post<R>('/api/v1/billing/downgrade', input, this.a(authToken)),
  };

  // ─── Workspace ────────────────────────────────────────────
  workspace = {
    show: (authToken?: string) => this.api.get<Workspace>('/api/v1/workspaces/current', this.a(authToken)),
    rename: (input: { name: string }, authToken?: string) =>
      this.api.patch<Workspace>('/api/v1/workspaces/current', input, this.a(authToken)),
    members: {
      list: (authToken?: string) => this.api.get<R[]>('/api/v1/workspaces/current/members', this.a(authToken)),
      add: (input: { email: string; role?: string }, authToken?: string) =>
        this.api.post<R>('/api/v1/workspaces/current/members', input, this.a(authToken)),
      remove: (memberId: string, authToken?: string) =>
        this.api.delete<void>(`/api/v1/workspaces/current/members/${memberId}`, this.a(authToken)),
    },
  };

  // ─── API keys (under /auth/api-keys) ─────────────────────
  apiKeys = {
    list: (authToken?: string) => this.api.get<ApiKey[]>('/api/v1/auth/api-keys', this.a(authToken)),
    create: (input: { name: string }, authToken?: string) =>
      this.api.post<ApiKey>('/api/v1/auth/api-keys', input, this.a(authToken)),
    delete: (id: string, authToken?: string) =>
      this.api.delete<void>(`/api/v1/auth/api-keys/${id}`, this.a(authToken)),
  };

  // ─── Profile (auth/me) ───────────────────────────────────
  account = {
    me: (authToken?: string) => this.api.get<R>('/api/v1/auth/me', this.a(authToken)),
    update: (patch: Partial<{ name: string; email: string }>, authToken?: string) =>
      this.api.patch<R>('/api/v1/auth/me', patch, this.a(authToken)),
    changePassword: (input: { currentPassword: string; newPassword: string }, authToken?: string) =>
      this.api.post<void>('/api/v1/auth/change-password', input, this.a(authToken)),
    delete: (authToken?: string) =>
      this.api.delete<void>('/api/v1/auth/account', this.a(authToken)),
  };

  // ─── Health (no auth) ────────────────────────────────────
  health() {
    return this.api.get<{ status: string }>('/api/v1/health');
  }
}
