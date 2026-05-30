#!/usr/bin/env bash
# Fetch plateau-core artifact bundles into public/artifacts/<slug>/.
#
# Bundles are hosted as GitHub Releases on the plateau-core repo; the index of
# available cities (city_code → bundle_url + sha256) is published at the URL
# below and pinned by the schema version it returns.
#
# Usage:
#   scripts/fetch-artifacts.sh [slug ...]
#
# Examples:
#   scripts/fetch-artifacts.sh shibuya
#   scripts/fetch-artifacts.sh shibuya edogawa koto kamakura osaka
#   scripts/fetch-artifacts.sh --all
#
# Why download at all? You don't have to. Two alternatives:
#   - Point the dev server at a hosted artifact origin via
#     VITE_ARTIFACT_BASE_ROOT=https://artifacts.plateau.yodolabs.jp (zero local
#     storage). See README.md.
#   - Or sibling-clone plateau-core; the dev middleware reads ../plateau-core
#     directly. See README.md.
#
# This script exists for contributors who want offline / reproducible work.

set -euo pipefail

# Index lives in the repo (not as a release asset), so read it raw from main —
# always fresh, single source of truth, and the same URL plateau-creative-mcp
# uses. The bundle_url in each entry still points at the data-v1 release assets.
INDEX_URL="${PLATEAU_DISTRIBUTION_INDEX:-https://raw.githubusercontent.com/pixelx-jp/plateau-bridge/main/distribution/index.json}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Artifacts are extracted *outside* the SPA's publicDir so that the
# production build doesn't bundle them. The Vite dev middleware reads from
# this location automatically. Production deploys host these on R2 or
# similar; see docs/DEPLOYMENT.md.
DEST_BASE="${ROOT}/.artifacts"
# Fallback when the published index isn't reachable: use a local plateau-core
# sibling checkout's distribution/index.json. This makes the script usable in
# environments without the GitHub Releases mirror set up yet.
LOCAL_INDEX="${ROOT}/../plateau-core/distribution/index.json"

# slug -> city_code map. Keep this in sync with src/app/cities.ts.
declare -A SLUG_TO_CODE=(
  [chiyoda]=13101 [chuo]=13102 [minato]=13103 [shinjuku]=13104
  [bunkyo]=13105 [taito]=13106 [sumida]=13107 [koto]=13108
  [shinagawa]=13109 [meguro]=13110 [ota]=13111 [setagaya]=13112
  [shibuya]=13113 [nakano]=13114 [suginami]=13115 [toshima]=13116
  [kita]=13117 [arakawa]=13118 [itabashi]=13119 [nerima]=13120
  [adachi]=13121 [katsushika]=13122 [edogawa]=13123
  [yokohama]=14100 [kamakura]=14204
  [osaka]=27100 [nagoya]=23100 [fukuoka]=40130 [sapporo]=01100
)

ALL_SLUGS=("${!SLUG_TO_CODE[@]}")

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <slug> [slug ...]   or   $0 --all"
  echo
  echo "Known slugs:"
  printf "  %s\n" "${ALL_SLUGS[@]}" | sort
  exit 1
fi

TARGETS=()
if [ "$1" = "--all" ]; then
  TARGETS=("${ALL_SLUGS[@]}")
else
  TARGETS=("$@")
fi

# Tools.
for cmd in curl tar jq sha256sum; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    # sha256sum is GNU-only; on macOS try shasum.
    if [ "$cmd" = "sha256sum" ] && command -v shasum >/dev/null 2>&1; then
      continue
    fi
    echo "missing required tool: $cmd" >&2
    exit 1
  fi
done

# zstd may be supplied by the system tar (bsdtar 3.7+) or as a standalone bin.
if ! tar --help 2>&1 | grep -q zstd; then
  if ! command -v zstd >/dev/null 2>&1; then
    echo "zstd not available; install via 'brew install zstd' or use a tar with --zstd support" >&2
    exit 1
  fi
fi

verify_sha256() {
  local file="$1" expected="$2"
  local actual
  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$file" | awk '{print $1}')
  else
    actual=$(shasum -a 256 "$file" | awk '{print $1}')
  fi
  if [ "$actual" != "$expected" ]; then
    echo "  ✗ sha256 mismatch (got $actual, expected $expected)" >&2
    return 1
  fi
}

mkdir -p "$DEST_BASE"

echo "==> Resolving distribution index"
if INDEX_JSON=$(curl -fsSL --max-time 15 "$INDEX_URL" 2>/dev/null); then
  echo "  · from $INDEX_URL"
elif [ -f "$LOCAL_INDEX" ]; then
  echo "  · from local sibling $LOCAL_INDEX"
  INDEX_JSON=$(cat "$LOCAL_INDEX")
else
  echo "  ✗ index not reachable at $INDEX_URL and no sibling at $LOCAL_INDEX" >&2
  echo "  Set PLATEAU_DISTRIBUTION_INDEX to a working URL or sibling-clone plateau-core." >&2
  exit 1
fi

for slug in "${TARGETS[@]}"; do
  code="${SLUG_TO_CODE[$slug]:-}"
  if [ -z "$code" ]; then
    echo "==> skip: unknown slug '$slug'" >&2
    continue
  fi

  echo "==> $slug ($code)"
  entry=$(echo "$INDEX_JSON" | jq --arg c "$code" '.cities[] | select(.city_code==$c)')
  if [ -z "$entry" ] || [ "$entry" = "null" ]; then
    echo "  ✗ no entry for city_code $code in distribution index" >&2
    continue
  fi

  bundle_url=$(echo "$entry" | jq -r '.bundle_url')
  sha=$(echo "$entry" | jq -r '.sha256')
  bytes=$(echo "$entry" | jq -r '.bytes')

  dest="$DEST_BASE/$slug"
  if [ -f "$dest/manifest.json" ]; then
    echo "  · already present, skipping (remove $dest to re-fetch)"
    continue
  fi

  tmpdir=$(mktemp -d)
  bundle="$tmpdir/bundle.tar.zst"
  echo "  · downloading ($bytes bytes)"
  curl -fL --progress-bar -o "$bundle" "$bundle_url"

  echo "  · verifying sha256"
  verify_sha256 "$bundle" "$sha"

  echo "  · extracting to $dest"
  mkdir -p "$dest"
  if tar --help 2>&1 | grep -q zstd; then
    tar --zstd -xf "$bundle" -C "$dest"
  else
    zstd -dc "$bundle" | tar -xf - -C "$dest"
  fi

  rm -rf "$tmpdir"
  echo "  ✓ ready: $dest"
done

# Multi-ward cities (Osaka, Yokohama, Fukuoka, Nagoya) need an FGB index in
# their manifest before FgbExporter can bbox-export. Run the patcher even if
# only one was downloaded; it is a no-op when the field already matches.
echo "==> Injecting FGB indexes (idempotent)"
if command -v npx >/dev/null 2>&1; then
  npx -y tsx "$ROOT/scripts/inject-fgb-index.ts" "$DEST_BASE"
else
  echo "  (skip: npx not on PATH; run scripts/inject-fgb-index.ts manually)" >&2
fi

echo
echo "Done. Start the dev server with: npm run dev"
