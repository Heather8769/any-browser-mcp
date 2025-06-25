# Any Browser MCP - Windows Installation Script
# PowerShell script for Windows users

Write-Host "🚀 Any Browser MCP - Windows Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check PowerShell version
$PSVersion = $PSVersionTable.PSVersion
Write-Host "🔍 PowerShell Version: $PSVersion" -ForegroundColor Green
Write-Host ""

# Check Node.js
Write-Host "🔍 Checking Node.js..." -ForegroundColor Yellow
try {
    $NodeVersion = node --version
    Write-Host "✅ Node.js found: $NodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first:" -ForegroundColor Red
    Write-Host "   https://nodejs.org/" -ForegroundColor White
    exit 1
}
Write-Host ""

# Check npm
Write-Host "🔍 Checking npm..." -ForegroundColor Yellow
try {
    $NpmVersion = npm --version
    Write-Host "✅ npm found: $NpmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check Chrome
Write-Host "🔍 Checking Google Chrome..." -ForegroundColor Yellow
$ChromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
)

$ChromeFound = $false
foreach ($Path in $ChromePaths) {
    if (Test-Path $Path) {
        Write-Host "✅ Google Chrome found: $Path" -ForegroundColor Green
        $ChromeFound = $true
        break
    }
}

if (-not $ChromeFound) {
    Write-Host "⚠️  Google Chrome not found at expected locations" -ForegroundColor Yellow
    Write-Host "   Please install Google Chrome from: https://www.google.com/chrome/" -ForegroundColor White
    Write-Host ""
    $Continue = Read-Host "Continue anyway? (y/N)"
    if ($Continue -ne "y" -and $Continue -ne "Y") {
        exit 1
    }
}
Write-Host ""

# Install Any Browser MCP
Write-Host "📦 Installing Any Browser MCP..." -ForegroundColor Yellow
Write-Host "Running: npm install -g any-browser-mcp" -ForegroundColor White
Write-Host ""

try {
    npm install -g any-browser-mcp
    Write-Host ""
    Write-Host "✅ Installation successful!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Installation failed. You can still use with npx:" -ForegroundColor Yellow
    Write-Host "   npx any-browser-mcp-direct --verbose" -ForegroundColor White
    Write-Host ""
}

# Test installation
Write-Host ""
Write-Host "🧪 Testing installation..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Testing direct CDP server..." -ForegroundColor White
try {
    $TestResult = npx any-browser-mcp-direct --help 2>$null
    Write-Host "✅ Direct CDP server working" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Direct CDP server test failed (this might be normal)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Installation Complete!" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Quick Start:" -ForegroundColor Cyan
Write-Host "   npx any-browser-mcp-direct --verbose" -ForegroundColor White
Write-Host ""
Write-Host "📚 This will:" -ForegroundColor Cyan
Write-Host "   ✅ Auto-launch Chrome with debugging" -ForegroundColor Green
Write-Host "   ✅ Preserve your profile (bookmarks, passwords)" -ForegroundColor Green
Write-Host "   ✅ Start MCP server for AI assistant integration" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Configure your AI assistant (Claude, VS Code, etc.)" -ForegroundColor White
Write-Host "   2. Add MCP server configuration" -ForegroundColor White
Write-Host "   3. Start automating your browser!" -ForegroundColor White
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Cyan
Write-Host "   • User Guide: https://github.com/Heather8769/any-browser-mcp/blob/main/USER_GUIDE.md" -ForegroundColor White
Write-Host "   • GitHub: https://github.com/Heather8769/any-browser-mcp" -ForegroundColor White
Write-Host ""
Write-Host "💡 Example AI command:" -ForegroundColor Cyan
Write-Host '   "Use browser_navigate to go to https://www.google.com"' -ForegroundColor White
Write-Host ""
Write-Host "Happy automating! 🎯" -ForegroundColor Green

# Pause to let user read
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
