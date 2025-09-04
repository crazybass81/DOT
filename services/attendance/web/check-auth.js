const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTEwMzAzNSwiZXhwIjoyMDUwNjc5MDM1fQ.3l7OW2fgPxUKJLx4xPFLWo89BFmE7dhCXnbmCfnp0IY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAuth() {
  console.log('🔍 Auth 시스템 체크 시작...\n')
  
  try {
    // 1. Auth Users 테이블 확인
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Auth users 조회 실패:', usersError)
      return
    }
    
    console.log(`📊 등록된 사용자 수: ${users?.length || 0}명`)
    
    if (users && users.length > 0) {
      console.log('\n최근 등록된 사용자:')
      users.slice(0, 3).forEach(user => {
        console.log(`- Email: ${user.email}`)
        console.log(`  ID: ${user.id}`)
        console.log(`  생성일: ${user.created_at}`)
        console.log(`  이메일 확인: ${user.email_confirmed_at ? '✅' : '❌ (미확인)'}`)
        console.log(`  메타데이터:`, user.user_metadata)
        console.log('')
      })
    }
    
    // 2. 이메일 확인 설정 체크
    console.log('\n📧 이메일 확인 설정:')
    console.log('Supabase 대시보드 > Authentication > Settings > Email Auth')
    console.log('- "Confirm email" 옵션이 활성화되어 있으면 이메일 확인 필요')
    console.log('- 비활성화하면 즉시 로그인 가능')
    
    // 3. 테스트 로그인
    const testEmail = users?.[0]?.email
    if (testEmail) {
      console.log(`\n🔑 테스트 로그인: ${testEmail}`)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'wrong_password_test'
      })
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          console.log('✅ 사용자는 존재함 (비밀번호만 틀림)')
        } else if (error.message.includes('Email not confirmed')) {
          console.log('⚠️ 이메일 확인 필요!')
        } else {
          console.log('❌ 로그인 에러:', error.message)
        }
      }
    }
    
    // 4. Employees 테이블 확인
    console.log('\n📋 Employees 테이블 확인:')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .limit(3)
    
    if (empError) {
      console.log('❌ Employees 테이블 조회 실패:', empError.message)
    } else {
      console.log(`Employees 레코드 수: ${employees?.length || 0}개`)
      employees?.forEach(emp => {
        console.log(`- ${emp.name} (${emp.email})`)
      })
    }
    
  } catch (error) {
    console.error('❌ 체크 중 오류:', error)
  }
}

checkAuth()