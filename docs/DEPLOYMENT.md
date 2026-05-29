# Deployment

This is a maintainer-only guide. **Contributors do not need any of this.**
PRs auto-deploy to a preview URL via the configured workflow; merges to `main`
auto-deploy to production.

## One-time maintainer setup

### 1. Cloudflare account + Pages project

- Create a Cloudflare account at <https://dash.cloudflare.com/sign-up> (free).
- In the dashboard, **Workers & Pages → Create → Pages → Direct upload**, name
  it `plateau-risk-lens`. We're using direct-upload (not Git integration)
  because the GitHub Actions workflow drives the build deterministically with
  the same env vars used for OG image generation.

### 2. Create a scoped API token

- **My Profile → API Tokens → Create Token → Custom token** with:
  - Permissions: `Account → Cloudflare Pages → Edit`
  - Account resources: include the account you'll deploy under
- Copy the token (you'll only see it once).
- Copy your Account ID from any zone or the Workers & Pages overview page.

### 3. Add repo secrets and variables

In the GitHub repo, **Settings → Secrets and variables → Actions**:

**Secrets:**
- `CLOUDFLARE_API_TOKEN` — the scoped token from step 2
- `CLOUDFLARE_ACCOUNT_ID` — your account ID

**Variables:**
- `CLOUDFLARE_DEPLOY_ENABLED = true` — gate flag the workflow checks
- `CLOUDFLARE_PROJECT_NAME = plateau-risk-lens` (or whatever you named it)
- `VITE_ARTIFACT_BASE_ROOT = https://artifacts.plateau.yodolabs.jp`
  (the public URL of your artifacts origin; see "Artifact hosting" below)
- `VITE_DEFAULT_CITY_SLUG = shibuya`

After this, every push to `main` deploys production and every PR gets a
preview URL commented on it automatically.

### 4. Custom domain (optional)

In the Cloudflare Pages dashboard for the project, **Custom domains → Set up
a custom domain**, e.g. `risk-lens.plateau.yodolabs.jp`. The DNS record is added
automatically if the domain's zone is in the same account.

## Data layer overview

The SPA and the data it renders live in different places by design:

```
plateau-core (CC BY 4.0 data, MIT pipeline)
   └─ distribution/*.tar.zst    ←  released to GitHub
                                    https://github.com/pixelx-jp/plateau-bridge/releases/tag/data-v1
                                    distribution/index.json catalogs each bundle (city_code, sha256, bytes)

risk-lens production deploy
   ├─ SPA static files          ←  Cloudflare Pages (this repo)
   └─ /artifacts/<slug>/*       ←  served from a separate origin
                                    options (in order of recommendation):
                                    (a) Cloudflare R2 + public hostname (free egress)
                                    (b) GitHub Releases directly (no CDN polish; rate-limited)
                                    (c) Cloudflare Pages bundled (only for <5 cities)

contributor local dev
   └─ /artifacts/<slug>/*       ←  served by Vite middleware from one of:
                                    1. .artifacts/<slug>/       (scripts/fetch-artifacts.sh)
                                    2. ../plateau-core/out_<slug>/ (sibling clone)
                                    3. VITE_ARTIFACT_BASE_ROOT=<production-url>
```

Why split? Disaster events drive traffic spikes; R2 has $0 egress so the SPA
can be cited freely by media without bandwidth surprises. GitHub Releases is
fine for snapshots / archival but throttles aggressive download. Bundling
inside the Pages deploy hits Pages's 25 MB/file and 20k-file limits past a
few cities.

## Artifact hosting

The SPA is ~350 KB gzip. PMTiles + FGB per city are 5–50 MB each — too large
to ship inside the Pages bundle for many cities. Two patterns:

### A. Bundled in Pages (dev / small datasets)

Symlink `out_<slug>/` directories under `public/artifacts/<slug>/` before
build. `public/_headers` declares the right CORS + `Accept-Ranges` headers.

Limit: Cloudflare Pages caps individual files at 25 MB and total at 20k
files — workable for a few wards, awkward for nationwide.

### B. Cloudflare R2 (production, recommended)

```sh
# One-time bucket setup (requires wrangler auth on maintainer's machine)
npx wrangler r2 bucket create plateau-artifacts

# Before uploading multi-ward cities (Osaka, Yokohama, Fukuoka, Nagoya),
# patch their manifests with the FGB file index so FgbExporter can find
# every ward. Idempotent.
npx tsx scripts/inject-fgb-index.ts ../plateau-core

# Upload each city
for city in shibuya edogawa koto kamakura osaka; do
  npx wrangler r2 object put plateau-artifacts/${city}/manifest.json \
    --file ../plateau-core/out_${city}/manifest.json
  npx wrangler r2 object put plateau-artifacts/${city}/buildings.pmtiles \
    --file ../plateau-core/out_${city}/buildings.pmtiles
  for fgb in ../plateau-core/out_${city}/buildings/*.fgb; do
    npx wrangler r2 object put \
      plateau-artifacts/${city}/buildings/$(basename $fgb) --file $fgb
  done
done
```

Bind a public hostname (e.g. `artifacts.plateau.yodolabs.jp`) to the bucket in
the R2 dashboard, then set `VITE_ARTIFACT_BASE_ROOT` to that URL.

R2 CORS rule (`r2-cors.json`):

```json
[
  {
    "AllowedOrigins": ["https://risk-lens.plateau.yodolabs.jp"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Range", "Accept-Ranges", "Content-Length", "ETag"],
    "MaxAgeSeconds": 86400
  }
]
```

```sh
npx wrangler r2 bucket cors put plateau-artifacts --file r2-cors.json
```

## Verifying a fresh deploy

```sh
# CORS + Range on artifacts:
curl -I -H "Range: bytes=0-100" https://artifacts.plateau.yodolabs.jp/shibuya/buildings.pmtiles
# Expect:
#   HTTP/2 206
#   accept-ranges: bytes
#   access-control-allow-origin: *
#   content-range: bytes 0-100/...

# Eyeball the live site:
#  1. Switch to Edogawa, enable tsunami → most of the city should be hatched grey
#  2. Click a building → property card shows coverage sources separately from hit sources
#  3. Export PNG → attribution + dataset year + disclaimer are visible
```

## Manual deploy override

If GitHub Actions is down or you need a local-machine deploy, keep
`scripts/deploy.sh` as a fallback. It requires a local `wrangler login` and
is not the normal path.

```sh
./scripts/deploy.sh
```

## Updating OG images

Sample-city OG images live in `public/og/` and are committed to the repo.
Regenerate them whenever the UI changes meaningfully:

```sh
npm run dev &
npm run og:generate
git add public/og/
git commit -m "chore: refresh OG images"
```

(A GitHub Action could automate this too, but committing them keeps PR
reviews able to see the impact of a UI change without spinning up a browser.)
