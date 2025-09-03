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

---

## 2. 복잡한 사용자 예시 - Case Study

```mermaid
graph LR
    subgraph "Case 1: 단순 워커"
        User1["👤 김알바<br/>(개인 아이디)"]
        Role1["👷 워커 역할"]
        Page1["📄 A카페 계약서 페이지"]
        
        User1 --> Role1
        Role1 --> Page1
    end
    
    subgraph "Case 2: 워커 + 매니저"
        User2["👤 이매니저<br/>(개인 아이디)"]
        Role2A["👷 워커 역할"]
        Role2B["📊 매니저 역할"]
        Page2A["📄 B식당 워커 페이지<br/>(계약서)"]
        Page2B["📄 C마트 워커 페이지<br/>(계약서)"]
        Page2C["📋 C마트 매니저 페이지<br/>(사업자)"]
        
        User2 --> Role2A
        User2 --> Role2B
        Role2A --> Page2A
        Role2A --> Page2B
        Role2B --> Page2C
    end
```

---

## 3. 최복잡 케이스 - 다중 역할 사용자

```mermaid
flowchart TD
    subgraph "개인 아이디"
        User["👤 김만능<br/>(개인 아이디 로그인)"]
    end
    
    subgraph "보유 역할"
        R1["👷 워커"]
        R2["👔 어드민"]
        R3["📊 매니저"]
    end
    
    subgraph "접근 가능 페이지"
        subgraph "사업자 페이지"
            BP1["📋 본인 개인사업자<br/>(어드민)"]
            BP2["📋 타인 개인사업자<br/>(매니저)"]
            BP3["📋 법인 사업자<br/>(어드민)"]
            BP4["📋 가맹본부<br/>(매니저)"]
        end
        
        subgraph "계약서 페이지"
            CP1["📄 알바 A<br/>(워커)"]
            CP2["📄 타 개인사업자<br/>(워커)"]
            CP3["📄 법인<br/>(워커)"]
            CP4["📄 가맹본부<br/>(워커)"]
        end
    end
    
    User --> R1
    User --> R2
    User --> R3
    
    R2 --> BP1
    R3 --> BP2
    R2 --> BP3
    R3 --> BP4
    
    R1 --> CP1
    R1 --> CP2
    R1 --> CP3
    R1 --> CP4
    
    style User fill:#FFD700
    style R1 fill:#E6F3FF
    style R2 fill:#FFE6E6
    style R3 fill:#E6FFE6
```

---

## 4. 시스템 아키텍처 Overview

```mermaid
erDiagram
    PERSONAL_ID ||--o{ ROLE : "has"
    PERSONAL_ID ||--o{ FRANCHISE_ID : "controls"
    PERSONAL_ID ||--o{ CORPORATE_ID : "controls"
    
    ROLE {
        string type "Worker|Admin|Manager|Franchise"
        string entity_id "연결된 사업체 ID"
    }
    
    PERSONAL_ID {
        string user_id PK
        string name
        string phone
        string email
    }
    
    FRANCHISE_ID {
        string franchise_id PK
        string business_number
        string controlled_by FK
    }
    
    CORPORATE_ID {
        string corporate_id PK
        string corporate_number
        string controlled_by FK
    }
    
    BUSINESS_PAGE ||--|| BUSINESS_REGISTRATION : "represents"
    CONTRACT_PAGE ||--|| LABOR_CONTRACT : "represents"
    
    ROLE ||--o{ BUSINESS_PAGE : "accesses"
    ROLE ||--o{ CONTRACT_PAGE : "accesses"
```

---

## 📋 시스템 특징

이 다이어그램들은 복잡한 권한 시스템을 시각화한 것입니다:

1. **기본 구조**: 모든 사용자는 개인 아이디로 로그인
2. **역할 할당**: 한 사용자가 여러 역할 보유 가능
3. **페이지 접근**: 역할에 따라 접근 가능한 페이지 결정
4. **확장성**: 새로운 역할이나 페이지 유형 추가 가능

이해하기 쉽도록 단순한 케이스부터 복잡한 케이스까지 단계적으로 표현했습니다.

---

## 🔧 VSCode에서 보는 방법

### 필요한 확장 프로그램 설치
1. VSCode 확장 프로그램 마켓플레이스에서 다음 중 하나를 설치:
   - **Markdown Preview Mermaid Support** (추천)
   - **Mermaid Markdown Syntax Highlighting**
   - **Markdown Preview Enhanced**

### 미리보기 실행
1. 이 파일을 VSCode에서 열기
2. `Ctrl+Shift+V` (Windows/Linux) 또는 `Cmd+Shift+V` (Mac) 누르기
3. 또는 우측 상단의 미리보기 아이콘 클릭

### 문제 해결
- 다이어그램이 보이지 않으면 확장 프로그램이 제대로 설치되었는지 확인
- VSCode를 재시작해보세요
- 다른 머메이드 미리보기 확장 프로그램을 시도해보세요

---

*문서 생성일: 2025-01-03*