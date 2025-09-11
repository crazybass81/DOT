#!/usr/bin/env node

/**
 * Script to check registered accounts in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAccounts() {
  try {
    console.log('🔍 데이터베이스 계정 확인 중...\n');

    // Check auth.users table
    console.log('📋 auth.users 테이블:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth users 조회 실패:', authError.message);
    } else {
      console.log(`총 ${authUsers.users.length}개 계정 발견:`);
      authUsers.users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
        console.log(`   생성일: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`   확인됨: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    // Check profiles table
    console.log('\n📋 profiles 테이블:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Profiles 조회 실패:', profilesError.message);
    } else {
      console.log(`총 ${profiles.length}개 프로필 발견:`);
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.name} (${profile.email})`);
        console.log(`   Role: ${profile.role}`);
        console.log(`   ID: ${profile.id}`);
        console.log('');
      });
    }

    // Check unified_identities table if it exists
    console.log('\n📋 unified_identities 테이블:');
    const { data: identities, error: identitiesError } = await supabase
      .from('unified_identities')
      .select('*');
    
    if (identitiesError) {
      console.log('⚠️  unified_identities 테이블 없음 또는 접근 불가:', identitiesError.message);
    } else {
      console.log(`총 ${identities.length}개 identity 발견:`);
      identities.forEach((identity, index) => {
        console.log(`${index + 1}. ${identity.full_name} (${identity.email})`);
        console.log(`   Auth User ID: ${identity.auth_user_id}`);
        console.log('');
      });
    }

    // Check role_assignments table if it exists
    console.log('\n📋 role_assignments 테이블:');
    const { data: roles, error: rolesError } = await supabase
      .from('role_assignments')
      .select('*');
    
    if (rolesError) {
      console.log('⚠️  role_assignments 테이블 없음 또는 접근 불가:', rolesError.message);
    } else {
      console.log(`총 ${roles.length}개 role assignment 발견:`);
      roles.forEach((role, index) => {
        console.log(`${index + 1}. Role: ${role.role}`);
        console.log(`   Employee Code: ${role.employee_code}`);
        console.log(`   Department: ${role.department}`);
        console.log(`   Active: ${role.is_active}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ 데이터베이스 확인 중 오류:', error);
  }
}

checkAccounts();