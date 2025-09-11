import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error.message)
        return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error`)
      }

      if (data?.user) {
        console.log('User authenticated:', data.user.email)
        
        // 인증 성공 후 대시보드로 리다이렉트
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      }
    } catch (error) {
      console.error('Unexpected auth error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error`)
    }
  }

  // 코드가 없거나 다른 문제가 있는 경우 홈페이지로 리다이렉트
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}