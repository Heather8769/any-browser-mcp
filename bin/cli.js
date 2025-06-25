#!/usr/bin/env node

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { startMCPServer } from '../src/server.js';

// CLI flags → server options
yargs(hideBin(process.argv))
  .command('*', 'Run Any‑Browser MCP Server', y =>
    y.option('endpoint', {
      alias: 'e', 
      type: 'string', 
      desc: 'Existing CDP ws://… endpoint (e.g., ws://127.0.0.1:9222/devtools/browser)'
    })
     .option('browser', {
       alias: 'b', 
       choices: ['detect', 'chrome', 'edge', 'firefox'], 
       default: 'detect',
       desc: 'Force a browser brand or auto‑detect (default)'
     })
     .option('launch', {
       boolean: true, 
       default: false,
       desc: 'If no running browser is found, launch a headful instance'
     })
     .option('port', {
       alias: 'p',
       type: 'number',
       desc: 'Custom port for browser debugging (overrides defaults)'
     })
     .option('verbose', {
       alias: 'v',
       boolean: true,
       default: false,
       desc: 'Enable verbose logging'
     })
  , async argv => {
      try {
        await startMCPServer({
          endpoint: argv.endpoint,
          browserPref: argv.browser,
          allowLaunch: argv.launch,
          customPort: argv.port,
          verbose: argv.verbose
        });
      } catch (error) {
        console.error('Failed to start MCP server:', error.message);
        if (argv.verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    })
  .help()
  .example('$0', 'Auto-detect and connect to running browser')
  .example('$0 --launch', 'Launch browser if none found')
  .example('$0 --endpoint ws://127.0.0.1:9222/devtools/browser', 'Connect to specific endpoint')
  .example('$0 --browser firefox --port 9224', 'Connect to Firefox on custom port')
  .argv;
