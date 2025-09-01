#!/bin/bash

# Claude Code Settings Sync Script
# 로컬과 SSH 환경 간 Claude Code 설정 동기화

set -e

# Configuration
CLAUDE_CONFIG_DIR="$HOME/.claude"
CLAUDE_SETTINGS_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
REMOTE_HOST="${1:-}"
SYNC_DIR="$HOME/.claude-sync"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to backup current settings
backup_settings() {
    local backup_dir="$SYNC_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    if [ -f "$CLAUDE_SETTINGS_FILE" ]; then
        cp "$CLAUDE_SETTINGS_FILE" "$backup_dir/claude_desktop_config.json"
        print_status "Backed up settings to $backup_dir"
    fi
    
    if [ -d "$CLAUDE_CONFIG_DIR" ]; then
        cp -r "$CLAUDE_CONFIG_DIR" "$backup_dir/"
        print_status "Backed up Claude directory to $backup_dir"
    fi
}

# Function to create portable settings
create_portable_settings() {
    mkdir -p "$SYNC_DIR/portable"
    
    # Create a template config that works across environments
    cat > "$SYNC_DIR/portable/claude_config_template.json" << 'EOF'
{
    "mcpServers": {
        "sequential-thinking": {
            "command": "node",
            "args": ["{{MCP_BASE}}/mcp-official-servers/src/sequentialthinking/dist/index.js"]
        },
        "magic": {
            "command": "npx",
            "args": [
                "-y",
                "@diahkamali/mcp-magic@latest"
            ]
        },
        "context7": {
            "command": "npx",
            "args": [
                "-y",
                "@context-labs/context7-mcp",
                "--api-key",
                "{{CONTEXT7_API_KEY}}"
            ]
        },
        "morphllm-fast-apply": {
            "command": "npx",
            "args": [
                "-y",
                "@morphllm/mcp-server-fast-apply@latest"
            ]
        },
        "playwright": {
            "command": "npx",
            "args": [
                "-y",
                "@executeautomation/playwright-mcp-server"
            ]
        },
        "ide": {
            "command": "npx",
            "args": [
                "-y",
                "mcp-server-vscode@latest"
            ],
            "alwaysAllow": ["executeCode", "getDiagnostics"]
        }
    }
}
EOF
    
    print_status "Created portable settings template"
}

# Function to sync to remote
sync_to_remote() {
    if [ -z "$REMOTE_HOST" ]; then
        print_error "Remote host not specified"
        return 1
    fi
    
    print_status "Syncing to remote: $REMOTE_HOST"
    
    # Create remote directories
    ssh "$REMOTE_HOST" "mkdir -p ~/.claude-sync/portable"
    
    # Copy portable settings
    scp -r "$SYNC_DIR/portable/"* "$REMOTE_HOST:~/.claude-sync/portable/"
    
    # Copy Claude directory files
    if [ -d "$CLAUDE_CONFIG_DIR" ]; then
        ssh "$REMOTE_HOST" "mkdir -p ~/.claude"
        scp -r "$CLAUDE_CONFIG_DIR/"*.md "$REMOTE_HOST:~/.claude/" 2>/dev/null || true
    fi
    
    print_status "Sync completed to $REMOTE_HOST"
}

# Function to apply settings locally
apply_local_settings() {
    if [ ! -f "$SYNC_DIR/portable/claude_config_template.json" ]; then
        print_error "Portable settings not found"
        return 1
    fi
    
    # Replace placeholders with actual paths
    local mcp_base="$HOME/mcp-servers"
    local context7_key="${CONTEXT7_API_KEY:-ctx7sk-a00b23ee-ff75-49a2-a8b8-3090e3465450}"
    
    sed -e "s|{{MCP_BASE}}|$mcp_base|g" \
        -e "s|{{CONTEXT7_API_KEY}}|$context7_key|g" \
        "$SYNC_DIR/portable/claude_config_template.json" > "$SYNC_DIR/claude_desktop_config.json"
    
    # Apply to actual config location
    if [ -f "$CLAUDE_SETTINGS_FILE" ]; then
        backup_settings
        cp "$SYNC_DIR/claude_desktop_config.json" "$CLAUDE_SETTINGS_FILE"
        print_status "Applied settings to Claude Code"
    else
        print_warning "Claude settings file not found at expected location"
    fi
}

# Function to setup SSH environment
setup_ssh_environment() {
    cat > "$SYNC_DIR/setup-ssh.sh" << 'EOF'
#!/bin/bash
# Setup script for SSH environment

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://fnm.vercel.app/install | bash
    source ~/.bashrc
    fnm use --install-if-missing 20
fi

# Setup MCP servers using npx (no local installation needed)
echo "MCP servers will use npx for portable execution"

# Create Claude directory if not exists
mkdir -p ~/.claude

# Apply settings
if [ -f ~/.claude-sync/portable/claude_config_template.json ]; then
    echo "Applying Claude Code settings..."
    # Process template here
fi

echo "SSH environment setup complete!"
EOF
    
    chmod +x "$SYNC_DIR/setup-ssh.sh"
    print_status "Created SSH setup script"
}

# Main menu
show_menu() {
    echo ""
    echo "Claude Code Settings Sync Tool"
    echo "=============================="
    echo "1) Backup current settings"
    echo "2) Create portable settings"
    echo "3) Sync to remote host"
    echo "4) Apply settings locally"
    echo "5) Setup SSH environment script"
    echo "6) Full sync (all steps)"
    echo "q) Quit"
    echo ""
    read -p "Select option: " choice
    
    case $choice in
        1) backup_settings ;;
        2) create_portable_settings ;;
        3) 
            read -p "Enter remote host (user@host): " remote
            REMOTE_HOST="$remote" sync_to_remote
            ;;
        4) apply_local_settings ;;
        5) setup_ssh_environment ;;
        6)
            backup_settings
            create_portable_settings
            setup_ssh_environment
            if [ -n "$REMOTE_HOST" ]; then
                sync_to_remote
            fi
            ;;
        q) exit 0 ;;
        *) print_error "Invalid option" ;;
    esac
}

# Main execution
if [ $# -eq 0 ]; then
    while true; do
        show_menu
    done
else
    # Command line mode
    case "$1" in
        backup) backup_settings ;;
        portable) create_portable_settings ;;
        sync) REMOTE_HOST="$2" sync_to_remote ;;
        apply) apply_local_settings ;;
        setup-ssh) setup_ssh_environment ;;
        full)
            backup_settings
            create_portable_settings
            setup_ssh_environment
            if [ -n "$2" ]; then
                REMOTE_HOST="$2" sync_to_remote
            fi
            ;;
        *)
            echo "Usage: $0 [backup|portable|sync <host>|apply|setup-ssh|full <host>]"
            exit 1
            ;;
    esac
fi