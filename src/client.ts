import { ApiClient, ApiError, NetworkError, Session } from '@forjio/sdk';
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

/** A file upload's part types, by file name, for a Blob given without one: the server
 *  takes a file by its declared type (the QR logo: PNG, JPEG or SVG only). */
const TYPES_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
};

function isFormData(v: unknown): v is FormData {
  return typeof FormData !== 'undefined' && v instanceof FormData;
}

/** The form with each file that has no type of its own given one from its name. */
function typedForm(form: FormData): FormData {
  const out = new FormData();
  form.forEach((value, key) => {
    if (typeof value === 'string') {
      out.append(key, value);
      return;
    }
    const name = (value as File).name || key;
    const guessed = TYPES_BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''];
    out.append(key, value.type || !guessed ? value : new Blob([value], { type: guessed }), name);
  });
  return out;
}

export class LinkSnapClient {
  /** Every feature route (generated), plus the raw HTTP verbs. See LinkSnapApi. */
  readonly api: LinkSnapApi;
  private readonly http: ApiClient;
  private readonly apiKey?: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(opts: LinkSnapClientOptions = {}) {
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl;
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
   *  credentials (session, or the constructor's apiKey) as every other method. A file
   *  upload's body is a FormData, sent as multipart/form-data (sendForm). */
  apigenRequest(method: string, path: string, query: Record<string, unknown> | undefined, body: unknown): Promise<unknown> {
    if (isFormData(body)) return this.sendForm(method.toUpperCase(), path, query, body);
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

  /** A file upload: the form as multipart/form-data (fetch writes the body and its
   *  Content-Type, with the boundary), with the credential every other call sends — the
   *  apiKey, else the session's token, refreshed when about to expire and once more on a
   *  401 — and the response envelope unwrapped like ApiClient's. (ApiClient JSON-encodes
   *  every body, so a FormData cannot go through it.) */
  private async sendForm(method: string, path: string, query: Record<string, unknown> | undefined, body: FormData): Promise<unknown> {
    const url = new URL(`${this.http.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    const form = typedForm(body);
    const session = this.apiKey ? undefined : this.http.session;
    const send = async (): Promise<Response> => {
      const headers: Record<string, string> = { accept: 'application/json' };
      const token = this.apiKey ?? session?.data?.accessToken;
      if (token) headers.authorization = credentialHeader(token);
      try {
        return await (this.fetchImpl ?? fetch)(url.toString(), { method, headers, body: form });
      } catch (e) {
        throw new NetworkError((e as Error).message, e);
      }
    };
    if (session?.willExpireSoon(300)) await session.refresh().catch(() => undefined);
    let res = await send();
    if (res.status === 401 && session) {
      try {
        await session.refresh();
        res = await send();
      } catch {
        // the original 401 is reported below
      }
    }
    const text = await res.text().catch(() => '');
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new ApiError(res.ok ? 'INVALID_RESPONSE' : 'NON_JSON_ERROR', res.ok ? 'non-JSON response from server' : text, res.status);
      }
    }
    const env = parsed as { data?: unknown; error?: { code: string; message: string; details?: Record<string, unknown> } | null; meta?: { requestId?: string } } | null;
    if (env && typeof env === 'object' && 'data' in env && 'error' in env && 'meta' in env) {
      if (env.error) throw new ApiError(env.error.code, env.error.message, res.status, env.meta?.requestId, env.error.details);
      return env.data;
    }
    if (!res.ok) {
      const e = ((env as { error?: unknown } | null)?.error ?? env) as { code?: string; message?: string } | null;
      throw new ApiError(e?.code ?? 'HTTP_ERROR', e?.message ?? res.statusText, res.status, undefined, (env as Record<string, unknown> | null) ?? undefined);
    }
    return parsed ?? undefined;
  }

  // ─── Health (no auth) ────────────────────────────────────
  health() {
    return this.http.get<{ status: string }>('/api/v1/health');
  }
}
