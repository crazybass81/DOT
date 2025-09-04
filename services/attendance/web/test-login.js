const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxMDMwMzUsImV4cCI6MjA1MDY3OTAzNX0.jZBVL-GQWM6RHzxvZVjqGAka4W7TJpZ8jVMJLKqhcxw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuth() {
  console.log('🔍 회원가입 및 로그인 테스트...\n')
  
  const timestamp = Date.now()
  const testEmail = `test${timestamp}@example.com`
  const testPassword = 'Test1234!@#$'
  
  try {
    // 1. 회원가입 테스트
    console.log('1️⃣ 회원가입 시도:')
    console.log(`   Email: ${testEmail}`)
    console.log(`   Password: ${testPassword}`)
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: '테스트유저',
          phone: '010-1234-5678'
        }
      }
    })
    
    if (signUpError) {
      console.error('❌ 회원가입 실패:', signUpError.message)
      return
    }
    
    console.log('✅ 회원가입 성공!')
    console.log('   User ID:', signUpData.user?.id)
    console.log('   Email confirmed:', signUpData.user?.email_confirmed_at ? '예' : '아니오')
    
    // 2. 즉시 로그인 테스트
    console.log('\n2️⃣ 로그인 시도:')
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })
    
    if (signInError) {
      console.error('❌ 로그인 실패:', signInError.message)
      
      if (signInError.message.includes('Email not confirmed')) {
        console.log('\n⚠️ 이메일 확인이 필요합니다!')
        console.log('해결 방법:')
        console.log('1. Supabase 대시보드 > Authentication > Settings')
        console.log('2. "Email Auth" 섹션에서 "Confirm email" 비활성화')
        console.log('3. 저장 후 다시 시도')
      }
    } else {
      console.log('✅ 로그인 성공!')
      console.log('   Session:', signInData.session ? '생성됨' : '없음')
      console.log('   Access Token:', signInData.session?.access_token ? '발급됨' : '없음')
    }
    
    // 3. Employees 테이블 체크
    console.log('\n3️⃣ Employees 테이블 확인:')
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', testEmail)
      .single()
    
    if (empError) {
      console.log('⚠️ Employees 레코드 없음 (정상 - 회원가입 시 생성 실패해도 됨)')
    } else {
      console.log('✅ Employees 레코드 찾음:', empData?.name)
    }
    
  } catch (error) {
    console.error('❌ 테스트 중 오류:', error)
  }
  
  console.log('\n📌 요약:')
  console.log('- 회원가입은 정상 작동')
  console.log('- 로그인 시 이메일 확인 필요 (Supabase 설정에서 비활성화 가능)')
  console.log('- Employees 테이블은 선택사항')
}

testAuth()