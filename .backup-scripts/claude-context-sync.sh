#!/bin/bash

# Claude Context Sync Script
# Synchronizes Claude Code context between SSH and local environments

# Configuration
PROJECT_DIR="/home/ec2-user/DOT"
SYNC_BRANCH="claude-context"
SYNC_INTERVAL=300  # 5 minutes

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Claude context files to sync
CLAUDE_FILES=(
    ".claude/"
    "CLAUDE.md"
    ".mcp.json"
    ".serena/memories/"
    "PROJECT_OVERVIEW.md"
    "services/attendance/README.md"
)

cd "$PROJECT_DIR" || exit 1

# Function to sync context to remote
sync_context() {
    echo -e "${BLUE}$(date '+%H:%M:%S') - Syncing Claude context...${NC}"
    
    # Check for changes in Claude files
    changes_found=false
    for file in "${CLAUDE_FILES[@]}"; do
        if [ -e "$file" ]; then
            git add "$file" 2>/dev/null
            if ! git diff --cached --quiet "$file" 2>/dev/null; then
                changes_found=true
            fi
        fi
    done
    
    if [ "$changes_found" = true ]; then
        # Commit context changes
        commit_msg="[Claude Context] Auto-sync $(date '+%Y-%m-%d %H:%M:%S')"
        git commit -m "$commit_msg" --quiet
        
        # Push to remote
        if git push origin "$SYNC_BRANCH" --quiet 2>/dev/null; then
            echo -e "${GREEN}✓ Context synced to remote${NC}"
            
            # List synced items
            echo -e "${GREEN}Synced:${NC}"
            for file in "${CLAUDE_FILES[@]}"; do
                if [ -e "$file" ]; then
                    echo -e "  • $file"
                fi
            done
        else
            echo -e "${RED}✗ Push failed${NC}"
        fi
    else
        echo -e "No context changes to sync"
    fi
}

# Function to show context status
show_status() {
    echo -e "\n${BLUE}Claude Context Status:${NC}"
    
    # Check .claude directory
    if [ -d ".claude" ]; then
        echo -e "${GREEN}✓ Claude settings:${NC} $(ls .claude/ | wc -l) files"
    else
        echo -e "${YELLOW}⚠ Claude settings:${NC} Not configured"
    fi
    
    # Check Serena memories
    if [ -d ".serena/memories" ]; then
        mem_count=$(ls .serena/memories/ 2>/dev/null | wc -l)
        echo -e "${GREEN}✓ Serena memories:${NC} $mem_count files"
    else
        echo -e "${YELLOW}⚠ Serena memories:${NC} Not found"
    fi
    
    # Check MCP configuration
    if [ -f ".mcp.json" ]; then
        mcp_count=$(cat .mcp.json | grep -o '"[^"]*":\s*{' | wc -l)
        echo -e "${GREEN}✓ MCP servers:${NC} $mcp_count configured"
    else
        echo -e "${YELLOW}⚠ MCP config:${NC} Not found"
    fi
    
    # Check CLAUDE.md
    if [ -f "CLAUDE.md" ]; then
        line_count=$(wc -l < CLAUDE.md)
        echo -e "${GREEN}✓ CLAUDE.md:${NC} $line_count lines"
    else
        echo -e "${YELLOW}⚠ CLAUDE.md:${NC} Not found"
    fi
}

# Function to backup context
backup_context() {
    BACKUP_DIR="claude-backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/claude-context-$TIMESTAMP.tar.gz"
    
    echo -e "${BLUE}Creating context backup...${NC}"
    
    tar -czf "$BACKUP_FILE" \
        --ignore-failed-read \
        "${CLAUDE_FILES[@]}" 2>/dev/null
    
    if [ -f "$BACKUP_FILE" ]; then
        size=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✓ Backup created:${NC} $BACKUP_FILE ($size)"
    else
        echo -e "${RED}✗ Backup failed${NC}"
    fi
}

# Setup branch
setup_branch() {
    current_branch=$(git branch --show-current)
    
    if [ "$current_branch" != "$SYNC_BRANCH" ]; then
        echo -e "${YELLOW}Creating context sync branch: $SYNC_BRANCH${NC}"
        git checkout -b "$SYNC_BRANCH" 2>/dev/null || git checkout "$SYNC_BRANCH"
    fi
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping context sync...${NC}"
    
    # Final sync
    sync_context
    
    # Create backup
    backup_context
    
    echo -e "${GREEN}Context sync stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main execution
clear
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}     Claude Context Sync Manager${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Project:${NC} $PROJECT_DIR"
echo -e "${BLUE}Branch:${NC} $SYNC_BRANCH"
echo -e "${BLUE}Interval:${NC} ${SYNC_INTERVAL}s ($(($SYNC_INTERVAL/60)) min)"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"

# Show current status
show_status

echo -e "\n${YELLOW}Options:${NC}"
echo -e "  ${GREEN}1${NC} - Start auto-sync"
echo -e "  ${GREEN}2${NC} - Sync once"
echo -e "  ${GREEN}3${NC} - Backup context"
echo -e "  ${GREEN}4${NC} - Show status"
echo -e "  ${GREEN}q${NC} - Quit"
echo ""
read -p "Choose option: " option

case $option in
    1)
        echo -e "\n${GREEN}Starting auto-sync...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
        
        setup_branch
        
        # Initial sync
        sync_context
        
        # Main loop
        while true; do
            sleep "$SYNC_INTERVAL"
            sync_context
        done
        ;;
    
    2)
        setup_branch
        sync_context
        ;;
    
    3)
        backup_context
        ;;
    
    4)
        show_status
        ;;
    
    q|*)
        echo -e "${GREEN}Goodbye!${NC}"
        exit 0
        ;;
esac