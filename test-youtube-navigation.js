#!/usr/bin/env node

/**
 * Test navigating to YouTube using the Direct CDP approach
 * This simulates what the MCP tools should do
 */

import { DirectCDPClient } from './src/utils/cdp-direct.js';
import http from 'http';

async function getPages() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:9222/json', { timeout: 5000 }, (res) => {
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
  });
}

async function testYouTubeNavigation() {
  try {
    console.log('🧪 Testing YouTube Navigation...');
    
    // 1. List current tabs
    console.log('\n📋 1. Listing current browser tabs...');
    const pages = await getPages();
    console.log(`Found ${pages.length} tabs:`);
    pages.forEach((page, i) => {
      console.log(`   ${i + 1}. ${page.title} - ${page.url}`);
    });
    
    if (pages.length === 0) {
      console.log('❌ No tabs found!');
      return;
    }
    
    // 2. Connect to first tab
    console.log('\n🔗 2. Connecting to first tab...');
    const firstPage = pages[0];
    console.log(`Connecting to: ${firstPage.title}`);
    
    const client = new DirectCDPClient();
    await client.connect(firstPage.webSocketDebuggerUrl);
    console.log('✅ Connected via WebSocket!');
    
    // 3. Navigate to YouTube
    console.log('\n🎥 3. Navigating to YouTube...');
    await client.navigate('https://www.youtube.com');
    console.log('✅ Navigation command sent!');
    
    // Wait for page to load
    console.log('⏳ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Get page info to confirm navigation
    console.log('\n📄 4. Confirming navigation...');
    const pageInfo = await client.getPageInfo();
    console.log(`URL: ${pageInfo.url}`);
    console.log(`Title: ${pageInfo.title}`);
    
    // 5. Take a screenshot
    console.log('\n📸 5. Taking screenshot...');
    const screenshot = await client.screenshot();
    console.log(`Screenshot taken: ${screenshot.length} characters of base64 data`);
    
    // 6. Look for YouTube elements
    console.log('\n🔍 6. Looking for YouTube search box...');
    try {
      const searchResult = await client.sendCommand('Runtime.evaluate', {
        expression: `
          const searchBox = document.querySelector('input[name="search_query"]') || 
                           document.querySelector('#search') ||
                           document.querySelector('[placeholder*="Search"]');
          searchBox ? 'Search box found!' : 'Search box not found';
        `
      });
      console.log(`Search box status: ${searchResult.result.value}`);
    } catch (error) {
      console.log(`Search box check failed: ${error.message}`);
    }
    
    client.close();
    
    console.log('\n🎉 YouTube navigation test completed successfully!');
    console.log('💡 Your Chrome browser should now be showing YouTube!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testYouTubeNavigation();
