#!/bin/sh
set -eu

: "${BACKEND_URL:=https://workmatch-backend.onrender.com}"
BACKEND_URL="${BACKEND_URL%/}"

escaped_backend_url=$(printf '%s' "$BACKEND_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > /usr/share/nginx/html/env.js <<EOF
window.WNU_CONFIG = {
  BACKEND_URL: "$escaped_backend_url"
};
EOF
