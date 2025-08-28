# Claude Code 맥락(Context) 동기화 가이드

로컬과 SSH 환경의 Claude Code 컨텍스트를 동기화하는 완벽한 가이드입니다.

## 🧠 Claude Code의 맥락 구성요소

### 1. 프로젝트 설정 파일들
```
.claude/
├── settings.json        # 프로젝트별 Claude 설정
├── settings.local.json  # 로컬 환경 설정
├── agents/             # 커스텀 에이전트 설정
└── commands/           # 커스텀 명령어
```

### 2. MCP 서버 설정
```
.mcp.json               # MCP 서버 구성
```

### 3. 프로젝트 문서
```
CLAUDE.md              # Claude 전용 지침
PROJECT_OVERVIEW.md    # 프로젝트 구조 이해
```

### 4. Serena 메모리 (지속적 컨텍스트)
```
.serena/memories/      # 세션 간 지식 보존
```

---

## 방법 1: Git으로 Claude 설정 동기화 (추천) ⭐

가장 간단하고 효과적인 방법입니다.

### 설정 단계

1. **`.gitignore` 수정** - Claude 설정을 Git에 포함
```bash
# .gitignore에서 제거 (주석 처리)
# .claude/settings.local.json  # 이것만 제외
```

2. **Claude 설정 커밋**
```bash
git add .claude/ CLAUDE.md .mcp.json .serena/memories/
git commit -m "Add Claude context files"
git push
```

3. **로컬에서 받기**
```bash
git pull
# Claude Code가 자동으로 설정 인식
```

### 자동 동기화 스크립트
```bash
#!/bin/bash
# claude-sync.sh

# Claude 관련 파일만 동기화
CLAUDE_FILES=(
    ".claude/"
    "CLAUDE.md"
    ".mcp.json"
    ".serena/memories/"
    "PROJECT_OVERVIEW.md"
)

# SSH에서 실행 (푸시)
sync_to_remote() {
    for file in "${CLAUDE_FILES[@]}"; do
        git add "$file" 2>/dev/null
    done
    git commit -m "[Claude Sync] Update context $(date +%Y%m%d_%H%M%S)"
    git push
}

# 로컬에서 실행 (풀)
sync_from_remote() {
    git fetch
    git pull --no-edit
}

# 실행
if [ "$1" = "push" ]; then
    sync_to_remote
elif [ "$1" = "pull" ]; then
    sync_from_remote
else
    echo "Usage: ./claude-sync.sh [push|pull]"
fi
```

---

## 방법 2: 실시간 양방향 컨텍스트 동기화 🔄

Unison을 사용한 실시간 동기화

### 설치
```bash
# macOS (로컬)
brew install unison

# Linux (SSH)
sudo apt-get install unison
```

### 설정 파일 생성
`~/.unison/claude-context.prf`:
```
# Claude Context Sync Profile
root = /Users/you/DOT
root = ssh://user@server//home/ec2-user/DOT

# Claude 관련 파일만 동기화
path = .claude
path = CLAUDE.md
path = .mcp.json
path = .serena/memories
path = PROJECT_OVERVIEW.md

# 실시간 동기화
repeat = watch
batch = true
auto = true
times = true
```

### 실행
```bash
unison claude-context
```

---

## 방법 3: Claude Export/Import 기능 활용 📦

### Export (SSH에서)
```bash
# Claude 컨텍스트 내보내기 스크립트
cat > export-claude-context.sh << 'EOF'
#!/bin/bash

EXPORT_DIR="claude-context-export"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE="claude-context-$TIMESTAMP.tar.gz"

# 컨텍스트 수집
mkdir -p $EXPORT_DIR
cp -r .claude $EXPORT_DIR/
cp CLAUDE.md $EXPORT_DIR/
cp .mcp.json $EXPORT_DIR/
cp -r .serena/memories $EXPORT_DIR/
cp PROJECT_OVERVIEW.md $EXPORT_DIR/

# 현재 대화 내역 추가 (선택사항)
echo "# Context Export Metadata" > $EXPORT_DIR/metadata.md
echo "Exported: $TIMESTAMP" >> $EXPORT_DIR/metadata.md
echo "Branch: $(git branch --show-current)" >> $EXPORT_DIR/metadata.md
echo "Commit: $(git rev-parse HEAD)" >> $EXPORT_DIR/metadata.md

# 압축
tar -czf $ARCHIVE $EXPORT_DIR
rm -rf $EXPORT_DIR

echo "Context exported to: $ARCHIVE"
EOF
chmod +x export-claude-context.sh
```

### Import (로컬에서)
```bash
# Claude 컨텍스트 가져오기
tar -xzf claude-context-*.tar.gz
cp -r claude-context-export/.claude ./
cp claude-context-export/*.md ./
cp -r claude-context-export/memories .serena/
```

---

## 방법 4: 클라우드 동기화 (Dropbox/Google Drive) ☁️

### Dropbox 설정
```bash
# SSH 서버에서
cd ~/Dropbox
ln -s /home/ec2-user/DOT/.claude claude-ssh

# 로컬에서
cd ~/DOT
rm -rf .claude
ln -s ~/Dropbox/claude-ssh .claude
```

---

## 방법 5: Claude Session 공유 🔗

### Session Export (새로운 기능)
```bash
# 현재 세션 상태 저장
cat > save-claude-session.sh << 'EOF'
#!/bin/bash

SESSION_FILE=".claude-session.json"

# 세션 정보 수집
cat > $SESSION_FILE << JSON
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "context": {
    "current_file": "$(pwd)",
    "open_files": [],
    "recent_commands": $(history | tail -20 | jq -R -s 'split("\n")[:-1]'),
    "git_branch": "$(git branch --show-current)",
    "git_status": "$(git status --short)"
  },
  "memories": $(ls .serena/memories/ | jq -R -s 'split("\n")[:-1]'),
  "mcp_servers": $(cat .mcp.json | jq '.mcpServers')
}
JSON

echo "Session saved to $SESSION_FILE"
EOF
chmod +x save-claude-session.sh
```

---

## 🚀 통합 동기화 솔루션

### `claude-context-manager.sh`
```bash
#!/bin/bash

# Claude Context Manager - 통합 관리 도구

ACTION=$1
MODE=${2:-"full"}  # full, settings, memories

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 컨텍스트 파일 정의
CONTEXT_FILES=(
    ".claude/settings.json"
    ".claude/agents/"
    ".claude/commands/"
    "CLAUDE.md"
    ".mcp.json"
)

MEMORY_FILES=(
    ".serena/memories/"
)

case $ACTION in
    sync)
        echo -e "${GREEN}Syncing Claude context...${NC}"
        rsync -avz \
            --include-from=<(printf '%s\n' "${CONTEXT_FILES[@]}" "${MEMORY_FILES[@]}") \
            --exclude='*' \
            . user@remote:~/DOT/
        ;;
    
    backup)
        echo -e "${GREEN}Backing up Claude context...${NC}"
        tar -czf "claude-backup-$(date +%Y%m%d).tar.gz" \
            "${CONTEXT_FILES[@]}" "${MEMORY_FILES[@]}"
        ;;
    
    restore)
        echo -e "${YELLOW}Restoring Claude context...${NC}"
        tar -xzf "$2"
        ;;
    
    status)
        echo -e "${GREEN}Claude Context Status:${NC}"
        echo "Settings: $(ls -la .claude/settings.json 2>/dev/null || echo 'Not found')"
        echo "Memories: $(ls .serena/memories/ | wc -l) files"
        echo "MCP: $(cat .mcp.json | jq '.mcpServers | length') servers configured"
        ;;
    
    *)
        echo "Usage: $0 {sync|backup|restore|status}"
        ;;
esac
```

---

## 🎯 Best Practices

### 1. 실시간 개발
- **SSH**: 메인 개발 환경, 컨텍스트 생성
- **로컬**: 테스트 환경, 컨텍스트 소비
- **동기화**: Git 기반 5분 간격

### 2. 민감정보 관리
```gitignore
# Claude 민감 정보 제외
.claude/settings.local.json
.claude/api-keys/
```

### 3. 컨텍스트 버전 관리
```bash
# 컨텍스트 태그 생성
git tag -a "context-v1.0" -m "Stable Claude context"
git push --tags
```

### 4. 팀 협업
- 공통 컨텍스트: `.claude/settings.json`
- 개인 컨텍스트: `.claude/settings.local.json`

---

## 🔧 문제 해결

### 컨텍스트 충돌
```bash
# SSH 우선
git checkout --theirs .claude/
git add .claude/
git commit -m "Use SSH context"
```

### 메모리 동기화 실패
```bash
# 수동 병합
rsync -avz user@ssh:~/DOT/.serena/memories/ .serena/memories/
```

### MCP 서버 불일치
```bash
# MCP 설정 재생성
cp .mcp.json .mcp.json.backup
# 수동 편집 후
claude-code --reload
```

---

## 결론

**추천 워크플로우:**
1. Git으로 Claude 설정 파일 버전 관리
2. 5분마다 자동 동기화
3. Serena 메모리는 별도 동기화
4. 중요 세션은 수동 백업

이렇게 하면 SSH와 로컬의 Claude Code가 같은 맥락을 공유하며 작업할 수 있습니다! 🎉