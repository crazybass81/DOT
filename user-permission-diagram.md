# 근로 관리 SaaS - 사용자 권한 시스템 다이어그램

## 📌 개요
이 문서는 근로 관리 SaaS의 복잡한 사용자 권한 시스템을 시각화한 다이어그램입니다.

---

## 1. 권한 및 역할 시스템 다이어그램

```mermaid
graph TB
    subgraph "아이디 체계"
        PersonalID["🔑 개인 아이디<br/>(모든 사용자 필수)"]
        FranchiseID["🏢 가맹본부 아이디"]
        CorporateID["🏛️ 법인 아이디"]
        
        PersonalID -.컨트롤.-> FranchiseID
        PersonalID -.컨트롤.-> CorporateID
    end
    
    subgraph "역할 (Roles)"
        Worker["👷 워커<br/>(근로자)"]
        Admin["👔 어드민<br/>(사업주)"]
        Manager["📊 매니저<br/>(관리자)"]
        FranchiseRole["🏪 가맹본부"]
    end
    
    subgraph "페이지 유형"
        BusinessPage["📋 사업자 페이지<br/>(사업자등록증당 1개)"]
        ContractPage["📄 계약서 페이지<br/>(근로계약서당 1개)"]
    end
    
    PersonalID ==> Worker
    PersonalID ==> Admin
    PersonalID ==> Manager
    PersonalID ==> FranchiseRole
    
    Worker --> ContractPage
    Admin --> BusinessPage
    Manager --> BusinessPage
    FranchiseRole --> BusinessPage
    
    style PersonalID fill:#FFE4B5
    style Worker fill:#E6F3FF
    style Admin fill:#FFE6E6
    style Manager fill:#E6FFE6
    style FranchiseRole fill:#F0E6FF
```

