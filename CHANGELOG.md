# Changelog

## 0.3.0
- File uploads: `client.api.qrCodesUploadLogo({ logo })` sends the logo as `multipart/form-data` (it was generated with no input and could not upload anything), with the client's credential, and returns `{ logoData }`. A `File` or `Blob` without a type is typed from its name (`logo.png` → `image/png`): the API takes a logo by its type (PNG, JPEG or SVG).

## 0.2.0
- The API key goes as `Authorization: ApiKey <key>`, which is what the LinkSnap API reads (it was sent as `Bearer`, which the API refused for keys until it learned to take both). A per-call `authToken` that is an `lsk_…` key goes the same way; a session or access token stays `Bearer`. The key now also applies to the raw verbs (`client.api.get(...)`) and takes precedence over a `session`.
- `billing.checkout` / `billing.downgrade` send the plan as `plan`, the field the API reads (they sent `planId`, which it rejected as an invalid plan); `checkout` returns `{ checkoutUrl, sessionId, subscriptionId, invoiceId }`, the API's answer.
- `client.api.*` regenerated: webhook endpoints, and every customer route, take the API key; the reference marks the person-only routes (API keys, the account, sign-in and workspace membership).
- A test checks every hand-written method's route against the API spec (`backend/openapi.json`).

## 0.1.3
- `client.api.<area><Action>(...)`: every LinkSnap feature route, one method each, generated from the API spec (`scripts/apigen.sh`). Calls go through the same ApiClient and credentials as the rest of the client. `client.api.get/post/patch/put/delete/paginate` keep working as before.

## 0.1.2
- Package metadata now points at the public mirror repo (github.com/hachimi-cat/linksnap-node).

## 0.1.1
- Prior release.
