# Any Browser MCP - Quick Start Guide

## 🚀 Installation

```bash
# Clone or download the project
cd any-browser-mcp
npm install
```

## 🌐 Browser Setup

### Chrome/Chromium
```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows  
chrome.exe --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

### Microsoft Edge
```bash
# Windows
msedge.exe --remote-debugging-port=9223

# macOS
/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --remote-debugging-port=9223
```

### Firefox
1. Open `about:config`
2. Set `devtools.debugger.remote-enabled` = `true`
3. Set `devtools.debugger.remote-port` = `9224`
4. Restart Firefox

## 🔧 Usage

### Test the Server
```bash
# Test MCP structure
node test/simple-test.js

# Test with auto-detection
node bin/cli.js --verbose

# Test with specific browser
node bin/cli.js --browser chrome --verbose

# Test with fallback launch
node bin/cli.js --launch --verbose
```

### Claude Desktop Configuration

1. Open your Claude Desktop config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the MCP server configuration:

```json
{
  "mcpServers": {
    "any-browser": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/any-browser-mcp/bin/cli.js",
        "--launch"
      ]
    }
  }
}
```

3. Replace `/ABSOLUTE/PATH/TO/any-browser-mcp` with your actual project path

4. Restart Claude Desktop

## 🛠️ Available Tools

Once connected, you'll have access to these browser automation tools:

### Navigation
- `browser_navigate` - Go to URLs
- `browser_back` / `browser_forward` - History navigation  
- `browser_reload` - Refresh page
- `browser_new_tab` - Open new tabs
- `browser_switch_tab` - Switch between tabs

### Interaction
- `browser_click` - Click elements
- `browser_type` - Type text
- `browser_fill` - Fill form inputs
- `browser_press_key` - Press keyboard keys
- `browser_hover` - Hover over elements
- `browser_select_option` - Select from dropdowns

### Information
- `browser_screenshot` - Take screenshots
- `browser_get_content` - Get page HTML/text
- `browser_find_elements` - Find elements by selector
- `browser_get_text` - Extract text from elements
- `browser_get_page_info` - Get page metadata

### Utilities
- `browser_wait_for` - Wait for elements/conditions
- `browser_evaluate` - Run JavaScript
- `browser_scroll` - Scroll page or elements

## 🌍 Netlify Deployment

1. Set environment variables in Netlify dashboard:
   ```
   CDP_ENDPOINT=ws://your-browser-host:9222/devtools/browser
   ALLOW_BROWSER_LAUNCH=true
   ```

2. Deploy:
   ```bash
   netlify deploy --prod
   ```

3. Configure Claude Desktop for remote:
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

## 🔍 Troubleshooting

### Browser Not Found
- Ensure browser is running with debugging enabled
- Check correct port numbers (Chrome: 9222, Edge: 9223, Firefox: 9224)
- Try explicit endpoint: `--endpoint ws://127.0.0.1:9222/devtools/browser`

### MCP Connection Issues
- Verify absolute paths in Claude Desktop config
- Check Claude Desktop logs: `~/Library/Logs/Claude/mcp*.log`
- Restart Claude Desktop after config changes

### Permission Issues
- Ensure the CLI script is executable: `chmod +x bin/cli.js`
- Check Node.js version: `node --version` (requires 18+)

## 💡 Example Usage

```bash
# Start Chrome with debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# In another terminal, start the MCP server
node bin/cli.js --verbose

# Now use Claude Desktop to automate the browser!
```

Ask Claude to:
- "Take a screenshot of the current page"
- "Navigate to google.com and search for 'MCP servers'"
- "Find all links on this page"
- "Click the first search result"
- "Fill out this form with test data"

## 📚 More Examples

See the `examples/` directory for:
- Complete Claude Desktop configurations
- Sample automation scripts
- Netlify deployment examples
- Advanced usage patterns
