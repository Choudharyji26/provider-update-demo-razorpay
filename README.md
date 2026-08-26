# Ledger Line provider-update demo

Ledger Line is a deliberately small TypeScript SaaS fixture for the Pramaan/Product Loop
`provider.update` demo loop. It is a payments reconciliation tool arranged around Razorpay-shaped
seams: it maps a capture-shaped response object to settlement state, classifies a refund lifecycle,
verifies a webhook signature over injected bytes, and drafts an invoice from validated amounts.
Every seam is inert. The application and its tests never contact Razorpay, any payment network, or
any other external system.

Tests use inert SDK-shaped doubles and run in a subprocess with Node's network permission disabled
(`node --permission --allow-fs-read=*`), so they cannot open sockets even if a future edit tried.
The settlement module reports `completionClaimed: false`. There are no credentials, no live
objects, no customer or subject data anywhere in this repository. This repo exists only as a demo
fixture for an automated dependency-update product; do not run anything real against it.

## Run the baseline

Use exactly Node `24.18.0` and pnpm `11.15.1`:

```sh
pnpm install --frozen-lockfile
pnpm test
```

`pnpm test` runs Biome formatting and linting, TypeScript syntax parsing, strict typechecking,
network-denied tests, an offline frozen-lockfile dependency check, secret-shape scanning,
deterministic seed checks, and a package dry run. All application and test code stays under strict
TypeScript (`verbatimModuleSyntax`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).

The pinned Product Loop alpha accepts a closed customer manifest with exactly one `test` script and
no separate development-dependency section. For that reason the local verification tools (Biome,
TypeScript, Node type declarations) are pinned alongside runtime packages in `dependencies`.
`.tool-versions`, `.node-version`, and `.nvmrc` pin Node and pnpm without widening that closed
manifest shape.

## Baseline dependencies

| Package | Baseline | Status |
| --- | --- | --- |
| `razorpay` | `2.9.0` | hero outdated dep (June 2023 era; 2.9.x line continues past this pin) |
| `zod` | `3.23.8` | outdated on major (4.x current) |
| `dayjs` | `1.11.11` | outdated patch line (1.11.x continues) |
| `@biomejs/biome` | `1.9.4` | older 1.x config schema |
| `typescript` | `5.5.4` | older minor |
| `@types/node` | `22.5.4` | older major |

## Expected razorpay migration

The baseline pins `razorpay: 2.9.0`. The demo's expected candidate change is intentionally one
manifest edit plus refresh:

```text
razorpay: 2.9.0  ->  razorpay: ^2.9.8
```

The two most coupled modules must receive manual review:

- `src/payments/settle-payment.ts`
- `src/refunds/refund-status.ts`

After the manifest edit, refresh `pnpm-lock.yaml`, re-check the two affected tests and the typed
double factories in `tests/support/razorpay.ts`, then run `pnpm test`.

Real but unaffected modules:

- `src/invoices/draft-invoice.ts` (zod + dayjs seams)
- `src/webhooks/verify-signature.ts` (`node:crypto` timing-safe comparison only)

Exact affected, manual-verification, automatic-patch, and untouched path sets are frozen in
`seed-manifest.json` and checked as part of `pnpm test`.

## Self-describing fixture

This manifest is a plain self-describing fixture. It intentionally declares no authority bundle, no
verification digests, and no Pramaan/Product Loop commit identities; those fields are omitted
entirely rather than fabricated.

A note on typing: `razorpay@2.9.0` ships declarations whose internal imports reference files not
included in the published tarball, so the fixture models capture-shaped and refund-shaped payloads
as local structural interfaces instead of importing provider types. The real outdated packages are
still installed and locked; nothing imports or instantiates the SDK at all.

This seed does not push to any remote, create branches or pull requests, register apps, call any
provider, merge, or deploy.
