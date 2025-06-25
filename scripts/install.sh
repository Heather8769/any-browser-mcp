#!/bin/bash

# Any Browser MCP - Installation Script
# Supports macOS, Linux, and Windows (via WSL)

set -e

echo "🚀 Any Browser MCP - Installation Script"
echo "========================================"
echo ""

# Detect platform
PLATFORM=$(uname -s)
case $PLATFORM in
    Darwin)
        PLATFORM_NAME="macOS"
        CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        ;;
    Linux)
        PLATFORM_NAME="Linux"
        CHROME_PATH="google-chrome"
        ;;
    MINGW*|CYGWIN*|MSYS*)
        PLATFORM_NAME="Windows"
        CHROME_PATH="chrome.exe"
        ;;
    *)
        echo "❌ Unsupported platform: $PLATFORM"
        exit 1
        ;;
esac

echo "🖥️  Platform detected: $PLATFORM_NAME"
echo ""

# Check Node.js
echo "🔍 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js found: $NODE_VERSION"
echo ""

# Check npm
echo "🔍 Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm found: $NPM_VERSION"
echo ""

# Check Chrome
echo "🔍 Checking Google Chrome..."
if command -v "$CHROME_PATH" &> /dev/null || [ -f "$CHROME_PATH" ]; then
    echo "✅ Google Chrome found"
else
    echo "⚠️  Google Chrome not found at expected location"
    echo "   Expected: $CHROME_PATH"
    echo "   Please install Google Chrome or update the path"
    echo ""
    echo "   Download from: https://www.google.com/chrome/"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Install Any Browser MCP
echo "📦 Installing Any Browser MCP..."
echo "Running: npm install -g any-browser-mcp"
echo ""

if npm install -g any-browser-mcp; then
    echo ""
    echo "✅ Installation successful!"
else
    echo ""
    echo "❌ Installation failed. Trying with npx instead..."
    echo ""
    echo "You can still use Any Browser MCP with:"
    echo "   npx any-browser-mcp-direct --verbose"
    echo ""
fi

# Test installation
echo ""
echo "🧪 Testing installation..."
echo ""

echo "Testing direct CDP server..."
if timeout 10s npx any-browser-mcp-direct --help &> /dev/null; then
    echo "✅ Direct CDP server working"
else
    echo "⚠️  Direct CDP server test failed (this might be normal)"
fi

echo ""
echo "🎉 Installation Complete!"
echo "======================="
echo ""
echo "🚀 Quick Start:"
echo "   npx any-browser-mcp-direct --verbose"
echo ""
echo "📚 This will:"
echo "   ✅ Auto-launch Chrome with debugging"
echo "   ✅ Preserve your profile (bookmarks, passwords)"
echo "   ✅ Start MCP server for AI assistant integration"
echo ""
echo "🔧 Next Steps:"
echo "   1. Configure your AI assistant (Claude, VS Code, etc.)"
echo "   2. Add MCP server configuration"
echo "   3. Start automating your browser!"
echo ""
echo "📖 Documentation:"
echo "   • User Guide: https://github.com/Heather8769/any-browser-mcp/blob/main/USER_GUIDE.md"
echo "   • GitHub: https://github.com/Heather8769/any-browser-mcp"
echo ""
echo "💡 Example AI command:"
echo '   "Use browser_navigate to go to https://www.google.com"'
echo ""
echo "Happy automating! 🎯"
