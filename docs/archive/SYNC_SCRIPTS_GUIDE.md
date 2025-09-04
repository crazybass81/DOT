# 🔄 DOT 프로젝트 동기화 스크립트 가이드

## 📋 스크립트 목록

### 1. `sync-local.sh`
- **📍 실행 위치**: 로컬 Mac
- **🎯 용도**: 로컬에서 작업 시 자동 동기화 (포커스 안전)
- **✨ 특징**: 
  - fswatch 사용으로 포커스 손실 없음
  - 파일 변경 감지 시에만 동기화
  - 백그라운드 처리로 작업 방해 없음

### 2. `sync-ssh.sh`
- **📍 실행 위치**: SSH 서버 (EC2)
- **🎯 용도**: SSH 서버에서 자동 동기화
- **✨ 특징**:
  - 5초마다 변경사항 체크
  - 자동 커밋 및 푸시
  - master 브랜치 사용

### 3. `setup-auto-sync.sh`
- **📍 실행 위치**: 로컬 Mac 또는 SSH 서버
- **🎯 용도**: 초기 설정 및 자동 실행 구성
- **✨ 특징**:
  - 환경 자동 감지 (로컬/SSH)
  - tmux 세션 자동 설정
  - 터미널 시작 시 자동 실행 설정

## 🚀 사용 방법

### 초기 설정 (한 번만 실행)
```bash
# 로컬 또는 SSH에서 실행
./setup-auto-sync.sh
```

### 수동 실행
```bash
# 로컬에서 (포커스 안전)
tmux new-session -d -s sync-local './sync-local.sh'

# SSH에서
tmux new-session -d -s sync-ssh './sync-ssh.sh'
```

### 동기화 상태 확인
```bash
# 로컬
tmux attach -t sync-local

# SSH
tmux attach -t sync-ssh

# 종료: Ctrl+B, D (detach)
```

### 동기화 중지
```bash
# 로컬
tmux kill-session -t sync-local

# SSH
tmux kill-session -t sync-ssh
```

## 🔧 문제 해결

### 포커스가 빠지는 경우
- `sync-local.sh` 사용 확인
- fswatch 설치 확인: `brew install fswatch`

### 동기화가 안 되는 경우
1. tmux 세션 확인: `tmux ls`
2. Git 상태 확인: `git status`
3. 브랜치 확인: `git branch`

## 📝 참고사항
- 로컬과 SSH 모두 `master` 브랜치 사용
- GitHub Actions는 `main` 브랜치 사용
- 자동 동기화는 터미널 시작 시 자동 실행됨