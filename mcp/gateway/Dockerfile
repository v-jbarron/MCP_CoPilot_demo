# Patch-only image: reuses an existing ado-mcp-gateway 1.0.4 runtime and dependencies, replaces server.mjs.
# Build with: docker build --build-arg BASE_IMAGE=<your-registry>.azurecr.io/ado-mcp-gateway:1.0.4 mcp/gateway
ARG BASE_IMAGE
FROM ${BASE_IMAGE}

COPY server.mjs /app/server.mjs
