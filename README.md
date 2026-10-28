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
- [`.github/skills`](.github/skills) for Azure DevOps creation, local implementation, and PR delivery workflows

## Quick Start

1. Open this folder in VS Code.
2. Start `ado-remote-mcp` from the MCP view.
3. Enter the gateway URL and shared token when VS Code prompts, then complete any additional authentication flow.
4. Use the prompts in `demos/ado-mcp-demo.md` for the live session.

## Run Locally with npm

If you can't use the hosted gateway, or want to run the server on your own machine, `.vscode/mcp.json` also defines two local servers. Both run Microsoft's [`@azure-devops/mcp`](https://github.com/microsoft/azure-devops-mcp) pinned to `2.10.0` and expose the same tools as the gateway. Start only one Azure DevOps server at a time.

| Server | Use when | Requires |
| --- | --- | --- |
| `ado-local-npm` | You want a local server with no build step. | Node.js 20+ and access to the npm registry |
| `ado-local-source` | You want to build, inspect, or change the server yourself. | Node.js 20+, Git, and the build steps below |

Neither option needs a gateway token or a personal access token (PAT). On first use, the server opens a browser so you can sign in with your own Microsoft Entra account, and your own Azure DevOps permissions apply. In GitHub Codespaces, it uses your Azure CLI login (`az login`) instead. VS Code prompts for the organization name (for example `contoso`) when the server starts.

### Option A: npm package

1. Install [Node.js 20 or later](https://nodejs.org/en/download).
2. In the MCP view, start `ado-local-npm`. The first start downloads the package.
3. Enter your organization name, then sign in when the browser opens.
4. Try `List my Azure DevOps projects` in Copilot Chat (Agent mode).

### Option B: Build from source

From the root of this repository, clone the matching release into the git-ignored `mcp/azure-devops-mcp-src` folder and build it:

```powershell
git clone --depth 1 --branch v2.10.0 https://github.com/microsoft/azure-devops-mcp.git mcp/azure-devops-mcp-src
cd mcp/azure-devops-mcp-src
npm ci
npm run build
cd ../..
```

The build produces `mcp/azure-devops-mcp-src/dist/index.js`. In the MCP view, start `ado-local-source`, then follow steps 3 and 4 from Option A. After you change the source, run `npm run build` again and restart the server.

To move to a newer release, update the version in both the `git clone --branch` tag and the `ado-local-npm` arguments in `.vscode/mcp.json`.

## Azure DevOps Skills

The workspace includes three skills adapted with permission from
[griffith-computing/Copilot-MCP-Demo](https://github.com/griffith-computing/Copilot-MCP-Demo/tree/9ef1d2edbf408456e5d8087589357ec25e15bf2b/.github/skills):

| Skill | Use |
| --- | --- |
| [ado-create-work-items](.github/skills/ado-create-work-items/SKILL.md) | Preview or create stories, bugs, and bounded backlogs through `ado-remote-mcp`. |
| [ado-implement-work-item](.github/skills/ado-implement-work-item/SKILL.md) | Read an exact item, implement locally, and validate; no automatic commit or remote writeback. |
| [ado-implement-work-item-with-pr](.github/skills/ado-implement-work-item-with-pr/SKILL.md) | Review a delivery plan, then implement, commit, push, create a GitHub/GHES PR, and comment with verified traceability links. |

In Copilot Chat, type `/` and select the skill, or explicitly request it by name.
Supply your actual Azure DevOps organization, project, and work-item ID where relevant.
The skills use this repository's hosted gateway by default, or whichever local
Azure DevOps server you've started, and the target repository's existing
stack, not the source demo's calculator documents or .NET scaffold.
PR delivery requires a clean target checkout and authenticated GitHub/GHES tooling.
State transitions require explicit approval and supported revision-safe MCP updates.

## Notes

- This setup targets Azure DevOps Services.
- The gateway endpoint has the form `https://<your-container-app-fqdn>/mcp`. VS Code prompts for the URL and the gateway's shared token when `ado-remote-mcp` starts; neither is stored in the repository.
- The Docker assets under `mcp/azure-devops` are separate from the configured remote gateway and require their own local MCP configuration.
- The local npm and source servers authenticate as the signed-in user. The gateway and Docker options use a shared token or PAT instead.