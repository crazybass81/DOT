# DOT 근태관리 시스템 - 초기 설계 문서

> ⚠️ **Note**: 이 문서는 초기 설계안입니다. 현재 구현은 AWS 서버리스 아키텍처를 사용합니다.
> 최신 아키텍처는 [AWS_ARCHITECTURE.md](./dot-attendance/AWS_ARCHITECTURE.md)를 참조하세요.

## 초기 설계 개요

### 원래 계획
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Auth0
- **Hosting**: Vercel
- **Framework**: Next.js + PWA

### 변경된 아키텍처 (현재)
- **Backend**: AWS Lambda + DynamoDB
- **Auth**: AWS Cognito
- **Hosting**: AWS Amplify
- **Framework**: Next.js + TypeScript

## 변경 이유

1. **비용 최적화**: AWS 서버리스로 사용량 기반 과금
2. **확장성**: 무제한 자동 스케일링
3. **통합성**: AWS 생태계 내 완전 통합
4. **보안**: IAM 기반 세밀한 권한 관리

## 현재 시스템

실제 구현된 시스템은 다음 문서를 참조하세요:
- [서비스 개요](./dot-attendance/SERVICE_OVERVIEW.md)
- [AWS 아키텍처](./dot-attendance/AWS_ARCHITECTURE.md)
- [README](./dot-attendance/README.md)