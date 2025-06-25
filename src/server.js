import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { attachToRunningBrowser, launchBrowser } from './utils/attach.js';
import { registerBrowserTools } from './tools/browser-tools.js';
import { registerNavigationTools } from './tools/navigation-tools.js';
import { registerInteractionTools } from './tools/interaction-tools.js';
import { registerUtilityTools } from './tools/utility-tools.js';

/**
 * Global browser instance - shared across all MCP operations
 */
let globalBrowser = null;
let globalContext = null;
let globalPage = null;

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

    // When connecting to existing browser, we need to create a new context
    // because existing contexts from CDP connection are not fully functional
    try {
      globalContext = await globalBrowser.newContext();

      // Try to get existing pages via CDP and navigate to one of them
      if (verbose) {
        console.error('🔍 Checking for existing pages...');
      }

      // Create a new page in our context
      globalPage = await globalContext.newPage();

      // Try to navigate to an existing page if available
      try {
        const http = await import('http');
        const existingPagesData = await new Promise((resolve, reject) => {
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
          const firstPage = existingPagesData[0];
          await globalPage.goto(firstPage.url);
          if (verbose) {
            console.error(`📄 Navigated to existing page: ${firstPage.url}`);
          }
        } else {
          if (verbose) {
            console.error('📄 No existing pages found, created new page');
          }
        }
      } catch (error) {
        if (verbose) {
          console.error('⚠️  Could not access existing pages, using new page');
        }
      }
    } catch (error) {
      if (verbose) {
        console.error('⚠️  Failed to create context, this might be a launched browser');
      }
      // Fallback for launched browsers
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
