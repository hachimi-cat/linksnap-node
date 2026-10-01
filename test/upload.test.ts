import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { LinkSnapClient } from '../src/index.js';

// A file upload through the generated surface (client.api.qrCodesUploadLogo): sent as
// multipart/form-data with the client's credential, to a real HTTP server that parses it.
describe('client.api file uploads', () => {
  let server: http.Server | undefined;
  afterEach(() => server?.close());

  async function listen(
    status = 200,
    answer: unknown = { data: { logoData: 'data:image/png;base64,AA==' }, error: null, meta: { requestId: 'r', timestamp: '' } },
  ) {
    const seen: Array<{ method: string; url: string; auth?: string; contentType?: string; form: FormData }> = [];
    server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', async () => {
        const body = Buffer.concat(chunks);
        const form = await new Request('http://x/', { method: 'POST', headers: { 'content-type': String(req.headers['content-type']) }, body }).formData();
        seen.push({ method: req.method!, url: req.url!, auth: req.headers.authorization, contentType: req.headers['content-type'], form });
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(answer));
      });
    });
    await new Promise<void>((r) => server!.listen(0, '127.0.0.1', () => r()));
    return { seen, baseUrl: `http://127.0.0.1:${(server!.address() as AddressInfo).port}` };
  }

  it('sends the logo as multipart/form-data with the API key, and returns the data', async () => {
    const { seen, baseUrl } = await listen();
    const client = new LinkSnapClient({ apiKey: 'lsk_live_test', baseUrl });
    const logo = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', { type: 'image/png' });
    const out = await client.api.qrCodesUploadLogo({ logo });
    expect(out).toEqual({ logoData: 'data:image/png;base64,AA==' });
    expect(seen[0]!.method).toBe('POST');
    expect(seen[0]!.url).toBe('/api/v1/qr-codes/upload-logo');
    expect(seen[0]!.auth).toBe('ApiKey lsk_live_test');
    expect(seen[0]!.contentType).toMatch(/^multipart\/form-data; boundary=/);
    const file = seen[0]!.form.get('logo') as File;
    expect(file.name).toBe('logo.png');
    expect(file.type).toBe('image/png');
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  });

  it("gives a file without a type one from its name (the server takes PNG, JPEG or SVG by type)", async () => {
    const { seen, baseUrl } = await listen();
    const client = new LinkSnapClient({ apiKey: 'lsk_live_test', baseUrl });
    await client.api.qrCodesUploadLogo({ logo: new File(['<svg/>'], 'mark.svg') });
    const file = seen[0]!.form.get('logo') as File;
    expect(file.name).toBe('mark.svg');
    expect(file.type).toBe('image/svg+xml');
  });

  it("raises the server's refusal as an ApiError", async () => {
    const { baseUrl } = await listen(403, {
      data: null,
      error: { code: 'FORBIDDEN', message: 'QR logo is available on Pro and Business plans only' },
      meta: { requestId: 'req_1', timestamp: '' },
    });
    const client = new LinkSnapClient({ apiKey: 'lsk_live_test', baseUrl });
    await expect(client.api.qrCodesUploadLogo({ logo: new Blob(['x'], { type: 'image/png' }) })).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
      requestId: 'req_1',
    });
  });

  it('sends a non-key token as Bearer', async () => {
    const { seen, baseUrl } = await listen();
    const client = new LinkSnapClient({ apiKey: 'eyJhbGciOi.tok', baseUrl });
    await client.api.qrCodesUploadLogo({ logo: new Blob(['x'], { type: 'image/png' }) });
    expect(seen[0]!.auth).toBe('Bearer eyJhbGciOi.tok');
  });
});
