#!/bin/sh
set -e

HTPASSWD_FILE=/etc/nginx/.htpasswd
AUTH_CONF=/etc/nginx/auth_basic.conf

if [ -n "$FLOWLENS_DASHBOARD_PASSWORD" ]; then
    HASH=$(openssl passwd -apr1 "$FLOWLENS_DASHBOARD_PASSWORD")
    printf '%s:%s\n' "${FLOWLENS_DASHBOARD_USER:-admin}" "$HASH" > "$HTPASSWD_FILE"
    printf 'auth_basic "FlowLens Dashboard";\nauth_basic_user_file %s;\n' "$HTPASSWD_FILE" > "$AUTH_CONF"
    echo "flowlens: dashboard auth enabled (user: ${FLOWLENS_DASHBOARD_USER:-admin})"
else
    printf '# auth disabled\n' > "$AUTH_CONF"
    echo "flowlens: dashboard auth disabled — set FLOWLENS_DASHBOARD_PASSWORD to enable"
fi

exec nginx -g "daemon off;"
