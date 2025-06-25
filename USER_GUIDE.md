# Any Browser MCP - User Guide 🚀

**Revolutionary Browser Automation for Everyone**

## 🎯 **What is Any Browser MCP?**

Any Browser MCP is a breakthrough browser automation tool that **controls your actual browser** - the one you can see and interact with. Unlike traditional automation tools that create separate, isolated browser instances, this directly controls your existing Chrome browser with all your bookmarks, passwords, and extensions.

## ⚡ **Quick Start (30 seconds)**

### **Step 1: Install & Run**
```bash
npx any-browser-mcp-direct --verbose
```

That's it! The MCP server will:
- ✅ Auto-detect if Chrome is running
- ✅ Launch Chrome with debugging if needed
- ✅ Preserve your profile (bookmarks, passwords, extensions)
- ✅ Start the MCP server ready for automation

### **Step 2: Connect Your AI Assistant**

Add this to your AI assistant's MCP configuration:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["any-browser-mcp-direct", "--verbose"]
    }
  }
}
```

**VS Code Continue.dev** (`config.json`):
```json
{
  "mcpServers": [
    {
      "name": "browser",
      "command": "npx", 
      "args": ["any-browser-mcp-direct", "--verbose"]
    }
  ]
}
```

### **Step 3: Test It!**

Ask your AI assistant:
> "Use browser_navigate to go to https://www.google.com, then take a screenshot"

You'll see your actual Chrome browser navigate to Google!

## 🌟 **Key Features**

### **🔗 Direct Browser Control**
- Controls your actual visible Chrome browser
- No separate, isolated browser instances
- See automation happen in real-time

### **📋 Profile Preservation**
- Uses your existing bookmarks
- Keeps your saved passwords
- Preserves your extensions
- Maintains login sessions

### **🚀 Auto-Launch**
- Automatically starts Chrome if not running
- Sets up debugging automatically
- No manual browser configuration needed

### **🛠️ 20+ Automation Tools**
- Navigate to websites
- Click buttons and links
- Fill forms and input fields
- Take screenshots
- Find and interact with elements
- Scroll pages
- Switch between tabs
- And much more!

## 🎮 **Available Commands**

### **Navigation & Tabs**
- `browser_list_tabs` - List all open browser tabs
- `browser_switch_tab` - Switch to specific tab
- `browser_navigate` - Navigate to URL
- `browser_back` - Go back in history
- `browser_forward` - Go forward in history
- `browser_reload` - Reload current page

### **Element Interaction**
- `browser_click` - Click elements by CSS selector
- `browser_type` - Type text into focused elements
- `browser_fill` - Fill input fields
- `browser_press_key` - Press keyboard keys
- `browser_hover` - Hover over elements

### **Content & Information**
- `browser_find_elements` - Find elements on page
- `browser_get_text` - Get text from elements
- `browser_get_attribute` - Get element attributes
- `browser_get_page_info` - Get page URL, title, etc.
- `browser_screenshot` - Take page screenshots

### **Utilities**
- `browser_wait_for` - Wait for elements to appear
- `browser_scroll` - Scroll page or elements
- `browser_launch_chrome` - Manually launch Chrome

## 🧪 **Example Use Cases**

### **Web Scraping**
```
1. Navigate to a website
2. Find product elements
3. Extract prices and descriptions
4. Take screenshots for verification
```

### **Form Automation**
```
1. Navigate to a form
2. Fill in multiple fields
3. Submit the form
4. Verify success page
```

### **Testing & QA**
```
1. Navigate through user flows
2. Take screenshots at each step
3. Verify elements exist
4. Test responsive design
```

### **Social Media Management**
```
1. Navigate to social platforms
2. Post content automatically
3. Monitor engagement
4. Take screenshots of posts
```

## 🔧 **Advanced Configuration**

### **Custom Chrome Port**
```bash
npx any-browser-mcp-direct --port 9223
```

### **Verbose Logging**
```bash
npx any-browser-mcp-direct --verbose
```

### **Manual Chrome Setup**
If you prefer to start Chrome manually:
```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows  
chrome.exe --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222

# Then start MCP server
npx any-browser-mcp-direct
```

## 🚨 **Troubleshooting**

### **Chrome Won't Start**
- Make sure Chrome is installed
- Check if another Chrome instance is running
- Try a different port: `--port 9223`

### **MCP Server Won't Connect**
- Verify Chrome debugging is enabled
- Check port 9222 is not blocked by firewall
- Try restarting both Chrome and MCP server

### **AI Assistant Can't See Tools**
- Restart your AI assistant after adding MCP config
- Check MCP configuration file syntax
- Verify file paths are correct

## 🎉 **Why This is Revolutionary**

Traditional browser automation tools create **separate browser instances** that don't have access to your data. Any Browser MCP **directly controls your existing browser**, making automation feel natural and integrated.

**Before:** Automation ↔ Separate Browser (no bookmarks, passwords, extensions)
**After:** Automation ↔ Your Real Browser (all your data available)

This breakthrough eliminates the disconnect between automation and your actual browsing experience!

## 🤝 **Support & Community**

- **GitHub:** https://github.com/Heather8769/any-browser-mcp
- **Issues:** Report bugs and request features
- **Discussions:** Share use cases and get help

## 📄 **License**

MIT License - Free to use for personal and commercial projects!

---

**Ready to revolutionize your browser automation? Start with:**
```bash
npx any-browser-mcp-direct --verbose
```
