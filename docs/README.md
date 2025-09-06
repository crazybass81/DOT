# DOT 플랫폼 문서

DOT 플랫폼의 통합 문서세트입니다. 이 문서들은 context-manager를 통해 자동으로 동기화됩니다.

## 📚 문서 구조

### 플랫폼 레벨 문서
- **[플랫폼 개요](./platform/overview.md)** - DOT 플랫폼 전체 소개
- **[아키텍처](./platform/architecture.md)** - 마이크로서비스 아키텍처
- **[시작 가이드](./platform/getting-started.md)** - 개발 환경 설정
- **[배포 가이드](./platform/deployment.md)** - 인프라 및 배포
- **[API 참조](./platform/api-reference.md)** - 공통 API 및 인터페이스

### 서비스별 문서
- **[Attendance Service](./services/attendance/)** - GPS 기반 근태관리
- **[Marketing Service](./services/marketing/)** - 유튜버 마케팅 자동화
- **[Scheduler Service](./services/scheduler/)** - 직원 스케줄링

### 개발자 리소스
- **[개발 가이드](./development/guidelines.md)** - 코딩 표준 및 워크플로우
- **[테스팅](./development/testing.md)** - 테스트 전략 및 도구
- **[컨트리뷰션](./development/contributing.md)** - 기여 가이드라인
- **[트러블슈팅](./development/troubleshooting.md)** - 일반적인 문제 해결

### 운영 및 모니터링
- **[모니터링](./operations/monitoring.md)** - Prometheus/Grafana 모니터링
- **[로깅](./operations/logging.md)** - 중앙화된 로깅 시스템
- **[보안](./operations/security.md)** - 보안 가이드라인
- **[백업 및 복구](./operations/backup-recovery.md)** - 데이터 보호 전략

## 🔄 Context Manager 통합

이 문서들은 [@dot/context-manager](../packages/context-manager/)를 통해 관리됩니다:

### 자동 동기화 기능
- **실시간 코드 변경 감지**: 소스 코드 변경 시 관련 문서 자동 업데이트
- **일관성 검증**: 문서와 코드 간 일치성 자동 검증
- **브레이킹 체인지 감지**: API 변경 시 자동 알림 및 문서 업데이트
- **리팩토링 제안**: 복잡도 분석 기반 개선 제안

### 보호된 파일 목록
다음 파일들은 context-manager에 의해 자동 업데이트되므로 수동 수정을 피해주세요:
- API 문서 (`api-reference.md`, `openapi.yml`)
- 아키텍처 다이어그램
- 서비스 상호작용 매트릭스
- 배포 구성 문서

### 문서 기여 방법
1. **일반 문서**: 직접 편집 가능
2. **API 문서**: 소스 코드의 주석을 수정하면 자동 생성
3. **아키텍처 문서**: `docs/diagrams/` 내 소스 파일 수정

## 📝 문서 규칙

### 스타일 가이드
- **일관된 구조**: 모든 문서는 동일한 템플릿 구조 사용
- **명확한 헤딩**: 계층적 헤딩 구조 (H1 > H2 > H3)
- **코드 블록**: 언어 명시 및 실행 가능한 예제
- **크로스 레퍼런스**: 관련 문서 간 적극적 링크 활용

### 업데이트 주기
- **즉시**: 브레이킹 체인지, 보안 관련
- **일간**: API 변경, 새로운 기능
- **주간**: 아키텍처 변경, 대규모 리팩토링
- **월간**: 전체 문서 검토 및 정리

## 🔍 찾고 있는 정보가 없나요?

1. **검색**: 프로젝트 루트에서 `grep -r "키워드" docs/`
2. **이슈**: [GitHub Issues](https://github.com/dot-platform/issues) 에서 질문
3. **Context Manager**: `context-manager analyze --docs` 로 관련 문서 찾기

## 📊 문서 메트릭스

| 구분 | 문서 수 | 마지막 업데이트 | 자동화율 |
|------|--------|---------------|----------|
| 플랫폼 | 5 | 실시간 | 80% |
| 서비스 | 15 | 실시간 | 90% |
| 개발 | 8 | 주간 | 40% |
| 운영 | 6 | 월간 | 60% |

---

*이 문서는 context-manager에 의해 자동으로 관리됩니다. 마지막 동기화: {{ last_sync_time }}*