#!/bin/bash

# Script to build, deploy, and publish all abilities and policies
# Records IPFS CIDs and npm versions
# Automatically bumps version if already published

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Packages to process
PACKAGES=(
  "ability-btc-psbt-signer"
  "ability-call-contract"
  "ability-native-send"
  "ability-app-metadata"
  "policy-btc-outputs"
  "policy-call-contract-whitelist"
  "policy-counter"
  "policy-app-metadata"
)

# File to store results
RESULTS_FILE="deployment-results-$(date +%Y%m%d-%H%M%S).txt"
echo "Deployment Results - $(date)" > "$RESULTS_FILE"
echo "======================================" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Function to get current version from package.json
get_current_version() {
  local package=$1
  local version=$(node -p "require('./packages/$package/package.json').version")
  echo "$version"
}

# Function to get package name from package.json
get_package_name() {
  local package=$1
  local name=$(node -p "require('./packages/$package/package.json').name")
  echo "$name"
}

# Function to check if version exists on npm
version_exists_on_npm() {
  local package_name=$1
  local version=$2
  
  # Try to get info about the specific version from npm
  if npm view "$package_name@$version" version &>/dev/null; then
    return 0  # Version exists
  else
    return 1  # Version doesn't exist
  fi
}

# Function to bump patch version
bump_version() {
  local version=$1
  # Split version into parts
  IFS='.' read -ra PARTS <<< "$version"
  local major="${PARTS[0]}"
  local minor="${PARTS[1]}"
  local patch="${PARTS[2]}"
  
  # Increment patch version
  patch=$((patch + 1))
  
  echo "$major.$minor.$patch"
}

# Function to update version in package.json
update_package_version() {
  local package=$1
  local new_version=$2
  
  cd "packages/$package"
  
  # Use npm version to update package.json
  npm version "$new_version" --no-git-tag-version --allow-same-version
  
  cd ../..
}

# Function to check and bump version if needed
ensure_publishable_version() {
  local package=$1
  
  echo -e "${BLUE}Checking version for $package...${NC}"
  
  local package_name=$(get_package_name "$package")
  local current_version=$(get_current_version "$package")
  
  echo "  Current version: $current_version"
  echo "  Package name: $package_name"
  
  # Check if this version already exists on npm
  if version_exists_on_npm "$package_name" "$current_version"; then
    echo -e "${YELLOW}  ⚠️  Version $current_version already exists on npm${NC}"
    
    # Bump the version
    local new_version=$(bump_version "$current_version")
    echo -e "${BLUE}  Bumping version to $new_version${NC}"
    
    update_package_version "$package" "$new_version"
    
    echo -e "${GREEN}  ✅ Version updated to $new_version${NC}"
    echo "$new_version"
  else
    echo -e "${GREEN}  ✅ Version $current_version is available for publishing${NC}"
    echo "$current_version"
  fi
}

# Function to build a package
build_package() {
  local package=$1
  echo -e "${BLUE}Building $package...${NC}"
  if ! pnpm nx build "$package"; then
    echo -e "${RED}❌ Build failed for $package${NC}"
    return 1
  fi
  return 0
}

# Function to deploy to IPFS and capture CID
deploy_package() {
  local package=$1
  echo -e "${BLUE}Deploying $package to IPFS...${NC}" >&2
  
  # Capture the output
  local output=$(pnpm nx action:deploy "$package" 2>&1)
  echo "$output" >&2
  
  # Extract IPFS CID from output
  local cid=$(echo "$output" | grep -oP 'Deployed lit-action.js to IPFS: \K\w+' || echo "")
  
  if [ -z "$cid" ]; then
    echo -e "${RED}❌ Failed to extract IPFS CID${NC}" >&2
    echo "DEPLOY_FAILED"
  else
    echo "$cid"
  fi
}

# Function to publish to npm and capture version
publish_package() {
  local package=$1
  echo -e "${BLUE}Publishing $package to npm...${NC}" >&2
  
  cd "packages/$package"
  
  # Capture the output (don't exit on error)
  local output=$(pnpm publish --no-git-checks 2>&1 || true)
  echo "$output" >&2
  
  # Get the version from package.json (most reliable)
  local version=$(node -p "require('./package.json').version")
  
  # Check if it was successful
  local status=""
  if echo "$output" | grep -q "^\+ @vaultlayer/"; then
    status="SUCCESS"
    echo -e "${GREEN}✅ Successfully published version $version${NC}" >&2
  elif echo "$output" | grep -q "You cannot publish over the previously published versions"; then
    status="ALREADY_PUBLISHED"
    echo -e "${YELLOW}⚠️  Version $version already published${NC}" >&2
  else
    status="ERROR"
    echo -e "${RED}❌ Publish failed${NC}" >&2
  fi
  
  cd ../..
  
  # Return version and status
  echo "$version|$status"
}

# Step 1: Build all packages first
echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PHASE 1: Building all packages    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

declare -a BUILT_PACKAGES
BUILD_FAILED=false

for package in "${PACKAGES[@]}"; do
  echo ""
  echo -e "${BLUE}Building $package...${NC}"
  
  # Check and bump version if needed
  final_version=$(ensure_publishable_version "$package")
  
  # Build
  if build_package "$package"; then
    BUILT_PACKAGES+=("$package")
    echo -e "${GREEN}✅ Built $package${NC}"
  else
    echo -e "${RED}❌ Build failed for $package${NC}"
    echo "$package:" >> "$RESULTS_FILE"
    echo "  Status: BUILD_FAILED" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    BUILD_FAILED=true
  fi
done

# Check if any builds failed
if [ "$BUILD_FAILED" = true ]; then
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ Some packages failed to build                  ║${NC}"
  echo -e "${RED}║  Aborting deployment and publishing                ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  # Show summary and exit
  cat "$RESULTS_FILE"
  exit 1
fi

# Step 2: Deploy and publish only successfully built packages
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  All packages built successfully                   ║${NC}"
echo -e "${GREEN}║  Proceeding to deploy and publish...              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

for package in "${BUILT_PACKAGES[@]}"; do
  echo ""
  echo -e "${GREEN}======================================${NC}"
  echo -e "${GREEN}Processing: $package${NC}"
  echo -e "${GREEN}======================================${NC}"
  
  # Deploy and capture CID
  cid=$(deploy_package "$package")
  
  # Publish and capture version and status
  version_status=$(publish_package "$package")
  version=$(echo "$version_status" | cut -d'|' -f1)
  status=$(echo "$version_status" | cut -d'|' -f2)
  
  # Record results
  echo "$package:" >> "$RESULTS_FILE"
  echo "  IPFS CID: $cid" >> "$RESULTS_FILE"
  echo "  npm version: $version" >> "$RESULTS_FILE"
  echo "  npm status: $status" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"
  
  echo -e "${GREEN}✅ Completed $package${NC}"
  echo -e "  IPFS CID: $cid"
  echo -e "  npm version: $version"
  echo -e "  npm status: $status"
  echo ""
done

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}All packages processed!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Results saved to: $RESULTS_FILE${NC}"
echo ""
echo -e "${BLUE}┌────────────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│${NC}                      ${GREEN}DEPLOYMENT SUMMARY${NC}                                   ${BLUE}│${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Read and display summary
while IFS= read -r line; do
  if [[ $line =~ ^[a-z-]+:$ ]]; then
    # Package name
    package_name=$(echo "$line" | sed 's/://')
    echo -e "${GREEN}📦 $package_name${NC}"
  elif [[ $line =~ "IPFS CID:" ]]; then
    cid=$(echo "$line" | sed 's/.*IPFS CID: //')
    if [[ $cid == "DEPLOY_FAILED" ]]; then
      echo -e "   ${RED}❌ IPFS: Deployment failed${NC}"
    else
      echo -e "   ${BLUE}🔗 IPFS: $cid${NC}"
    fi
  elif [[ $line =~ "npm version:" ]]; then
    version=$(echo "$line" | sed 's/.*npm version: //')
    if [[ -z $version ]]; then
      echo -e "   ${RED}❌ npm: No version found${NC}"
    else
      echo -e "   ${YELLOW}📌 npm: $version${NC}"
    fi
  elif [[ $line =~ "npm status:" ]]; then
    status=$(echo "$line" | sed 's/.*npm status: //')
    if [[ $status == "SUCCESS" ]]; then
      echo -e "   ${GREEN}✅ Status: Published successfully${NC}"
    elif [[ $status == "ALREADY_PUBLISHED" ]]; then
      echo -e "   ${YELLOW}⚠️  Status: Already published${NC}"
    elif [[ $status == "ERROR" ]]; then
      echo -e "   ${RED}❌ Status: Publish failed${NC}"
    fi
  elif [[ $line =~ "Status: BUILD_FAILED" ]]; then
    echo -e "   ${RED}❌ Build failed${NC}"
  fi
  
  # Add spacing between packages
  if [[ $line == "" ]]; then
    echo ""
  fi
done < "$RESULTS_FILE"

echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────${NC}"
echo ""

# Append summary table to results file
echo "" >> "$RESULTS_FILE"
echo "## Deployment Summary" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Parse results and collect data
declare -A packages_cid
declare -A packages_version
declare -A packages_status
declare -a failed_packages
declare -a successful_packages

package_name=""
cid=""
version=""
status=""

while IFS= read -r line; do
  if [[ $line =~ ^[a-z-]+:$ ]]; then
    package_name=$(echo "$line" | sed 's/://')
  elif [[ $line =~ "IPFS CID:" ]]; then
    # Extract CID from the line, handling various formats
    cid=$(echo "$line" | sed 's/.*IPFS CID: //' | tr -d '\012\015')
  elif [[ $line =~ "npm version:" ]]; then
    version=$(echo "$line" | sed 's/.*npm version: //' | tr -d '\012\015')
  elif [[ $line =~ "npm status:" ]]; then
    status=$(echo "$line" | sed 's/.*npm status: //' | tr -d '\012\015')
    
    # Process the data if we have a package name
    if [[ -n "$package_name" ]]; then
      # Extract actual CID using grep on the file content
      actual_cid=$(grep -A 200 "$package_name:" "$RESULTS_FILE" | grep -oP 'Deployed lit-action.js to IPFS: \KQm[a-zA-Z0-9]+' | head -1)
      
      if [[ -z "$actual_cid" ]]; then
        actual_cid="DEPLOY_FAILED"
        failed_packages+=("$package_name")
      else
        successful_packages+=("$package_name")
      fi
      
      packages_cid["$package_name"]="$actual_cid"
      packages_version["$package_name"]="$version"
      packages_status["$package_name"]="$status"
      
      # Reset for next package
      package_name=""
      cid=""
      version=""
      status=""
    fi
  fi
done < "$RESULTS_FILE"

# Write successful deployments
if [[ ${#successful_packages[@]} -gt 0 ]]; then
  echo "### ✅ **Successful Deployments**" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"
  
  count=1
  for package in "${successful_packages[@]}"; do
    echo "${count}. **${package}**" >> "$RESULTS_FILE"
    echo "   - IPFS CID: \`${packages_cid[$package]}\`" >> "$RESULTS_FILE"
    echo "   - npm version: \`${packages_version[$package]}\`" >> "$RESULTS_FILE"
    echo "   - Status: ${packages_status[$package]}" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    ((count++))
  done
fi

# Write failed deployments
if [[ ${#failed_packages[@]} -gt 0 ]]; then
  echo "### ❌ **Failed Deployments**" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"
  
  count=1
  for package in "${failed_packages[@]}"; do
    echo "${count}. **${package}**" >> "$RESULTS_FILE"
    echo "   - Issue: Failed to extract IPFS CID" >> "$RESULTS_FILE"
    echo "   - npm version: \`${packages_version[$package]}\` (${packages_status[$package]})" >> "$RESULTS_FILE"
    echo "   - Status: DEPLOY_FAILED" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    ((count++))
  done
fi

# Display the summary in console as well
echo ""
echo -e "${BLUE}┌────────────────────────────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│${NC}                                 ${GREEN}DEPLOYMENT SUMMARY${NC}                                                 ${BLUE}│${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Display successful deployments
if [[ ${#successful_packages[@]} -gt 0 ]]; then
  echo -e "${GREEN}### ✅ Successful Deployments${NC}"
  echo ""
  
  count=1
  for package in "${successful_packages[@]}"; do
    echo -e "${GREEN}${count}.${NC} ${package}"
    echo -e "   ${BLUE}IPFS CID:${NC} ${packages_cid[$package]}"
    echo -e "   ${YELLOW}npm version:${NC} ${packages_version[$package]}"
    echo -e "   ${GREEN}Status:${NC} ${packages_status[$package]}"
    echo ""
    ((count++))
  done
fi

# Display failed deployments
if [[ ${#failed_packages[@]} -gt 0 ]]; then
  echo -e "${RED}### ❌ Failed Deployments${NC}"
  echo ""
  
  count=1
  for package in "${failed_packages[@]}"; do
    echo -e "${RED}${count}.${NC} ${package}"
    echo -e "   ${RED}Issue:${NC} Failed to extract IPFS CID"
    echo -e "   ${YELLOW}npm version:${NC} ${packages_version[$package]} (${packages_status[$package]})"
    echo -e "   ${RED}Status:${NC} DEPLOY_FAILED"
    echo ""
    ((count++))
  done
fi
echo ""
