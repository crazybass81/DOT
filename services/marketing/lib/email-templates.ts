import { EmailTemplate } from '@/types';

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'general-collab',
    name: '일반 협업 제안',
    category: 'general',
    subject: '[{{restaurantName}}] 유튜브 콘텐츠 협업 제안드립니다',
    variables: ['creatorName', 'restaurantName', 'location', 'specialMenu'],
    body: `안녕하세요, {{creatorName}}님!

{{restaurantName}}에서 인사드립니다. 

{{creatorName}}님의 유튜브 채널을 즐겁게 시청하고 있는 팬이자, 
{{location}}에서 {{specialMenu}}로 유명한 {{restaurantName}}의 대표입니다.

{{creatorName}}님의 콘텐츠 스타일과 저희 레스토랑이 추구하는 가치가 
잘 맞을 것 같아 협업을 제안드리게 되었습니다.

저희가 제안드리는 협업 내용:
• 모든 메뉴 무료 제공
• 동반 1인 초대
• 추가 협찬금 논의 가능
• 향후 지속적인 파트너십 가능

{{creatorName}}님의 일정에 맞춰 편하신 시간에 방문해 주시면 
최고의 서비스와 음식으로 모시겠습니다.

관심 있으시다면 편하게 답변 부탁드립니다.

감사합니다.

{{restaurantName}} 드림
연락처: {{contactInfo}}`,
  },
  {
    id: 'product-review',
    name: '제품 리뷰',
    category: 'review',
    subject: '{{creatorName}}님께 맛있는 리뷰 제안 🍜',
    variables: ['creatorName', 'restaurantName', 'productName', 'uniquePoint'],
    body: `안녕하세요, {{creatorName}}님!

{{creatorName}}님의 먹방 콘텐츠를 정말 재미있게 보고 있습니다.

저희 {{restaurantName}}의 시그니처 메뉴 '{{productName}}'을 
{{creatorName}}님의 솔직한 리뷰로 소개해 주실 수 있을까 해서 연락드립니다.

'{{productName}}'의 특별한 점:
• {{uniquePoint}}
• 100% 국내산 재료 사용
• 하루 한정 수량만 제공

리뷰 조건:
• 제품 무료 제공 (테이크아웃 or 매장)
• 원하시는 사이드 메뉴 추가 제공
• 솔직한 평가 100% 보장
• 협찬 명시만 부탁드립니다

{{creatorName}}님의 입맛에 꼭 맞을 거라 확신합니다!
편하신 방법으로 연락 주시면 자세히 안내드리겠습니다.

맛있는 하루 되세요! 🍴

{{restaurantName}} 드림`,
  },
  {
    id: 'visit-review',
    name: '방문 리뷰',
    category: 'visit',
    subject: '{{restaurantName}}에서 {{creatorName}}님을 초대합니다',
    variables: ['creatorName', 'restaurantName', 'atmosphere', 'bestTime'],
    body: `{{creatorName}}님, 안녕하세요!

{{atmosphere}}로 유명한 {{restaurantName}}입니다.

{{creatorName}}님을 저희 레스토랑에 특별 초대하고 싶습니다.
방문하셔서 자유롭게 콘텐츠를 제작해 주시면 감사하겠습니다.

특별 혜택:
• 전 메뉴 무료 (인원 제한 없음)
• {{bestTime}} 프라이빗 공간 제공
• 촬영에 필요한 모든 지원
• 주차 무료

저희가 바라는 것:
• 자연스러운 방문 후기
• {{creatorName}}님만의 스타일로 소개
• 협찬 표시만 부탁드립니다

날짜와 시간은 {{creatorName}}님 일정에 100% 맞춰드립니다.

특별한 경험을 준비해서 기다리겠습니다!

{{restaurantName}}
위치: {{location}}
예약: {{contactInfo}}`,
  },
  {
    id: 'event-collab',
    name: '이벤트 협업',
    category: 'event',
    subject: '🎉 {{eventName}} 이벤트에 {{creatorName}}님을 모십니다',
    variables: ['creatorName', 'restaurantName', 'eventName', 'eventDate', 'eventBenefit'],
    body: `{{creatorName}}님, 안녕하세요!

{{restaurantName}}에서 {{eventDate}}에 진행하는 
'{{eventName}}' 이벤트에 {{creatorName}}님을 특별 게스트로 모시고 싶습니다.

이벤트 개요:
• 일시: {{eventDate}}
• 특전: {{eventBenefit}}
• {{creatorName}}님 전용 특별 메뉴 제공
• 구독자 이벤트 공동 진행 가능

{{creatorName}}님께 제공되는 혜택:
• 출연료 협의
• 모든 메뉴 무료 제공
• 구독자 초대 이벤트 지원
• 향후 정기 협업 기회

이번 이벤트가 {{creatorName}}님 채널에도 
특별한 콘텐츠가 될 수 있을 것 같습니다.

참여 의향이 있으시다면 연락 부탁드립니다.
자세한 내용 설명드리겠습니다.

기대하며 기다리겠습니다!

{{restaurantName}} 이벤트팀
{{contactInfo}}`,
  },
  {
    id: 'long-term',
    name: '장기 파트너십',
    category: 'partnership',
    subject: '{{restaurantName}} X {{creatorName}} 파트너십 제안',
    variables: ['creatorName', 'restaurantName', 'monthlyBenefit', 'duration'],
    body: `{{creatorName}}님께,

{{restaurantName}}입니다.

{{creatorName}}님과 장기 파트너십을 맺고 싶어 연락드립니다.
일회성 협업이 아닌, 지속적인 Win-Win 관계를 제안합니다.

파트너십 조건:
• 기간: {{duration}}
• 월 {{monthlyBenefit}} 제공
• 월 1회 콘텐츠 제작
• 신메뉴 우선 체험권
• 특별 이벤트 우선 초대

{{creatorName}}님께 바라는 점:
• 월 1회 자연스러운 콘텐츠
• SNS 스토리 가능하실 때 소개
• 저희 브랜드 앰버서더 활동

추가 혜택:
• {{creatorName}}님 추천 메뉴 개발
• 콜라보 메뉴 런칭 가능
• 구독자 할인 이벤트 지원

{{creatorName}}님과 함께 성장하고 싶습니다.
관심 있으시다면 자세한 조건 논의하고 싶습니다.

긍정적인 답변 기다리겠습니다.

{{restaurantName}} 마케팅팀
{{contactInfo}}`,
  },
];

export class EmailTemplateEngine {
  private templates: Map<string, EmailTemplate>;

  constructor() {
    this.templates = new Map(emailTemplates.map(t => [t.id, t]));
  }

  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  getAllTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: string): EmailTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  fillTemplate(templateId: string, variables: Record<string, string>): {
    subject: string;
    body: string;
  } | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    let filledSubject = template.subject;
    let filledBody = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      filledSubject = filledSubject.replace(regex, value);
      filledBody = filledBody.replace(regex, value);
    }

    return {
      subject: filledSubject,
      body: filledBody,
    };
  }

  validateVariables(templateId: string, variables: Record<string, string>): {
    valid: boolean;
    missing: string[];
  } {
    const template = this.templates.get(templateId);
    if (!template) {
      return { valid: false, missing: [] };
    }

    const missing = template.variables.filter(v => !variables[v]);
    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

export const emailTemplateEngine = new EmailTemplateEngine();