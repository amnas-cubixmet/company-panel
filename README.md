# cubixgear — Company Panel

Production-oriented React 19 + Vite 6 company/workshop management frontend for
the cubixgear multi-tenant SaaS product. Django provides authentication,
entitlements, payments, invoices, credits, storage and tenant-scoped APIs.

## Development

Node 22 is used in CI.

```sh
npm ci
cp .env.example .env
npm run dev
```

The local backend defaults to `http://127.0.0.1:8000/api/v1`.
Set `VITE_CUSTOMER_WEBSITE_DEV_ORIGIN` in `.env` or `.env.local` to the HTTP
origin of the locally running Customer Website, for example `http://localhost:3000`.
Restart Vite after editing it. The local website preview, customer tracking
links and WhatsApp drafts use this port on the workshop's `.localhost`
subdomain. With the value blank, links use Django's configured portal address.
For staging/production, configure `VITE_API_URL` to the deployed Django
`/api/v1` endpoint. Never place secrets in `VITE_*` variables.

## Validation

```sh
npm run check
npm test
VITE_API_URL=https://api.example.invalid/api/v1 npm run build
npm run check:bundle
npx playwright install chromium
UI_PRODUCTION=1 npm run test:ui
```

The `example.invalid` build URL is for isolated CI/testing only; replace it
with the real HTTPS backend during deployment. `npm run verify` combines
lint, Node regression tests, build and bundle guardrails (API URL required).

Browser smoke tests intercept API calls using isolated fixtures and block
writes. They cover route layouts across desktop, tablet and phone but cannot
verify real Django data, SMTP, payment capture or Celery workers. Use staging
integration tests before production releases.

See [production readiness and release checklist](docs/production-readiness.md)
and [SaaS owner onboarding](docs-owner-saas-onboarding.md).

## Production API setup (Vercel / npm)

Django web, PostgreSQL, Redis and Celery run in the **backend repository**
using its separate-service production configuration. Company Panel is
a Vite browser frontend; npm never starts Django or Celery.

Windows PowerShell:

~~~powershell
Copy-Item .env.production.example .env.production
notepad .env.production
npm ci
npm run check:production-env
npm run build:production
~~~

Set the actual production HTTPS Django URL ending in `/api/v1` and
`VITE_USE_MOCK_API=false` in Vercel Environment Variables. Vercel's
build command is `npm run build:production`. Production builds fail closed
if the URL is missing/localhost/HTTP/example/mock; this intentionally
prevents a broken deployment. The local `.env.example` uses Django
`http://127.0.0.1:8000/api/v1` and still works with `npm run dev`.

`ENV.production.example.txt` is a copyable plain-text template.
No database passwords, email credentials, Django/JWT secrets or Redis broker
passwords may appear in frontend `VITE_*` variables — they are public.
See the backend [PostgreSQL migration and Celery deployment guide](https://github.com/amnas-cubixmet/cubegears-backend/blob/main/docs/production-postgres-celery.md)
after its deployment branch is merged.

## Customer Website subdomains (kubescare.tech)

The public `abc-mortgage.customer.kubescare.tech` website is **not** this
React/Vite Company Panel. This app already reads the company-specific URL from
Django `GET /api/v1/company/customer-website`, lets an authorized owner rename
the label at `PATCH /api/v1/company/customer-website/subdomain`, and keeps
production Open Website links disabled until the backend returns
`wildcardReady: true`.

For the actual rollout, configure `CUSTOMER_PORTAL_ROOT_DOMAIN`, the signed
Customer Website proxy, wildcard DNS/TLS and the backend rollout flag. Do **not**
add a `VITE_*` secret or point `VITE_API_URL` to a customer-site wildcard.
See the backend [kubescare wildcard deployment runbook](https://github.com/amnas-cubixmet/cubegears-backend/blob/main/docs/customer-website-kubescare-wildcard.md)
after the corresponding backend PR is merged. A separate Customer Website
Vercel frontend/BFF deployment is still required for public pages.
