#!/usr/bin/env python3
"""
네이버 스마트플레이스 스크래퍼
AWS Lambda 배포를 위한 Python 구현
"""

import json
import asyncio
import re
from typing import Dict, List, Optional, Any
from datetime import datetime
from urllib.parse import urlparse, parse_qs

from playwright.async_api import async_playwright, Page, Browser
from bs4 import BeautifulSoup


class SmartPlaceScraper:
    """네이버 스마트플레이스 스크래퍼"""
    
    def __init__(self, headless: bool = True, debug: bool = False):
        self.headless = headless
        self.debug = debug
        self.browser: Optional[Browser] = None
        self.playwright = None
        
    async def __aenter__(self):
        """Context manager 진입"""
        await self.initialize()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager 종료"""
        await self.close()
        
    async def initialize(self):
        """브라우저 초기화"""
        self.playwright = await async_playwright().start()
        
        # Lambda 환경을 위한 설정
        browser_args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
        
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=browser_args
        )
        
        if self.debug:
            print("브라우저 초기화 완료")
    
    async callable(self):
        """브라우저 종료"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
            
    async def scrape(self, url: str) -> Dict[str, Any]:
        """
        스마트플레이스 페이지 스크래핑
        
        Args:
            url: 네이버 스마트플레이스 URL
            
        Returns:
            스크래핑된 데이터
        """
        context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 720},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            locale='ko-KR'
        )
        
        page = await context.new_page()
        
        try:
            # URL 처리
            final_url = await self._navigate_to_store(page, url)
            
            if self.debug:
                print(f"최종 URL: {final_url}")
            
            # 페이지 로드 대기
            await page.wait_for_timeout(3000)
            
            # 직접 평가로 데이터 추출
            extracted_data = await self._extract_with_evaluate(page)
            
            # BeautifulSoup으로 추가 파싱
            html_content = await page.content()
            soup_data = self._extract_with_soup(html_content)
            
            # 데이터 병합
            merged_data = self._merge_data(extracted_data, soup_data)
            
            return {
                'success': True,
                'data': merged_data,
                'url': final_url,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"스크래핑 실패: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'url': url,
                'timestamp': datetime.now().isoformat()
            }
            
        finally:
            await context.close()
    
    async def _navigate_to_store(self, page: Page, url: str) -> str:
        """스마트플레이스 페이지로 이동"""
        
        # 단축 URL 처리
        if 'naver.me' in url:
            await page.goto(url, wait_until='domcontentloaded')
            await page.wait_for_timeout(2000)
            url = page.url
            
        # 모바일 URL을 PC 버전으로 변환
        if 'm.place.naver.com' in url or 'map.naver.com' in url:
            place_id_match = re.search(r'(\d{8,})', url)
            if place_id_match:
                url = f'https://pcmap.place.naver.com/restaurant/{place_id_match.group(1)}/home'
        
        await page.goto(url, wait_until='networkidle')
        return page.url
    
    async def _extract_with_evaluate(self, page: Page) -> Dict[str, Any]:
        """JavaScript 평가를 통한 데이터 추출"""
        
        data = await page.evaluate('''() => {
            const result = {
                basicInfo: {},
                menuItems: [],
                reviews: [],
                images: [],
                raw: {}
            };
            
            try {
                // 1. Window 객체에서 데이터 찾기
                const possibleDataKeys = [
                    '__PLACE_STATE__',
                    '__APOLLO_STATE__',
                    'PLACE_STATE',
                    '__NEXT_DATA__'
                ];
                
                for (const key of possibleDataKeys) {
                    if (window[key]) {
                        result.raw[key] = window[key];
                        console.log(`Found data in window.${key}`);
                    }
                }
                
                // 2. Meta 태그 정보
                document.querySelectorAll('meta').forEach(meta => {
                    const property = meta.getAttribute('property') || meta.getAttribute('name');
                    const content = meta.getAttribute('content');
                    
                    if (property && content) {
                        if (property.includes('title')) {
                            result.basicInfo.name = content;
                        }
                        if (property.includes('description')) {
                            result.basicInfo.description = content;
                        }
                        if (property.includes('image')) {
                            result.images.push(content);
                        }
                    }
                });
                
                // 3. JSON-LD 구조화된 데이터
                const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
                jsonLdElements.forEach(element => {
                    try {
                        const data = JSON.parse(element.textContent);
                        if (data['@type'] === 'Restaurant' || data['@type']?.includes('Restaurant')) {
                            Object.assign(result.basicInfo, {
                                name: data.name,
                                address: data.address?.streetAddress,
                                telephone: data.telephone,
                                priceRange: data.priceRange,
                                rating: data.aggregateRating?.ratingValue,
                                reviewCount: data.aggregateRating?.reviewCount
                            });
                        }
                        result.raw.jsonLd = data;
                    } catch (e) {}
                });
                
                // 4. 일반적인 셀렉터로 시도
                const selectors = {
                    name: ['h1', 'h2', '[class*="name"]', '[class*="title"]'],
                    category: ['[class*="category"]', '[class*="type"]'],
                    address: ['[class*="address"]', '[class*="location"]'],
                    phone: ['[class*="phone"]', '[class*="tel"]']
                };
                
                for (const [key, selectorList] of Object.entries(selectors)) {
                    for (const selector of selectorList) {
                        if (!result.basicInfo[key]) {
                            const element = document.querySelector(selector);
                            if (element) {
                                result.basicInfo[key] = element.textContent.trim();
                                break;
                            }
                        }
                    }
                }
                
                // 5. 이미지 수집
                document.querySelectorAll('img').forEach(img => {
                    const src = img.src || img.dataset.src;
                    if (src && src.includes('pstatic') && !src.includes('icon')) {
                        result.images.push(src);
                    }
                });
                
            } catch (error) {
                result.error = error.toString();
            }
            
            return result;
        }''')
        
        return data
    
    def _extract_with_soup(self, html: str) -> Dict[str, Any]:
        """BeautifulSoup을 사용한 추가 데이터 추출"""
        
        soup = BeautifulSoup(html, 'html.parser')
        data = {
            'basicInfo': {},
            'menuItems': [],
            'reviews': []
        }
        
        # 다양한 패턴으로 정보 추출
        patterns = {
            'name': ['span.GHAhO', 'span.Fc1rA', 'h2.place_title'],
            'category': ['span.lnJFt', 'span.DJJvD'],
            'address': ['span.IH7VW', 'span.LDgIH'],
            'phone': ['span.xlx7Q']
        }
        
        for key, selectors in patterns.items():
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    data['basicInfo'][key] = element.get_text(strip=True)
                    break
        
        # 메뉴 아이템 추출
        menu_items = soup.select('li.E2jtL')
        for item in menu_items[:20]:
            name_elem = item.select_one('span.lPzHi')
            price_elem = item.select_one('div._3qFuX')
            
            if name_elem:
                data['menuItems'].append({
                    'name': name_elem.get_text(strip=True),
                    'price': price_elem.get_text(strip=True) if price_elem else ''
                })
        
        # 리뷰 추출
        reviews = soup.select('li.pui__X35jYm')
        for review in reviews[:10]:
            rating_elem = review.select_one('span.pui__bMWJiy')
            text_elem = review.select_one('a.pui__xtsQN-')
            date_elem = review.select_one('time span')
            
            if text_elem:
                data['reviews'].append({
                    'rating': self._extract_rating(rating_elem.get_text() if rating_elem else ''),
                    'text': text_elem.get_text(strip=True),
                    'date': date_elem.get_text(strip=True) if date_elem else ''
                })
        
        return data
    
    def _extract_rating(self, text: str) -> float:
        """별점 텍스트에서 숫자 추출"""
        match = re.search(r'(\d+)', text)
        return float(match.group(1)) if match else 0.0
    
    def _merge_data(self, eval_data: Dict, soup_data: Dict) -> Dict[str, Any]:
        """추출된 데이터 병합"""
        
        merged = {
            'basicInfo': {
                **soup_data.get('basicInfo', {}),
                **eval_data.get('basicInfo', {})
            },
            'menuItems': eval_data.get('menuItems', []) + soup_data.get('menuItems', []),
            'reviews': eval_data.get('reviews', []) + soup_data.get('reviews', []),
            'images': eval_data.get('images', [])[:10],
            'statistics': {
                'rating': eval_data.get('basicInfo', {}).get('rating', 0),
                'reviewCount': eval_data.get('basicInfo', {}).get('reviewCount', 0)
            }
        }
        
        # 중복 제거
        merged['menuItems'] = list({item['name']: item for item in merged['menuItems']}.values())[:20]
        merged['reviews'] = merged['reviews'][:10]
        
        return merged


# Lambda 핸들러
def lambda_handler(event, context):
    """AWS Lambda 핸들러"""
    
    url = event.get('url')
    if not url:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'URL is required'})
        }
    
    # 동기 실행을 위한 래퍼
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        result = loop.run_until_complete(scrape_store(url))
        
        return {
            'statusCode': 200 if result['success'] else 500,
            'body': json.dumps(result, ensure_ascii=False)
        }
    finally:
        loop.close()


async def scrape_store(url: str) -> Dict[str, Any]:
    """비동기 스크래핑 함수"""
    async with SmartPlaceScraper(headless=True) as scraper:
        return await scraper.scrape(url)


# CLI 실행
if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python smartplace_scraper.py <URL>")
        sys.exit(1)
    
    url = sys.argv[1]
    result = asyncio.run(scrape_store(url))
    
    print(json.dumps(result, ensure_ascii=False, indent=2))