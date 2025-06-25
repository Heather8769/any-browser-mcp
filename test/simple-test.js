#!/usr/bin/env node

/**
 * Simple test to verify MCP server structure without browser connection
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

console.log('🧪 Testing MCP server structure...\n');

try {
  // Test 1: Can we create an MCP server?
  const server = new McpServer({
    name: 'any-browser-mcp-test',
    version: '1.0.0',
    description: 'Test MCP server'
  });
  
  console.log('✅ MCP server creation: SUCCESS');

  // Test 2: Can we register a simple tool?
  server.registerTool(
    'test_tool',
    {
      title: 'Test Tool',
      description: 'A simple test tool',
      inputSchema: {
        message: { type: 'string', description: 'Test message' }
      }
    },
    async ({ message }) => ({
      content: [{
        type: 'text',
        text: `Test response: ${message}`
      }]
    })
  );
  
  console.log('✅ Tool registration: SUCCESS');

  // Test 3: Can we register a resource?
  server.registerResource(
    'test-resource',
    'test://status',
    {
      title: 'Test Resource',
      description: 'A simple test resource'
    },
    async () => ({
      contents: [{
        uri: 'test://status',
        text: 'Test resource content'
      }]
    })
  );
  
  console.log('✅ Resource registration: SUCCESS');

  // Test 4: Check our imports work
  const { attachToRunningBrowser } = await import('../src/utils/attach.js');
  console.log('✅ Browser utilities import: SUCCESS');

  const { registerBrowserTools } = await import('../src/tools/browser-tools.js');
  console.log('✅ Browser tools import: SUCCESS');

  const { registerNavigationTools } = await import('../src/tools/navigation-tools.js');
  console.log('✅ Navigation tools import: SUCCESS');

  const { registerInteractionTools } = await import('../src/tools/interaction-tools.js');
  console.log('✅ Interaction tools import: SUCCESS');

  const { registerUtilityTools } = await import('../src/tools/utility-tools.js');
  console.log('✅ Utility tools import: SUCCESS');

  console.log('\n🎉 All tests passed! MCP server structure is working correctly.');
  console.log('\n📝 Next steps:');
  console.log('   1. Start a browser with debugging enabled:');
  console.log('      Chrome: --remote-debugging-port=9222');
  console.log('      Edge: --remote-debugging-port=9223');
  console.log('      Firefox: about:config → devtools.debugger.remote-enabled=true');
  console.log('   2. Run: node bin/cli.js');
  console.log('   3. Configure Claude Desktop to use this MCP server');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}
