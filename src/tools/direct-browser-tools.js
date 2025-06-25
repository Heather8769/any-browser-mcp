import { z } from 'zod';

/**
 * Register all 25+ browser automation tools for direct CDP control
 * These tools directly control existing browser tabs via Chrome DevTools Protocol
 */
export function registerDirectBrowserTools(server, getCDPClient, getPages, activateTab, connectToPage) {

  // 9. Press Key
  server.registerTool(
    'browser_press_key',
    {
      title: 'Press Key',
      description: 'Press a keyboard key or key combination',
      inputSchema: {
        key: z.string().describe('Key to press (e.g., "Enter", "Tab", "Escape", "ArrowDown")')
      }
    },
    async ({ key }) => {
      const client = await getCDPClient();
      
      await client.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: key
      });
      await client.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: key
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'press_key',
            key
          }, null, 2)
        }]
      };
    }
  );

  // 10. Hover Element
  server.registerTool(
    'browser_hover',
    {
      title: 'Hover Over Element',
      description: 'Hover the mouse over an element',
      inputSchema: {
        selector: z.string().describe('CSS selector for the element to hover over')
      }
    },
    async ({ selector }) => {
      const client = await getCDPClient();
      
      // Get element coordinates
      const result = await client.sendCommand('Runtime.evaluate', {
        expression: `
          const element = document.querySelector('${selector}');
          if (!element) throw new Error('Element not found: ${selector}');
          const rect = element.getBoundingClientRect();
          ({ x: rect.left + rect.width/2, y: rect.top + rect.height/2 });
        `
      });
      
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }
      
      const { x, y } = result.result.value;
      
      // Move mouse to element
      await client.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x, y
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'hover',
            selector,
            coordinates: { x, y }
          }, null, 2)
        }]
      };
    }
  );

  // 11. Find Elements
  server.registerTool(
    'browser_find_elements',
    {
      title: 'Find Elements',
      description: 'Find elements on the page using CSS selector',
      inputSchema: {
        selector: z.string().describe('CSS selector to find elements'),
        limit: z.number().optional().describe('Maximum number of elements to return (default: 10)')
      }
    },
    async ({ selector, limit = 10 }) => {
      const client = await getCDPClient();
      
      const result = await client.sendCommand('Runtime.evaluate', {
        expression: `
          const elements = Array.from(document.querySelectorAll('${selector}')).slice(0, ${limit});
          elements.map((el, index) => ({
            index,
            tagName: el.tagName.toLowerCase(),
            text: el.textContent?.trim().substring(0, 100) || '',
            attributes: {
              id: el.id || null,
              class: el.className || null,
              href: el.href || null,
              src: el.src || null
            },
            visible: el.offsetParent !== null
          }));
        `
      });
      
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }
      
      const elements = result.result.value;
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'find_elements',
            selector,
            count: elements.length,
            elements
          }, null, 2)
        }]
      };
    }
  );

  // 12. Get Element Text
  server.registerTool(
    'browser_get_text',
    {
      title: 'Get Element Text',
      description: 'Get text content from an element',
      inputSchema: {
        selector: z.string().describe('CSS selector for the element')
      }
    },
    async ({ selector }) => {
      const client = await getCDPClient();
      
      const result = await client.sendCommand('Runtime.evaluate', {
        expression: `
          const element = document.querySelector('${selector}');
          if (!element) throw new Error('Element not found: ${selector}');
          element.textContent;
        `
      });
      
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'get_text',
            selector,
            text: result.result.value
          }, null, 2)
        }]
      };
    }
  );

  // 13. Get Element Attribute
  server.registerTool(
    'browser_get_attribute',
    {
      title: 'Get Element Attribute',
      description: 'Get a specific attribute value from an element',
      inputSchema: {
        selector: z.string().describe('CSS selector for the element'),
        attribute: z.string().describe('Attribute name to get')
      }
    },
    async ({ selector, attribute }) => {
      const client = await getCDPClient();
      
      const result = await client.sendCommand('Runtime.evaluate', {
        expression: `
          const element = document.querySelector('${selector}');
          if (!element) throw new Error('Element not found: ${selector}');
          element.getAttribute('${attribute}');
        `
      });
      
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'get_attribute',
            selector,
            attribute,
            value: result.result.value
          }, null, 2)
        }]
      };
    }
  );

  // 14. Wait for Element
  server.registerTool(
    'browser_wait_for',
    {
      title: 'Wait for Element',
      description: 'Wait for an element to appear or disappear',
      inputSchema: {
        selector: z.string().describe('CSS selector to wait for'),
        state: z.enum(['visible', 'hidden']).optional().describe('Element state to wait for (default: visible)'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ selector, state = 'visible', timeout = 30000 }) => {
      const client = await getCDPClient();
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        const result = await client.sendCommand('Runtime.evaluate', {
          expression: `
            const element = document.querySelector('${selector}');
            const exists = element !== null;
            const visible = element && element.offsetParent !== null;
            ({ exists, visible });
          `
        });
        
        const { exists, visible } = result.result.value;
        
        if (state === 'visible' && exists && visible) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                action: 'wait_for',
                selector,
                state: 'visible',
                found: true
              }, null, 2)
            }]
          };
        } else if (state === 'hidden' && (!exists || !visible)) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                action: 'wait_for',
                selector,
                state: 'hidden',
                found: true
              }, null, 2)
            }]
          };
        }
        
        // Wait 100ms before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      throw new Error(`Timeout waiting for element ${selector} to be ${state}`);
    }
  );

  // 15. Scroll
  server.registerTool(
    'browser_scroll',
    {
      title: 'Scroll Page',
      description: 'Scroll the page or a specific element',
      inputSchema: {
        x: z.number().optional().describe('Horizontal scroll position'),
        y: z.number().optional().describe('Vertical scroll position'),
        selector: z.string().optional().describe('CSS selector for element to scroll (if not provided, scrolls page)')
      }
    },
    async ({ x = 0, y = 0, selector }) => {
      const client = await getCDPClient();
      
      let expression;
      if (selector) {
        expression = `
          const element = document.querySelector('${selector}');
          if (!element) throw new Error('Element not found: ${selector}');
          element.scrollTo(${x}, ${y});
          ({ scrollLeft: element.scrollLeft, scrollTop: element.scrollTop });
        `;
      } else {
        expression = `
          window.scrollTo(${x}, ${y});
          ({ scrollLeft: window.scrollX, scrollTop: window.scrollY });
        `;
      }
      
      const result = await client.sendCommand('Runtime.evaluate', {
        expression
      });
      
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: 'scroll',
            selector: selector || 'page',
            position: result.result.value
          }, null, 2)
        }]
      };
    }
  );

}
