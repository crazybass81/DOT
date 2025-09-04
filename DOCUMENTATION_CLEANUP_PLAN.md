# 📋 문서 정리 계획

## 🎯 목표
- Context Manager가 자동 관리할 핵심 문서만 유지
- 중복/오래된 문서는 archive로 이동
- 명확한 문서 구조 확립

## 📌 반드시 유지할 문서 (KEEP)

### 루트 레벨 핵심 문서
- ✅ `README.md` - 프로젝트 메인 문서
- ✅ `PROJECT_OVERVIEW.md` - 프로젝트 구조 설명
- ✅ `CHANGELOG.md` - 변경 이력 (자동 생성 예정)
- ✅ `CLAUDE.md` - Claude Code 설정

### 서비스별 메인 문서
- ✅ `services/attendance/README.md` - 근태 서비스 메인
- ✅ `services/attendance/user-permission-diagram.md` - ⚠️ **절대 삭제 금지**
- ✅ `services/marketing/README.md` - 마케팅 서비스 메인
- ✅ `services/scheduler/README.md` - 스케줄러 서비스 메인 (생성 필요)

### 기술 문서
- ✅ `API_SPECIFICATION.md` - API 명세 (통합 생성 예정)
- ✅ `ARCHITECTURE.md` - 전체 아키텍처 (생성 예정)

## 📁 Archive로 이동할 문서

### 중복/오래된 문서들
```
docs/archive/ 폴더로 이동:
- CICD_DOCUMENTATION.md → 최신 정보로 업데이트 필요
- SYNC_SCRIPTS_GUIDE.md → 구버전 스크립트
- CONSISTENCY_ANALYSIS_REPORT.md → 분석 리포트는 reports/ 폴더로
- test-context-manager.md → 테스트 파일, 삭제
```

### attendance 서비스 정리
```
services/attendance/docs/archive/로 이동:
- HARDCODED_LOGIN.md → 임시 문서
- docs/archive/* → 이미 archive됨, 유지
- docs/guides/* → 일부는 메인 문서에 통합
- docs/features/* → 핵심 기능만 메인 문서에 통합
```

### marketing 서비스 정리
```
services/marketing/docs/archive/로 이동:
- 이미 대부분 archive되어 있음
- 현재 상태 문서들은 유지
```

## 🏗️ 새로운 문서 구조

```
DOT/
├── README.md                      # 프로젝트 개요
├── PROJECT_OVERVIEW.md            # 구조 상세
├── CHANGELOG.md                   # 변경 이력 (자동 관리)
├── API_SPECIFICATION.md           # API 통합 명세 (자동 관리)
├── ARCHITECTURE.md                # 아키텍처 문서 (자동 관리)
├── CLAUDE.md                      # Claude 설정
│
├── docs/                          # 프로젝트 레벨 문서
│   ├── guides/                    # 개발 가이드
│   │   └── DEVELOPMENT.md         # 개발 가이드 통합
│   ├── archive/                   # 아카이브된 문서
│   └── reports/                   # 분석 리포트
│       └── consistency/           # 일관성 분석 리포트
│
├── services/
│   ├── attendance/
│   │   ├── README.md              # 서비스 메인 (자동 관리)
│   │   ├── user-permission-diagram.md  # ⚠️ 유지 (절대 삭제 금지)
│   │   └── docs/
│   │       └── archive/           # 아카이브된 문서
│   │
│   ├── marketing/
│   │   ├── README.md              # 서비스 메인 (자동 관리)
│   │   └── docs/
│   │       ├── current/           # 현재 상태 문서
│   │       └── archive/           # 아카이브된 문서
│   │
│   └── scheduler/
│       ├── README.md              # 서비스 메인 (생성, 자동 관리)
│       └── docs/
│           └── business_plan.md   # 비즈니스 계획
```

## 🔧 실행 계획

### 1단계: Archive 폴더 생성
```bash
mkdir -p docs/archive
mkdir -p docs/reports/consistency
mkdir -p docs/guides
```

### 2단계: 문서 이동
- 중복/오래된 문서를 archive로 이동
- 테스트 파일 삭제

### 3단계: 핵심 문서 통합
- 분산된 가이드를 DEVELOPMENT.md로 통합
- API 문서를 API_SPECIFICATION.md로 통합

### 4단계: 새 문서 생성
- CHANGELOG.md
- ARCHITECTURE.md
- services/scheduler/README.md

### 5단계: Context Manager 설정 업데이트
- 관리할 문서 경로 지정
- 자동 업데이트 규칙 설정

## ⚠️ 주의사항
1. **user-permission-diagram.md는 절대 삭제/이동 금지**
2. archive 폴더의 문서는 참고용으로 유지
3. 모든 이동은 git mv 명령 사용 (히스토리 보존)