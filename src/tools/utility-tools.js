import { z } from 'zod';

/**
 * Register utility tools for element inspection, attributes, etc.
 * @param {McpServer} server - MCP server instance
 * @param {Function} getBrowserInstances - Function to get current browser instances
 */
export function registerUtilityTools(server, getBrowserInstances) {

  // Find elements
  server.registerTool(
    'browser_find_elements',
    {
      title: 'Find Elements',
      description: 'Find elements on the page using CSS selector and get their information',
      inputSchema: {
        selector: z.string().describe('CSS selector to find elements'),
        limit: z.number().optional().describe('Maximum number of elements to return (default: 10)'),
        includeText: z.boolean().optional().describe('Include text content of elements (default: true)'),
        includeAttributes: z.boolean().optional().describe('Include all attributes of elements (default: false)')
      }
    },
    async ({ selector, limit = 10, includeText = true, includeAttributes = false }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const elements = await page.locator(selector).all();
        const limitedElements = elements.slice(0, limit);
        
        const elementInfo = await Promise.all(
          limitedElements.map(async (element, index) => {
            const info = { index };
            
            try {
              if (includeText) {
                info.textContent = await element.textContent();
                info.innerText = await element.innerText();
              }
              
              if (includeAttributes) {
                // Get common attributes
                const tagName = await element.evaluate(el => el.tagName.toLowerCase());
                info.tagName = tagName;
                
                const attributes = await element.evaluate(el => {
                  const attrs = {};
                  for (const attr of el.attributes) {
                    attrs[attr.name] = attr.value;
                  }
                  return attrs;
                });
                info.attributes = attributes;
              }
              
              // Always include basic info
              info.isVisible = await element.isVisible();
              info.isEnabled = await element.isEnabled();
              
            } catch (error) {
              info.error = error.message;
            }
            
            return info;
          })
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              selector,
              totalFound: elements.length,
              returned: elementInfo.length,
              limited: elements.length > limit,
              elements: elementInfo
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
              selector
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Get element attribute
  server.registerTool(
    'browser_get_attribute',
    {
      title: 'Get Element Attribute',
      description: 'Get a specific attribute value from an element',
      inputSchema: {
        selector: z.string().describe('CSS selector for the element'),
        attribute: z.string().describe('Attribute name to get'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ selector, attribute, timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const element = page.locator(selector).first();
        const value = await element.getAttribute(attribute, { timeout });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              selector,
              attribute,
              value
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
              selector,
              attribute
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Get element text
  server.registerTool(
    'browser_get_text',
    {
      title: 'Get Element Text',
      description: 'Get text content from an element',
      inputSchema: {
        selector: z.string().describe('CSS selector for the element'),
        type: z.enum(['textContent', 'innerText', 'innerHTML']).optional().describe('Type of text to get (default: textContent)'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ selector, type = 'textContent', timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const element = page.locator(selector).first();
        
        let text;
        switch (type) {
          case 'textContent':
            text = await element.textContent({ timeout });
            break;
          case 'innerText':
            text = await element.innerText({ timeout });
            break;
          case 'innerHTML':
            text = await element.innerHTML({ timeout });
            break;
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              selector,
              type,
              text,
              length: text ? text.length : 0
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
              selector,
              type
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Check element state
  server.registerTool(
    'browser_check_element',
    {
      title: 'Check Element State',
      description: 'Check various states of an element (visible, enabled, checked, etc.)',
      inputSchema: {
        selector: z.string().describe('CSS selector for the element'),
        checks: z.array(z.enum(['visible', 'hidden', 'enabled', 'disabled', 'checked', 'unchecked', 'editable', 'readonly'])).optional().describe('States to check (default: all)'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ selector, checks, timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      const allChecks = ['visible', 'enabled', 'checked', 'editable'];
      const checksToPerform = checks || allChecks;

      try {
        const element = page.locator(selector).first();
        const results = {};

        for (const check of checksToPerform) {
          try {
            switch (check) {
              case 'visible':
                results.visible = await element.isVisible();
                break;
              case 'hidden':
                results.hidden = await element.isHidden();
                break;
              case 'enabled':
                results.enabled = await element.isEnabled();
                break;
              case 'disabled':
                results.disabled = await element.isDisabled();
                break;
              case 'checked':
                results.checked = await element.isChecked({ timeout });
                break;
              case 'unchecked':
                results.unchecked = !(await element.isChecked({ timeout }));
                break;
              case 'editable':
                results.editable = await element.isEditable({ timeout });
                break;
              case 'readonly':
                results.readonly = !(await element.isEditable({ timeout }));
                break;
            }
          } catch (error) {
            results[check] = `Error: ${error.message}`;
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              selector,
              checks: results
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
              selector
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Get page info
  server.registerTool(
    'browser_get_page_info',
    {
      title: 'Get Page Information',
      description: 'Get comprehensive information about the current page',
      inputSchema: {
        includeMetadata: z.boolean().optional().describe('Include page metadata (title, description, etc.)'),
        includePerformance: z.boolean().optional().describe('Include performance metrics'),
        includeViewport: z.boolean().optional().describe('Include viewport information')
      }
    },
    async ({ includeMetadata = true, includePerformance = false, includeViewport = true }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const info = {
          url: await page.url(),
          title: await page.title()
        };

        if (includeMetadata) {
          const metadata = await page.evaluate(() => {
            const meta = {};
            
            // Get meta tags
            const metaTags = document.querySelectorAll('meta');
            metaTags.forEach(tag => {
              const name = tag.getAttribute('name') || tag.getAttribute('property');
              const content = tag.getAttribute('content');
              if (name && content) {
                meta[name] = content;
              }
            });

            // Get other useful info
            meta.lang = document.documentElement.lang;
            meta.charset = document.characterSet;
            meta.readyState = document.readyState;
            
            return meta;
          });
          info.metadata = metadata;
        }

        if (includeViewport) {
          const viewport = await page.evaluate(() => ({
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight
          }));
          info.viewport = viewport;
        }

        if (includePerformance) {
          const performance = await page.evaluate(() => {
            const perf = window.performance;
            const navigation = perf.getEntriesByType('navigation')[0];
            
            return {
              loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : null,
              domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : null,
              firstPaint: perf.getEntriesByName('first-paint')[0]?.startTime || null,
              firstContentfulPaint: perf.getEntriesByName('first-contentful-paint')[0]?.startTime || null
            };
          });
          info.performance = performance;
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              pageInfo: info
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Scroll page or element
  server.registerTool(
    'browser_scroll',
    {
      title: 'Scroll Page or Element',
      description: 'Scroll the page or a specific element',
      inputSchema: {
        selector: z.string().optional().describe('CSS selector for element to scroll (if not provided, scrolls page)'),
        x: z.number().optional().describe('Horizontal scroll position'),
        y: z.number().optional().describe('Vertical scroll position'),
        behavior: z.enum(['auto', 'smooth']).optional().describe('Scroll behavior (default: auto)')
      }
    },
    async ({ selector, x, y, behavior = 'auto' }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        if (selector) {
          const element = page.locator(selector).first();
          await element.scrollIntoViewIfNeeded();
        } else {
          await page.evaluate(({ x, y, behavior }) => {
            window.scrollTo({
              left: x,
              top: y,
              behavior
            });
          }, { x, y, behavior });
        }

        const scrollPosition = await page.evaluate(() => ({
          x: window.scrollX,
          y: window.scrollY
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'scroll',
              selector: selector || null,
              targetPosition: { x, y },
              currentPosition: scrollPosition,
              behavior
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
              action: 'scroll',
              selector: selector || null
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );
}
