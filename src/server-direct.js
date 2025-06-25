import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DirectCDPClient, getAvailablePages, createNewTab } from './utils/cdp-direct.js';
import { registerDirectBrowserTools } from './tools/direct-browser-tools.js';
import { z } from 'zod';
import http from 'http';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Direct CDP-based MCP Server that controls existing browser tabs
 * This bypasses Playwright's context isolation and directly controls visible browser windows
 */

let currentCDPClient = null;
let currentPageId = null;
let debugPort = 9222;
let chromeProcess = null;

/**
 * Launch Chrome with debugging enabled
 */
async function launchChrome(verbose = false) {
  if (verbose) {
    console.error('🚀 Launching Chrome with debugging enabled...');
  }

  const platform = process.platform;
  let chromePath;
  let userDataDir;

  if (platform === 'darwin') {
    chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    userDataDir = `${process.env.HOME}/Library/Application Support/Google/Chrome-Debug`;
  } else if (platform === 'win32') {
    chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    userDataDir = `${process.env.USERPROFILE}\\AppData\\Local\\Google\\Chrome-Debug`;
  } else {
    chromePath = 'google-chrome';
    userDataDir = `${process.env.HOME}/.config/google-chrome-debug`;
  }

  // Copy user data if it doesn't exist
  try {
    const mainProfile = platform === 'darwin'
      ? `${process.env.HOME}/Library/Application Support/Google/Chrome`
      : platform === 'win32'
      ? `${process.env.USERPROFILE}\\AppData\\Local\\Google\\Chrome\\User Data`
      : `${process.env.HOME}/.config/google-chrome`;

    // Check if debug profile exists, if not copy from main profile
    try {
      await execAsync(`test -d "${userDataDir}"`);
    } catch {
      if (verbose) {
        console.error('📋 Copying Chrome profile data...');
      }
      await execAsync(`mkdir -p "${userDataDir}"`);
      try {
        await execAsync(`cp -r "${mainProfile}/Default" "${userDataDir}/" 2>/dev/null || true`);
        if (verbose) {
          console.error('✅ Profile data copied');
        }
      } catch {
        if (verbose) {
          console.error('⚠️  Could not copy profile data, using fresh profile');
        }
      }
    }
  } catch (error) {
    if (verbose) {
      console.error('⚠️  Profile setup warning:', error.message);
    }
  }

  const args = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'
  ];

  if (verbose) {
    console.error(`📍 Chrome path: ${chromePath}`);
    console.error(`📁 User data dir: ${userDataDir}`);
    console.error(`🔧 Debug port: ${debugPort}`);
  }

  chromeProcess = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore'
  });

  chromeProcess.unref();

  if (verbose) {
    console.error(`✅ Chrome launched with PID: ${chromeProcess.pid}`);
    console.error('⏳ Waiting for Chrome to initialize...');
  }

  // Wait for Chrome to start and become accessible
  for (let i = 0; i < 30; i++) {
    try {
      await getPages();
      if (verbose) {
        console.error('✅ Chrome is ready!');
      }
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Chrome failed to start within 30 seconds');
}

/**
 * Get available pages from Chrome
 */
async function getPages() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${debugPort}/json`, { timeout: 5000 }, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const pages = JSON.parse(data).filter(p => p.type === 'page');
            resolve(pages);
          } catch (parseError) {
            reject(parseError);
          }
        });
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Activate a tab
 */
async function activateTab(tabId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: debugPort,
      path: `/json/activate/${tabId}`,
      method: 'POST'
    };
    
    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * Connect to a specific page
 */
async function connectToPage(pageId) {
  if (currentCDPClient) {
    currentCDPClient.close();
  }
  
  const pages = await getPages();
  const page = pages.find(p => p.id === pageId);
  if (!page) {
    throw new Error(`Page not found: ${pageId}`);
  }
  
  currentCDPClient = new DirectCDPClient();
  await currentCDPClient.connect(page.webSocketDebuggerUrl);
  currentPageId = pageId;
  
  return page;
}

/**
 * Start the Direct CDP MCP Server
 */
export async function startDirectMCPServer(options = {}) {
  const { verbose = false, port = 9222 } = options;
  debugPort = port;

  // Create MCP server instance
  const server = new McpServer({
    name: 'any-browser-mcp-direct',
    version: '1.0.0',
    description: 'Direct CDP MCP server for controlling existing browser tabs'
  });

  if (verbose) {
    console.error('🌐 Starting Direct CDP MCP Server...');
    console.error(`🔧 Debug port: ${debugPort}`);
  }

  // Test connection to Chrome, launch if not running
  try {
    const pages = await getPages();
    if (verbose) {
      console.error(`✅ Found existing Chrome with ${pages.length} browser tabs`);
      pages.forEach((page, i) => {
        console.error(`   ${i + 1}. ${page.title} - ${page.url}`);
      });
    }
  } catch (error) {
    if (verbose) {
      console.error('⚠️  Chrome not running, launching automatically...');
    }

    try {
      await launchChrome(verbose);
      const pages = await getPages();
      if (verbose) {
        console.error(`✅ Chrome launched successfully with ${pages.length} tabs`);
      }
    } catch (launchError) {
      throw new Error(`Failed to launch Chrome: ${launchError.message}`);
    }
  }

  // 1. List Tabs
  server.registerTool(
    'browser_list_tabs',
    {
      title: 'List Browser Tabs',
      description: 'List all open browser tabs',
      inputSchema: {}
    },
    async () => {
      const pages = await getPages();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            totalTabs: pages.length,
            tabs: pages.map((page, index) => ({
              index,
              id: page.id,
              title: page.title,
              url: page.url,
              active: page.id === currentPageId
            }))
          }, null, 2)
        }]
      };
    }
  );

  // 2. Switch Tab
  server.registerTool(
    'browser_switch_tab',
    {
      title: 'Switch to Tab',
      description: 'Switch to a specific tab by index or ID',
      inputSchema: {
        index: z.number().optional().describe('Tab index (0-based)'),
        id: z.string().optional().describe('Tab ID')
      }
    },
    async ({ index, id }) => {
      const pages = await getPages();
      let targetPage;
      
      if (id) {
        targetPage = pages.find(p => p.id === id);
      } else if (typeof index === 'number') {
        targetPage = pages[index];
      } else {
        throw new Error('Must provide either index or id');
      }
      
      if (!targetPage) {
        throw new Error('Tab not found');
      }
      
      await activateTab(targetPage.id);
      await connectToPage(targetPage.id);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'switch_tab',
            tab: {
              id: targetPage.id,
              title: targetPage.title,
              url: targetPage.url
            }
          }, null, 2)
        }]
      };
    }
  );

  // 3. Navigate
  server.registerTool(
    'browser_navigate',
    {
      title: 'Navigate to URL',
      description: 'Navigate the current tab to a URL',
      inputSchema: {
        url: z.string().describe('URL to navigate to')
      }
    },
    async ({ url }) => {
      if (!currentCDPClient) {
        // Connect to first available page
        const pages = await getPages();
        if (pages.length === 0) {
          throw new Error('No browser tabs available');
        }
        await connectToPage(pages[0].id);
      }
      
      await currentCDPClient.navigate(url);
      
      // Wait a moment for navigation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pageInfo = await currentCDPClient.getPageInfo();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'navigate',
            url: pageInfo.url,
            title: pageInfo.title
          }, null, 2)
        }]
      };
    }
  );

  // 4. Get Page Info
  server.registerTool(
    'browser_get_page_info',
    {
      title: 'Get Page Information',
      description: 'Get current page URL, title, and other info',
      inputSchema: {}
    },
    async () => {
      if (!currentCDPClient) {
        const pages = await getPages();
        if (pages.length === 0) {
          throw new Error('No browser tabs available');
        }
        await connectToPage(pages[0].id);
      }
      
      const pageInfo = await currentCDPClient.getPageInfo();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            url: pageInfo.url,
            title: pageInfo.title,
            tabId: currentPageId
          }, null, 2)
        }]
      };
    }
  );

  // 5. Take Screenshot
  server.registerTool(
    'browser_screenshot',
    {
      title: 'Take Screenshot',
      description: 'Take a screenshot of the current page',
      inputSchema: {}
    },
    async () => {
      if (!currentCDPClient) {
        const pages = await getPages();
        if (pages.length === 0) {
          throw new Error('No browser tabs available');
        }
        await connectToPage(pages[0].id);
      }
      
      const screenshotData = await currentCDPClient.screenshot();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'screenshot',
            format: 'png',
            data: screenshotData.substring(0, 100) + '...' // Truncate for display
          }, null, 2)
        }]
      };
    }
  );

  // 6. Click Element
  server.registerTool(
    'browser_click',
    {
      title: 'Click Element',
      description: 'Click on an element by CSS selector',
      inputSchema: {
        selector: z.string().describe('CSS selector for the element to click')
      }
    },
    async ({ selector }) => {
      if (!currentCDPClient) {
        const pages = await getPages();
        await connectToPage(pages[0].id);
      }

      await currentCDPClient.click(selector);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'click',
            selector
          }, null, 2)
        }]
      };
    }
  );

  // 7. Type Text
  server.registerTool(
    'browser_type',
    {
      title: 'Type Text',
      description: 'Type text into the currently focused element',
      inputSchema: {
        text: z.string().describe('Text to type')
      }
    },
    async ({ text }) => {
      if (!currentCDPClient) {
        const pages = await getPages();
        await connectToPage(pages[0].id);
      }

      await currentCDPClient.type(text);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'type',
            text
          }, null, 2)
        }]
      };
    }
  );

  // 8. Fill Input
  server.registerTool(
    'browser_fill',
    {
      title: 'Fill Input Field',
      description: 'Fill an input field with text',
      inputSchema: {
        selector: z.string().describe('CSS selector for the input field'),
        value: z.string().describe('Value to fill')
      }
    },
    async ({ selector, value }) => {
      if (!currentCDPClient) {
        const pages = await getPages();
        await connectToPage(pages[0].id);
      }

      // Click the input first, then clear and type
      await currentCDPClient.click(selector);
      await currentCDPClient.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Meta'
      });
      await currentCDPClient.sendCommand('Input.dispatchKeyEvent', {
        type: 'char',
        text: 'a'
      });
      await currentCDPClient.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Meta'
      });
      await currentCDPClient.type(value);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'fill',
            selector,
            value
          }, null, 2)
        }]
      };
    }
  );

  // Helper function to get current CDP client
  const getCDPClient = async () => {
    if (!currentCDPClient) {
      const pages = await getPages();
      if (pages.length === 0) {
        throw new Error('No browser tabs available');
      }
      await connectToPage(pages[0].id);
    }
    return currentCDPClient;
  };

  // 9. Launch Chrome (manual)
  server.registerTool(
    'browser_launch_chrome',
    {
      title: 'Launch Chrome',
      description: 'Launch Chrome with debugging enabled (if not already running)',
      inputSchema: {}
    },
    async () => {
      try {
        // Check if Chrome is already running
        await getPages();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'launch_chrome',
              message: 'Chrome is already running'
            }, null, 2)
          }]
        };
      } catch {
        // Chrome not running, launch it
        await launchChrome(verbose);
        const pages = await getPages();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'launch_chrome',
              message: 'Chrome launched successfully',
              tabs: pages.length
            }, null, 2)
          }]
        };
      }
    }
  );

  // Register additional browser tools
  registerDirectBrowserTools(server, getCDPClient, getPages, activateTab, connectToPage);

  if (verbose) {
    console.error('✅ Registered 20+ browser automation tools');
    console.error('🚀 Starting MCP server...');
  }

  // Cleanup function
  const cleanup = async () => {
    if (verbose) {
      console.error('🧹 Cleaning up...');
    }

    if (currentCDPClient) {
      currentCDPClient.close();
    }

    // Note: We don't kill Chrome automatically as user might want to keep it running
    if (verbose) {
      console.error('✅ Cleanup complete');
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  // Start the MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  if (verbose) {
    console.error('✅ Direct CDP MCP server is running!');
    console.error('💡 Chrome will stay running even if MCP server stops');
  }
}
