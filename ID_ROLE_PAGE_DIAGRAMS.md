graph TB
    subgraph "로그인 체계"
        PersonalID["🔑 개인 아이디<br/>(모든 사용자 필수 로그인)"]
    end
    
    subgraph "아이디 유형"
        PersonalType["개인 아이디"]
        FranchiseType["가맹본부 아이디"]
        CorporateType["법인 아이디"]
    end
    
    subgraph "역할 4종"
        Worker["👷 워커 (근로자)"]
        Admin["👔 어드민 (사업주)"]
        Manager["📊 매니저 (관리자)"]
        Franchise["🏪 가맹본부"]
    end
    
    subgraph "페이지 단위"
        BusinessDashboard["📋 사업자 대시보드<br/>(사업자등록증당 1개)"]
        ContractDashboard["📄 계약서 대시보드<br/>(근로계약서당 1개)"]
    end
    
    PersonalID --> PersonalType
    PersonalID -.제어.-> FranchiseType
    PersonalID -.제어.-> CorporateType
    
    PersonalID ==> Worker
    PersonalID ==> Admin
    PersonalID ==> Manager
    PersonalID ==> Franchise
    
    Admin --> BusinessDashboard
    Manager --> BusinessDashboard
    Franchise --> BusinessDashboard
    Worker --> ContractDashboard