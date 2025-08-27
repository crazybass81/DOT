/**
 * 협업 제안서 자동 생성 서비스
 * 가게 정보와 크리에이터 특성을 기반으로 맞춤형 제안서 생성
 */

export interface ProposalData {
  store: {
    name: string;
    category: string;
    address: string;
    specialties?: string[];
    benefits?: string[];
  };
  creator: {
    name: string;
    subscribers: string;
    email?: string;
    category?: string;
    recentContent?: string[];
  };
  matchScore: number;
}

export class ProposalGenerator {
  /**
   * 이메일 제안서 생성
   */
  generateEmailProposal(data: ProposalData): {
    subject: string;
    body: string;
    preview: string;
  } {
    const subject = this.generateSubject(data);
    const body = this.generateEmailBody(data);
    const preview = body.substring(0, 150) + '...';
    
    return { subject, body, preview };
  }
  
  /**
   * 제목 생성
   */
  private generateSubject(data: ProposalData): string {
    const templates = [
      `[${data.store.name}] ${data.creator.name}님께 특별한 콜라보 제안 드립니다 🎬`,
      `${data.creator.name}님, ${data.store.name}에서 콘텐츠 협업 제안드려요!`,
      `[협업 제안] ${data.store.name} x ${data.creator.name} 콜라보`,
      `${data.creator.name}님의 콘텐츠와 완벽한 ${data.store.category} 맛집을 소개합니다`,
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  /**
   * 이메일 본문 생성
   */
  private generateEmailBody(data: ProposalData): string {
    const greeting = this.generateGreeting(data);
    const introduction = this.generateIntroduction(data);
    const whyYou = this.generateWhyYou(data);
    const benefits = this.generateBenefits(data);
    const proposal = this.generateProposal(data);
    const closing = this.generateClosing(data);
    
    return `${greeting}

${introduction}

${whyYou}

${benefits}

${proposal}

${closing}

---
${data.store.name}
${data.store.address}
`;
  }
  
  /**
   * 인사말
   */
  private generateGreeting(data: ProposalData): string {
    return `안녕하세요, ${data.creator.name}님! 👋

항상 멋진 콘텐츠로 ${this.formatSubscribers(data.creator.subscribers)}명의 구독자분들께 
즐거움을 선사해주셔서 감사합니다.`;
  }
  
  /**
   * 소개
   */
  private generateIntroduction(data: ProposalData): string {
    return `저희는 ${data.store.address}에 위치한 ${data.store.category} 전문점 
'${data.store.name}'입니다.

${data.creator.name}님의 채널을 오랫동안 시청해온 팬이자, 
이번에 특별한 콜라보레이션을 제안드리고자 연락드렸습니다.`;
  }
  
  /**
   * 왜 이 크리에이터인가
   */
  private generateWhyYou(data: ProposalData): string {
    const reasons = [];
    
    if (data.matchScore >= 80) {
      reasons.push('채널 콘텐츠와 저희 매장의 컨셉이 완벽하게 매칭됩니다');
    }
    
    if (parseInt(data.creator.subscribers) > 100000) {
      reasons.push('높은 영향력으로 많은 분들께 저희를 소개할 수 있을 것 같습니다');
    }
    
    if (data.creator.category?.includes('먹방') || data.creator.category?.includes('맛집')) {
      reasons.push('맛집 콘텐츠 전문성이 저희와 잘 맞을 것 같습니다');
    }
    
    return `🎯 ${data.creator.name}님과 함께하고 싶은 이유:
${reasons.map(r => `• ${r}`).join('\n')}`;
  }
  
  /**
   * 제공 혜택
   */
  private generateBenefits(data: ProposalData): string {
    const benefits = [
      '🍴 방문 시 모든 메뉴 무료 제공',
      '👥 동행 1인 추가 무료 (최대 4인)',
      '🎬 촬영에 최적화된 별도 공간 제공',
      '⏰ 원하시는 시간대 단독 촬영 가능',
      '📸 메뉴 및 인테리어 자유 촬영',
      '🎁 구독자 이벤트용 쿠폰/상품 지원',
      '💰 별도 협의 시 촬영비 지원 가능',
    ];
    
    // 카테고리별 추가 혜택
    if (data.store.category.includes('카페')) {
      benefits.push('☕ 시그니처 음료 레시피 공개');
    }
    if (data.store.category.includes('음식점')) {
      benefits.push('👨‍🍳 셰프 인터뷰 및 요리 과정 공개');
    }
    
    return `💝 저희가 제공하는 혜택:
${benefits.slice(0, 5).map(b => b).join('\n')}`;
  }
  
  /**
   * 구체적 제안
   */
  private generateProposal(data: ProposalData): string {
    return `📅 협업 제안:
    
1. 방문 일정: ${data.creator.name}님이 편하신 시간에 언제든지
2. 콘텐츠 형태: 자유롭게 진행 (리뷰, 먹방, V-log 등)
3. 추가 지원: 필요하신 부분 있으시면 최대한 맞춰드리겠습니다

부담 갖지 마시고 편하게 놀러오신다는 마음으로 방문해주세요!
맛있는 음식과 좋은 시간을 준비해놓겠습니다 😊`;
  }
  
  /**
   * 맺음말
   */
  private generateClosing(data: ProposalData): string {
    return `${data.creator.name}님의 소중한 시간 내어 읽어주셔서 감사합니다.

긍정적인 답변 기다리겠습니다!
편하신 방법으로 회신 주시면 더 자세히 상의드리겠습니다.

감사합니다 🙏`;
  }
  
  /**
   * 구독자 수 포맷
   */
  private formatSubscribers(subscribers: string): string {
    const num = parseInt(subscribers);
    if (num >= 1000000) {
      return `${Math.floor(num / 10000)}만`;
    } else if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}만`;
    } else if (num >= 1000) {
      return `${Math.floor(num / 1000)}천`;
    }
    return subscribers;
  }
  
  /**
   * 짧은 DM용 메시지 생성
   */
  generateDMMessage(data: ProposalData): string {
    return `안녕하세요 ${data.creator.name}님! 
${data.store.name}입니다 🙌

${data.creator.name}님의 팬이자 ${data.store.category} 매장을 운영하고 있습니다.
콜라보 제안드리고 싶어 DM 드립니다!

✅ 모든 메뉴 무료 제공
✅ 촬영 전폭 지원
✅ 구독자 이벤트 상품 지원

부담없이 놀러오세요! 😊
자세한 내용은 이메일로 보내드릴게요~`;
  }
}