import WebSocket from 'ws';
import { EventEmitter } from 'events';

/**
 * Direct CDP (Chrome DevTools Protocol) client for controlling existing browser tabs
 * This bypasses Playwright's context isolation and directly controls visible browser windows
 */
export class DirectCDPClient extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.messageId = 0;
    this.pendingMessages = new Map();
    this.connected = false;
  }

  /**
   * Connect to a specific page via its WebSocket URL
   * @param {string} wsUrl - WebSocket URL for the page (e.g., ws://localhost:9222/devtools/page/ID)
   */
  async connect(wsUrl) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        this.connected = true;
        console.error(`✅ Direct CDP connected to: ${wsUrl}`);
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.id && this.pendingMessages.has(message.id)) {
            const { resolve, reject } = this.pendingMessages.get(message.id);
            this.pendingMessages.delete(message.id);
            
            if (message.error) {
              reject(new Error(message.error.message));
            } else {
              resolve(message.result);
            }
          } else {
            // Event message
            this.emit('event', message);
          }
        } catch (error) {
          console.error('CDP message parse error:', error);
        }
      });
      
      this.ws.on('error', (error) => {
        console.error('CDP WebSocket error:', error);
        reject(error);
      });
      
      this.ws.on('close', () => {
        this.connected = false;
        console.error('CDP WebSocket closed');
      });
    });
  }

  /**
   * Send a CDP command
   * @param {string} method - CDP method name
   * @param {Object} params - Command parameters
   * @returns {Promise} Command result
   */
  async sendCommand(method, params = {}) {
    if (!this.connected) {
      throw new Error('CDP client not connected');
    }
    
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const message = { id, method, params };
      
      this.pendingMessages.set(id, { resolve, reject });
      
      this.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          this.pendingMessages.delete(id);
          reject(error);
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error(`CDP command timeout: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * Navigate to a URL
   * @param {string} url - URL to navigate to
   */
  async navigate(url) {
    return await this.sendCommand('Page.navigate', { url });
  }

  /**
   * Get page info
   */
  async getPageInfo() {
    const [url, title] = await Promise.all([
      this.sendCommand('Runtime.evaluate', { 
        expression: 'window.location.href' 
      }),
      this.sendCommand('Runtime.evaluate', { 
        expression: 'document.title' 
      })
    ]);
    
    return {
      url: url.result.value,
      title: title.result.value
    };
  }

  /**
   * Take a screenshot
   */
  async screenshot() {
    const result = await this.sendCommand('Page.captureScreenshot', {
      format: 'png',
      quality: 80
    });
    return result.data;
  }

  /**
   * Click an element
   * @param {string} selector - CSS selector
   */
  async click(selector) {
    // First, find the element
    const result = await this.sendCommand('Runtime.evaluate', {
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
    
    // Click at the coordinates
    await this.sendCommand('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x, y,
      button: 'left',
      clickCount: 1
    });
    
    await this.sendCommand('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x, y,
      button: 'left',
      clickCount: 1
    });
  }

  /**
   * Type text
   * @param {string} text - Text to type
   */
  async type(text) {
    for (const char of text) {
      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'char',
        text: char
      });
    }
  }

  /**
   * Close the connection
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
    }
  }
}

/**
 * Get available pages from Chrome
 * @param {number} port - Debug port (default: 9222)
 * @returns {Promise<Array>} List of available pages
 */
export async function getAvailablePages(port = 9222) {
  const http = await import('http');
  
  return new Promise((resolve, reject) => {
    const req = http.default.get(`http://localhost:${port}/json`, { timeout: 5000 }, (res) => {
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Create a new tab in the existing browser
 * @param {number} port - Debug port (default: 9222)
 * @param {string} url - URL to open (optional)
 * @returns {Promise<Object>} New tab info
 */
export async function createNewTab(port = 9222, url = 'about:blank') {
  const http = await import('http');
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ url });
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/json/new',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.default.request(options, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const tabInfo = JSON.parse(data);
            resolve(tabInfo);
          } catch (parseError) {
            reject(parseError);
          }
        });
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}
