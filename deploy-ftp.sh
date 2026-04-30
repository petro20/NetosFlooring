#!/usr/bin/env bash
set -euo pipefail

if [ -f ".env.deploy" ]; then
  set -a
  # shellcheck disable=SC1091
  . ".env.deploy"
  set +a
fi

: "${FTP_PROTOCOL:?Set FTP_PROTOCOL in .env.deploy. Use ftp or ftps.}"
: "${FTP_HOST:?Set FTP_HOST in .env.deploy.}"
: "${FTP_PORT:?Set FTP_PORT in .env.deploy.}"
: "${FTP_USER:?Set FTP_USER in .env.deploy.}"
: "${FTP_REMOTE_DIR:?Set FTP_REMOTE_DIR in .env.deploy, usually public_html.}"

if [ -z "${FTP_PASS:-}" ]; then
  read -rsp "FTP password for ${FTP_USER}@${FTP_HOST}: " FTP_PASS
  echo
fi

case "$FTP_PROTOCOL" in
  ftp|ftps) ;;
  *)
    echo "FTP_PROTOCOL must be ftp or ftps."
    exit 1
    ;;
esac

CURL_FLAGS=(--fail --show-error --silent --ftp-create-dirs)

if [ "$FTP_PROTOCOL" = "ftps" ]; then
  CURL_FLAGS+=(--ssl-reqd)
fi

upload_file() {
  local file="$1"
  local remote_path="${FTP_REMOTE_DIR%/}/${file#./}"
  local url="ftp://${FTP_HOST}:${FTP_PORT}/${remote_path}"

  echo "Uploading ${file#./}"
  curl "${CURL_FLAGS[@]}" \
    --user "$FTP_USER:$FTP_PASS" \
    --upload-file "$file" \
    "$url"
}

while IFS= read -r -d '' file; do
  upload_file "$file"
done < <(
  find . -type f \
    -not -path "./.git/*" \
    -not -path "./.vscode/*" \
    -not -name ".env.deploy" \
    -not -name ".env.deploy.example" \
    -not -name ".gitignore" \
    -not -name "deploy-ftp.sh" \
    -print0
)

echo "Deploy finished."
