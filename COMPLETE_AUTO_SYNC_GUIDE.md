# 🚀 완전 자동 양방향 동기화 설정 가이드

## 📋 최종 목표
로컬과 SSH 서버 어디에서 터미널을 열어도 자동으로 양방향 동기화가 실행되는 상태

## 🎯 현재 상태

### ✅ 로컬 설정 (완료)
- **위치**: ~/Desktop/DOT
- **자동 실행 스크립트**: `sync-all.sh` (양방향)
- **자동 시작**: ~/.zshrc에 설정됨
- **tmux 세션**: `sync-local`

### 🔧 SSH 서버 설정 (필요)
SSH 서버에서 아래 명령 실행:

```bash
# 1. SSH 서버 접속
ssh ec2-user@021.dev

# 2. DOT 디렉토리로 이동
cd ~/DOT

# 3. 최신 변경사항 가져오기
git checkout auto-sync
git pull origin auto-sync

# 4. 자동 설정 스크립트 실행
./setup-ssh-auto-sync.sh
```

## 🔄 동기화 구조

```
[로컬]                    [GitHub]                    [SSH 서버]
sync-all.sh        ←→    auto-sync 브랜치    ←→     auto-sync.sh
(자동 실행)               (중계 역할)                (자동 실행)
```

## 📊 동기화 흐름

### 로컬 → SSH
1. 로컬에서 파일 수정
2. `sync-all.sh`가 5초 내 자동 감지
3. 자동 commit + push → GitHub
4. SSH의 `auto-sync.sh`가 5초 내 자동 pull
5. SSH에 반영 완료

### SSH → 로컬  
1. SSH에서 파일 수정
2. `auto-sync.sh`가 5초 내 자동 감지
3. 자동 commit + push → GitHub
4. 로컬의 `sync-all.sh`가 5초 내 자동 pull
5. 로컬에 반영 완료

## 🛠️ 유용한 명령어

### tmux 세션 관리
```bash
# 세션 목록 보기
tmux ls

# 로그 실시간 보기
tmux attach -t sync-local    # 로컬
tmux attach -t sync-ssh      # SSH

# 세션에서 나오기 (계속 실행됨)
Ctrl+B, D

# 세션 재시작
tmux kill-session -t sync-local
tmux new-session -d -s sync-local './sync-all.sh'
```

### 동기화 상태 확인
```bash
# Git 상태
git status
git log --oneline -5

# 동기화 프로세스 확인
ps aux | grep sync
```

## ⚠️ 주의사항

1. **브랜치**: 항상 `auto-sync` 브랜치 사용
2. **충돌 처리**: 자동으로 rebase 처리되지만, 큰 충돌 시 수동 개입 필요
3. **tmux 세션**: 터미널 재시작 시 자동 생성됨
4. **네트워크**: 인터넷 연결 필수

## 🎉 설정 완료 확인

### 로컬에서 확인
```bash
# 새 터미널 열기
# 자동으로 다음 메시지가 나타나야 함:
# ✅ 로컬 ↔️ GitHub 양방향 동기화 시작됨 (tmux: sync-local)
```

### SSH에서 확인
```bash
# SSH 접속 후
# 자동으로 다음 메시지가 나타나야 함:
# ✅ SSH → GitHub 동기화 시작됨 (tmux: sync-ssh)
```

## 📝 스크립트 역할 정리

| 스크립트 | 위치 | 역할 | 자동 실행 |
|---------|------|------|-----------|
| `sync-all.sh` | 로컬 | 로컬 ↔️ GitHub 양방향 | ✅ |
| `auto-sync.sh` | SSH | SSH ↔️ GitHub 양방향 | ✅ |
| `setup-ssh-auto-sync.sh` | 공통 | SSH 서버 자동 설정 | 1회 실행 |

## 🚨 문제 해결

### tmux 세션이 죽었을 때
```bash
tmux new-session -d -s sync-local './sync-all.sh'
```

### 동기화가 멈췄을 때
```bash
# 세션 재시작
tmux kill-session -t sync-local
tmux new-session -d -s sync-local './sync-all.sh'
```

### 충돌이 발생했을 때
```bash
git status
git stash
git pull origin auto-sync
git stash pop
```

---

**완료!** 이제 로컬과 SSH 어디서든 터미널만 열면 자동으로 동기화가 시작됩니다! 🎉