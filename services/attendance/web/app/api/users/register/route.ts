import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../src/lib/supabase-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, phone } = body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null
        }
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      );
    }

    // Step 2: Create unified identity record
    const { data: identityData, error: identityError } = await supabase
      .from('unified_identities')
      .insert({
        email,
        full_name: fullName,
        phone: phone || null,
        id_type: 'personal',
        auth_user_id: authData.user.id,
        is_active: true,
        metadata: {
          registration_method: 'web_form',
          created_at: new Date().toISOString()
        },
        login_count: 0
      })
      .select()
      .single();

    if (identityError) {
      console.error('Identity creation error:', identityError);
      
      // Clean up auth user if identity creation failed
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { error: 'Failed to create user identity' },
        { status: 500 }
      );
    }

    // Step 3: Return success response
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: identityData.id,
        email: identityData.email,
        fullName: identityData.full_name,
        phone: identityData.phone,
        authUserId: authData.user.id
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}