# Custom domain via Firebase Hosting — design

Date: 2026-06-13
Status: approved

## Goal

Serve math-quizz from the custom domain **`math-quizz.mrpia.ch`** (the owner
controls `mrpia.ch`), with a free Google-managed TLS certificate, at no
recurring cost.

## Decision

**Serve the static build directly from Firebase Hosting and stop using Cloud
Run for this app** (Option A below). The Vite `dist/` bundle is deployed to
Firebase Hosting; the custom domain points at Firebase Hosting's Anycast IPs;
Cloud Run, the `Dockerfile`, and `nginx.conf` become redundant and are retired
in a final, deliberate step.

## Why — the constraint that started this

The service runs in **`europe-west6` (Zürich)**. Cloud Run's *native* custom
domain mapping does **not** support europe-west6 — the supported list is a small
preview set (asia-east1, asia-northeast1, asia-southeast1, europe-north1,
europe-west1, europe-west4, us-central1, us-east1, us-east4, us-west1), and the
feature is itself flagged "not recommended for production". So there is no
one-command `gcloud run domain-mappings` path from Zürich.
Source: <https://docs.cloud.google.com/run/docs/mapping-custom-domains>

That constraint is real, but it pointed at the wrong question. The real question
is: **this app is a fully static SPA** (Vite build → nginx just hands back
files; zero server-side logic). It does not need a running container at all.

## Options considered

| | Approach | Recurring cost | Complexity | Keeps Zürich origin? |
|---|---|---|---|---|
| **A — chosen** | Static build served directly by Firebase Hosting; retire Cloud Run | **$0** (within Hosting free tier) | Lowest — no Docker/nginx/Cloud Build | No — global edge CDN |
| B | Firebase Hosting **proxies** to the Cloud Run container via a `run` rewrite | ~$0 (free tiers; Blaze required) | Highest — two products, a proxy hop, container cold starts | Yes — origin stays in europe-west6 |
| C | Global External Application Load Balancer + serverless NEG → Cloud Run | **~$18–25/mo** (forwarding-rule floor) | Medium | Yes |
| D | Move the service to europe-west1/4 and use native Cloud Run domain mapping | $0 | Low–medium | No — leaves Zürich; mapping is flaky preview |

Notes on the rejected options:

- **B** is the path the GCP assistant ("gcloud AI chat") proposed. It is
  *technically* sound — europe-west6 **is** in the supported-regions list for
  Firebase Hosting `run` rewrites
  (<https://firebase.google.com/docs/hosting/full-config>) — but it routes
  static assets through a CDN *to a container whose only job is to serve those
  same static files*. That is a proxy hop to nowhere: complexity and latency
  for no functional gain on a static app. It also requires the Blaze plan and
  the GCP assistant's cost summary contained a confused "billed in two regions"
  line that doesn't apply (there is only one service; it was moved from
  us-central1 and the old one deleted).
- **C** is the GCP-native, production-grade way to custom-domain a Cloud Run
  service in *any* region — but a forwarding rule alone has a fixed ~$18/mo
  floor before any traffic. Overkill for a one-child practice app. The GCP
  assistant omitted this option and its cost entirely.
- **D** trades the deliberate Zürich placement away and relies on a preview
  feature with well-documented certificate-provisioning flakiness.

## Consequences accepted (the honest downsides)

Choosing A is not free of tradeoffs. These are accepted knowingly:

1. **The origin is no longer in Switzerland.** Firebase Hosting serves from
   Google's global edge CDN; the backing storage region is not Zürich. The
   service was deliberately moved to europe-west6, so this reverses that
   placement. It is acceptable here because the app transmits **no personal
   data** — all state lives in the browser's `localStorage`, nothing is sent to
   any server. "Swiss hosting" for this app was symbolic, not a
   data-protection requirement. *If that symbolism matters more than
   simplicity, Option B is the fallback.*
2. **The child's saved progress does not carry over.** `localStorage` is keyed
   per-origin. Today's data lives under the `run.app` origin; the new origin
   (`math-quizz.mrpia.ch`) starts empty. Session history, the error heatmap, and
   training history reset on the new domain. Acceptable for a practice app; a
   manual one-time copy via browser devtools is possible if the history is worth
   keeping (out of scope for this plan).
3. **We lose the container as a fallback** once Cloud Run is deleted. The
   retirement step is deliberately last and reversible up to the point of
   deletion; the `Dockerfile`/`nginx.conf` can be kept in-repo as a re-deploy
   path even after the service is gone.

## What Firebase Hosting gives us for free (replacing nginx.conf)

The current `nginx.conf` does three things; each maps to Hosting config or is
handled automatically:

| `nginx.conf` behaviour | Firebase Hosting equivalent |
|---|---|
| SPA fallback (`try_files $uri … /index.html`) | `rewrites: [{ source: "**", destination: "/index.html" }]` — only fires when no real file matches, same semantics |
| `/assets/` cached 1y immutable (Vite content-hashes) | `headers` rule on `/assets/**` → `Cache-Control: public, max-age=31536000, immutable` |
| `sw.js` + `manifest.webmanifest` `no-cache` | `headers` rules on each → `Cache-Control: no-cache` |
| `gzip on` | Automatic — Hosting gzip/brotli-compresses responses; no config needed |

`vite.config.ts` uses `base: './'` (relative asset paths). This is safe because
the app has **no nested URL routes** — it is a screen state machine served at
`/`, so the SPA fallback only ever returns `index.html` for the root origin and
relative `./assets/...` resolve correctly. (Same reason it works under nginx
today.)

## Cost

$0 recurring. Firebase Hosting's free (Spark) tier covers 10 GB stored and
~360 MB/day transfer; a one-child app is orders of magnitude under that.
Custom domains and Google-managed SSL are included on the free tier — no Blaze
plan required for Option A. (The GCP project already has billing enabled because
it ran Cloud Run, so adding Firebase puts it on Blaze automatically; Hosting
usage still falls within the no-cost quota.)
Source: <https://firebase.google.com/docs/hosting/usage-quotas-pricing>

Retiring Cloud Run also stops the (tiny) ongoing Artifact Registry image-storage
cost from the `cloud-run-source-deploy` repo.

## Out of scope (noted, not built)

- Migrating existing `localStorage` history from the `run.app` origin to the new
  domain.
- A CI/CD deploy pipeline (GitHub Action → `firebase deploy`). Deploy stays
  manual, mirroring the current manual `gcloud run deploy`.
- Keeping Cloud Run warm as a hot standby behind the same domain (that would be
  Option B/C and defeats the purpose).
