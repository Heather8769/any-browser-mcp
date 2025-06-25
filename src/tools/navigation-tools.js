import { z } from 'zod';
import { setCurrentPage } from '../server.js';

/**
 * Register navigation tools
 * @param {McpServer} server - MCP server instance  
 * @param {Function} getBrowserInstances - Function to get current browser instances
 */
export function registerNavigationTools(server, getBrowserInstances) {

  // Navigate to URL
  server.registerTool(
    'browser_navigate',
    {
      title: 'Navigate to URL',
      description: 'Navigate the browser to a specific URL',
      inputSchema: {
        url: z.string().describe('URL to navigate to'),
        waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().describe('When to consider navigation complete'),
        timeout: z.number().optional().describe('Navigation timeout in milliseconds (default: 30000)')
      }
    },
    async ({ url, waitUntil = 'load', timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const response = await page.goto(url, { waitUntil, timeout });
        const finalUrl = await page.url();
        const title = await page.title();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              url: finalUrl,
              title,
              status: response?.status(),
              statusText: response?.statusText(),
              redirected: finalUrl !== url
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              requestedUrl: url,
              currentUrl: (() => {
                try {
                  return page.url();
                } catch {
                  return 'unknown';
                }
              })()
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Go back
  server.registerTool(
    'browser_back',
    {
      title: 'Go Back',
      description: 'Navigate back in browser history',
      inputSchema: {
        waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().describe('When to consider navigation complete'),
        timeout: z.number().optional().describe('Navigation timeout in milliseconds (default: 30000)')
      }
    },
    async ({ waitUntil = 'load', timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        await page.goBack({ waitUntil, timeout });
        const url = await page.url();
        const title = await page.title();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'back',
              url,
              title
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              action: 'back'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Go forward
  server.registerTool(
    'browser_forward',
    {
      title: 'Go Forward',
      description: 'Navigate forward in browser history',
      inputSchema: {
        waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().describe('When to consider navigation complete'),
        timeout: z.number().optional().describe('Navigation timeout in milliseconds (default: 30000)')
      }
    },
    async ({ waitUntil = 'load', timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        await page.goForward({ waitUntil, timeout });
        const url = await page.url();
        const title = await page.title();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'forward',
              url,
              title
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              action: 'forward'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Reload page
  server.registerTool(
    'browser_reload',
    {
      title: 'Reload Page',
      description: 'Reload the current page',
      inputSchema: {
        waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().describe('When to consider reload complete'),
        timeout: z.number().optional().describe('Reload timeout in milliseconds (default: 30000)')
      }
    },
    async ({ waitUntil = 'load', timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        await page.reload({ waitUntil, timeout });
        const url = await page.url();
        const title = await page.title();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'reload',
              url,
              title
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              action: 'reload'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Create new tab/page
  server.registerTool(
    'browser_new_tab',
    {
      title: 'Open New Tab',
      description: 'Open a new tab/page in the browser',
      inputSchema: {
        url: z.string().optional().describe('URL to open in new tab (optional)'),
        switchTo: z.boolean().optional().describe('Switch to the new tab (default: true)')
      }
    },
    async ({ url, switchTo = true }) => {
      const { context } = getBrowserInstances();
      if (!context) {
        throw new Error('No active browser context available');
      }

      try {
        const newPage = await context.newPage();
        
        if (url) {
          await newPage.goto(url);
        }

        if (switchTo) {
          setCurrentPage(newPage);
        }

        const pageUrl = url ? await newPage.url() : 'about:blank';
        const title = url ? await newPage.title() : 'New Tab';

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'new_tab',
              url: pageUrl,
              title,
              switchedTo: switchTo
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              action: 'new_tab',
              requestedUrl: url || null
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // List all tabs
  server.registerTool(
    'browser_list_tabs',
    {
      title: 'List All Tabs',
      description: 'Get information about all open tabs/pages',
      inputSchema: {}
    },
    async () => {
      const { context, page: currentPage } = getBrowserInstances();
      if (!context) {
        throw new Error('No active browser context available');
      }

      try {
        const pages = context.pages();
        const tabsInfo = await Promise.all(
          pages.map(async (page, index) => {
            try {
              const url = await page.url();
              const title = await page.title();
              const isCurrent = page === currentPage;
              
              return {
                index,
                url,
                title,
                isCurrent
              };
            } catch (error) {
              return {
                index,
                url: 'unknown',
                title: 'Error loading tab',
                isCurrent: false,
                error: error.message
              };
            }
          })
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              totalTabs: tabsInfo.length,
              tabs: tabsInfo
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              action: 'list_tabs'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Switch to tab by index
  server.registerTool(
    'browser_switch_tab',
    {
      title: 'Switch to Tab',
      description: 'Switch to a specific tab by index',
      inputSchema: {
        index: z.number().describe('Tab index to switch to (0-based)')
      }
    },
    async ({ index }) => {
      const { context } = getBrowserInstances();
      if (!context) {
        throw new Error('No active browser context available');
      }

      try {
        const pages = context.pages();
        
        if (index < 0 || index >= pages.length) {
          throw new Error(`Tab index ${index} out of range. Available tabs: 0-${pages.length - 1}`);
        }

        const targetPage = pages[index];
        setCurrentPage(targetPage);
        
        const url = await targetPage.url();
        const title = await targetPage.title();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'switch_tab',
              index,
              url,
              title
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              action: 'switch_tab',
              requestedIndex: index
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );
}
