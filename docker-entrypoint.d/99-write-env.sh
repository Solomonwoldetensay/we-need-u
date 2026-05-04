#!/bin/sh
# This script runs automatically when the app starts on a server
# It creates the env.js file with the correct backend URL

# Stop immediately if any error occurs (-e)
# Stop if any variable is undefined (-u)
set -eu

# If BACKEND_URL is not set, use the default Render URL as fallback
: "${BACKEND_URL:=https://workmatch-backend.onrender.com}"

# Remove trailing slash from URL if present
# Example: https://myapp.com/ becomes https://myapp.com
BACKEND_URL="${BACKEND_URL%/}"

# Clean up special characters in the URL
# so they don't break the JavaScript file
escaped_backend_url=$(printf '%s' "$BACKEND_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')

# Create the env.js file with the backend URL
# This file is read by the frontend app to know
# where to send API requests
cat > /usr/share/nginx/html/env.js <<EOF
window.WNU_CONFIG = {
  BACKEND_URL: "$escaped_backend_url"
};
EOF

# env.js is now created and ready!
# The frontend will now connect to: $escaped_backend_url
