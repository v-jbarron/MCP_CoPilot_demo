# Azure DevOps MCP Copilot Demo

This standalone folder contains a demo-ready Azure DevOps MCP setup for GitHub Copilot, configured to use the Azure Container Apps gateway.

VS Code connects to the remote gateway over HTTP. The Docker assets are an optional local fallback and are not the Azure-hosted gateway.

## Included Assets

- `.vscode/mcp.json` for the VS Code MCP client configuration
- `mcp/azure-devops/Dockerfile` for the local demo image
- `mcp/azure-devops/entrypoint.sh` for auth and domain defaults
- `mcp/azure-devops/.env.example` for local configuration
- `demos/ado-mcp-demo.md` for the live session runbook
- `demos/ado-mcp-hosting-options.md` for the take-away document

## Quick Start

1. Open this folder in VS Code.
2. Start `ado-remote-mcp` from the MCP view.
3. Complete the gateway's authentication flow if prompted.
4. Use the prompts in `demos/ado-mcp-demo.md` for the live session.

## Notes

- This setup targets Azure DevOps Services.
- The configured gateway is at `https://ado-mcp-gateway.yellowmeadow-a79e4e9c.westus2.azurecontainerapps.io/mcp`.
- The Docker assets under `mcp/azure-devops` are separate from the configured remote gateway and require their own local MCP configuration.