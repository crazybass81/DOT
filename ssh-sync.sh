#!/bin/bash

# Git Auto Sync Script for SSH Development
# Automatically commits and pushes changes at regular intervals

# Configuration
PROJECT_DIR="/home/ec2-user/DOT"
BRANCH="master"
SYNC_INTERVAL=5  # seconds
COMMIT_PREFIX="[Auto-sync]"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to project directory
cd "$PROJECT_DIR" || exit 1

# Function to check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}Error: Not a git repository${NC}"
        exit 1
    fi
}

# Function to setup branch
setup_branch() {
    current_branch=$(git branch --show-current)
    
    if [ "$current_branch" != "$BRANCH" ]; then
        echo -e "${YELLOW}Switching to branch: $BRANCH${NC}"
        git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"
    fi
    
    # Set upstream if not set
    if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} > /dev/null 2>&1; then
        echo -e "${YELLOW}Setting upstream branch${NC}"
        git push -u origin "$BRANCH"
    fi
}

# Function to auto commit and push
auto_sync() {
    # Check for changes
    if [[ -n $(git status -s) ]]; then
        echo -e "${BLUE}$(date '+%H:%M:%S') - Changes detected${NC}"
        
        # Add all changes
        git add -A
        
        # Generate commit message with changed files summary
        changed_files=$(git diff --cached --name-only | wc -l)
        commit_msg="$COMMIT_PREFIX $(date '+%Y-%m-%d %H:%M:%S') - $changed_files files changed"
        
        # Commit
        git commit -m "$commit_msg" --quiet
        
        # Push to remote
        if git push origin "$BRANCH" --quiet 2>/dev/null; then
            echo -e "${GREEN}✓ Synced to remote${NC}"
        else
            echo -e "${RED}✗ Push failed, will retry${NC}"
        fi
    else
        echo -e "$(date '+%H:%M:%S') - No changes"
    fi
}

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping auto-sync...${NC}"
    
    # Final sync before exit
    echo -e "${BLUE}Performing final sync...${NC}"
    auto_sync
    
    echo -e "${GREEN}Auto-sync stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Main execution
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Git Auto-Sync Started${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${BLUE}Project: ${NC}$PROJECT_DIR"
echo -e "${BLUE}Branch: ${NC}$BRANCH"
echo -e "${BLUE}Interval: ${NC}${SYNC_INTERVAL}s"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

# Initial checks
check_git_repo
setup_branch

# Initial sync
auto_sync

# Main loop
while true; do
    sleep "$SYNC_INTERVAL"
    auto_sync
done