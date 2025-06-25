# Demo: Browser Automation with Any Browser MCP

This document shows example interactions you can have with Claude Desktop once the Any Browser MCP server is running.

## 🎯 Basic Navigation

**You:** "Navigate to google.com and take a screenshot"

**Claude will:**
1. Use `browser_navigate` to go to https://google.com
2. Use `browser_screenshot` to capture the page
3. Show you the result

## 🔍 Web Scraping

**You:** "Go to news.ycombinator.com and get me the titles of the top 5 stories"

**Claude will:**
1. Navigate to Hacker News
2. Use `browser_find_elements` to locate story titles
3. Extract text from each title element
4. Present a clean list

## 📝 Form Automation

**You:** "Fill out the contact form on this page with test data"

**Claude will:**
1. Use `browser_find_elements` to locate form fields
2. Use `browser_fill` to populate each field
3. Optionally submit the form if requested

## 🖱️ Interactive Testing

**You:** "Test the search functionality on this website"

**Claude will:**
1. Find the search input field
2. Type a test query
3. Click the search button
4. Wait for results to load
5. Verify results appeared

## 📊 Data Extraction

**You:** "Extract all the product information from this e-commerce page"

**Claude will:**
1. Use `browser_find_elements` to locate product containers
2. Extract names, prices, descriptions, etc.
3. Format the data in a structured way
4. Optionally save to a file

## 🎮 Multi-tab Workflows

**You:** "Open the top 3 search results in new tabs and summarize each page"

**Claude will:**
1. Find the first 3 search result links
2. Use `browser_new_tab` for each link
3. Switch between tabs using `browser_switch_tab`
4. Extract content from each page
5. Provide summaries

## 🔄 Dynamic Content

**You:** "Wait for the page to finish loading and then click the 'Load More' button"

**Claude will:**
1. Use `browser_wait_for` to wait for loading indicators to disappear
2. Find the "Load More" button
3. Click it and wait for new content
4. Verify additional content loaded

## 🎨 Visual Testing

**You:** "Take screenshots before and after clicking this button to see what changes"

**Claude will:**
1. Take initial screenshot
2. Click the specified button
3. Wait for any animations/changes
4. Take second screenshot
5. Compare and describe differences

## 🚀 Advanced Automation

**You:** "Automate logging into this website and downloading my data"

**Claude will:**
1. Navigate to login page
2. Fill in credentials (you provide)
3. Handle any 2FA or captcha prompts
4. Navigate to data export section
5. Initiate download
6. Confirm completion

## 🔧 Debugging Workflows

**You:** "Help me debug why this JavaScript isn't working on the page"

**Claude will:**
1. Use `browser_evaluate` to run diagnostic JavaScript
2. Check console for errors
3. Inspect element states
4. Test different approaches
5. Provide debugging insights

## 📱 Responsive Testing

**You:** "Test how this page looks on mobile vs desktop"

**Claude will:**
1. Take screenshot at current resolution
2. Use `browser_evaluate` to change viewport size
3. Take screenshot at mobile size
4. Compare layouts and identify issues

## 🎯 Performance Monitoring

**You:** "Check the performance metrics of this page"

**Claude will:**
1. Use `browser_get_page_info` with performance data
2. Analyze load times, resource usage
3. Identify potential optimizations
4. Provide performance report

---

## 💡 Tips for Best Results

1. **Be Specific**: "Click the blue 'Submit' button in the contact form" vs "click submit"

2. **Provide Context**: "On the shopping cart page, update the quantity to 3" 

3. **Chain Actions**: "Navigate to the products page, filter by price under $50, then sort by rating"

4. **Error Handling**: Claude will automatically retry failed actions and suggest alternatives

5. **Screenshots**: Ask for screenshots to verify actions completed correctly

## 🔒 Security Notes

- Never share sensitive credentials in chat
- Use test accounts for automation demos
- Be mindful of rate limiting on websites
- Respect robots.txt and terms of service

## 🎪 Fun Examples

- "Play a game of tic-tac-toe on this web game"
- "Fill out this personality quiz and tell me the results"
- "Navigate through this online maze game"
- "Create a meme using this meme generator website"

The possibilities are endless! The Any Browser MCP server gives Claude the ability to interact with any website just like a human would.
