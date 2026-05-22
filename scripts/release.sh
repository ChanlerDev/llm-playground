#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh [patch|minor|major]
# Default: patch

BUMP="${1:-patch}"
CHANGELOG="docs/CHANGELOG.md"
PKG="package.json"

# --- Pre-flight guards ---

# Working tree clean?
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Working tree not clean. Commit or stash changes first."
  exit 1
fi

# Not detached HEAD?
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "HEAD" ]; then
  echo "✗ Detached HEAD. Checkout a branch first."
  exit 1
fi

# Get current version from package.json
CURRENT=$(node -p "require('./$PKG').version")
LATEST_TAG=$(git tag --list 'v*' --sort=-v:refname | head -1)

# If tags exist, check alignment
if [ -n "$LATEST_TAG" ]; then
  TAG_VER="${LATEST_TAG#v}"
  if [ "$TAG_VER" != "$CURRENT" ]; then
    echo "✗ package.json version ($CURRENT) ≠ latest tag ($LATEST_TAG). Align first."
    exit 1
  fi

  # Has actual changes since last tag?
  CHANGES=$(git diff --name-only "$LATEST_TAG"...HEAD | grep -v '^docs/' | head -1 || true)
  if [ -z "$CHANGES" ]; then
    echo "✗ No code changes since $LATEST_TAG."
    exit 1
  fi
fi

# Changelog Unreleased section non-empty?
if [ -f "$CHANGELOG" ]; then
  UNRELEASED=$(sed -n '/^## Unreleased/,/^## /{ /^## /d; /^$/d; p; }' "$CHANGELOG")
  if [ -z "$UNRELEASED" ]; then
    echo "✗ $CHANGELOG ## Unreleased section is empty. Add entries first."
    exit 1
  fi
fi

# Run check
echo "→ Running checks..."
bash scripts/check.sh

# --- Bump version ---

# Calculate new version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "✗ Invalid bump type: $BUMP (use patch|minor|major)"; exit 1 ;;
esac
NEW_VER="$MAJOR.$MINOR.$PATCH"

echo "→ Bumping $CURRENT → $NEW_VER"

# Update package.json version
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PKG', 'utf8'));
pkg.version = '$NEW_VER';
fs.writeFileSync('$PKG', JSON.stringify(pkg, null, 2) + '\n');
"

# --- Changelog: archive Unreleased → version ---

if [ -f "$CHANGELOG" ]; then
  DATE=$(date +%Y-%m-%d)
  sed -i '' "s/^## Unreleased/## Unreleased\n\n## $NEW_VER ($DATE)/" "$CHANGELOG"
  # Clean up double blank lines
  sed -i '' '/^$/N;/^\n$/d' "$CHANGELOG"
fi

# --- Commit, tag, push ---

git add "$PKG" "$CHANGELOG"
git commit -m "release: v$NEW_VER"
git tag "v$NEW_VER"
git push origin "$BRANCH" --follow-tags

echo "✓ Released v$NEW_VER"
