# Claude Context Synchronization Workflow

## 양방향 동기화 시스템
- SSH와 로컬 모두에서 작업 가능
- 5초마다 자동 동기화
- Claude 컨텍스트와 메모리 공유

## 작업 우선순위
1. **코드 작성**: SSH Claude (서버 환경)
2. **모바일 테스트**: 로컬 Android Studio
3. **디버깅**: 로컬에서 실시간 확인
4. **배포/서버**: SSH에서 처리

## 동기화 충돌 방지
- 한 곳에서 작업 중일 때 다른 곳은 읽기 전용
- 작업 전환 시 5초 대기
- git stash로 로컬 변경사항 자동 보호