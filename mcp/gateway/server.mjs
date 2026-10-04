import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { McpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';

const GATEWAY_NAME = 'ado-http-gateway';
const GATEWAY_VERSION = '1.0.0';
const MAX_RETRY_DELAY_MS = 30000;

function getOptionalEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getRequiredEnv(name) {
  const value = getOptionalEnv(name);
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function buildUpstreamEnv() {
  const env = { ...process.env };
  const project = getOptionalEnv('ADO_PROJECT');
  const team = getOptionalEnv('ADO_TEAM');
  const personalAccessToken = getRequiredEnv('PERSONAL_ACCESS_TOKEN');

  if (project) {
    env.ado_mcp_project = project;
  }

  if (team) {
    env.ado_mcp_team = team;
  }

  env.PERSONAL_ACCESS_TOKEN = Buffer.from(`ado-mcp:${personalAccessToken}`, 'utf8').toString('base64');

  return env;
}

function buildUpstreamArgs() {
  const organization = getRequiredEnv('ADO_ORG');
  const domains = (getOptionalEnv('ADO_DOMAINS') ?? 'core work work-items repositories')
    .split(/\s+/)
    .map(domain => domain.trim())
    .filter(Boolean);

  const args = [organization, '--authentication', 'pat'];
  for (const domain of domains) {
    args.push('-d', domain);
  }

  return args;
}

function tokensMatch(provided, expected) {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function unauthorizedResponse() {
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Bearer realm="ado-mcp-gateway"'
    }
  });
}

function serviceUnavailableResponse(message) {
  return new Response(message, {
    status: 503,
    headers: {
      'Retry-After': '5'
    }
  });
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function formatErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function closeGateway(gateway) {
  if (!gateway) {
    return;
  }

  await Promise.allSettled([
    gateway.upstreamClient.close(),
    gateway.downstreamTransport.close(),
    gateway.proxyServer.close?.()
  ]);
}

async function createGateway() {
  let upstreamClient;
  let proxyServer;
  let downstreamTransport;

  try {
    upstreamClient = new Client({ name: `${GATEWAY_NAME}-upstream`, version: GATEWAY_VERSION });
    const upstreamTransport = new StdioClientTransport({
      command: 'mcp-server-azuredevops',
      args: buildUpstreamArgs(),
      env: buildUpstreamEnv()
    });

    await upstreamClient.connect(upstreamTransport);

    proxyServer = new McpServer(
      { name: GATEWAY_NAME, version: GATEWAY_VERSION },
      { capabilities: { tools: {} } }
    );

    proxyServer.server.setRequestHandler('ping', async () => ({}));
    proxyServer.server.setRequestHandler('tools/list', async request => {
      const result = await upstreamClient.listTools(request.params);
      return { tools: result.tools, nextCursor: result.nextCursor };
    });
    proxyServer.server.setRequestHandler('tools/call', async request => {
      return upstreamClient.callTool(request.params);
    });

    downstreamTransport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    await proxyServer.connect(downstreamTransport);

    return {
      proxyServer,
      upstreamClient,
      upstreamTransport,
      downstreamTransport
    };
  } catch (error) {
    await Promise.allSettled([
      upstreamClient?.close(),
      downstreamTransport?.close(),
      proxyServer?.close?.()
    ]);

    throw error;
  }
}

async function main() {
  const port = Number.parseInt(getOptionalEnv('PORT') ?? '8080', 10);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error('PORT must be a positive integer.');
  }

  const expectedToken = getRequiredEnv('MCP_SHARED_TOKEN');
  let gateway;
  let shuttingDown = false;
  let startupError;
  let startupPromise;
  let startupAttempt = 0;

  const startGateway = () => {
    if (gateway || startupPromise || shuttingDown) {
      return;
    }

    startupPromise = (async () => {
      while (!gateway && !shuttingDown) {
        startupAttempt += 1;

        try {
          const connectedGateway = await createGateway();
          if (shuttingDown) {
            await closeGateway(connectedGateway);
            return;
          }

          gateway = connectedGateway;
          startupError = undefined;
          console.error(`[${GATEWAY_NAME}] upstream ready on attempt ${startupAttempt}`);
          return;
        } catch (error) {
          startupError = error;

          const retryDelayMs = Math.min(1000 * Math.pow(2, startupAttempt - 1), MAX_RETRY_DELAY_MS);
          console.error(
            `[${GATEWAY_NAME}] upstream startup attempt ${startupAttempt} failed; retrying in ${retryDelayMs}ms`,
            error
          );

          if (shuttingDown) {
            return;
          }

          await delay(retryDelayMs);
        }
      }
    })().finally(() => {
      startupPromise = undefined;
    });
  };

  startGateway();

  const fetchHandler = async request => {
    const url = new URL(request.url);

    if (url.pathname === '/healthz') {
      return new Response('ok', { status: 200 });
    }

    if (url.pathname === '/readyz') {
      if (gateway) {
        return new Response('ready', { status: 200 });
      }

      const message = startupError
        ? `upstream unavailable: ${formatErrorMessage(startupError)}`
        : 'upstream unavailable: startup in progress';
      return serviceUnavailableResponse(message);
    }

    if (url.pathname !== '/mcp') {
      return new Response('Not Found', { status: 404 });
    }

    const authorization = request.headers.get('authorization');
    const [scheme, token] = authorization?.split(/\s+/, 2) ?? [];
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer' || !tokensMatch(token, expectedToken)) {
      return unauthorizedResponse();
    }

    // No server-initiated messages; a held-open GET stream gets reset by ingress and fails in-flight calls.
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }

    if (!gateway) {
      startGateway();
      const message = startupError
        ? `gateway upstream unavailable: ${formatErrorMessage(startupError)}`
        : 'gateway upstream unavailable: startup in progress';
      return serviceUnavailableResponse(message);
    }

    return gateway.downstreamTransport.handleRequest(request);
  };

  const httpServer = createServer(toNodeHandler({ fetch: fetchHandler }));

  const shutdown = async signal => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.error(`[${GATEWAY_NAME}] received ${signal}, shutting down`);

    await new Promise(resolve => {
      httpServer.close(() => resolve());
    });

    await closeGateway(gateway);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT').finally(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM').finally(() => process.exit(0));
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.error(`[${GATEWAY_NAME}] listening on http://0.0.0.0:${port}/mcp`);
  });
}

main().catch(error => {
  console.error(`[${GATEWAY_NAME}] startup failed`, error);
  process.exit(1);
});
