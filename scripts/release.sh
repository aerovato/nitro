#!/bin/sh

set -eu

version=${1:-}

if [ -z "$version" ]; then
  printf '%s\n' 'Usage: bun run release -- <version>' >&2
  exit 1
fi

case "$version" in
  v*) tag="$version" ;;
  *) tag="v$version" ;;
esac

npm version "$tag" --git-tag-version
git push origin main --follow-tags
