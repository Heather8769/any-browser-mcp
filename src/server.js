import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { attachToRunningBrowser, launchBrowser } from './utils/attach.js';
import { DirectCDPClient, getAvailablePages, createNewTab } from './utils/cdp-direct.js';
import { registerBrowserTools } from './tools/browser-tools.js';
import { registerNavigationTools } from './tools/navigation-tools.js';
import { registerInteractionTools } from './tools/interaction-tools.js';
import { registerUtilityTools } from './tools/utility-tools.js';

/**
 * Global browser instances - shared across all MCP operations
 */
let globalBrowser = null;
let globalContext = null;
let globalPage = null;
let directCDPClient = null;
let useDirectCDP = false;

/**
 * Initialize and start the MCP server
 * @param {Object} options - Server configuration options
 */
export async function startMCPServer(options = {}) {
  const { 
    endpoint, 
    browserPref = 'detect', 
    allowLaunch = false, 
    customPort,
    verbose = false 
  } = options;

  // Create MCP server instance
  const server = new McpServer({
    name: 'any-browser-mcp',
    version: '1.0.0',
    description: 'MCP server for browser automation via CDP - connects to existing browser sessions'
  });

  // Initialize browser connection
  try {
    if (verbose) {
      console.error('🌐 Initializing browser connection...');
    }

    try {
      globalBrowser = await attachToRunningBrowser({
        endpoint,
        brand: browserPref,
        customPort,
        verbose
      });
    } catch (attachError) {
      if (!allowLaunch) {
        if (verbose) {
          console.error('❌ Browser attachment failed and launching is disabled');
          console.error('💡 To enable browser launching, use --launch flag');
        }
        throw new Error(`Cannot connect to existing browser and launching is disabled. ${attachError.message}`);
      }

      if (verbose) {
        console.error('⚠️  No existing browser found with debugging enabled');
        console.error('🚀 Falling back to launching new browser instance...');
        console.error('💡 To avoid this, start your browser with debugging enabled first');
      }
      globalBrowser = await launchBrowser(browserPref, verbose);
    }

    // For existing browsers, we need a hybrid approach:
    // 1. Connect to existing pages directly via their WebSocket URLs
    // 2. Also maintain ability to create new tabs in the same browser
    try {
      if (verbose) {
        console.error('🔍 Setting up connection to existing browser...');
      }

      // Get existing pages from the browser
      const http = await import('http');
      const existingPagesData = await new Promise((resolve) => {
        const req = http.default.get('http://localhost:9222/json', { timeout: 5000 }, (res) => {
          if (res.statusCode === 200) {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const pages = JSON.parse(data).filter(p => p.type === 'page');
                resolve(pages);
              } catch (parseError) {
                resolve([]);
              }
            });
          } else {
            resolve([]);
          }
        });
        req.on('error', () => resolve([]));
        req.on('timeout', () => {
          req.destroy();
          resolve([]);
        });
      });

      if (existingPagesData.length > 0) {
        // Connect to the first existing page directly
        const firstPage = existingPagesData[0];
        if (verbose) {
          console.error(`📄 Connecting to existing page: ${firstPage.title} (${firstPage.url})`);
        }

        // Connect directly to the existing page via its WebSocket URL
        try {
          globalPage = await globalBrowser.newPage();
          await globalPage.goto(firstPage.url);
          globalContext = globalPage.context();

          if (verbose) {
            console.error(`✅ Connected to existing page: ${firstPage.url}`);
          }
        } catch (pageError) {
          if (verbose) {
            console.error(`⚠️  Could not connect to existing page, creating new one: ${pageError.message}`);
          }
          // Fallback: create new context and page
          globalContext = await globalBrowser.newContext();
          globalPage = await globalContext.newPage();
        }
      } else {
        if (verbose) {
          console.error('📄 No existing pages found, creating new tab in existing browser');
        }
        // Create new context and page in the existing browser
        globalContext = await globalBrowser.newContext();
        globalPage = await globalContext.newPage();
      }
    } catch (error) {
      if (verbose) {
        console.error('⚠️  Failed to connect to existing browser, using fallback approach');
      }
      // Fallback for any connection issues
      globalContext = await globalBrowser.newContext();
      globalPage = await globalContext.newPage();
    }

    if (verbose) {
      console.error('✅ Browser connection established');
    }

  } catch (error) {
    console.error('❌ Failed to initialize browser:', error.message);
    throw error;
  }

  // Register all tool categories
  registerBrowserTools(server, () => ({ browser: globalBrowser, context: globalContext, page: globalPage }));
  registerNavigationTools(server, () => ({ browser: globalBrowser, context: globalContext, page: globalPage }));
  registerInteractionTools(server, () => ({ browser: globalBrowser, context: globalContext, page: globalPage }));
  registerUtilityTools(server, () => ({ browser: globalBrowser, context: globalContext, page: globalPage }));

  // Add a resource for browser status
  server.registerResource(
    'browser-status',
    'browser://status',
    {
      title: 'Browser Status',
      description: 'Current browser connection and page information',
      mimeType: 'application/json'
    },
    async () => {
      const contexts = globalBrowser ? globalBrowser.contexts() : [];
      const pages = globalContext ? globalContext.pages() : [];
      
      return {
        contents: [{
          uri: 'browser://status',
          text: JSON.stringify({
            connected: !!globalBrowser,
            browserType: globalBrowser?._initializer?.name || 'unknown',
            contextsCount: contexts.length,
            pagesCount: pages.length,
            currentUrl: globalPage ? await globalPage.url() : null,
            currentTitle: globalPage ? await globalPage.title() : null
          }, null, 2)
        }]
      };
    }
  );

  // Handle cleanup on exit
  const cleanup = async () => {
    if (verbose) {
      console.error('🧹 Cleaning up browser connections...');
    }
    
    try {
      if (globalContext) {
        await globalContext.close();
      }
      if (globalBrowser) {
        await globalBrowser.close();
      }
    } catch (error) {
      if (verbose) {
        console.error('⚠️  Cleanup error:', error.message);
      }
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  // Start the MCP server with stdio transport
  const transport = new StdioServerTransport();
  
  if (verbose) {
    console.error('🚀 Starting MCP server on stdio...');
  }

  await server.connect(transport);
  
  if (verbose) {
    console.error('✅ MCP server is running and ready for connections');
  }
}

/**
 * Get current browser instances (for use by tools)
 * @returns {Object} Current browser, context, and page instances
 */
export function getBrowserInstances() {
  return {
    browser: globalBrowser,
    context: globalContext, 
    page: globalPage
  };
}

/**
 * Update the global page reference (when switching tabs, etc.)
 * @param {Page} newPage - New page to set as current
 */
export function setCurrentPage(newPage) {
  globalPage = newPage;
}
