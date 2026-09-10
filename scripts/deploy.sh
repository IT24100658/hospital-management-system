#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT=$(pwd)

if [ -f deploy.env ]; then
  set -a
  # shellcheck disable=SC1091
  source deploy.env
  set +a
fi

MISSING=()
[ -z "${GITHUB_TOKEN:-}" ] && MISSING+=("GITHUB_TOKEN")
[ -z "${GITHUB_USER:-}" ] && MISSING+=("GITHUB_USER")
[ -z "${ATLAS_PUBLIC:-}" ] && MISSING+=("ATLAS_PUBLIC")
[ -z "${ATLAS_PRIVATE:-}" ] && MISSING+=("ATLAS_PRIVATE")
[ -z "${RENDER_API_KEY:-}" ] && MISSING+=("RENDER_API_KEY")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "Missing values in deploy.env: ${MISSING[*]}"
  echo "Copy deploy.env.example to deploy.env and fill in the codes:"
  echo "  cp deploy.env.example deploy.env"
  exit 1
fi

REPO="${HMS_REPO:-hospital-management-system}"
REPO_URL="https://github.com/${GITHUB_USER}/${REPO}"

echo "==> 1/3 Pushing code to GitHub (${REPO_URL})"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token ${GITHUB_TOKEN}" "https://api.github.com/repos/${GITHUB_USER}/${REPO}")
if [ "$HTTP" = "404" ]; then
  curl -s -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/user/repos" -d "{\"name\":\"${REPO}\",\"private\":false,\"description\":\"Hospital Management System\"}" > /dev/null
  echo "    Created repo"
else
  echo "    Repo already exists"
fi

git remote remove origin > /dev/null 2>&1 || true
git remote add origin "https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO}.git"
git add -A 2>/dev/null || true
git -c commit.gpgsign=false commit -m "Hospital Management System" --no-verify > /dev/null 2>&1 || true
git push -u origin HEAD:main --force --quiet || git push -u origin HEAD:master --force --quiet
echo "    Code pushed"

echo "==> 2/3 Database setup"
if [ -n "${MONGO_URI:-}" ]; then
  printf '%s' "$MONGO_URI" > .deploy-atlas-uri
  echo "    Using the MONGO_URI from deploy.env (Atlas API not needed)"
else
  echo "    Creating MongoDB Atlas cluster + database user"
  export GITHUB_REPO_URL="$REPO_URL"
  node scripts/deploy.cjs setup-atlas "$@"
fi

echo "==> 3/3 Creating Render web service and waiting for it to go live"
node scripts/deploy.cjs setup-render "$@"

echo ""
echo "======================================================"
echo "   LIVE! Sign in at:  https://${CLIENT_URL_NAME:-hospital-management-system}.onrender.com"
echo "   (or the onrender.com URL printed above)"
echo "   Demo login:  admin / admin123"
echo "======================================================"