# Patch-only image: reuses the 1.0.4 runtime and dependencies, replaces server.mjs.
ARG BASE_IMAGE=acradomcpdemo004.azurecr.io/ado-mcp-gateway:1.0.4
FROM ${BASE_IMAGE}

COPY server.mjs /app/server.mjs
