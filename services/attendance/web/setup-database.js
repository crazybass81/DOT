const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTEwMzAzNSwiZXhwIjoyMDUwNjc5MDM1fQ.3l7OW2fgPxUKJLx4xPFLWo89BFmE7dhCXnbmCfnp0IY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDatabase() {
  console.log('📦 데이터베이스 설정 시작...')
  
  try {
    // 1. organizations 테이블 확인 및 생성
    const { data: orgCheck } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
    
    if (!orgCheck) {
      console.log('❌ organizations 테이블이 없습니다. SQL Editor에서 수동으로 생성해주세요.')
    } else {
      console.log('✅ organizations 테이블 확인됨')
    }
    
    // 2. employees 테이블 확인
    const { data: empCheck, error: empError } = await supabase
      .from('employees')
      .select('id')
      .limit(1)
    
    if (empError?.code === '42P01') {
      console.log('❌ employees 테이블이 없습니다. SQL Editor에서 수동으로 생성해주세요.')
    } else {
      console.log('✅ employees 테이블 확인됨')
    }
    
    // 3. user_roles 테이블 확인
    const { data: roleCheck, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .limit(1)
    
    if (roleError?.code === '42P01') {
      console.log('❌ user_roles 테이블이 없습니다. SQL Editor에서 수동으로 생성해주세요.')
    } else {
      console.log('✅ user_roles 테이블 확인됨')
    }
    
    // 4. contracts 테이블 확인
    const { data: contractCheck, error: contractError } = await supabase
      .from('contracts')
      .select('id')
      .limit(1)
    
    if (contractError?.code === '42P01') {
      console.log('❌ contracts 테이블이 없습니다. SQL Editor에서 수동으로 생성해주세요.')
    } else {
      console.log('✅ contracts 테이블 확인됨')
    }
    
    console.log('\n📝 다음 단계:')
    console.log('1. Supabase 대시보드 접속: https://supabase.com/dashboard/project/mljyiuzetchtjudbcfvd')
    console.log('2. SQL Editor 메뉴 클릭')
    console.log('3. create-tables-safe.sql 파일 내용 실행')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
  }
}

setupDatabase()