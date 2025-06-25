import { chromium, firefox } from 'playwright-core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if a browser process is running with debugging enabled
 * @param {string} browserName - Browser name to check
 * @param {number} port - Expected debugging port
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Promise<boolean>} True if browser with debugging is running
 */
async function isBrowserRunningWithDebugging(browserName, port, verbose = false) {
  try {
    const platform = process.platform;
    let command;

    if (platform === 'win32') {
      // Windows: Check for Chrome/Edge processes with debugging port
      command = `tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV | findstr chrome.exe || tasklist /FI "IMAGENAME eq msedge.exe" /FO CSV | findstr msedge.exe`;
    } else if (platform === 'darwin') {
      // macOS: Check for Chrome/Edge processes with debugging port
      command = `ps aux | grep -E "(Google Chrome|Microsoft Edge|chrome|edge)" | grep -E "(remote-debugging-port=${port}|remote-debugging-port.*${port})" | grep -v grep`;
    } else {
      // Linux: Check for Chrome/Edge processes with debugging port
      command = `ps aux | grep -E "(chrome|chromium|edge)" | grep -E "(remote-debugging-port=${port}|remote-debugging-port.*${port})" | grep -v grep`;
    }

    const { stdout } = await execAsync(command);
    const hasProcess = stdout.trim().length > 0;

    if (verbose) {
      console.error(`🔍 Browser process check for ${browserName} on port ${port}: ${hasProcess ? 'Found' : 'Not found'}`);
      if (hasProcess && verbose) {
        console.error(`   Process details: ${stdout.trim().split('\n')[0]}`);
      }
    }

    return hasProcess;
  } catch (error) {
    if (verbose) {
      console.error(`⚠️  Process check failed for ${browserName}: ${error.message}`);
    }
    return false;
  }
}

/**
 * Test if a debugging port is accessible via HTTP
 * @param {number} port - Port to test
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Promise<boolean>} True if port is accessible
 */
async function isDebuggingPortAccessible(port, verbose = false) {
  try {
    // Use Node.js http module instead of fetch
    const http = await import('http');

    return new Promise((resolve) => {
      const req = http.default.get(`http://localhost:${port}/json/version`, { timeout: 2000 }, (res) => {
        if (res.statusCode === 200) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const browserInfo = JSON.parse(data);
              if (verbose) {
                console.error(`✅ Port ${port} accessible - Browser: ${browserInfo.Browser || 'Unknown'}`);
              }
              resolve(true);
            } catch {
              resolve(false);
            }
          });
        } else {
          resolve(false);
        }
      });

      req.on('error', (error) => {
        if (verbose) {
          console.error(`❌ Port ${port} not accessible: ${error.message}`);
        }
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        if (verbose) {
          console.error(`❌ Port ${port} timeout`);
        }
        resolve(false);
      });
    });
  } catch (error) {
    if (verbose) {
      console.error(`❌ Port ${port} check failed: ${error.message}`);
    }
    return false;
  }
}

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
    console.error(`   Platform: ${process.platform}`);
    console.error(`   Brand preference: ${brand}`);
    console.error(`   Custom port: ${customPort || 'none'}`);
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

  // If custom port specified, try connecting to that port
  if (customPort) {
    if (verbose) {
      console.error(`🔌 Testing custom port ${customPort}...`);
    }

    // First check if port is accessible
    const isAccessible = await isDebuggingPortAccessible(customPort, verbose);
    if (!isAccessible) {
      throw new Error(`Custom port ${customPort} is not accessible. Ensure browser is running with --remote-debugging-port=${customPort}`);
    }

    const wsURL = `ws://127.0.0.1:${customPort}/devtools/browser`;
    if (verbose) {
      console.error(`🔌 Connecting to custom port ${customPort}: ${wsURL}`);
    }
    try {
      const browser = await chromium.connectOverCDP(wsURL);
      if (verbose) {
        console.error(`✅ Connected on custom port ${customPort}`);
      }
      return browser;
    } catch (error) {
      throw new Error(`Failed to connect to custom port ${customPort}: ${error.message}`);
    }
  }

  // Auto-probe default debugging ports with enhanced detection
  const brandsToTry = brand === 'detect' ? Object.keys(defaultPorts) : [brand];
  const connectionAttempts = [];

  for (const browserBrand of brandsToTry) {
    const port = defaultPorts[browserBrand];

    if (verbose) {
      console.error(`🔍 Checking ${browserBrand} on port ${port}...`);
    }

    // Step 1: Check if browser process is running with debugging
    const hasProcess = await isBrowserRunningWithDebugging(browserBrand, port, verbose);

    // Step 2: Check if debugging port is accessible
    const isAccessible = await isDebuggingPortAccessible(port, verbose);

    if (!hasProcess && !isAccessible) {
      if (verbose) {
        console.error(`⏭️  Skipping ${browserBrand} - no process with debugging and port not accessible`);
      }
      connectionAttempts.push({
        browser: browserBrand,
        port,
        hasProcess: false,
        isAccessible: false,
        error: 'No browser process with debugging found'
      });
      continue;
    }

    // Step 3: Try to connect via WebSocket
    const wsURL = `ws://127.0.0.1:${port}/devtools/browser`;

    if (verbose) {
      console.error(`🔍 Attempting WebSocket connection to ${browserBrand} on port ${port}: ${wsURL}`);
    }

    try {
      const browser = await chromium.connectOverCDP(wsURL);
      if (verbose) {
        console.error(`✅ Successfully connected to ${browserBrand} on port ${port}`);
      }
      return browser;
    } catch (error) {
      if (verbose) {
        console.error(`❌ WebSocket connection failed for ${browserBrand} on port ${port}: ${error.message}`);
      }
      connectionAttempts.push({
        browser: browserBrand,
        port,
        hasProcess,
        isAccessible,
        error: error.message
      });
    }
  }

  // Generate detailed error message with connection attempt details
  const attemptDetails = connectionAttempts.map(attempt =>
    `   ${attempt.browser} (port ${attempt.port}): ${attempt.error} [Process: ${attempt.hasProcess ? '✓' : '✗'}, Port: ${attempt.isAccessible ? '✓' : '✗'}]`
  ).join('\n');

  const errorMessage = `No running browser found with debugging enabled.

Connection attempts:
${attemptDetails}

To fix this:
1. Start your browser with debugging enabled:

   Chrome/Chromium:
   ${process.platform === 'win32'
     ? 'chrome.exe --remote-debugging-port=9222'
     : process.platform === 'darwin'
     ? '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222'
     : 'google-chrome --remote-debugging-port=9222'
   }

   Microsoft Edge:
   ${process.platform === 'win32'
     ? 'msedge.exe --remote-debugging-port=9223'
     : process.platform === 'darwin'
     ? '/Applications/Microsoft\\ Edge.app/Contents/MacOS/Microsoft\\ Edge --remote-debugging-port=9223'
     : 'microsoft-edge --remote-debugging-port=9223'
   }

2. Or use --launch flag to start a new browser instance
3. Or specify a custom --endpoint with the exact WebSocket URL

Note: Make sure no firewall is blocking the debugging ports and that you're not running the browser in incognito/private mode.`;

  throw new Error(errorMessage);
}

/**
 * Launches a new browser instance as a last resort
 * @param {string} browserPref - Browser preference
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Promise<Browser>} Launched browser instance
 */
export async function launchBrowser(browserPref = 'detect', verbose = false) {
  if (verbose) {
    console.error(`🚀 Launching new ${browserPref} browser instance as fallback...`);
    console.error('⚠️  Note: This will create a separate browser instance without your existing session data');
  }

  try {
    const launchOptions = {
      headless: false,
      devtools: false, // Don't auto-open devtools
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };

    const browser = browserPref === 'firefox'
      ? await firefox.launch(launchOptions)
      : await chromium.launch(launchOptions);

    if (verbose) {
      console.error('✅ Successfully launched new browser instance');
      console.error('💡 To connect to your existing browser instead, restart it with debugging enabled');
    }

    return browser;
  } catch (error) {
    throw new Error(`Failed to launch ${browserPref} browser: ${error.message}`);
  }
}
