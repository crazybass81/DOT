# 📋 Attendance Service Changelog

이 파일은 Attendance 서비스의 모든 주요 변경사항을 기록합니다.

## [Unreleased]

### Added
- 서비스별 독립 문서 시스템 구축
- user-permission-diagram을 docs/diagrams로 이동 (보존)

## [1.2.0] - 2025-01-15

### Added
- QR 코드 기반 출퇴근 시스템
- 실시간 대시보드 (WebSocket)
- 관리자 승인 워크플로우
- 모바일 앱 Flutter 구현

### Changed
- Supabase Auth로 인증 시스템 전환
- Row Level Security 적용

### Security
- JWT 토큰 기반 인증 강화
- 위치 기반 출퇴근 검증

## [1.1.0] - 2024-12-01

### Added
- 기본 출퇴근 기록 시스템
- 직원 관리 기능
- 근태 리포트 생성

### Fixed
- 시간대 처리 버그 수정
- 중복 체크인 방지

## [1.0.0] - 2024-11-01

### Added
- 초기 서비스 구축
- Next.js 웹 애플리케이션
- Supabase 백엔드 연동

---
*이 문서는 Context Manager에 의해 자동으로 관리됩니다.*