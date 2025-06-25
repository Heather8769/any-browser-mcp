import { chromium, firefox } from 'playwright-core';

/**
 * Attempts to connect to a running browser instance via CDP
 * @param {Object} options - Connection options
 * @param {string} [options.endpoint] - Explicit CDP endpoint URL
 * @param {string} [options.brand] - Browser brand preference ('detect', 'chrome', 'edge', 'firefox')
 * @param {number} [options.customPort] - Custom port override
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @returns {Promise<Browser>} Connected browser instance
 */
export async function attachToRunningBrowser({ endpoint, brand = 'detect', customPort, verbose = false }) {
  if (verbose) {
    console.error('🔍 Attempting to connect to browser...');
  }

  // If explicit endpoint provided, use it directly
  if (endpoint) {
    if (verbose) {
      console.error(`📡 Connecting to explicit endpoint: ${endpoint}`);
    }
    try {
      const browser = await chromium.connectOverCDP(endpoint);
      if (verbose) {
        console.error('✅ Successfully connected to explicit endpoint');
      }
      return browser;
    } catch (error) {
      throw new Error(`Failed to connect to endpoint ${endpoint}: ${error.message}`);
    }
  }

  // Default debugging ports for different browsers
  const defaultPorts = {
    chrome: 9222,
    edge: 9223,
    firefox: 9224
  };

  // If custom port specified, try all browsers on that port
  if (customPort) {
    const wsURL = `ws://127.0.0.1:${customPort}/devtools/browser`;
    if (verbose) {
      console.error(`🔌 Trying custom port ${customPort}: ${wsURL}`);
    }
    try {
      const browser = await chromium.connectOverCDP(wsURL);
      if (verbose) {
        console.error(`✅ Connected on custom port ${customPort}`);
      }
      return browser;
    } catch (error) {
      throw new Error(`No browser found on custom port ${customPort}: ${error.message}`);
    }
  }

  // Auto-probe default debugging ports
  const brandsToTry = brand === 'detect' ? Object.keys(defaultPorts) : [brand];

  for (const browserBrand of brandsToTry) {
    const port = defaultPorts[browserBrand];
    const wsURL = `ws://127.0.0.1:${port}/devtools/browser`;
    
    if (verbose) {
      console.error(`🔍 Probing ${browserBrand} on port ${port}: ${wsURL}`);
    }

    try {
      const browser = await chromium.connectOverCDP(wsURL);
      if (verbose) {
        console.error(`✅ Successfully connected to ${browserBrand} on port ${port}`);
      }
      return browser;
    } catch (error) {
      if (verbose) {
        console.error(`❌ Failed to connect to ${browserBrand} on port ${port}: ${error.message}`);
      }
      // Continue trying other browsers
    }
  }

  throw new Error(`No running browser found. Tried ports: ${brandsToTry.map(b => defaultPorts[b]).join(', ')}. 
    
To fix this:
1. Start your browser with debugging enabled:
   - Chrome: --remote-debugging-port=9222
   - Edge: --remote-debugging-port=9223  
   - Firefox: about:config → devtools.debugger.remote-enabled=true, devtools.debugger.remote-port=9224
2. Or use --launch flag to start a new browser instance
3. Or specify a custom --endpoint`);
}

/**
 * Launches a new browser instance if attachment fails
 * @param {string} browserPref - Browser preference
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Promise<Browser>} Launched browser instance
 */
export async function launchBrowser(browserPref = 'detect', verbose = false) {
  if (verbose) {
    console.error(`🚀 Launching new ${browserPref} browser instance...`);
  }

  try {
    const browser = browserPref === 'firefox' 
      ? await firefox.launch({ headless: false, devtools: true })
      : await chromium.launch({ headless: false, devtools: true });
    
    if (verbose) {
      console.error('✅ Successfully launched new browser instance');
    }
    
    return browser;
  } catch (error) {
    throw new Error(`Failed to launch ${browserPref} browser: ${error.message}`);
  }
}
