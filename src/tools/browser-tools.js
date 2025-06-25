import { z } from 'zod';

/**
 * Register browser management tools
 * @param {McpServer} server - MCP server instance
 * @param {Function} getBrowserInstances - Function to get current browser instances
 */
export function registerBrowserTools(server, getBrowserInstances) {

  // Take a screenshot
  server.registerTool(
    'browser_screenshot',
    {
      title: 'Take Screenshot',
      description: 'Take a screenshot of the current page or a specific element',
      inputSchema: {
        fullPage: z.boolean().optional().describe('Capture full page (default: false)'),
        element: z.string().optional().describe('CSS selector for specific element to screenshot'),
        path: z.string().optional().describe('File path to save screenshot (optional)'),
        quality: z.number().min(0).max(100).optional().describe('JPEG quality 0-100 (default: 80)')
      }
    },
    async ({ fullPage = false, element, path, quality = 80 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        let screenshotOptions = {
          fullPage,
          quality,
          type: path?.endsWith('.png') ? 'png' : 'jpeg'
        };

        if (path) {
          screenshotOptions.path = path;
        }

        let screenshot;
        if (element) {
          const elementHandle = await page.locator(element).first();
          screenshot = await elementHandle.screenshot(screenshotOptions);
        } else {
          screenshot = await page.screenshot(screenshotOptions);
        }

        const result = {
          success: true,
          message: `Screenshot taken${element ? ` of element: ${element}` : ''}${path ? ` and saved to: ${path}` : ''}`,
          fullPage,
          element: element || null,
          path: path || null
        };

        // If no path specified, return base64 data
        if (!path && screenshot) {
          result.base64 = screenshot.toString('base64');
          result.dataUrl = `data:image/${screenshotOptions.type};base64,${result.base64}`;
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              element: element || null
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Get page content/HTML
  server.registerTool(
    'browser_get_content',
    {
      title: 'Get Page Content',
      description: 'Get the HTML content of the current page',
      inputSchema: {
        selector: z.string().optional().describe('CSS selector to get content of specific element'),
        textOnly: z.boolean().optional().describe('Return only text content, not HTML (default: false)')
      }
    },
    async ({ selector, textOnly = false }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        let content;
        const url = page.url();
        const title = await page.title();

        if (selector) {
          const element = page.locator(selector).first();
          content = textOnly 
            ? await element.textContent()
            : await element.innerHTML();
        } else {
          content = textOnly 
            ? await page.textContent('body')
            : await page.content();
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              url,
              title,
              selector: selector || null,
              textOnly,
              content: content || ''
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
              selector: selector || null
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Wait for element or condition
  server.registerTool(
    'browser_wait_for',
    {
      title: 'Wait For Element/Condition',
      description: 'Wait for an element to appear, disappear, or for a specific condition',
      inputSchema: {
        selector: z.string().optional().describe('CSS selector to wait for'),
        state: z.enum(['visible', 'hidden', 'attached', 'detached']).optional().describe('Element state to wait for'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
        text: z.string().optional().describe('Wait for element containing this text'),
        url: z.string().optional().describe('Wait for URL to match this pattern')
      }
    },
    async ({ selector, state = 'visible', timeout = 30000, text, url }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        let result;

        if (url) {
          await page.waitForURL(url, { timeout });
          result = { condition: 'url', value: url, currentUrl: page.url() };
        } else if (selector) {
          if (text) {
            await page.waitForSelector(`${selector}:has-text("${text}")`, { state, timeout });
            result = { condition: 'selector_with_text', selector, text, state };
          } else {
            await page.waitForSelector(selector, { state, timeout });
            result = { condition: 'selector', selector, state };
          }
        } else {
          throw new Error('Must specify either selector or url to wait for');
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Wait condition satisfied',
              ...result,
              timeout
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
              selector: selector || null,
              state,
              timeout
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Evaluate JavaScript
  server.registerTool(
    'browser_evaluate',
    {
      title: 'Evaluate JavaScript',
      description: 'Execute JavaScript code in the browser context',
      inputSchema: {
        script: z.string().describe('JavaScript code to execute'),
        args: z.array(z.any()).optional().describe('Arguments to pass to the script')
      }
    },
    async ({ script, args = [] }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const result = await page.evaluate(script, ...args);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              result,
              script: script.substring(0, 100) + (script.length > 100 ? '...' : ''),
              args
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
              script: script.substring(0, 100) + (script.length > 100 ? '...' : ''),
              args
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );
}
