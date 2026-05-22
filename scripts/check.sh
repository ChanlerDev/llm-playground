#!/usr/bin/env bash
set -euo pipefail

# One-shot verification: lint + build
# Exit non-zero on any failure

echo "→ Lint"
pnpm lint

echo "→ Build"
pnpm build

echo "✓ All checks passed"
