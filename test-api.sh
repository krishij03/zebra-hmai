#!/bin/bash

echo "🔍 Testing Zebra API startup..."
echo ""

# Check Redis
echo "1️⃣ Checking Redis..."
redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Redis is running"
else
    echo "   ❌ Redis is NOT running. Run: brew services start redis"
    exit 1
fi

# Check MySQL
echo "2️⃣ Checking MySQL..."
mysql --version > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ MySQL is installed"
else
    echo "   ⚠️  MySQL not found in PATH"
fi

# Check Zconfig
echo "3️⃣ Checking Zconfig.json..."
if [ -f "src/config/Zconfig.json" ]; then
    echo "   ✅ Zconfig.json exists"
else
    echo "   ❌ Zconfig.json NOT found"
    exit 1
fi

# Check .env
echo "4️⃣ Checking API .env..."
if [ -f "packages/api/.env" ]; then
    echo "   ✅ .env exists"
else
    echo "   ❌ .env NOT found"
    exit 1
fi

# Check memory directories
echo "5️⃣ Checking memory directories..."
if [ -d "config/hmaiMemory" ]; then
    echo "   ✅ hmaiMemory directory exists"
else
    echo "   ⚠️  Creating hmaiMemory directory..."
    mkdir -p config/hmaiMemory
fi

# Test API startup
echo ""
echo "6️⃣ Starting API test (will stop after 10 seconds)..."
echo ""

cd packages/api
timeout 10s pnpm start:dev &
PID=$!

sleep 8

# Check if API is responding
curl -s http://localhost:3090/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ API is responding!"
    kill $PID 2>/dev/null
    exit 0
else
    echo ""
    echo "❌ API is NOT responding"
    kill $PID 2>/dev/null
    exit 1
fi

