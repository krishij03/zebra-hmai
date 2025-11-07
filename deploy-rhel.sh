#!/bin/bash
# Quick Deployment Script for RHEL after fixes

set -e

echo "========================================"
echo "Zebra HMAI - RHEL Deployment"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
  echo -e "${YELLOW}Warning: Not running as root. Some commands may require sudo.${NC}"
  echo ""
fi

# Step 1: Clean old builds
echo -e "${YELLOW}Step 1:${NC} Cleaning old builds..."
rm -rf packages/shared/dist
rm -rf packages/api/dist
echo -e "${GREEN}✓${NC} Clean complete"
echo ""

# Step 2: Rebuild shared package with fixed validation
echo -e "${YELLOW}Step 2:${NC} Rebuilding shared package with lenient validation..."
pnpm --filter @zebra/shared build
echo -e "${GREEN}✓${NC} Shared package rebuilt"
echo ""

# Step 3: Verify Zconfig.json exists
echo -e "${YELLOW}Step 3:${NC} Checking Zconfig.json..."
if [ -f "config/Zconfig.json" ]; then
    echo -e "${GREEN}✓${NC} Zconfig.json found at: config/Zconfig.json"
    echo ""
    echo "LPARs configured:"
    cat config/Zconfig.json | grep -A1 '"dds"' | grep -o '"[^"]*"' | grep -v "dds" | head -5
else
    echo -e "${RED}✗${NC} Zconfig.json not found!"
    echo ""
    echo "Please create config/Zconfig.json with your mainframe credentials."
    echo "See RHEL-FIXES.md for example configuration."
    exit 1
fi
echo ""

# Step 4: Check if ports are available
echo -e "${YELLOW}Step 4:${NC} Checking ports..."
if lsof -Pi :3090 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}  Port 3090 is in use (API)"
    echo "   Kill existing process? [y/N]"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        pkill -f "nest start" || true
        echo -e "${GREEN}✓${NC} Killed existing API process"
    fi
else
    echo -e "${GREEN}✓${NC} Port 3090 available (API)"
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}  Port 3001 is in use (Web)"
    echo "   Kill existing process? [y/N]"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        pkill -f "next dev" || true
        echo -e "${GREEN}✓${NC} Killed existing Web process"
    fi
else
    echo -e "${GREEN}✓${NC} Port 3001 available (Web)"
fi
echo ""

# Step 5: Configure firewall (if firewalld is running)
if systemctl is-active --quiet firewalld; then
    echo -e "${YELLOW}Step 5:${NC} Configuring firewall..."
    
    if ! firewall-cmd --list-ports | grep -q "3090/tcp"; then
        echo "   Adding port 3090 (API)..."
        firewall-cmd --add-port=3090/tcp --permanent >/dev/null 2>&1 || \
            echo -e "${YELLOW}⚠${NC}  Could not add port 3090 (may need sudo)"
    fi
    
    if ! firewall-cmd --list-ports | grep -q "3001/tcp"; then
        echo "   Adding port 3001 (Web)..."
        firewall-cmd --add-port=3001/tcp --permanent >/dev/null 2>&1 || \
            echo -e "${YELLOW}⚠${NC}  Could not add port 3001 (may need sudo)"
    fi
    
    firewall-cmd --reload >/dev/null 2>&1 || \
        echo -e "${YELLOW}⚠${NC}  Could not reload firewall (may need sudo)"
    
    echo -e "${GREEN}✓${NC} Firewall configured"
else
    echo -e "${YELLOW}Step 5:${NC} Firewall not running (skipped)"
fi
echo ""

# Step 6: Display configuration summary
echo "========================================"
echo "Configuration Summary"
echo "========================================"
echo ""
echo "API URL:      http://$(hostname):3090/api/v2"
echo "Web URL:      http://$(hostname):3001"
echo "Docs:         http://$(hostname):3090/api/docs"
echo ""
echo "Zconfig:      config/Zconfig.json"
echo "Memory Files: config/hmaiMemory/"
echo "Auth:         DISABLED (for testing)"
echo ""

# Step 7: Ask to start
echo -e "${YELLOW}Ready to start Zebra HMAI?${NC} [Y/n]"
read -r response
if [[ ! "$response" =~ ^[Nn]$ ]]; then
    echo ""
    echo "========================================"
    echo "Starting Application..."
    echo "========================================"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""
    sleep 2
    
    # Start with environment variables
    DISABLE_AUTH=true pnpm start
else
    echo ""
    echo "To start manually, run:"
    echo "  DISABLE_AUTH=true pnpm start"
    echo ""
    echo "See RHEL-FIXES.md for more information."
fi

