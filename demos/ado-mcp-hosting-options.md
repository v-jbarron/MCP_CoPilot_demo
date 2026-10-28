## Azure DevOps MCP Hosting Options

This document summarizes the main ways to expose Azure DevOps MCP tools to GitHub Copilot or another MCP client. The default workspace configuration in this repository uses the Azure Container Apps gateway shown below. The Microsoft-hosted Azure DevOps MCP endpoint remains an alternative.

## Recommended Options

| Option | Transport | Best for | Notes |
| --- | --- | --- | --- |
| Azure Container Apps gateway | HTTP | Using the existing gateway deployment | This repository's `.vscode/mcp.json` points to this option. |
| Remote Azure DevOps MCP server | HTTP | Lowest-friction managed setup | Microsoft hosts the endpoint and ships new features here first. |
| Local npm package | stdio | Fast local setup without Docker | Good when Node.js is already installed on the demo machine. |
| Local Docker container | stdio | Reproducible demos and workshop machines | This repo still includes assets for this fallback option. |
| Run from source | stdio | Development and debugging | Best when you want to inspect or change the server itself. |

## Workspace Default: Azure Container Apps Gateway

The workspace connects to your gateway's `https://<your-container-app-fqdn>/mcp` endpoint over HTTP; VS Code prompts for the URL and shared token. The endpoint requires authentication; this repository configures the client but does not provision the gateway or its identity settings.

## Option 1: Remote Azure DevOps MCP Server

Use this when you want a managed HTTP endpoint and the simplest client configuration. Azure DevOps hosts the server for you; you only point the client at the organization-scoped URL or the shared root endpoint.

```json
{
  "servers": {
    "ado-remote-mcp": {
      "type": "http",
      "url": "https://mcp.dev.azure.com/{organization}"
    }
  }
}
```

Why choose it:

- Azure DevOps hosts and updates the service.
- No local Node.js or Docker dependency.
- Microsoft recommends it for ongoing use.
- New capabilities land here first.

Tradeoffs:

- Requires an Azure DevOps organization backed by Microsoft Entra ID.
- Requires outbound HTTPS connectivity to `mcp.dev.azure.com`.
- Does not give you a local `stdio` process for Docker-based demos or unsupported clients.

If you do not want to pin one organization in the config file, you can also use `https://mcp.dev.azure.com/` and provide the organization in each prompt or tool call.

## Option 2: Local npm Package

Use this when you want a simple local setup and already trust the machine's Node.js runtime. This repository's `.vscode/mcp.json` includes this option as `ado-local-npm`.

```json
{
  "inputs": [
    {
      "id": "ado_org",
      "type": "promptString",
      "description": "Azure DevOps organization name"
    }
  ],
  "servers": {
    "ado-local-npm": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@azure-devops/mcp@2.10.0",
        "${input:ado_org}",
        "-d",
        "core",
        "work",
        "work-items",
        "repositories"
      ]
    }
  }
}
```

By default, the server opens a browser for Microsoft Entra sign-in (in GitHub Codespaces, it uses the Azure CLI login instead). To reuse an existing Azure CLI login elsewhere, add `"--authentication", "azcli"` to the arguments.

Why choose it:

- Fewest local files.
- Each user signs in as themselves; no shared token or PAT.
- Easy to swap authentication modes.
- Good for individual setup on a dev workstation.

Tradeoffs:

- Depends on Node.js being installed and available.
- First start may download packages.
- Pin the version so tool names and schemas don't change between sessions.

## Option 3: Local Docker Container

Use this when your client cannot authenticate to the remote endpoint or when you want the same behavior across demo machines and you want the PAT-handling logic hidden behind a thin wrapper.

Build the image from this repository:

```bash
docker build -t ado-mcp-demo:latest mcp/azure-devops
```

The workspace configuration is already provided in [../.vscode/mcp.json](../.vscode/mcp.json). It starts the server with a repo-local env file:

```json
{
  "servers": {
    "ado-docker-demo": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--env-file",
        "${workspaceFolder}/mcp/azure-devops/.env.local",
        "ado-mcp-demo:latest"
      ]
    }
  }
}
```

Why choose it:

- Reproducible across workshop and presenter machines.
- No Node.js dependency on the host.
- Easy to explain and rebuild during a session.

Tradeoffs:

- Requires Docker Desktop.
- Image rebuild is needed when you change the pinned server version.

## Option 4: Run from Source

Use this when you need to debug the server or test an unreleased change. This repository's `.vscode/mcp.json` includes this option as `ado-local-source`.

From the root of this repository, clone a tagged release into the git-ignored `mcp/azure-devops-mcp-src` folder and build it:

```bash
git clone --depth 1 --branch v2.10.0 https://github.com/microsoft/azure-devops-mcp.git mcp/azure-devops-mcp-src
cd mcp/azure-devops-mcp-src
npm ci
npm run build
```

Then point the client at the built entry point:

```json
{
  "inputs": [
    {
      "id": "ado_org",
      "type": "promptString",
      "description": "Azure DevOps organization name"
    }
  ],
  "servers": {
    "ado-local-source": {
      "type": "stdio",
      "command": "node",
      "args": [
        "${workspaceFolder}/mcp/azure-devops-mcp-src/dist/index.js",
        "${input:ado_org}",
        "-d",
        "core",
        "work",
        "work-items",
        "repositories"
      ]
    }
  }
}
```

Rebuild with `npm run build` and restart the server after changing the source.

Why choose it:

- Full control over the code.
- Best option for debugging and contribution.

Tradeoffs:

- Highest setup cost.
- Not necessary for a normal demo.

## Selection Guidance

- Use the remote server first when your client supports Microsoft Entra authentication.
- Use the local npm package when you need a quick single-user local install or a local fallback.
- Use the Docker container when you want repeatable demos or when remote auth is unavailable in the client.
- Use source mode only when you are developing or debugging the MCP server itself.