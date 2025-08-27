# Infrastructure as Code - CDK

이 디렉토리는 AWS CDK를 사용한 인프라 정의 코드를 포함합니다.

## 구조

```
cdk/
├── lib/           # CDK 스택 정의
├── bin/           # CDK 앱 엔트리포인트
└── test/          # 인프라 테스트
```

## 사용법

```bash
# CDK 설치
npm install -g aws-cdk

# 의존성 설치
npm install

# 스택 합성
cdk synth

# 배포
cdk deploy

# 제거
cdk destroy
```