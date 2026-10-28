This repository defaults to an Azure Container Apps-hosted `ado-mcp-gateway` MCP endpoint (`https://<your-container-app-fqdn>/mcp`); VS Code prompts for its URL and shared token. The local npm (`ado-local-npm`) and build-from-source (`ado-local-source`) servers in `.vscode/mcp.json` are alternatives that expose the same tools. The optional Dockerized setup is a separate local fallback.

When a task involves Azure DevOps work items, projects, teams, or traceability updates, use the Azure DevOps MCP server that is running from `.vscode/mcp.json` (`ado-remote-mcp` by default, or `ado-local-npm` / `ado-local-source`) and check for a matching MCP tool before suggesting direct REST calls or manual portal steps. Use write-capable MCP tools for requested creates, updates, and comments; do not assume the server is read-only.

When the remote MCP URL is not pinned to a single organization, include the Azure DevOps organization in prompts and tool calls. Reuse the user's stated project and team defaults when they are provided.

For traceability flows, prefer Azure DevOps MCP tools for work item creation, updates, and comments. Use repository or GitHub tools only for the code change and push portion of the workflow.

References:
- Azure DevOps MCP server: https://github.com/microsoft/azure-devops-mcp
- Model Context Protocol: https://modelcontextprotocol.io/