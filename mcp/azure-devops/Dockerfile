FROM node:20-alpine

ARG ADO_MCP_VERSION=2.10.0

RUN npm install --global @azure-devops/mcp@${ADO_MCP_VERSION}

COPY entrypoint.sh /usr/local/bin/ado-mcp-entrypoint
RUN chmod +x /usr/local/bin/ado-mcp-entrypoint

ENTRYPOINT ["/usr/local/bin/ado-mcp-entrypoint"]