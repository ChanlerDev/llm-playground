#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh [patch|minor|major]
# Default: patch
#
# Checkpoint script — archives ## Unreleased → versioned section,
# bumps package.json, syncs roadmap, commits + tags.
# Deployment is handled by Vercel on push to main (no manual deploy step).

BUMP="${1:-patch}"
CHANGELOG="docs/CHANGELOG.md"
ROADMAP="docs/ROADMAP.md"
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

  # Has changes since last tag?
  CHANGES=$(git diff --name-only "$LATEST_TAG"...HEAD | head -1 || true)
  if [ -z "$CHANGES" ]; then
    echo "✗ No changes since $LATEST_TAG."
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

# --- Roadmap: move fully-completed parent trees to Done ---

if [ -f "$ROADMAP" ]; then
  node -e "
const fs = require('fs');
const content = fs.readFileSync('$ROADMAP', 'utf8');
const lines = content.split('\n');

let plannedStart = -1, doneStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '## Planned') plannedStart = i;
  if (lines[i].trim() === '## Done') doneStart = i;
}
if (plannedStart === -1 || doneStart === -1) process.exit(0);

// Parse planned items into groups (parent + children)
const groups = [];
for (let i = plannedStart + 1; i < doneStart; i++) {
  const line = lines[i];
  if (/^- \[[ x]\]/.test(line)) {
    // Top-level item
    groups.push({ parent: line, children: [], startIdx: i });
  } else if (/^  - \[[ x]\]/.test(line) && groups.length > 0) {
    // Child item
    groups[groups.length - 1].children.push(line);
  }
}

// Determine which groups are fully complete
const toMove = [];
const toKeep = [];
for (const g of groups) {
  if (g.children.length === 0) {
    // No children: move if parent is [x]
    if (/^- \[x\]/.test(g.parent)) {
      toMove.push(g);
    } else {
      toKeep.push(g);
    }
  } else {
    // Has children: move only if ALL children are [x]
    const allDone = g.children.every(c => /\[x\]/.test(c));
    if (allDone) {
      // Mark parent as [x] too
      g.parent = g.parent.replace('- [ ]', '- [x]');
      toMove.push(g);
    } else {
      toKeep.push(g);
    }
  }
}

if (toMove.length === 0) process.exit(0);

// Rebuild file
const before = lines.slice(0, plannedStart + 1);
const plannedLines = [''];
for (const g of toKeep) {
  plannedLines.push(g.parent);
  for (const c of g.children) plannedLines.push(c);
}
plannedLines.push('');

const doneHeader = lines.slice(doneStart, doneStart + 1);
const doneExisting = lines.slice(doneStart + 1);
const doneNew = [];
for (const g of toMove) {
  doneNew.push(g.parent);
  for (const c of g.children) doneNew.push(c);
}

const result = [...before, ...plannedLines, ...doneHeader, ...doneNew, ...doneExisting].join('\n');
fs.writeFileSync('$ROADMAP', result);
console.log('  Moved ' + toMove.length + ' completed item(s) to Done');
"
fi

# --- Commit, tag, push ---

git add "$PKG" "$CHANGELOG" "$ROADMAP"
git commit -m "release: v$NEW_VER"
git tag "v$NEW_VER"
git push origin "$BRANCH" --follow-tags

echo "✓ Checkpoint v$NEW_VER tagged and pushed"
echo "  Vercel will auto-deploy if on main."
