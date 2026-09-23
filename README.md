# AIILSG Library Portal

MERN digital library with role-based authorization, private PDF page delivery, revocable JWT sessions, inventory accounting, and server-generated audit history.

## Requirements and local startup

- Node.js 22.13+ (Node 24 LTS recommended).
- MongoDB replica set or Atlas cluster. Standalone MongoDB is intentionally rejected: stock changes and session revocation require transactions.
- A private persistent filesystem directory, or a Cloudinary account configured for authenticated raw assets.

```sh
npm ci
cp server/.env.example server/.env
```

Set `MONGO_URI`, `JWT_SECRET` (at least 48 random characters), and `CLIENT_ORIGIN`. Generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. The server always loads `server/.env`, regardless of the working directory. Secrets have no fallback, and database credentials are never logged.

Provision a core super administrator with the following environment variables using your shell or secret manager, then run `npm run bootstrap:admin`:

- `BOOTSTRAP_ADMIN_ID`: unique administrator login
- `BOOTSTRAP_ADMIN_NAME`: display name
- `BOOTSTRAP_ADMIN_PASSWORD`: 12–72 UTF-8 bytes, at least 12 characters

Remove these bootstrap variables afterwards. There are no automatic accounts or demo passwords. The core account cannot be deleted via the API.

```sh
npm run dev:server
# In a second terminal:
npm run dev
```

Vite proxies `/api` to the local backend. PDFs never use an absolute localhost URL. A separate frontend deployment can set `VITE_API_BASE_URL` at build time and must configure its CSP and the backend's `CLIENT_ORIGIN` accordingly.

## Structure

```text
server/
  config/         environment, database, Cloudinary
  models/         users, admins, books, stock, sessions, blacklist, audit, reports
  middlewares/    authentication, roles, uploads, async errors
  controllers/    validated API operations
  routes/         endpoint-to-controller mapping
  services/       storage, isolated PDF processing, validation, audit, revocation
  scripts/        bootstrap, inventory migration, disposable test preview
  tests/          API/security integration tests
  app.js          testable application and production static serving
  server.js       database readiness, startup, graceful shutdown
src/
  api.js          deployment-aware API client and session handling
  components/     authenticated PDF reader
  App.jsx         login and library/admin workflows
```

## Permission policy

| Operation | Student | Limited admin | Super admin |
|---|---|---|---|
| Read assigned, unexpired, paid pages | Yes | All book pages | All book pages |
| Edit own name/phone and password | Yes | — | — |
| List/create students, edit student name/phone | No | Yes | Yes |
| Change fees, assignments, validity; reset/delete student | No | No | Yes |
| Upload books, manage stock, visitors and reports | No | Yes | Yes |
| Delete books; manage administrators/settings; read audit logs | No | No | Yes |

The existing librarian interface exposes visitor/report tools; the API policy above defines the maximum authorized operations. The server checks account type and current database role, not a role supplied by the browser. Student collection records can never grant administrative authority, including legacy records.

## API contract

All routes are under `/api`. Protected requests use `Authorization: Bearer <token>`.

- `POST /login`, `GET /me`, `POST /logout`
- `GET/POST /users`; `PUT /users/:id/profile` (`PUT /users/:id` is a profile-only compatibility alias)
- `PUT /users/:id/password`: `{ currentPassword, newPassword }`; owner only
- `POST /users/:id/reset-password`: `{ newPassword }`; super admin only
- `PUT /users/:id/fees`: `{ paidAmount, totalFee? }`
- `PUT /users/:id/permissions`: `{ access?, validFrom?, validUntil? }`
- `DELETE /users/:id`
- `GET/POST /admins`, `DELETE /admins/:id`
- `GET/POST /books`, `DELETE /books/:customId`
- `GET /books/:customId/pages/:page`: exactly one newly generated PDF page
- `GET/POST /inventory`, `GET/POST /transactions`
- `GET/POST /visitors`; `GET/PUT /settings`; `GET /logs`
- `POST /reports`, `GET /reports`, `PUT /reports/:id`; rate-limited public `POST /enquiries`

Lists accept `limit` (1–100, default 50) and `offset`, returning `{ items, total, limit, offset }`. The UI has explicit load-more controls; exports and aggregate views describe currently loaded records. Unknown update fields, MongoDB operators, arrays/objects in scalar inputs, and invalid ranges are rejected. Client audit writes/deletes do not exist.

## PDF access and session lifecycle

Uploads are limited to 20 MB, PDF MIME/extension, a `%PDF-` signature, and successful parsing of 1–1000 unencrypted pages. Parsing runs in bounded worker threads (four concurrent workers, 128 MB JS heap per worker, ten-second timeout). Originals are never served by Express or exposed in list responses.

For students, the allowed page count is `floor(totalPages * min(1, paidAmount / totalFee))`; explicitly zero-fee books are fully available to assigned students. Missing dates, missing assignments or invalid fees deny access. Validity dates are inclusive UTC calendar dates. Checks run for every page request. The backend creates a one-page PDF, excludes document-level scripts/attachments and page annotations, and embeds a user-specific watermark. Responses are private/no-store. Authorized content can still be captured or photographed; this is access control, not screenshot prevention.

JWTs have a 30-minute expiry, issuer/audience/algorithm restrictions and a random session ID. Session records and a TTL-indexed blacklist live in MongoDB. Logout blacklists that session; password reset/change and account deletion blacklist all associated sessions in the same transaction. Tokens from the prototype are rejected. Every request also checks the current account and token version. Browser tokens use sessionStorage; a 403 does not clear them, while a matching 401 expires the session.

## Production deployment

```sh
npm ci
npm run build
NODE_ENV=production npm start
```

Provide `NODE_ENV=production`, `CLIENT_ORIGIN=https://your-domain`, MongoDB credentials, a random JWT secret, and your storage configuration through the deployment secret manager. The server serves only `dist/` and the API. Terminate HTTPS at your reverse proxy; set `HOST=0.0.0.0` in a container and `TRUST_PROXY_HOPS` only to match the exact trusted proxy topology (default 0). Do not expose the backend directly when trusting proxy headers.

Use durable storage outside web roots, tested database/file backups, restricted database access, and monitoring for startup failures and rejected requests. Current rate limiters are process-local: deploy a single API instance or enforce equivalent shared limits at the gateway before horizontal scaling. PDF worker concurrency is also per instance. Audit records cannot be changed through the API; use separate database credentials/access controls for operators and backup tooling.

Cloudinary deployment instructions are in `CLOUDINARY_SETUP.md`. A real Cloudinary round-trip requires your credentials and is separate from the local integration suite.

## Migrating the prototype

1. Stop writes and back up the database and original files. Test migration on a restored staging database first.
2. Use a replica set/Atlas and a new JWT secret. Provision a new core administrator. Short prototype passwords are rejected by login validation. Reset affected student passwords through the new core account and rotate/remove legacy administrator credentials before exposure. Prototype accounts are **not** automatically deleted by this refactor.
3. Run `npm run migrate:inventory` while the API is stopped. It populates current stock and receipt/issue totals only for legacy items missing them, and rejects negative stock or invalid legacy quantities for manual reconciliation.
4. Re-upload legacy PDFs privately and reassign the replacement books through the admin console. Legacy `filePath` values are intentionally never followed or returned. Retire the old `/uploads` hosting route and remove/invalidate old public Cloudinary copies; changing this application's routes cannot revoke a previously public URL on another service.
5. Historical prototype logs remain in their original collection; new authoritative records use `auditlogs` and cannot inherit forged browser entries. Old UI-only fee/access/password edits never reached MongoDB and must be reconciled from trusted institutional records.
6. Verify an assigned student's permitted page, denied page, expired account, and an administrator's persisted edit before enabling public traffic.

## Verification

```sh
npm test
npm run lint
npm run build
npm audit
```

API tests use a disposable MongoDB replica set and do not read a production database. The first run may download a MongoDB binary. UI tests cover pre-login loading, role-based fetches, failures/retry, 401 expiration, 403 preservation, and stale-request handling.

For manual browser checks, `npm run test:preview` starts a disposable local database/API with synthetic fixtures. Pair it with `npm run dev`. The command prints test-only logins; it must never be deployed or pointed at real data.
