import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../src/lib/supabase-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      phone, 
      birthDate, 
      accountNumber, 
      businessId, 
      locationId, 
      deviceFingerprint 
    } = body;

    // Validate required fields
    if (!name || !phone || !birthDate) {
      return NextResponse.json(
        { error: '필수 정보를 모두 입력해주세요' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/;
    if (!phoneRegex.test(phone.replace(/-/g, ''))) {
      return NextResponse.json(
        { error: '올바른 전화번호 형식이 아닙니다' },
        { status: 400 }
      );
    }

    // Step 1: Check if user already exists (using unified_identities table)
    const { data: existingUser, error: checkError } = await supabase
      .from('unified_identities')
      .select('id, full_name, phone, is_active')
      .eq('phone', phone.replace(/-/g, ''))
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('User identity check error:', checkError);
      return NextResponse.json(
        { error: '등록 확인 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 등록된 전화번호입니다' },
        { status: 400 }
      );
    }

    // Step 2: Create user identity record (following ID-ROLE-PAPER system)
    const userIdentityData = {
      full_name: name,
      phone: phone.replace(/-/g, ''), // Store without hyphens
      id_type: 'personal', // Default to personal identity
      is_active: true,
      metadata: {
        registration_method: 'qr_scan',
        birth_date: birthDate,
        account_number: accountNumber || null,
        business_id: businessId || null,
        location_id: locationId || null,
        device_fingerprint: deviceFingerprint || null,
        registration_timestamp: new Date().toISOString()
      }
    };

    const { data: userIdentity, error: identityError } = await supabase
      .from('unified_identities')
      .insert(userIdentityData)
      .select()
      .single();

    if (identityError) {
      console.error('User identity creation error:', identityError);
      return NextResponse.json(
        { error: '사용자 등록 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    // Step 3: Log registration event
    await supabase
      .from('audit_logs')
      .insert({
        action: 'user_identity_registration',
        table_name: 'unified_identities',
        record_id: userIdentity.id,
        user_id: userIdentity.id,
        metadata: {
          registration_method: 'qr_scan',
          business_id: businessId,
          location_id: locationId,
          device_fingerprint: deviceFingerprint
        }
      });

    // Step 4: Return success response
    return NextResponse.json({
      success: true,
      message: '등록이 완료되었습니다',
      user: {
        id: userIdentity.id,
        name: userIdentity.full_name,
        phone: userIdentity.phone,
        idType: userIdentity.id_type,
        isActive: userIdentity.is_active
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '등록 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}