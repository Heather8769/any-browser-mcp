#!/usr/bin/env node

/**
 * Test the Direct CDP MCP server by simulating MCP tool calls
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

async function testDirectControl() {
  try {
    console.log('🧪 Testing Direct CDP Control...');
    
    // 1. List tabs
    console.log('\n📋 1. Listing browser tabs...');
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
    
    // 3. Get page info
    console.log('\n📄 3. Getting page info...');
    const pageInfo = await client.getPageInfo();
    console.log(`URL: ${pageInfo.url}`);
    console.log(`Title: ${pageInfo.title}`);
    
    // 4. Take screenshot
    console.log('\n📸 4. Taking screenshot...');
    const screenshot = await client.screenshot();
    console.log(`Screenshot taken: ${screenshot.length} characters of base64 data`);
    
    // 5. Navigate to Google
    console.log('\n🧭 5. Navigating to Google...');
    await client.navigate('https://www.google.com');
    console.log('✅ Navigation command sent!');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. Get updated page info
    console.log('\n📄 6. Getting updated page info...');
    const updatedPageInfo = await client.getPageInfo();
    console.log(`New URL: ${updatedPageInfo.url}`);
    console.log(`New Title: ${updatedPageInfo.title}`);
    
    client.close();
    
    console.log('\n🎉 Direct CDP control test completed successfully!');
    console.log('💡 This proves we can directly control your existing browser tabs!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirectControl();
