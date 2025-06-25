import { z } from 'zod';

/**
 * Register interaction tools for clicking, typing, etc.
 * @param {McpServer} server - MCP server instance
 * @param {Function} getBrowserInstances - Function to get current browser instances
 */
export function registerInteractionTools(server, getBrowserInstances) {

  // Click element
  server.registerTool(
    'browser_click',
    {
      title: 'Click Element',
      description: 'Click on an element specified by CSS selector',
      inputSchema: {
        selector: z.string().describe('CSS selector for the element to click'),
        button: z.enum(['left', 'right', 'middle']).optional().describe('Mouse button to use (default: left)'),
        clickCount: z.number().optional().describe('Number of clicks (default: 1)'),
        force: z.boolean().optional().describe('Force click even if element is not actionable'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ selector, button = 'left', clickCount = 1, force = false, timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const element = page.locator(selector).first();
        await element.click({ 
          button, 
          clickCount, 
          force, 
          timeout 
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'click',
              selector,
              button,
              clickCount,
              force
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
              action: 'click',
              selector
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Type text
  server.registerTool(
    'browser_type',
    {
      title: 'Type Text',
      description: 'Type text into an input field or element',
      inputSchema: {
        selector: z.string().describe('CSS selector for the element to type into'),
        text: z.string().describe('Text to type'),
        delay: z.number().optional().describe('Delay between keystrokes in milliseconds'),
        clear: z.boolean().optional().describe('Clear existing text before typing (default: false)'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ selector, text, delay, clear = false, timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const element = page.locator(selector).first();
        
        if (clear) {
          await element.clear({ timeout });
        }
        
        await element.type(text, { delay, timeout });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'type',
              selector,
              text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
              textLength: text.length,
              cleared: clear,
              delay
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
              action: 'type',
              selector
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Fill input (faster than type)
  server.registerTool(
    'browser_fill',
    {
      title: 'Fill Input',
      description: 'Fill an input field with text (faster than typing)',
      inputSchema: {
        selector: z.string().describe('CSS selector for the input element'),
        value: z.string().describe('Value to fill'),
        force: z.boolean().optional().describe('Force fill even if element is not editable'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ selector, value, force = false, timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const element = page.locator(selector).first();
        await element.fill(value, { force, timeout });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'fill',
              selector,
              value: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
              valueLength: value.length,
              force
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
              action: 'fill',
              selector
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Press key
  server.registerTool(
    'browser_press_key',
    {
      title: 'Press Key',
      description: 'Press a keyboard key or key combination',
      inputSchema: {
        key: z.string().describe('Key to press (e.g., "Enter", "Tab", "Escape", "Control+a")'),
        selector: z.string().optional().describe('CSS selector to focus before pressing key'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ key, selector, timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        if (selector) {
          const element = page.locator(selector).first();
          await element.focus({ timeout });
          await element.press(key);
        } else {
          await page.keyboard.press(key);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'press_key',
              key,
              selector: selector || null,
              focused: !!selector
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
              action: 'press_key',
              key,
              selector: selector || null
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Hover over element
  server.registerTool(
    'browser_hover',
    {
      title: 'Hover Over Element',
      description: 'Hover the mouse over an element',
      inputSchema: {
        selector: z.string().describe('CSS selector for the element to hover over'),
        force: z.boolean().optional().describe('Force hover even if element is not visible'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ selector, force = false, timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const element = page.locator(selector).first();
        await element.hover({ force, timeout });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'hover',
              selector,
              force
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
              action: 'hover',
              selector
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Select option from dropdown
  server.registerTool(
    'browser_select_option',
    {
      title: 'Select Option',
      description: 'Select an option from a dropdown/select element',
      inputSchema: {
        selector: z.string().describe('CSS selector for the select element'),
        value: z.union([z.string(), z.array(z.string())]).optional().describe('Option value(s) to select'),
        label: z.union([z.string(), z.array(z.string())]).optional().describe('Option label(s) to select'),
        index: z.union([z.number(), z.array(z.number())]).optional().describe('Option index(es) to select'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ selector, value, label, index, timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const element = page.locator(selector).first();
        
        let selectedValues;
        if (value !== undefined) {
          selectedValues = await element.selectOption({ value }, { timeout });
        } else if (label !== undefined) {
          selectedValues = await element.selectOption({ label }, { timeout });
        } else if (index !== undefined) {
          selectedValues = await element.selectOption({ index }, { timeout });
        } else {
          throw new Error('Must specify value, label, or index to select');
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'select_option',
              selector,
              selectedValues,
              criteria: { value, label, index }
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
              action: 'select_option',
              selector,
              criteria: { value, label, index }
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Drag and drop
  server.registerTool(
    'browser_drag_and_drop',
    {
      title: 'Drag and Drop',
      description: 'Drag an element and drop it on another element',
      inputSchema: {
        sourceSelector: z.string().describe('CSS selector for the element to drag'),
        targetSelector: z.string().describe('CSS selector for the drop target'),
        force: z.boolean().optional().describe('Force drag even if elements are not actionable'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
      }
    },
    async ({ sourceSelector, targetSelector, force = false, timeout = 30000 }) => {
      const { page } = getBrowserInstances();
      if (!page) {
        throw new Error('No active page available');
      }

      try {
        const sourceElement = page.locator(sourceSelector).first();
        const targetElement = page.locator(targetSelector).first();
        
        await sourceElement.dragTo(targetElement, { force, timeout });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'drag_and_drop',
              sourceSelector,
              targetSelector,
              force
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
              action: 'drag_and_drop',
              sourceSelector,
              targetSelector
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );
}
