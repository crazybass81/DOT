import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    try {
      // 인증 코드를 세션으로 교환
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error.message)
        return NextResponse.redirect(`${requestUrl.origin}/auth/error?message=${encodeURIComponent(error.message)}`)
      }

      if (data?.user) {
        console.log('User authenticated successfully:', data.user.email)
        
        // 세션 쿠키 설정을 위해 응답 생성
        const response = NextResponse.redirect(`${requestUrl.origin}/auth/success`)
        
        // 세션 정보를 쿠키에 설정 (선택적)
        if (data.session) {
          response.cookies.set('supabase-auth-token', data.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7일
          })
        }
        
        return response
      }
    } catch (error) {
      console.error('Unexpected auth error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?message=${encodeURIComponent('Unexpected error occurred')}`)
    }
  }

  // 코드가 없는 경우 에러 페이지로
  return NextResponse.redirect(`${requestUrl.origin}/auth/error?message=${encodeURIComponent('No authorization code provided')}`)
}