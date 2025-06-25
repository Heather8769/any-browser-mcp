#!/usr/bin/env node

/**
 * Simple test script for Any Browser MCP
 * Tests basic functionality without requiring a full MCP client
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Test the MCP server by sending JSON-RPC requests
 */
async function testMCPServer() {
  console.log('🧪 Testing Any Browser MCP Server...\n');

  // Start the MCP server
  const serverProcess = spawn('node', [join(projectRoot, 'bin/cli.js'), '--launch', '--verbose'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  let responseCount = 0;
  const responses = [];

  // Handle server responses
  serverProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        responseCount++;
        
        console.log(`📨 Response ${responseCount}:`, JSON.stringify(response, null, 2));
        
        // Stop after getting a few responses
        if (responseCount >= 3) {
          serverProcess.kill();
        }
      } catch (error) {
        // Ignore non-JSON lines (like verbose logs)
      }
    }
  });

  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('📤 Sending test requests...\n');

  // Test 1: Get browser status
  const statusRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'resources/read',
    params: {
      uri: 'browser://status'
    }
  };

  serverProcess.stdin.write(JSON.stringify(statusRequest) + '\n');

  // Test 2: Navigate to a page
  const navigateRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'browser_navigate',
      arguments: {
        url: 'https://example.com'
      }
    }
  };

  setTimeout(() => {
    serverProcess.stdin.write(JSON.stringify(navigateRequest) + '\n');
  }, 1000);

  // Test 3: Take a screenshot
  const screenshotRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'browser_screenshot',
      arguments: {
        fullPage: false
      }
    }
  };

  setTimeout(() => {
    serverProcess.stdin.write(JSON.stringify(screenshotRequest) + '\n');
  }, 2000);

  // Handle server exit
  serverProcess.on('exit', (code) => {
    console.log(`\n🏁 Server exited with code ${code}`);
    
    if (responseCount > 0) {
      console.log('✅ Test completed successfully!');
      console.log(`📊 Received ${responseCount} responses`);
    } else {
      console.log('❌ No responses received - check server logs');
    }
    
    process.exit(code || 0);
  });

  // Handle errors
  serverProcess.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });

  // Timeout after 30 seconds
  setTimeout(() => {
    console.log('⏰ Test timeout - killing server');
    serverProcess.kill();
  }, 30000);
}

/**
 * Test browser connection without MCP
 */
async function testBrowserConnection() {
  console.log('🔍 Testing browser connection...\n');

  try {
    const { attachToRunningBrowser, launchBrowser } = await import('../src/utils/attach.js');
    
    let browser;
    try {
      browser = await attachToRunningBrowser({ 
        brand: 'detect', 
        verbose: true 
      });
      console.log('✅ Successfully attached to running browser');
    } catch (attachError) {
      console.log('⚠️  No running browser found, launching new instance...');
      browser = await launchBrowser('detect', true);
      console.log('✅ Successfully launched new browser');
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://example.com');
    const title = await page.title();
    
    console.log(`📄 Page title: ${title}`);
    
    await context.close();
    await browser.close();
    
    console.log('✅ Browser connection test passed!\n');
    
  } catch (error) {
    console.error('❌ Browser connection test failed:', error.message);
    process.exit(1);
  }
}

// Main test runner
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--browser-only')) {
    await testBrowserConnection();
  } else if (args.includes('--mcp-only')) {
    await testMCPServer();
  } else {
    // Run both tests
    await testBrowserConnection();
    await testMCPServer();
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
main().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
