# Firebase Hosting custom domain — migration runbook

> **Nature of this plan:** this is a **deployment runbook**, not a TDD code
> plan. Most steps are commands run against Google Cloud / your DNS registrar
> and can't be unit-tested; "verify" steps use `curl`/browser checks instead of
> `pnpm test`. Steps still use checkbox (`- [ ]`) syntax and stay bite-sized.
> Steps marked **[you]** need a human (interactive login, registrar DNS, console
> clicks); steps marked **[repo]** are file edits.

**Goal:** Serve math-quizz at `https://math-quizz.mrpia.ch` from Firebase
Hosting (static `dist/`), with free Google-managed TLS, then retire Cloud Run.

**Architecture:** Deploy the Vite `dist/` bundle directly to Firebase Hosting on
the existing GCP project `modern-ally-102412`; reproduce `nginx.conf` behaviour
(SPA fallback + cache headers) in `firebase.json`; point the subdomain at
Firebase's Anycast IPs; validate; then delete the now-redundant Cloud Run
service. See the design doc:
`docs/superpowers/specs/2026-06-13-firebase-hosting-design.md`.

**Tech stack:** Firebase CLI (`firebase-tools`), Firebase Hosting, Vite static
build. Project `modern-ally-102412`. No app code changes.

> **WSL note (from prior deploy experience):** like `gcloud`, `firebase` needs
> network egress to Google. In this WSL dev environment that means running the
> CLI with the command sandbox **disabled** (egress to googleapis.com is blocked
> under the sandbox, and the CLI can't write its config). Use
> `firebase login --no-localhost` because the browser-redirect login is awkward
> across WSL.

---

## File / artifact map

- Create `firebase.json` — Hosting config (public dir, SPA rewrite, cache headers).
- Create `.firebaserc` — pins the default Firebase project.
- Modify `.gitignore` — ignore Firebase CLI cruft (`.firebase/`, `*-debug.log`).
- Modify `README.md` — rewrite the **Deploy** section (Cloud Run → Firebase).
- Modify `CLAUDE.md` — update the **Deploy** section pointer.
- Delete (final task, optional) `Dockerfile`, `nginx.conf`, `.dockerignore`,
  `.gcloudignore`, plus the Cloud Run service and its Artifact Registry images.

---

### Task 1: Pre-flight checks (no changes)

**Goal:** confirm the ground truth before touching anything.

- [x] **Step 1: Confirm the build still produces `dist/`** **[repo]**

Run: `pnpm build`
Expected: `tsc --noEmit` clean, Vite writes `dist/index.html`, `dist/assets/…`,
`dist/sw.js`, `dist/manifest.webmanifest`.

- [x] **Step 2: Confirm the active gcloud account + project** **[you]**

Run: `gcloud config list`
Expected: the account that owns the project, `project = modern-ally-102412`.
(If wrong: `gcloud config set project modern-ally-102412`.)

- [x] **Step 3: Check for a CAA record that could block the managed cert** **[you]**

Run: `dig +short CAA mrpia.ch`
Expected: **empty** (no CAA = any CA may issue, including Google). If it returns
records, confirm they permit `pki.goog` / `letsencrypt.org`; otherwise the
Firebase managed certificate will hang at "provisioning" and you must add an
allowing CAA entry. Note the result here before proceeding.

- [x] **Step 4: Confirm you can edit DNS for `mrpia.ch`** **[you]**

Identify where `mrpia.ch`'s nameservers point (`dig +short NS mrpia.ch`) and that
you have login access to add A/TXT records there. No change yet — just confirm
access, because Task 4 is blocked without it.

---

### Task 2: Add Firebase to the project and write Hosting config

- [x] **Step 1: Install the Firebase CLI** **[you]**

Run: `pnpm add -g firebase-tools` (or `npm i -g firebase-tools`)
Verify: `firebase --version` (expect 13.x+).

- [x] **Step 2: Log in** **[you]**

Run: `firebase login --no-localhost`
Follow the paste-code flow. Verify: `firebase projects:list` lists projects.

- [x] **Step 3: Enable Firebase on the existing GCP project** **[you]**

If `modern-ally-102412` is **not** already in `firebase projects:list`, add
Firebase to it (this does not create a new project — it attaches Firebase to the
existing Cloud project):

Run: `firebase projects:addfirebase modern-ally-102412`
Expected: success, or a message that Firebase resources already exist (also
fine). (Equivalent UI path: Firebase console → Add project → "Add Firebase to
an existing Google Cloud project" → select `modern-ally-102412`.)

- [x] **Step 4: Create `.firebaserc`** **[repo]**

Create `.firebaserc` at the repo root (do **not** run interactive `firebase
init` — it can clobber config and ask for a SPA rewrite we're setting by hand):

```json
{
  "projects": {
    "default": "modern-ally-102412"
  }
}
```

- [x] **Step 5: Create `firebase.json`** **[repo]**

Create `firebase.json` at the repo root. This reproduces `nginx.conf`:
`public: dist` (the Vite output), the SPA fallback as a rewrite, and the three
cache-header rules. Gzip/brotli is automatic on Hosting, so the `gzip` block has
no equivalent.

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      },
      {
        "source": "/sw.js",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      },
      {
        "source": "/manifest.webmanifest",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      }
    ]
  }
}
```

- [x] **Step 6: Ignore CLI cruft** **[repo]**

Append to `.gitignore`:

```
# Firebase CLI
.firebase/
*-debug.log
```

- [x] **Step 7: Commit the config** **[repo]**

```bash
git add firebase.json .firebaserc .gitignore
git commit -m "build(hosting): add Firebase Hosting config (static dist, SPA fallback, cache headers)"
```

---

### Task 3: Deploy to the default `*.web.app` URL and validate

**Goal:** prove the build serves correctly from Hosting *before* touching DNS.

- [x] **Step 1: Build fresh** **[repo]**

Run: `pnpm build`
Expected: `dist/` regenerated.

- [x] **Step 2: Deploy** **[you]**

Run: `firebase deploy --only hosting`
Expected: "Deploy complete!" and a Hosting URL, e.g.
`https://modern-ally-102412.web.app`.

- [x] **Step 3: Verify the app loads and SPA fallback works** **[you]**

Open `https://modern-ally-102412.web.app` — the home screen renders. Hard-refresh
(Ctrl-Shift-R); it must not 404 (the `**` → `/index.html` rewrite handles it).

- [x] **Step 4: Verify cache headers match the nginx intent** **[you]**

```bash
curl -sI https://modern-ally-102412.web.app/sw.js | grep -i cache-control
curl -sI "https://modern-ally-102412.web.app/$(curl -s https://modern-ally-102412.web.app/ | grep -oE 'assets/[^\"]+\.js' | head -1)" | grep -i cache-control
```
Expected: `sw.js` → `cache-control: no-cache`; the `/assets/…` file →
`cache-control: public, max-age=31536000, immutable`.

- [x] **Step 5: Verify the PWA still installs** **[you]**

In Chrome devtools → Application: the service worker registers and the manifest
loads on the `.web.app` origin. (A fresh origin = a fresh SW install, expected.)

---

### Task 4: Connect the custom domain `math-quizz.mrpia.ch`

> **[you] — all console + registrar.** Firebase shows the **exact** records to
> add; use those verbatim rather than any IPs guessed here (they can change).

- [x] **Step 1: Add the custom domain**

Firebase console → Hosting → **Add custom domain** → enter
`math-quizz.mrpia.ch` → continue.

- [x] **Step 2: Verify ownership (if prompted)**

If Firebase asks to verify domain ownership, it gives a **TXT** record. Add it at
`mrpia.ch`'s DNS exactly as shown, then continue once it propagates
(`dig +short TXT mrpia.ch` shows it).

- [x] **Step 3: Add the A records for the subdomain**

Firebase then shows two **A** records for `math-quizz` (the subdomain host). Add
both at `mrpia.ch`'s DNS, host = `math-quizz`, exactly as shown.

- [x] **Step 4: Wait for SSL provisioning**

The console moves from "Needs setup" → "Pending" → "Connected". Google issues the
managed certificate automatically; this can take minutes up to ~24h. If it
stalls, re-check Task 1 Step 3 (CAA) and that the A records resolve:
`dig +short A math-quizz.mrpia.ch`.

- [x] **Step 5: Verify the live domain**

Open `https://math-quizz.mrpia.ch` — app loads over a valid (Google-managed)
certificate; hard-refresh doesn't 404. Confirm cert validity:

```bash
curl -sI https://math-quizz.mrpia.ch | head -1   # expect: HTTP/2 200
```

> **Heads-up (expected, not a bug):** the child's existing history/heatmap/
> training data does **not** appear here — `localStorage` is per-origin and this
> is a new origin. See the design doc's "Consequences accepted" §2.

---

### Task 5: Repoint the docs to Firebase Hosting

**Goal:** the repo must stop claiming Cloud Run is the deploy target. Do this
**after** Task 4 succeeds, so the docs are never false in either direction.

- [x] **Step 1: Rewrite the README Deploy section** **[repo]**

In `README.md`, replace the entire **## Deploy** section (currently the Cloud
Run / Docker / nginx description and the `gcloud run deploy` command) with:

```markdown
## Deploy

The app is a static bundle hosted on **Firebase Hosting** (project
`modern-ally-102412`), served at **https://math-quizz.mrpia.ch** with a free
Google-managed TLS certificate. There is no server — Firebase Hosting serves the
`dist/` files directly from Google's edge CDN.

Build and deploy in two steps:

```bash
pnpm build
firebase deploy --only hosting
```

`firebase.json` reproduces the old nginx behaviour: a `**` → `/index.html`
rewrite for the SPA fallback, a 1-year immutable cache on the content-hashed
`/assets/`, and `no-cache` on `sw.js` and `manifest.webmanifest`. Gzip/brotli
compression is automatic. `.firebaserc` pins the default project.

> Custom domain DNS lives at the `mrpia.ch` registrar (two A records on the
> `math-quizz` host, pointing at Firebase's Anycast IPs as shown in the Firebase
> console → Hosting). The Google-managed certificate renews automatically.
```

- [x] **Step 2: Update the CLAUDE.md Deploy section** **[repo]**

In `CLAUDE.md`, replace the **## Deploy** section:

```markdown
## Deploy

Static bundle on **Firebase Hosting** (GCP project `modern-ally-102412`), live at
`math-quizz.mrpia.ch`. Deploy with `pnpm build && firebase deploy --only
hosting`. See `README.md` and `docs/superpowers/specs/2026-06-13-firebase-hosting-design.md`.
```

- [x] **Step 3: Confirm no app-version churn is needed** **[repo]**

This change does not alter app behaviour, so **do not** bump `package.json`
version. The `releaseNotes`/CHANGELOG drift guard only triggers on a version
change, so leaving them untouched keeps `pnpm test` green. (Optionally add a
`### Changed` line under an `## [Unreleased]` heading in `CHANGELOG.md` — no
version bump.)

- [x] **Step 4: Verify the suite is still green** **[repo]**

Run: `pnpm test`
Expected: PASS (no version/notes drift; no code changed).

- [x] **Step 5: Commit the docs** **[repo]**

```bash
git add README.md CLAUDE.md
git commit -m "docs: point deploy docs at Firebase Hosting + math-quizz.mrpia.ch"
```

---

### Task 6: Retire Cloud Run (final, deliberate, partly irreversible)

> Do this **only after** `math-quizz.mrpia.ch` has been stable for a few days
> and you're confident. This is the outward-facing, hard-to-reverse step:
> deleting the service frees the redundant `run.app` URL and stops Artifact
> Registry image-storage cost. Keep the `Dockerfile`/`nginx.conf` in-repo if you
> want a re-deploy path; delete them only if you're sure.

- [ ] **Step 1: Snapshot what exists** **[you]**

```bash
gcloud run services describe math-quizz --region europe-west6 --format='value(status.url)'
gcloud artifacts repositories list --location europe-west6
```
Record the URL and the `cloud-run-source-deploy` repo name.

- [ ] **Step 2: Delete the Cloud Run service** **[you]**

```bash
gcloud run services delete math-quizz --region europe-west6
```
Expected: confirmation prompt → deleted. `https://math-quizz-…europe-west6.run.app`
now 404s; `math-quizz.mrpia.ch` is unaffected (it's served by Hosting).

- [ ] **Step 3: (Optional) Remove the now-orphaned container images** **[you]**

```bash
gcloud artifacts repositories delete cloud-run-source-deploy --location europe-west6
```
Only do this if no other service uses that repo. This stops the small ongoing
image-storage charge.

- [ ] **Step 4: (Optional) Remove the container build files from the repo** **[repo]**

```bash
git rm Dockerfile nginx.conf .dockerignore .gcloudignore
git commit -m "chore: drop Cloud Run container build files (now on Firebase Hosting)"
```
Skip this if you want to keep the container as a documented fallback.

---

### Task 7: Final verification

- [x] **Step 1: Live domain healthy** — `curl -sI https://math-quizz.mrpia.ch | head -1` → `HTTP/2 200`, valid cert.
- [x] **Step 2: SPA fallback** — a hard refresh on the domain does not 404.
- [x] **Step 3: Cache headers** — `/assets/*` immutable, `sw.js`/`manifest.webmanifest` `no-cache` (rerun Task 3 Step 4 against the custom domain).
- [x] **Step 4: Repo green** — `pnpm test` and `pnpm build` both pass.
- [x] **Step 5: Docs truthful** — README/CLAUDE.md describe Firebase Hosting, not Cloud Run.

---

## Self-review notes (checked against the spec)

- **Spec coverage:** Option A chosen → Tasks 2–3 (deploy static), Task 4 (custom
  domain + free SSL), Task 6 (retire Cloud Run). `nginx.conf` → `firebase.json`
  mapping (spec table) is implemented verbatim in Task 2 Step 5. The two flagged
  consequences are surfaced where they bite: CAA pre-check (Task 1 Step 3),
  per-origin `localStorage` reset (Task 4 Step 5 heads-up).
- **No hardcoded DNS:** A-record IPs are intentionally **not** written here —
  Task 4 uses exactly what the Firebase console displays (they can change), per
  the "don't invent facts" rule.
- **Greenness:** no app code changes; the only repo edits (config + docs) don't
  touch the version, so the `releaseNotes` drift guard stays green throughout
  (Task 5 Step 3 makes this explicit).
- **Reversibility ordering:** all reversible/validating steps (1–5) precede the
  one irreversible step (Task 6), which is gated on a stability soak.
