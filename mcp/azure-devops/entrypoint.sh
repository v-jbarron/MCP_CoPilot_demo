#!/bin/sh

set -eu

if [ -z "${ADO_ORG:-}" ]; then
  echo "ADO_ORG is required." >&2
  exit 1
fi

auth_mode="${ADO_AUTH_MODE:-pat}"
domains="${ADO_DOMAINS:-core work work-items repositories}"

if [ -n "${ADO_PROJECT:-}" ]; then
  export ado_mcp_project="${ADO_PROJECT}"
fi

if [ -n "${ADO_TEAM:-}" ]; then
  export ado_mcp_team="${ADO_TEAM}"
fi

case "${auth_mode}" in
  pat)
    if [ -n "${ADO_PAT:-}" ]; then
      pat_email="${ADO_PAT_EMAIL:-demo@example.com}"
      export PERSONAL_ACCESS_TOKEN="$(printf '%s' "${pat_email}:${ADO_PAT}" | base64 | tr -d '\n')"
    elif [ -z "${PERSONAL_ACCESS_TOKEN:-}" ]; then
      echo "Set ADO_PAT or PERSONAL_ACCESS_TOKEN when ADO_AUTH_MODE=pat." >&2
      exit 1
    fi
    ;;
  envvar)
    if [ -z "${ADO_MCP_AUTH_TOKEN:-}" ]; then
      echo "Set ADO_MCP_AUTH_TOKEN when ADO_AUTH_MODE=envvar." >&2
      exit 1
    fi
    ;;
esac

set -- mcp-server-azuredevops "${ADO_ORG}" "--authentication" "${auth_mode}"

for domain in ${domains}; do
  set -- "$@" "-d" "${domain}"
done

exec "$@"