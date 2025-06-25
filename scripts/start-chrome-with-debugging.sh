#!/bin/bash

# Start Chrome with debugging enabled while preserving your profile
# This script helps users connect Any Browser MCP to their existing Chrome profile

echo "🌐 Any Browser MCP - Chrome Setup Helper"
echo "========================================"
echo ""

# Detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    PLATFORM="macOS"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
    PLATFORM="Windows"
else
    # Linux
    CHROME_PATH="google-chrome"
    PLATFORM="Linux"
fi

echo "Platform detected: $PLATFORM"
echo "Chrome path: $CHROME_PATH"
echo ""

# Check if Chrome is already running
if pgrep -f "chrome.*remote-debugging-port" > /dev/null; then
    echo "✅ Chrome is already running with debugging enabled!"
    echo ""
    echo "You can now run: npx any-browser-mcp@latest"
    exit 0
fi

# Check if Chrome is running without debugging
if pgrep -f "chrome" > /dev/null; then
    echo "⚠️  Chrome is running but WITHOUT debugging enabled."
    echo ""
    echo "To use Any Browser MCP with your existing profile:"
    echo "1. Close Chrome completely (⌘+Q on macOS, Alt+F4 on Windows)"
    echo "2. Run this script again"
    echo ""
    read -p "Would you like me to try closing Chrome now? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ "$PLATFORM" == "macOS" ]]; then
            osascript -e 'quit app "Google Chrome"'
        elif [[ "$PLATFORM" == "Windows" ]]; then
            taskkill /F /IM chrome.exe
        else
            pkill chrome
        fi
        echo "Chrome closed. Please run this script again."
    fi
    exit 1
fi

echo "🚀 Starting Chrome with debugging enabled..."
echo ""
echo "This will:"
echo "✅ Use your existing Chrome profile (bookmarks, passwords, extensions)"
echo "✅ Enable debugging on port 9222 for MCP connection"
echo "✅ Keep all your login sessions and data"
echo ""

# Start Chrome with debugging
if [[ "$PLATFORM" == "macOS" ]]; then
    "$CHROME_PATH" --remote-debugging-port=9222 > /dev/null 2>&1 &
elif [[ "$PLATFORM" == "Windows" ]]; then
    start "" "$CHROME_PATH" --remote-debugging-port=9222
else
    "$CHROME_PATH" --remote-debugging-port=9222 > /dev/null 2>&1 &
fi

# Wait a moment for Chrome to start
sleep 3

# Test if debugging port is accessible
echo "🔍 Testing debugging connection..."
if curl -s http://localhost:9222/json/version > /dev/null; then
    echo "✅ Chrome is running with debugging enabled!"
    echo ""
    echo "🎉 Setup complete! You can now run:"
    echo "   npx any-browser-mcp@latest"
    echo ""
    echo "💡 Your Chrome browser now has debugging enabled and Any Browser MCP"
    echo "   can connect to it while preserving all your existing data."
else
    echo "❌ Could not connect to Chrome debugging port."
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure Chrome started successfully"
    echo "2. Check if port 9222 is blocked by firewall"
    echo "3. Try running Chrome manually:"
    echo "   $CHROME_PATH --remote-debugging-port=9222"
fi
