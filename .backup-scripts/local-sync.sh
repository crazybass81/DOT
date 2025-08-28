#!/bin/bash

# Git Auto Pull Script for Local Development
# Automatically pulls changes from remote SSH development

# Configuration - Update these for your local environment
PROJECT_DIR="~/DOT"  # Change to your local project path
REMOTE_BRANCH="auto-sync"
SYNC_INTERVAL=5  # seconds
REMOTE_NAME="origin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Expand home directory
PROJECT_DIR="${PROJECT_DIR/#\~/$HOME}"

# Navigate to project directory
cd "$PROJECT_DIR" || {
    echo -e "${RED}Error: Cannot access directory $PROJECT_DIR${NC}"
    echo "Please update PROJECT_DIR in this script"
    exit 1
}

# Function to check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}Error: Not a git repository${NC}"
        exit 1
    fi
}

# Function to setup branch
setup_branch() {
    # Fetch latest from remote
    echo -e "${BLUE}Fetching from remote...${NC}"
    git fetch "$REMOTE_NAME"
    
    # Check if remote branch exists
    if ! git show-ref --verify --quiet "refs/remotes/$REMOTE_NAME/$REMOTE_BRANCH"; then
        echo -e "${RED}Error: Remote branch $REMOTE_NAME/$REMOTE_BRANCH does not exist${NC}"
        echo -e "${YELLOW}Make sure auto-sync.sh is running on SSH server${NC}"
        exit 1
    fi
    
    # Check current branch
    current_branch=$(git branch --show-current)
    
    if [ "$current_branch" != "$REMOTE_BRANCH" ]; then
        echo -e "${YELLOW}Switching to branch: $REMOTE_BRANCH${NC}"
        git checkout "$REMOTE_BRANCH" 2>/dev/null || git checkout -b "$REMOTE_BRANCH" "$REMOTE_NAME/$REMOTE_BRANCH"
    fi
}

# Function to auto pull changes
auto_pull() {
    # Fetch latest
    git fetch "$REMOTE_NAME" --quiet
    
    # Check if there are updates
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse "$REMOTE_NAME/$REMOTE_BRANCH")
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "${BLUE}$(date '+%H:%M:%S') - Updates available${NC}"
        
        # Check for local changes
        if [[ -n $(git status -s) ]]; then
            echo -e "${YELLOW}⚠ Local changes detected, stashing...${NC}"
            git stash push -m "Auto-stash before pull $(date '+%Y-%m-%d %H:%M:%S')"
            STASHED=true
        else
            STASHED=false
        fi
        
        # Pull changes
        if git pull "$REMOTE_NAME" "$REMOTE_BRANCH" --quiet 2>/dev/null; then
            # Count updated files
            changed_files=$(git diff --name-only "$LOCAL..$REMOTE" | wc -l)
            echo -e "${GREEN}✓ Pulled $changed_files files from SSH${NC}"
            
            # Notify Android Studio to refresh (macOS)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                osascript -e 'tell application "Android Studio" to activate' 2>/dev/null || true
            fi
            
            # Re-apply stashed changes if any
            if [ "$STASHED" = true ]; then
                echo -e "${YELLOW}Re-applying local changes...${NC}"
                if git stash pop --quiet; then
                    echo -e "${GREEN}✓ Local changes restored${NC}"
                else
                    echo -e "${RED}✗ Conflict in local changes, please resolve manually${NC}"
                    echo -e "${YELLOW}Run 'git stash list' to see stashed changes${NC}"
                fi
            fi
        else
            echo -e "${RED}✗ Pull failed${NC}"
        fi
    else
        echo -e "$(date '+%H:%M:%S') - Already up to date"
    fi
}

# Function to show sync status
show_status() {
    echo -e "\n${CYAN}Current Status:${NC}"
    echo -e "${BLUE}Local: ${NC}$(git rev-parse --short HEAD) - $(git log -1 --format=%s)"
    
    git fetch "$REMOTE_NAME" --quiet
    echo -e "${BLUE}Remote: ${NC}$(git rev-parse --short "$REMOTE_NAME/$REMOTE_BRANCH") - $(git log -1 --format=%s "$REMOTE_NAME/$REMOTE_BRANCH")"
    
    # Show if behind/ahead
    LOCAL_AHEAD=$(git rev-list --count "$REMOTE_NAME/$REMOTE_BRANCH"..HEAD)
    LOCAL_BEHIND=$(git rev-list --count HEAD.."$REMOTE_NAME/$REMOTE_BRANCH")
    
    if [ "$LOCAL_AHEAD" -gt 0 ]; then
        echo -e "${YELLOW}⚠ Local is $LOCAL_AHEAD commits ahead${NC}"
    fi
    if [ "$LOCAL_BEHIND" -gt 0 ]; then
        echo -e "${CYAN}📥 Local is $LOCAL_BEHIND commits behind${NC}"
    fi
    echo ""
}

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping auto-pull...${NC}"
    
    # Show final status
    show_status
    
    echo -e "${GREEN}Auto-pull stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Main execution
clear
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Git Auto-Pull Started (Local)${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${BLUE}Project: ${NC}$PROJECT_DIR"
echo -e "${BLUE}Remote: ${NC}$REMOTE_NAME/$REMOTE_BRANCH"
echo -e "${BLUE}Interval: ${NC}${SYNC_INTERVAL}s"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"

# Initial checks
check_git_repo
setup_branch

# Show initial status
show_status

# Initial pull
auto_pull

# Main loop
while true; do
    sleep "$SYNC_INTERVAL"
    auto_pull
done