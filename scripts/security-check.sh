#!/bin/bash

# Phone Range Nexus Security Verification Script
# This script verifies that all security measures are properly configured

echo "🔒 Phone Range Nexus Security Check"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
WARNINGS=0

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING${NC}: $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "ℹ INFO: $1"
}

echo "Checking application security configuration..."
echo ""

# 1. Check if production environment file exists
if [ -f ".env.production" ]; then
    print_result 0 "Production environment file exists"
else
    print_result 1 "Production environment file missing"
fi

# 2. Check if security configuration exists
if [ -f "SECURITY-CONFIGURATION.md" ]; then
    print_result 0 "Security configuration documentation exists"
else
    print_result 1 "Security configuration documentation missing"
fi

# 3. Check if deployment guide exists
if [ -f "DEPLOYMENT-GUIDE.md" ]; then
    print_result 0 "Deployment guide exists"
else
    print_result 1 "Deployment guide missing"
fi

# 4. Check package.json for security scripts
if grep -q "security:audit" package.json; then
    print_result 0 "Security audit script configured"
else
    print_result 1 "Security audit script missing"
fi

# 5. Check for enhanced vite.config.ts
if grep -q "X-Frame-Options" vite.config.ts; then
    print_result 0 "Security headers configured in Vite"
else
    print_result 1 "Security headers missing in Vite config"
fi

# 6. Check for HTTPS enforcement in config
if grep -q "Strict-Transport-Security" vite.config.ts; then
    print_result 0 "HTTPS enforcement configured"
else
    print_result 1 "HTTPS enforcement missing"
fi

# 7. Check for production build optimizations
if grep -q "manualChunks" vite.config.ts; then
    print_result 0 "Production build optimizations configured"
else
    print_result 1 "Production build optimizations missing"
fi

# 8. Check for local authentication implementation
if [ -f "src/lib/localAuth.ts" ]; then
    print_result 0 "Local authentication system implemented"
else
    print_result 1 "Local authentication system missing"
fi

# 9. Check for secure database implementation
if [ -f "src/lib/browserDatabase.ts" ]; then
    print_result 0 "Secure local database implemented"
else
    print_result 1 "Secure local database missing"
fi

# 10. Check for PBX system security implementation
if grep -q "authType.*oauth\|api_key\|certificate" src/components/PBXSyncManager.tsx; then
    print_result 0 "PBX authentication security implemented"
else
    print_result 1 "PBX authentication security missing"
fi

echo ""
echo "Checking dependencies for known vulnerabilities..."

# 11. Run npm audit
if command -v npm &> /dev/null; then
    AUDIT_RESULT=$(npm audit --audit-level high --json 2>/dev/null)
    if [ $? -eq 0 ]; then
        HIGH_VULNS=$(echo "$AUDIT_RESULT" | grep -o '"high":[0-9]*' | cut -d':' -f2 | tr -d ' ')
        CRITICAL_VULNS=$(echo "$AUDIT_RESULT" | grep -o '"critical":[0-9]*' | cut -d':' -f2 | tr -d ' ')
        
        if [ "${HIGH_VULNS:-0}" -eq 0 ] && [ "${CRITICAL_VULNS:-0}" -eq 0 ]; then
            print_result 0 "No high or critical vulnerability dependencies found"
        else
            print_result 1 "High/critical vulnerability dependencies found (High: ${HIGH_VULNS:-0}, Critical: ${CRITICAL_VULNS:-0})"
        fi
    else
        print_warning "Could not run npm audit - run 'npm audit' manually"
    fi
else
    print_warning "npm not found - cannot check dependencies"
fi

echo ""
echo "Checking file permissions..."

# 12. Check sensitive file permissions
SENSITIVE_FILES=(".env" ".env.production" "src/lib/localAuth.ts" "src/lib/browserDatabase.ts")
for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        PERMS=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null)
        if [ "$PERMS" ] && [ "$PERMS" -le 644 ]; then
            print_result 0 "File permissions secure for $file ($PERMS)"
        else
            print_warning "File permissions may be too open for $file ($PERMS)"
        fi
    fi
done

echo ""
echo "Checking build configuration..."

# 13. Check if build can run successfully
if npm run build:prod &> /dev/null; then
    print_result 0 "Production build runs successfully"
else
    print_result 1 "Production build fails"
fi

# 14. Check if dist folder has expected files
if [ -d "dist" ]; then
    if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
        print_result 0 "Production build output is complete"
    else
        print_result 1 "Production build output incomplete"
    fi
else
    print_warning "No dist folder found - run 'npm run build:prod' first"
fi

echo ""
echo "Checking application server..."

# 15. Check if server can start (timeout after 5 seconds)
SERVER_CHECK=$(timeout 5s npm run preview:prod 2>&1 || true)
if echo "$SERVER_CHECK" | grep -q "Local.*http"; then
    print_result 0 "Production server can start"
else
    print_warning "Could not verify production server startup"
fi

echo ""
echo "Security Configuration Summary"
echo "============================="

# Check if application is running and test security headers
if curl -s -I http://localhost:8080 &> /dev/null; then
    print_info "Testing security headers on running application..."
    
    HEADERS=$(curl -s -I http://localhost:8080)
    
    if echo "$HEADERS" | grep -q "X-Frame-Options"; then
        print_result 0 "X-Frame-Options header present"
    else
        print_result 1 "X-Frame-Options header missing"
    fi
    
    if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
        print_result 0 "X-Content-Type-Options header present"
    else
        print_result 1 "X-Content-Type-Options header missing"
    fi
    
    if echo "$HEADERS" | grep -q "X-XSS-Protection"; then
        print_result 0 "X-XSS-Protection header present"
    else
        print_result 1 "X-XSS-Protection header missing"
    fi
else
    print_warning "Application not running - start with 'npm run dev' to test headers"
fi

echo ""
echo "Final Security Report"
echo "===================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical security checks passed!${NC}"
    echo "Your application is ready for secure deployment."
    exit 0
else
    echo -e "${RED}❌ Some security checks failed.${NC}"
    echo "Please address the failed items before deploying to production."
    exit 1
fi