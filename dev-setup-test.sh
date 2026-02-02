#!/bin/bash

# Alkebulanimages 2.0 - Development Environment Test Script
# This script verifies that your local development environment is set up correctly

echo "🧪 Testing Alkebulanimages 2.0 Local Development Setup"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
}

# Test 1: Check Node.js version
echo -e "\n📋 Checking prerequisites..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        pass "Node.js version $NODE_VERSION (>= 18 required)"
    else
        fail "Node.js version $NODE_VERSION is too old (>= 18 required)"
    fi
else
    fail "Node.js not found - please install Node.js 18+"
fi

# Test 2: Check pnpm availability
if command -v pnpm >/dev/null 2>&1; then
    pass "pnpm is available ($(pnpm -v))"
else
    fail "pnpm not found - install with: npm install -g pnpm"
fi

# Test 3: Check directory structure
echo -e "\n📁 Checking project structure..."
if [ -d "alkebu-load" ]; then
    pass "Backend directory (alkebu-load) exists"
else
    fail "Backend directory (alkebu-load) not found"
fi

if [ -d "alkebu-web" ]; then
    pass "Frontend directory (alkebu-web) exists"
else
    fail "Frontend directory (alkebu-web) not found"
fi

# Test 4: Check backend configuration
echo -e "\n🔧 Checking backend configuration..."
if [ -f "alkebu-load/.env" ]; then
    pass "Backend .env file exists"
    
    # Check for required variables
    if grep -q "PAYLOAD_SECRET=" alkebu-load/.env; then
        SECRET=$(grep "PAYLOAD_SECRET=" alkebu-load/.env | cut -d'=' -f2)
        if [ ${#SECRET} -ge 32 ]; then
            pass "PAYLOAD_SECRET is set and long enough (${#SECRET} chars)"
        else
            fail "PAYLOAD_SECRET is too short (${#SECRET} chars, need 32+)"
        fi
    else
        fail "PAYLOAD_SECRET not found in .env"
    fi
    
    if grep -q "DATABASE_URI=file:./alkebulanimages.db" alkebu-load/.env; then
        pass "DATABASE_URI configured for SQLite"
    else
        warn "DATABASE_URI may not be configured for local development"
    fi
else
    fail "Backend .env file not found - run: cp alkebu-load/.env.example alkebu-load/.env"
fi

# Test 5: Check frontend configuration  
echo -e "\n🌐 Checking frontend configuration..."
if [ -f "alkebu-web/.env.local" ]; then
    pass "Frontend .env.local file exists"
    
    if grep -q "PAYLOAD_API_URL=http://localhost:3000" alkebu-web/.env.local; then
        pass "PAYLOAD_API_URL configured for local backend"
    else
        fail "PAYLOAD_API_URL not configured for local development"
    fi
    
    if grep -q "PUBLIC_SITE_URL=http://localhost:5173" alkebu-web/.env.local; then
        pass "PUBLIC_SITE_URL configured for local development"
    else
        fail "PUBLIC_SITE_URL not configured correctly"
    fi
else
    fail "Frontend .env.local not found - run: cp alkebu-web/.env.example alkebu-web/.env.local"
fi

# Test 6: Check node_modules
echo -e "\n📦 Checking dependencies..."
if [ -d "alkebu-load/node_modules" ]; then
    pass "Backend dependencies installed"
else
    fail "Backend dependencies not installed - run: cd alkebu-load && pnpm install"
fi

if [ -d "alkebu-web/node_modules" ]; then
    pass "Frontend dependencies installed"
else
    fail "Frontend dependencies not installed - run: cd alkebu-web && npm install"
fi

# Test 7: Test ports availability
echo -e "\n🚪 Checking port availability..."
if ! lsof -i :3000 >/dev/null 2>&1; then
    pass "Port 3000 is available for backend"
else
    warn "Port 3000 is in use - backend may already be running"
fi

if ! lsof -i :5173 >/dev/null 2>&1; then
    pass "Port 5173 is available for frontend"
else
    warn "Port 5173 is in use - frontend may already be running"
fi

# Summary
echo -e "\n📊 Test Summary"
echo "==============="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All tests passed!${NC} Your development environment is ready."
    echo -e "\nNext steps:"
    echo -e "1. Start backend: ${YELLOW}cd alkebu-load && pnpm dev${NC}"
    echo -e "2. Create admin user: ${YELLOW}http://localhost:3000/admin${NC}"
    echo -e "3. Start frontend: ${YELLOW}cd alkebu-web && npm run dev${NC}"
    echo -e "4. Visit: ${YELLOW}http://localhost:5173${NC}"
else
    echo -e "\n❌ ${RED}$FAILED test(s) failed.${NC} Please fix the issues above before proceeding."
    echo -e "\nFor help, see the troubleshooting section in docs/development-guide.md"
fi

echo -e "\n✨ Happy coding!"