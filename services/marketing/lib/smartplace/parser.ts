/**
 * SmartPlace Parser
 * 수집된 원시 데이터를 정규화하고 파싱
 */

import { RawSmartPlaceData } from '@/types/smartplace';

export class SmartPlaceParser {
  /**
   * 가격 문자열을 숫자로 변환
   */
  static parsePrice(priceString: string): number {
    // "15,000원" -> 15000
    const cleaned = priceString.replace(/[^0-9]/g, '');
    return parseInt(cleaned) || 0;
  }

  /**
   * 날짜 문자열 파싱
   */
  static parseDate(dateString: string): Date {
    // "24.01.15." or "2024.01.15." -> Date
    const cleaned = dateString.replace(/\./g, '-').replace(/-$/, '');
    
    // 연도가 2자리인 경우
    if (cleaned.match(/^\d{2}-/)) {
      return new Date(`20${cleaned}`);
    }
    
    return new Date(cleaned);
  }

  /**
   * 영업시간 파싱
   */
  static parseBusinessHours(hoursString: string): Record<string, { open: string; close: string }> {
    const hours: Record<string, { open: string; close: string }> = {};
    
    if (!hoursString) return hours;
    
    // 예: "매일 11:00 - 22:00"
    const dailyPattern = /매일\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
    const dailyMatch = hoursString.match(dailyPattern);
    
    if (dailyMatch) {
      const [, open, close] = dailyMatch;
      const days = ['월', '화', '수', '목', '금', '토', '일'];
      days.forEach(day => {
        hours[day] = { open, close };
      });
      return hours;
    }
    
    // 요일별 파싱 로직
    const dayPattern = /(월|화|수|목|금|토|일)요일?\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g;
    let match;
    
    while ((match = dayPattern.exec(hoursString)) !== null) {
      const [, day, open, close] = match;
      hours[day] = { open, close };
    }
    
    return hours;
  }

  /**
   * 카테고리 정규화
   */
  static normalizeCategory(category: string): {
    primary: string;
    secondary: string[];
  } {
    const categoryMap: Record<string, { primary: string; secondary: string[] }> = {
      '한식': { primary: '한식', secondary: ['한정식', '백반', '국밥'] },
      '치킨': { primary: '치킨', secondary: ['호프', '펍', '맥주'] },
      '카페': { primary: '카페', secondary: ['디저트', '베이커리', '브런치'] },
      '일식': { primary: '일식', secondary: ['스시', '라멘', '이자카야'] },
      '중식': { primary: '중식', secondary: ['중화요리', '마라탕', '딤섬'] },
      '양식': { primary: '양식', secondary: ['이탈리안', '프렌치', '스테이크'] },
      '분식': { primary: '분식', secondary: ['떡볶이', '김밥', '튀김'] },
      '술집': { primary: '술집', secondary: ['호프', '포차', '와인바'] },
      '고기': { primary: '고기', secondary: ['삼겹살', '갈비', '구이'] }
    };
    
    // 카테고리 매칭
    for (const [key, value] of Object.entries(categoryMap)) {
      if (category.includes(key)) {
        return value;
      }
    }
    
    // 매칭되지 않으면 원본 반환
    return { 
      primary: category, 
      secondary: [] 
    };
  }

  /**
   * 주소 파싱
   */
  static parseAddress(address: string): {
    city: string;
    district: string;
    neighborhood: string;
    detail: string;
  } {
    const parts = address.split(' ');
    
    return {
      city: parts[0] || '',
      district: parts[1] || '',
      neighborhood: parts[2] || '',
      detail: parts.slice(3).join(' ')
    };
  }

  /**
   * 리뷰 텍스트에서 감정 키워드 추출
   */
  static extractSentimentKeywords(text: string): {
    positive: string[];
    negative: string[];
    neutral: string[];
  } {
    const positiveKeywords = [
      '맛있', '좋', '최고', '추천', '만족', '친절', '깨끗', '신선', '훌륭',
      '굿', '대박', '짱', '예쁘', '분위기', '아늑', '편안', '가성비'
    ];
    
    const negativeKeywords = [
      '별로', '실망', '아쉽', '비싸', '불친절', '더럽', '오래', '느리',
      '짜', '싱겁', '맛없', '최악', '비추', '후회', '그냥'
    ];
    
    const result = {
      positive: [] as string[],
      negative: [] as string[],
      neutral: [] as string[]
    };
    
    positiveKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        result.positive.push(keyword);
      }
    });
    
    negativeKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        result.negative.push(keyword);
      }
    });
    
    // 중립 키워드는 긍정/부정이 없는 경우
    if (result.positive.length === 0 && result.negative.length === 0) {
      result.neutral.push('보통');
    }
    
    return result;
  }

  /**
   * 메뉴 카테고리 분류
   */
  static categorizeMenu(menuName: string): string {
    const categories: Record<string, string[]> = {
      '메인요리': ['스테이크', '파스타', '피자', '버거', '정식', '세트'],
      '사이드': ['샐러드', '스프', '감자튀김', '치즈스틱'],
      '음료': ['커피', '차', '주스', '콜라', '사이다', '맥주', '와인'],
      '디저트': ['케이크', '아이스크림', '푸딩', '마카롱', '쿠키']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => menuName.includes(keyword))) {
        return category;
      }
    }
    
    return '기타';
  }

  /**
   * 가격 레벨 판단
   */
  static determinePriceLevel(prices: number[]): 'budget' | 'moderate' | 'premium' | 'luxury' {
    if (prices.length === 0) return 'moderate';
    
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    if (average < 10000) return 'budget';
    if (average < 20000) return 'moderate';
    if (average < 40000) return 'premium';
    return 'luxury';
  }

  /**
   * 타겟 연령대 추출
   */
  static extractAgeGroups(reviews: string[]): string[] {
    const ageGroups = new Set<string>();
    const patterns = [
      { pattern: /10대|학생|고등학생|중학생/, group: '10대' },
      { pattern: /20대|대학생|청년/, group: '20대' },
      { pattern: /30대|직장인/, group: '30대' },
      { pattern: /40대|중년/, group: '40대' },
      { pattern: /50대|시니어/, group: '50대' },
      { pattern: /아이|어린이|가족|패밀리/, group: '가족' }
    ];
    
    reviews.forEach(review => {
      patterns.forEach(({ pattern, group }) => {
        if (pattern.test(review)) {
          ageGroups.add(group);
        }
      });
    });
    
    return Array.from(ageGroups);
  }

  /**
   * 방문 목적 추출
   */
  static extractVisitPurpose(reviews: string[]): string[] {
    const purposes = new Set<string>();
    const patterns = [
      { pattern: /데이트|연인|커플/, purpose: '데이트' },
      { pattern: /회식|모임|단체|파티/, purpose: '모임' },
      { pattern: /혼밥|혼자|혼술/, purpose: '혼밥/혼술' },
      { pattern: /가족|부모님|아이/, purpose: '가족모임' },
      { pattern: /비즈니스|미팅|업무/, purpose: '비즈니스' },
      { pattern: /친구|동료/, purpose: '친구모임' }
    ];
    
    reviews.forEach(review => {
      patterns.forEach(({ pattern, purpose }) => {
        if (pattern.test(review)) {
          purposes.add(purpose);
        }
      });
    });
    
    return Array.from(purposes);
  }

  /**
   * 인기 시간대 분석
   */
  static analyzePopularTimes(reviews: Array<{ date: string; visitedDate?: string }>): string[] {
    const timeSlots = {
      '아침': 0,
      '점심': 0,
      '저녁': 0,
      '심야': 0,
      '주말': 0
    };
    
    reviews.forEach(review => {
      const text = review.visitedDate || review.date;
      
      if (text.includes('아침') || text.includes('모닝')) timeSlots['아침']++;
      if (text.includes('점심') || text.includes('런치')) timeSlots['점심']++;
      if (text.includes('저녁') || text.includes('디너')) timeSlots['저녁']++;
      if (text.includes('밤') || text.includes('심야')) timeSlots['심야']++;
      if (text.includes('주말') || text.includes('토요일') || text.includes('일요일')) timeSlots['주말']++;
    });
    
    // 상위 2개 시간대 반환
    return Object.entries(timeSlots)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([slot]) => slot);
  }

  /**
   * 원시 데이터 정규화
   */
  static normalizeRawData(raw: RawSmartPlaceData): RawSmartPlaceData {
    // 메뉴 가격 파싱
    const normalizedMenu = raw.menuInfo.map(item => ({
      ...item,
      price: item.price
    }));
    
    // 리뷰 날짜 정규화
    const normalizedReviews = raw.reviews.map(review => ({
      ...review,
      date: review.date
    }));
    
    return {
      ...raw,
      menuInfo: normalizedMenu,
      reviews: normalizedReviews
    };
  }
}