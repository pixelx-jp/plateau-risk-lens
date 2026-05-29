#!/usr/bin/env bash
# Manual override deploy. The normal path is GitHub Actions —
# see docs/DEPLOYMENT.md. Use this only if Actions is unavailable.
#
# Prerequisites:
#   npm i -g wrangler && wrangler login
#
# Env:
#   CF_PAGES_PROJECT (default: plateau-risk-lens)
#   CF_PAGES_BRANCH  (default: main)
#   VITE_ARTIFACT_BASE_ROOT (default: /artifacts; set to https://<r2-host> for R2)
#   VITE_DEFAULT_CITY_SLUG (default: shibuya)
set -euo pipefail

PROJECT="${CF_PAGES_PROJECT:-plateau-risk-lens}"
BRANCH="${CF_PAGES_BRANCH:-main}"

echo "==> Building (VITE_ARTIFACT_BASE_ROOT=${VITE_ARTIFACT_BASE_ROOT:-/artifacts})"
npm run build

echo "==> Publishing to Cloudflare Pages project '${PROJECT}' (branch=${BRANCH})"
npx wrangler pages deploy dist \
  --project-name "${PROJECT}" \
  --branch "${BRANCH}"

cat <<EOF

Next steps:
  1. Verify HTTP/2 206 + accept-ranges on artifact host:
       curl -I -H "Range: bytes=0-100" <pmtiles_url>
  2. If artifacts live on a separate origin (R2 / S3), confirm CORS headers:
       access-control-allow-origin: *
       accept-ranges: bytes
  3. Set the custom domain (risk-lens.plateau.yodolabs.jp) in the Cloudflare Pages dashboard.
EOF
