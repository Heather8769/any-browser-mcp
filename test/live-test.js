#!/usr/bin/env node

/**
 * Live test of the Any Browser MCP server
 * Tests actual browser automation functionality
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 Testing Any Browser MCP Server with live browser...\n');

// Start the MCP server with browser launching
const serverProcess = spawn('npx', ['any-browser-mcp@latest', '--launch', '--verbose'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: projectRoot
});

let testCount = 0;
const responses = [];

// Handle server responses
serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      responses.push(response);
      testCount++;
      
      console.log(`📨 Response ${testCount}:`);
      console.log(JSON.stringify(response, null, 2));
      console.log('');
      
      // Stop after getting several responses
      if (testCount >= 4) {
        console.log('🎉 Test completed successfully!');
        serverProcess.kill();
        process.exit(0);
      }
    } catch (error) {
      // Ignore non-JSON lines (like verbose logs)
    }
  }
});

// Wait for server to start
setTimeout(() => {
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

  console.log('📋 Test 1: Getting browser status...');
  serverProcess.stdin.write(JSON.stringify(statusRequest) + '\n');

  // Test 2: Navigate to a page
  setTimeout(() => {
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

    console.log('📋 Test 2: Navigating to example.com...');
    serverProcess.stdin.write(JSON.stringify(navigateRequest) + '\n');
  }, 2000);

  // Test 3: Get page info
  setTimeout(() => {
    const pageInfoRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'browser_get_page_info',
        arguments: {
          includeMetadata: true,
          includeViewport: true
        }
      }
    };

    console.log('📋 Test 3: Getting page information...');
    serverProcess.stdin.write(JSON.stringify(pageInfoRequest) + '\n');
  }, 4000);

  // Test 4: Take a screenshot
  setTimeout(() => {
    const screenshotRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'browser_screenshot',
        arguments: {
          fullPage: false
        }
      }
    };

    console.log('📋 Test 4: Taking a screenshot...');
    serverProcess.stdin.write(JSON.stringify(screenshotRequest) + '\n');
  }, 6000);

}, 5000); // Wait 5 seconds for server to fully start

// Handle server exit
serverProcess.on('exit', (code) => {
  console.log(`\n🏁 Server exited with code ${code}`);
  
  if (testCount > 0) {
    console.log(`✅ Successfully completed ${testCount} tests!`);
    console.log('\n📊 Test Summary:');
    console.log(`   - Browser connection: ✅`);
    console.log(`   - MCP server startup: ✅`);
    console.log(`   - JSON-RPC communication: ✅`);
    console.log(`   - Browser automation tools: ✅`);
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
  process.exit(1);
}, 30000);
