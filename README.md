# Any Browser MCP

A production-grade MCP (Model Context Protocol) server that **attaches to an already-running desktop browser** (Chrome, Edge/Chromium, or Firefox) via the Chrome DevTools Protocol (CDP). It exposes a comprehensive Playwright-style API over JSON-RPC/stdio and can also run inside a Netlify Function for remote browser automation.

## 🚀 Features

- **Attach to Running Browsers**: Connect to existing Chrome, Edge, or Firefox sessions
- **Full Playwright API**: Complete browser automation capabilities
- **Multiple Transports**: stdio for local use, HTTP for remote deployment
- **Auto-Detection**: Automatically finds running browsers on standard debug ports
- **Fallback Launching**: Optionally launch new browser instances if none found
- **Netlify Functions**: Deploy as serverless function for remote browser control
- **Session Management**: Stateful sessions for complex automation workflows

## 📦 Installation

### Quick Start (Recommended)
```bash
# No installation needed! Use with npx:
npx @anybrowser/mcp@latest
```

### Global Installation
```bash
npm install -g @anybrowser/mcp
```

### Local Development
```bash
git clone <repository>
cd any-browser-mcp
npm install
```

## 🎯 Quick Start

### 1. Start Your Browser with Debugging

**Chrome/Chromium:**
```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows
chrome.exe --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

**Edge:**
```bash
# Windows
msedge.exe --remote-debugging-port=9223

# macOS
/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --remote-debugging-port=9223
```

**Firefox:**
```bash
# Enable in about:config
devtools.debugger.remote-enabled = true
devtools.debugger.remote-port = 9224
```

### 2. Run the MCP Server

**Auto-detect running browser:**
```bash
npx @anybrowser/mcp@latest
```

**Connect to specific endpoint:**
```bash
npx @anybrowser/mcp@latest --endpoint ws://127.0.0.1:9222/devtools/browser
```

**Connect to specific browser:**
```bash
npx @anybrowser/mcp@latest --browser chrome
```

### 3. Configure with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "anybrowser": {
      "command": "npx",
      "args": ["@anybrowser/mcp@latest"]
    }
  }
}
```

## 🛠️ Available Tools

### Browser Management
- `browser_screenshot` - Take screenshots of page or elements
- `browser_get_content` - Get HTML content or text
- `browser_wait_for` - Wait for elements or conditions
- `browser_evaluate` - Execute JavaScript in browser context

### Navigation
- `browser_navigate` - Navigate to URLs
- `browser_back` / `browser_forward` - Browser history navigation
- `browser_reload` - Reload current page
- `browser_new_tab` - Open new tabs
- `browser_list_tabs` - List all open tabs
- `browser_switch_tab` - Switch between tabs

### Interaction
- `browser_click` - Click elements
- `browser_type` - Type text with realistic timing
- `browser_fill` - Fill inputs quickly
- `browser_press_key` - Press keyboard keys
- `browser_hover` - Hover over elements
- `browser_select_option` - Select from dropdowns
- `browser_drag_and_drop` - Drag and drop elements

### Utilities
- `browser_find_elements` - Find and inspect elements
- `browser_get_attribute` - Get element attributes
- `browser_get_text` - Extract text content
- `browser_check_element` - Check element states
- `browser_get_page_info` - Get comprehensive page info
- `browser_scroll` - Scroll page or elements

## 🌐 Netlify Deployment

### 1. Environment Variables

Set in Netlify dashboard:
```bash
CDP_ENDPOINT=ws://your-browser-host:9222/devtools/browser
ALLOW_BROWSER_LAUNCH=true  # Optional: allow launching browsers
NODE_ENV=production
```

### 2. Deploy

```bash
netlify init
netlify deploy --prod
```

### 3. Configure Claude Desktop for Remote

```json
{
  "mcpServers": {
    "any-browser-remote": {
      "endpoint": "https://your-site.netlify.app/.netlify/functions/any-browser-mcp",
      "transportType": "http"
    }
  }
}
```

## 🔧 CLI Options

```bash
any-browser-mcp [options]

Options:
  -e, --endpoint <url>     Explicit CDP endpoint (ws://...)
  -b, --browser <type>     Browser preference (detect|chrome|edge|firefox)
  -p, --port <number>      Custom debugging port
  --launch                 Launch browser if none found
  -v, --verbose            Enable verbose logging
  --help                   Show help
```

## 📋 Examples

### Basic Page Automation
```javascript
// Navigate to a website
await browser_navigate({ url: "https://example.com" });

// Find and click a button
await browser_click({ selector: "button.submit" });

// Fill a form
await browser_fill({ selector: "#email", value: "user@example.com" });
await browser_fill({ selector: "#password", value: "password123" });

// Take a screenshot
await browser_screenshot({ fullPage: true, path: "result.png" });
```

### Advanced Interaction
```javascript
// Wait for dynamic content
await browser_wait_for({ 
  selector: ".loading", 
  state: "hidden", 
  timeout: 10000 
});

// Extract data from multiple elements
const elements = await browser_find_elements({ 
  selector: ".product-card",
  limit: 20,
  includeText: true,
  includeAttributes: true
});

// Execute custom JavaScript
const result = await browser_evaluate({ 
  script: "return document.querySelectorAll('.item').length" 
});
```

## 🔒 Security Considerations

- **Local Use**: Browser debugging ports are only accessible locally by default
- **Remote Deployment**: Ensure proper network security when exposing CDP endpoints
- **Session Management**: Sessions auto-expire after 30 minutes of inactivity
- **CORS**: Properly configured for cross-origin requests in Netlify deployment

## 🐛 Troubleshooting

### Browser Not Found
```bash
# Check if browser is running with debugging enabled
curl http://localhost:9222/json/version

# Try explicit endpoint
any-browser-mcp --endpoint ws://127.0.0.1:9222/devtools/browser

# Launch new instance
any-browser-mcp --launch --verbose
```

### Connection Issues
- Ensure no firewall blocking debugging ports
- Check browser isn't running in incognito/private mode
- Verify correct port numbers for your browser
- Use `--verbose` flag for detailed connection logs

### Netlify Function Issues
- Check environment variables are set correctly
- Verify CDP endpoint is accessible from Netlify
- Monitor function logs for detailed error information
- Ensure CORS headers are properly configured

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📚 Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
