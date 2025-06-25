#!/bin/bash

# Setup Chrome with debugging enabled while preserving user data
# This script creates a debugging-enabled Chrome profile with your existing data

echo "🌐 Any Browser MCP - Chrome Debugging Setup"
echo "==========================================="
echo ""

# Paths
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
MAIN_PROFILE="$HOME/Library/Application Support/Google/Chrome"
DEBUG_PROFILE="$HOME/Library/Application Support/Google/Chrome-Debug"
MAIN_DEFAULT="$MAIN_PROFILE/Default"
DEBUG_DEFAULT="$DEBUG_PROFILE/Default"

echo "📍 Paths:"
echo "   Main Profile: $MAIN_PROFILE"
echo "   Debug Profile: $DEBUG_PROFILE"
echo ""

# Check if main Chrome profile exists
if [ ! -d "$MAIN_DEFAULT" ]; then
    echo "❌ Main Chrome profile not found at: $MAIN_DEFAULT"
    echo "   Please run Chrome normally first to create your profile."
    exit 1
fi

echo "✅ Found main Chrome profile"

# Close any running Chrome instances
echo "🔄 Closing existing Chrome instances..."
osascript -e 'quit app "Google Chrome"' 2>/dev/null || true
sleep 2

# Create debug profile directory
echo "📁 Creating debug profile directory..."
mkdir -p "$DEBUG_PROFILE"
mkdir -p "$DEBUG_DEFAULT"

# Copy essential data from main profile to debug profile
echo "📋 Copying your Chrome data to debug profile..."

# Copy bookmarks
if [ -f "$MAIN_DEFAULT/Bookmarks" ]; then
    cp "$MAIN_DEFAULT/Bookmarks" "$DEBUG_DEFAULT/"
    echo "   ✅ Bookmarks copied"
fi

if [ -f "$MAIN_DEFAULT/Bookmarks.bak" ]; then
    cp "$MAIN_DEFAULT/Bookmarks.bak" "$DEBUG_DEFAULT/"
    echo "   ✅ Bookmarks backup copied"
fi

# Copy preferences (settings)
if [ -f "$MAIN_DEFAULT/Preferences" ]; then
    cp "$MAIN_DEFAULT/Preferences" "$DEBUG_DEFAULT/"
    echo "   ✅ Preferences copied"
fi

# Copy login data (saved passwords) - be careful with this
if [ -f "$MAIN_DEFAULT/Login Data" ]; then
    cp "$MAIN_DEFAULT/Login Data" "$DEBUG_DEFAULT/"
    echo "   ✅ Login data copied"
fi

# Copy history
if [ -f "$MAIN_DEFAULT/History" ]; then
    cp "$MAIN_DEFAULT/History" "$DEBUG_DEFAULT/"
    echo "   ✅ History copied"
fi

# Copy cookies
if [ -f "$MAIN_DEFAULT/Cookies" ]; then
    cp "$MAIN_DEFAULT/Cookies" "$DEBUG_DEFAULT/"
    echo "   ✅ Cookies copied"
fi

# Copy extensions and extension data
if [ -d "$MAIN_DEFAULT/Extensions" ]; then
    cp -r "$MAIN_DEFAULT/Extensions" "$DEBUG_DEFAULT/"
    echo "   ✅ Extensions copied"
fi

# Copy extension state and settings
if [ -f "$MAIN_DEFAULT/Extension State" ]; then
    cp "$MAIN_DEFAULT/Extension State" "$DEBUG_DEFAULT/"
    echo "   ✅ Extension State copied"
fi

if [ -f "$MAIN_DEFAULT/Extension Rules" ]; then
    cp "$MAIN_DEFAULT/Extension Rules" "$DEBUG_DEFAULT/"
    echo "   ✅ Extension Rules copied"
fi

if [ -f "$MAIN_DEFAULT/Extension Cookies" ]; then
    cp "$MAIN_DEFAULT/Extension Cookies" "$DEBUG_DEFAULT/"
    echo "   ✅ Extension Cookies copied"
fi

# Copy Local Extension Settings
if [ -d "$MAIN_DEFAULT/Local Extension Settings" ]; then
    cp -r "$MAIN_DEFAULT/Local Extension Settings" "$DEBUG_DEFAULT/"
    echo "   ✅ Local Extension Settings copied"
fi

# Copy Sync Extension Settings
if [ -d "$MAIN_DEFAULT/Sync Extension Settings" ]; then
    cp -r "$MAIN_DEFAULT/Sync Extension Settings" "$DEBUG_DEFAULT/"
    echo "   ✅ Sync Extension Settings copied"
fi

# Copy Extension Scripts
if [ -d "$MAIN_DEFAULT/Extension Scripts" ]; then
    cp -r "$MAIN_DEFAULT/Extension Scripts" "$DEBUG_DEFAULT/"
    echo "   ✅ Extension Scripts copied"
fi

# Copy Web Data (autofill, etc.)
if [ -f "$MAIN_DEFAULT/Web Data" ]; then
    cp "$MAIN_DEFAULT/Web Data" "$DEBUG_DEFAULT/"
    echo "   ✅ Web Data copied"
fi

# Copy Secure Preferences (extension permissions, etc.)
if [ -f "$MAIN_DEFAULT/Secure Preferences" ]; then
    cp "$MAIN_DEFAULT/Secure Preferences" "$DEBUG_DEFAULT/"
    echo "   ✅ Secure Preferences copied"
fi

# Copy Platform Notifications
if [ -f "$MAIN_DEFAULT/Platform Notifications" ]; then
    cp "$MAIN_DEFAULT/Platform Notifications" "$DEBUG_DEFAULT/"
    echo "   ✅ Platform Notifications copied"
fi

# Copy any additional extension-related files
for ext_file in "Extension Cookies-journal" "Extension State-journal" "Local Storage" "Session Storage"; do
    if [ -e "$MAIN_DEFAULT/$ext_file" ]; then
        cp -r "$MAIN_DEFAULT/$ext_file" "$DEBUG_DEFAULT/"
        echo "   ✅ $ext_file copied"
    fi
done

echo ""
echo "🚀 Starting Chrome with debugging enabled..."
echo "   Profile: $DEBUG_PROFILE"
echo "   Debug Port: 9222"
echo ""

# Start Chrome with debugging enabled using the debug profile
"$CHROME_PATH" \
    --remote-debugging-port=9222 \
    --user-data-dir="$DEBUG_PROFILE" \
    --no-first-run \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding &

CHROME_PID=$!
echo "Chrome started with PID: $CHROME_PID"

# Wait for Chrome to start
echo "⏳ Waiting for Chrome to initialize..."
sleep 5

# Test if debugging port is accessible
echo "🔍 Testing debugging connection..."
if curl -s http://localhost:9222/json/version > /dev/null; then
    echo "✅ Chrome debugging is working!"
    echo ""
    echo "🎉 Setup complete! Your Chrome browser now has:"
    echo "   ✅ All your bookmarks and settings"
    echo "   ✅ Debugging enabled on port 9222"
    echo "   ✅ Ready for Any Browser MCP connection"
    echo ""
    echo "🚀 You can now run:"
    echo "   npx any-browser-mcp@latest --verbose"
    echo ""
    echo "💡 This Chrome instance will preserve your data while allowing"
    echo "   the MCP server to connect and automate your browsing."
    echo ""
    
    # Get Chrome version info
    CHROME_INFO=$(curl -s http://localhost:9222/json/version)
    echo "📊 Chrome Debug Info:"
    echo "$CHROME_INFO" | python3 -m json.tool 2>/dev/null || echo "$CHROME_INFO"
    
else
    echo "❌ Chrome debugging connection failed"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if Chrome started successfully"
    echo "2. Verify port 9222 is not blocked"
    echo "3. Try running the command manually:"
    echo "   $CHROME_PATH --remote-debugging-port=9222 --user-data-dir=\"$DEBUG_PROFILE\""
    
    # Kill Chrome if it's not working
    kill $CHROME_PID 2>/dev/null || true
    exit 1
fi
