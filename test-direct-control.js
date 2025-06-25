#!/usr/bin/env node

/**
 * Test script to directly control existing Chrome browser tabs
 * This bypasses Playwright and uses Chrome DevTools Protocol directly
 */

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

async function createNewTab(url = 'about:blank') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ url });
    const options = {
      hostname: 'localhost',
      port: 9222,
      path: '/json/new',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const tabInfo = JSON.parse(data);
            resolve(tabInfo);
          } catch (parseError) {
            reject(parseError);
          }
        });
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function activateTab(tabId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9222,
      path: `/json/activate/${tabId}`,
      method: 'POST'
    };
    
    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('🔍 Testing direct Chrome control...');
    
    // Get existing pages
    console.log('\n📄 Getting existing pages...');
    const pages = await getPages();
    console.log(`Found ${pages.length} pages:`);
    pages.forEach((page, i) => {
      console.log(`  ${i + 1}. ${page.title} - ${page.url}`);
    });
    
    // Create a new tab
    console.log('\n🆕 Creating new tab...');
    const newTab = await createNewTab('https://www.google.com');
    console.log(`Created tab: ${newTab.title} - ${newTab.url}`);
    console.log(`Tab ID: ${newTab.id}`);
    
    // Activate the new tab
    console.log('\n🎯 Activating new tab...');
    const activated = await activateTab(newTab.id);
    console.log(`Tab activated: ${activated}`);
    
    // Get pages again to see the new tab
    console.log('\n📄 Getting updated pages...');
    const updatedPages = await getPages();
    console.log(`Now have ${updatedPages.length} pages:`);
    updatedPages.forEach((page, i) => {
      console.log(`  ${i + 1}. ${page.title} - ${page.url}`);
    });
    
    console.log('\n✅ Direct control test completed!');
    console.log('💡 This shows we can directly control the existing Chrome browser!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
