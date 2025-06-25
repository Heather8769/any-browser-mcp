#!/usr/bin/env node

/**
 * Direct CDP CLI for Any Browser MCP
 * This version directly controls existing browser tabs via Chrome DevTools Protocol
 * No Playwright context isolation - controls the actual visible browser windows
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { startDirectMCPServer } from '../src/server-direct.js';

async function main() {
  const argv = yargs(hideBin(process.argv))
    .scriptName('any-browser-mcp-direct')
    .usage('$0 [options]')
    .help('h')
    .alias('h', 'help')
    .version()
    .option('verbose', {
      alias: 'v',
      boolean: true,
      default: false,
      desc: 'Enable verbose logging'
    })
    .option('port', {
      alias: 'p',
      type: 'number',
      default: 9222,
      desc: 'Chrome debugging port (default: 9222)'
    })
    .example('$0', 'Start MCP server with default settings')
    .example('$0 --verbose', 'Start with verbose logging')
    .example('$0 --port 9223', 'Use custom debugging port')
    .epilogue(`
🌐 Any Browser MCP - Direct CDP Edition

This version directly controls your existing browser tabs via Chrome DevTools Protocol.
No isolated contexts - it controls the actual visible browser windows you can see!

Prerequisites:
1. Start Chrome with debugging enabled:
   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222

2. Or use the setup script:
   ./scripts/setup-chrome-debugging.sh

Features:
✅ Controls existing browser tabs (the ones you can see)
✅ List, switch, and navigate tabs
✅ Click, type, fill forms
✅ Take screenshots
✅ Find elements, get text/attributes
✅ Wait for elements, scroll
✅ And 15+ more browser automation tools

This is the real deal - it controls your actual browser, not a separate instance!
    `)
    .argv;

  try {
    if (argv.verbose) {
      console.error('🌐 Any Browser MCP - Direct CDP Edition');
      console.error('==========================================');
      console.error('');
      console.error('🎯 This version directly controls your existing browser tabs!');
      console.error('💡 No isolated contexts - controls the actual visible browser windows');
      console.error('');
    }

    await startDirectMCPServer({
      verbose: argv.verbose,
      port: argv.port
    });

  } catch (error) {
    console.error('❌ Failed to start MCP server:', error.message);
    
    if (error.message.includes('Cannot connect to Chrome')) {
      console.error('');
      console.error('💡 Make sure Chrome is running with debugging enabled:');
      console.error('');
      console.error('   macOS:');
      console.error('   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222');
      console.error('');
      console.error('   Or use the setup script:');
      console.error('   ./scripts/setup-chrome-debugging.sh');
      console.error('');
    }
    
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
