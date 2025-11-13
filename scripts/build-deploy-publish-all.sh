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
  "policy-btc-outputs"
  "policy-evm-recipients"
  "ability-btc-psbt-signer"
  "ability-evm-send"
  "ability-across-bridge"
  "ability-molten-swap"
  "ability-coredao-bridge"
  "ability-btc-bridge"
  "ability-unpermit-app"
  "ability-aave"
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

# Convert semantic version to comparable integer
version_to_number() {
  local version=$1
  IFS='.' read -ra PARTS <<< "$version"
  local major="${PARTS[0]}"
  local minor="${PARTS[1]}"
  local patch="${PARTS[2]}"
  printf "%03d%03d%03d" "$major" "$minor" "$patch"
}

# Compare two semantic versions
compare_versions() {
  local v1_num
  local v2_num
  v1_num=$(version_to_number "$1")
  v2_num=$(version_to_number "$2")
  if (( v1_num > v2_num )); then
    echo 1
  elif (( v1_num < v2_num )); then
    echo -1
  else
    echo 0
  fi
}

# Determine a global version that is unpublished for all packages
determine_target_version() {
  local highest_version=""
  
  for package in "${PACKAGES[@]}"; do
    local current_version
    current_version=$(get_current_version "$package")
    if [ -z "$highest_version" ] || [ "$(compare_versions "$current_version" "$highest_version")" -gt 0 ]; then
      highest_version="$current_version"
    fi
  done
  
  local target_version="$highest_version"
  local conflict=true
  
  while [ "$conflict" = true ]; do
    conflict=false
    for package in "${PACKAGES[@]}"; do
      local package_name
      package_name=$(get_package_name "$package")
      if version_exists_on_npm "$package_name" "$target_version"; then
        conflict=true
        target_version=$(bump_version "$target_version")
        break
      fi
    done
  done
  
  echo "$target_version"
}

# Align all packages to the same target version
align_package_versions() {
  local target_version=$1
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   Setting package versions                         ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}Target version for this run: $target_version${NC}"
  
  for package in "${PACKAGES[@]}"; do
    local current_version
    current_version=$(get_current_version "$package")
    if [ "$current_version" != "$target_version" ]; then
      echo -e "${BLUE}Updating $package from $current_version to $target_version...${NC}"
      update_package_version "$package" "$target_version"
      echo -e "${GREEN}  ✅ Version updated${NC}"
    else
      echo -e "${GREEN}$package already at target version $target_version${NC}"
    fi
  done
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

# Function to deploy to IPFS and capture CID and status
deploy_package() {
  local package=$1
  echo -e "${BLUE}Deploying $package to IPFS...${NC}" >&2
  
  # Capture the output
  local output=$(pnpm nx action:deploy "$package" 2>&1)
  echo "$output" >&2
  
  # Check if there's an error about invalid request format or other real errors
  if echo "$output" | grep -qi "error" && ! echo "$output" | grep -qi "already.*pinned\|already.*exists"; then
    # Check for specific non-acceptable errors
    if echo "$output" | grep -qi "invalid request format\|HTTP error.*status: [45]"; then
      echo -e "${RED}❌ IPFS deployment failed for $package${NC}" >&2
      echo "DEPLOY_FAILED|ERROR"
      return 1
    fi
  fi
  
  # Extract IPFS CID from output - check multiple patterns
  # First check for successful deployment
  local cid=$(echo "$output" | grep -oP 'Deployed lit-action.js to IPFS: \KQm[a-zA-Z0-9]{44}' || echo "")
  
  # Also check for "already pinned" message which includes the CID
  # Message format: "ℹ️  IPFS CID already pinned on Pinata: QmVmwBwNm64LcE1Wtav5TSxnENQrNLSCaoGVopwTJAajNz. Skipping upload."
  if [ -z "$cid" ]; then
    cid=$(echo "$output" | grep -oP 'IPFS CID already pinned on Pinata: \KQm[a-zA-Z0-9]{44}' || echo "")
    if [ -n "$cid" ]; then
      echo -e "${YELLOW}⚠️  IPFS CID already exists: $cid (this is OK)${NC}" >&2
      echo "$cid|ALREADY_EXISTS"
      return 0
    fi
  fi
  
  if [ -z "$cid" ]; then
    echo -e "${RED}❌ Failed to extract IPFS CID${NC}" >&2
    echo "DEPLOY_FAILED|ERROR"
    return 1
  else
    echo -e "${GREEN}✅ Successfully deployed to IPFS: $cid${NC}" >&2
    echo "$cid|SUCCESS"
    return 0
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

# Determine and align versions before building
target_version=$(determine_target_version)
align_package_versions "$target_version"

declare -a BUILT_PACKAGES
BUILD_FAILED=false

for package in "${PACKAGES[@]}"; do
  echo ""
  echo -e "${BLUE}Building $package...${NC}"

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

# Step 2: Deploy all packages to IPFS
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PHASE 2: Deploying all packages to IPFS          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

declare -A DEPLOYED_PACKAGES
declare -A PACKAGE_CIDS
IPFS_DEPLOY_FAILED=false

for package in "${BUILT_PACKAGES[@]}"; do
  echo ""
  echo -e "${BLUE}======================================${NC}"
  echo -e "${BLUE}Deploying: $package${NC}"
  echo -e "${BLUE}======================================${NC}"
  
  # Deploy and capture output
  # Function outputs messages to stderr (>&2) and result line to stdout
  temp_file=$(mktemp)
  deploy_package "$package" > "$temp_file" 2>&1 || true
  
  # Extract the result line (format: CID|STATUS)
  deploy_result=$(grep -E '\|(SUCCESS|ALREADY_EXISTS|ERROR)$' "$temp_file" | tail -1)
  
  # Display all output except the result line
  grep -vE '\|(SUCCESS|ALREADY_EXISTS|ERROR)$' "$temp_file" || true
  
  # Clean up temp file
  rm -f "$temp_file"
  
  # Parse result
  cid=$(echo "$deploy_result" | cut -d'|' -f1)
  deploy_status=$(echo "$deploy_result" | cut -d'|' -f2)
  
  if [ "$deploy_status" = "SUCCESS" ] || [ "$deploy_status" = "ALREADY_EXISTS" ]; then
    DEPLOYED_PACKAGES+=(["$package"]="true")
    PACKAGE_CIDS+=(["$package"]="$cid")
    echo -e "${GREEN}✅ IPFS deployment successful for $package${NC}"
    echo -e "  CID: $cid"
    echo -e "  Status: $deploy_status"
  else
    echo -e "${RED}❌ IPFS deployment failed for $package${NC}"
    echo "$package:" >> "$RESULTS_FILE"
    echo "  Status: IPFS_DEPLOY_FAILED" >> "$RESULTS_FILE"
    echo "  IPFS CID: $cid" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    IPFS_DEPLOY_FAILED=true
  fi
  echo ""
done

# Check if any IPFS deployments failed
if [ "$IPFS_DEPLOY_FAILED" = true ]; then
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ Some packages failed to deploy to IPFS          ║${NC}"
  echo -e "${RED}║  Aborting npm publishing                          ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  # Show summary and exit
  cat "$RESULTS_FILE"
  exit 1
fi

# Step 3: Publish all successfully deployed packages to npm
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  All packages deployed to IPFS successfully      ║${NC}"
echo -e "${GREEN}║  Proceeding to publish to npm...                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

for package in "${BUILT_PACKAGES[@]}"; do
  echo ""
  echo -e "${GREEN}======================================${NC}"
  echo -e "${GREEN}Publishing: $package${NC}"
  echo -e "${GREEN}======================================${NC}"
  
  cid="${PACKAGE_CIDS[$package]}"
  
  # Get full npm package name (including organization)
  package_name=$(get_package_name "$package")
  
  # Publish and capture version and status
  version_status=$(publish_package "$package")
  version=$(echo "$version_status" | cut -d'|' -f1)
  status=$(echo "$version_status" | cut -d'|' -f2)
  
  # Record results
  echo "$package:" >> "$RESULTS_FILE"
  echo "  IPFS CID: $cid" >> "$RESULTS_FILE"
  echo "  npm package: $package_name" >> "$RESULTS_FILE"
  echo "  npm version: $version" >> "$RESULTS_FILE"
  echo "  npm status: $status" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"
  
  echo -e "${GREEN}✅ Completed $package${NC}"
  echo -e "  IPFS CID: $cid"
  echo -e "  npm package: $package_name"
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
  elif [[ $line =~ "npm package:" ]]; then
    npm_package=$(echo "$line" | sed 's/.*npm package: //')
    echo -e "   ${YELLOW}📦 npm package: $npm_package${NC}"
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
  elif [[ $line =~ "Status: IPFS_DEPLOY_FAILED" ]]; then
    echo -e "   ${RED}❌ IPFS deployment failed${NC}"
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
declare -A packages_npm_name
declare -a failed_packages
declare -a successful_packages

package_name=""
cid=""
npm_package=""
version=""
status=""

while IFS= read -r line; do
  if [[ $line =~ ^[a-z-]+:$ ]]; then
    package_name=$(echo "$line" | sed 's/://')
  elif [[ $line =~ "IPFS CID:" ]]; then
    # Extract CID from the line, handling various formats
    cid=$(echo "$line" | sed 's/.*IPFS CID: //' | tr -d '\012\015')
  elif [[ $line =~ "npm package:" ]]; then
    npm_package=$(echo "$line" | sed 's/.*npm package: //' | tr -d '\012\015')
  elif [[ $line =~ "npm version:" ]]; then
    version=$(echo "$line" | sed 's/.*npm version: //' | tr -d '\012\015')
  elif [[ $line =~ "npm status:" ]]; then
    status=$(echo "$line" | sed 's/.*npm status: //' | tr -d '\012\015')
    
    # Process the data if we have a package name
    if [[ -n "$package_name" ]]; then
      # Use the CID that was already extracted from "IPFS CID:" line
      actual_cid="$cid"
      
      # Check if CID is valid (starts with Qm and has valid length) or if it's a failure indicator
      if [[ -z "$actual_cid" ]] || [[ "$actual_cid" == "DEPLOY_FAILED" ]] || [[ ! "$actual_cid" =~ ^Qm[a-zA-Z0-9]{44}$ ]]; then
        actual_cid="DEPLOY_FAILED"
        failed_packages+=("$package_name")
      else
        successful_packages+=("$package_name")
      fi
      
      packages_cid["$package_name"]="$actual_cid"
      packages_npm_name["$package_name"]="$npm_package"
      packages_version["$package_name"]="$version"
      packages_status["$package_name"]="$status"
      
      # Reset for next package
      package_name=""
      cid=""
      npm_package=""
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
    echo "   - npm package: \`${packages_npm_name[$package]}\`" >> "$RESULTS_FILE"
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
    if [[ -n "${packages_npm_name[$package]}" ]]; then
      echo "   - npm package: \`${packages_npm_name[$package]}\`" >> "$RESULTS_FILE"
    fi
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
    echo -e "   ${YELLOW}npm package:${NC} ${packages_npm_name[$package]}"
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
    if [[ -n "${packages_npm_name[$package]}" ]]; then
      echo -e "   ${YELLOW}npm package:${NC} ${packages_npm_name[$package]}"
    fi
    echo -e "   ${YELLOW}npm version:${NC} ${packages_version[$package]} (${packages_status[$package]})"
    echo -e "   ${RED}Status:${NC} DEPLOY_FAILED"
    echo ""
    ((count++))
  done
fi
echo ""
