#!/bin/bash

# Claude Settings Auto Sync Script
# This script automatically syncs .claude/settings.json to ~/.claude.json

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_FILE="$SCRIPT_DIR/settings.json"
TARGET_FILE="$HOME/.claude.json"

# Function to sync settings
sync_settings() {
    if [ -f "$SOURCE_FILE" ]; then
        cp "$SOURCE_FILE" "$TARGET_FILE"
        echo "✅ Settings synced: $SOURCE_FILE → $TARGET_FILE"
    else
        echo "❌ Source file not found: $SOURCE_FILE"
        exit 1
    fi
}

# Function to watch for changes (macOS)
watch_and_sync() {
    echo "👀 Watching for changes in $SOURCE_FILE..."
    echo "Press Ctrl+C to stop"
    
    if command -v fswatch >/dev/null 2>&1; then
        # Use fswatch if available (install with: brew install fswatch)
        fswatch -o "$SOURCE_FILE" | while read f; do
            sync_settings
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Settings auto-synced"
        done
    else
        # Fallback to manual polling
        echo "ℹ️  fswatch not found. Install it with: brew install fswatch"
        echo "Using fallback polling method (checks every 5 seconds)..."
        
        last_modified=$(stat -f %m "$SOURCE_FILE" 2>/dev/null)
        
        while true; do
            current_modified=$(stat -f %m "$SOURCE_FILE" 2>/dev/null)
            
            if [ "$current_modified" != "$last_modified" ]; then
                sync_settings
                echo "$(date '+%Y-%m-%d %H:%M:%S') - Settings auto-synced"
                last_modified=$current_modified
            fi
            
            sleep 5
        done
    fi
}

# Main script
case "${1:-}" in
    watch)
        sync_settings  # Initial sync
        watch_and_sync
        ;;
    sync)
        sync_settings
        ;;
    *)
        echo "Claude Settings Sync Script"
        echo ""
        echo "Usage:"
        echo "  ./setup.sh sync   - Sync settings once"
        echo "  ./setup.sh watch  - Watch and auto-sync on changes"
        echo ""
        echo "To run in background:"
        echo "  nohup ./setup.sh watch > ~/.claude/sync.log 2>&1 &"
        echo ""
        echo "To install fswatch for better performance:"
        echo "  brew install fswatch"
        ;;
esac