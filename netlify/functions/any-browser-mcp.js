import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { attachToRunningBrowser, launchBrowser } from '../../src/utils/attach.js';
import { registerBrowserTools } from '../../src/tools/browser-tools.js';
import { registerNavigationTools } from '../../src/tools/navigation-tools.js';
import { registerInteractionTools } from '../../src/tools/interaction-tools.js';
import { registerUtilityTools } from '../../src/tools/utility-tools.js';

/**
 * Netlify Function for Any Browser MCP Server
 * Supports both stateless and session-based operation
 */

// Global browser instances for session management
const browserSessions = new Map();

/**
 * Initialize browser for a session
 */
async function initializeBrowser(sessionId, options = {}) {
  try {
    let browser;
    
    // Try to connect to existing browser first
    try {
      browser = await attachToRunningBrowser({
        endpoint: process.env.CDP_ENDPOINT,
        brand: options.browserPref || 'detect',
        verbose: process.env.NODE_ENV === 'development'
      });
    } catch (attachError) {
      // If attachment fails, launch new browser (if allowed)
      if (process.env.ALLOW_BROWSER_LAUNCH === 'true') {
        browser = await launchBrowser(options.browserPref || 'detect', process.env.NODE_ENV === 'development');
      } else {
        throw new Error(`Cannot connect to browser: ${attachError.message}. Set ALLOW_BROWSER_LAUNCH=true to allow launching new instances.`);
      }
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    const session = {
      browser,
      context,
      page,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    browserSessions.set(sessionId, session);
    return session;
  } catch (error) {
    console.error('Failed to initialize browser:', error);
    throw error;
  }
}

/**
 * Get or create browser session
 */
function getBrowserSession(sessionId) {
  const session = browserSessions.get(sessionId);
  if (session) {
    session.lastUsed = new Date();
    return session;
  }
  return null;
}

/**
 * Cleanup old sessions (called periodically)
 */
function cleanupOldSessions() {
  const now = new Date();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [sessionId, session] of browserSessions.entries()) {
    if (now - session.lastUsed > maxAge) {
      try {
        session.context?.close();
        session.browser?.close();
      } catch (error) {
        console.error('Error cleaning up session:', error);
      }
      browserSessions.delete(sessionId);
    }
  }
}

// Cleanup old sessions every 10 minutes
setInterval(cleanupOldSessions, 10 * 60 * 1000);

/**
 * Create MCP server instance
 */
function createMCPServer(getBrowserInstances) {
  const server = new McpServer({
    name: 'any-browser-mcp-netlify',
    version: '1.0.0',
    description: 'Any Browser MCP Server running on Netlify Functions'
  });

  // Register all tool categories
  registerBrowserTools(server, getBrowserInstances);
  registerNavigationTools(server, getBrowserInstances);
  registerInteractionTools(server, getBrowserInstances);
  registerUtilityTools(server, getBrowserInstances);

  // Add Netlify-specific status resource
  server.registerResource(
    'netlify-status',
    'netlify://status',
    {
      title: 'Netlify Function Status',
      description: 'Status of the Netlify function and browser sessions',
      mimeType: 'application/json'
    },
    async () => {
      return {
        contents: [{
          uri: 'netlify://status',
          text: JSON.stringify({
            environment: 'netlify',
            activeSessions: browserSessions.size,
            cdpEndpoint: process.env.CDP_ENDPOINT || 'not configured',
            allowLaunch: process.env.ALLOW_BROWSER_LAUNCH === 'true',
            nodeEnv: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  );

  return server;
}

/**
 * Main Netlify function handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get or create session
    const sessionId = req.headers['mcp-session-id'] || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let session = getBrowserSession(sessionId);
    if (!session) {
      session = await initializeBrowser(sessionId);
    }

    // Create browser instances getter for this session
    const getBrowserInstances = () => ({
      browser: session.browser,
      context: session.context,
      page: session.page
    });

    // Create MCP server
    const server = createMCPServer(getBrowserInstances);

    // Create transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId
    });

    // Connect server to transport
    await server.connect(transport);

    // Set session ID header
    res.setHeader('mcp-session-id', sessionId);

    // Handle the request
    await transport.handleRequest(req, res, req.body);

  } catch (error) {
    console.error('Netlify function error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: {
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }
        },
        id: null
      });
    }
  }
}
