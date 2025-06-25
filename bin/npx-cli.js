#!/usr/bin/env node

/**
 * Simple npx entry point for @anybrowser/mcp
 * This provides a clean interface when run via npx
 */

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { startMCPServer } from '../src/server.js';

// Show banner for npx usage
console.log('🌐 Any Browser MCP Server');
console.log('Connecting to your existing browser session...\n');

// Simplified CLI for npx usage - most users will want auto-detection
yargs(hideBin(process.argv))
  .command('*', 'Start Any Browser MCP Server', y =>
    y.option('endpoint', {
      alias: 'e', 
      type: 'string', 
      desc: 'Explicit CDP endpoint (ws://127.0.0.1:9222/devtools/browser)'
    })
     .option('browser', {
       alias: 'b', 
       choices: ['detect', 'chrome', 'edge', 'firefox'], 
       default: 'detect',
       desc: 'Browser preference (default: auto-detect)'
     })
     .option('launch', {
       boolean: true, 
       default: true,  // Default to true for npx usage
       desc: 'Launch browser if none found (default: true)'
     })
     .option('port', {
       alias: 'p',
       type: 'number',
       desc: 'Custom debugging port'
     })
     .option('verbose', {
       alias: 'v',
       boolean: true,
       default: false,
       desc: 'Verbose logging'
     })
  , async argv => {
      try {
        if (argv.verbose) {
          console.log('🔧 Configuration:', {
            endpoint: argv.endpoint || 'auto-detect',
            browser: argv.browser,
            launch: argv.launch,
            port: argv.port || 'default'
          });
        }

        await startMCPServer({
          endpoint: argv.endpoint,
          browserPref: argv.browser,
          allowLaunch: argv.launch,
          customPort: argv.port,
          verbose: argv.verbose
        });
      } catch (error) {
        console.error('❌ Failed to start MCP server:', error.message);
        if (argv.verbose) {
          console.error(error.stack);
        }
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Ensure a browser is running with debugging enabled');
        console.log('   2. Try: --launch to start a new browser instance');
        console.log('   3. Use --verbose for detailed logs');
        process.exit(1);
      }
    })
  .help()
  .example('npx any-browser-mcp@latest', 'Auto-detect browser and start MCP server')
  .example('npx any-browser-mcp@latest --browser chrome', 'Connect specifically to Chrome')
  .example('npx any-browser-mcp@latest --endpoint ws://127.0.0.1:9222/devtools/browser', 'Use explicit endpoint')
  .epilogue('For more information, visit: https://github.com/Heather8769/any-browser-mcp')
  .argv;
