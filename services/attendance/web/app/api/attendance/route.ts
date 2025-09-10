import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/lib/supabase-config';
import { validateWithSchema } from '../../../src/lib/validation';
import { z } from 'zod';

// Supabase 클라이언트 초기화
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// 출근 기록 생성 스키마
const CheckInSchema = z.object({
  employee_id: z.string().uuid(),
  business_id: z.string().uuid(),
  check_in_time: z.string().datetime().optional(),
  work_date: z.string().optional(),
  check_in_location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
    accuracy: z.number().optional()
  }).optional(),
  verification_method: z.enum(['gps', 'qr', 'manual']).default('manual'),
  notes: z.string().optional()
});

// 퇴근 기록 업데이트 스키마
const CheckOutSchema = z.object({
  attendance_id: z.string().uuid(),
  check_out_time: z.string().datetime().optional(),
  check_out_location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
    accuracy: z.number().optional()
  }).optional(),
  break_time_minutes: z.number().min(0).default(0),
  overtime_minutes: z.number().min(0).default(0),
  notes: z.string().optional()
});

// GET: 출근 기록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const businessId = searchParams.get('business_id');
    const workDate = searchParams.get('work_date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 기본 쿼리 구성
    let query = supabase
      .from('attendance_records')
      .select(`
        id,
        created_at,
        updated_at,
        employee_id,
        business_id,
        check_in_time,
        check_out_time,
        work_date,
        check_in_location,
        check_out_location,
        verification_method,
        status,
        notes,
        break_time_minutes,
        overtime_minutes
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // 필터 적용
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (businessId) {
      query = query.eq('business_id', businessId);
    }
    if (workDate) {
      query = query.eq('work_date', workDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('출근 기록 조회 오류:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    });

  } catch (error) {
    console.error('GET /api/attendance 오류:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 출근 기록 생성 (체크인)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 검증
    const validation = validateWithSchema(CheckInSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: '입력 데이터가 올바르지 않습니다', details: validation.errors },
        { status: 400 }
      );
    }

    const validatedData = validation.data;
    
    // 현재 시간 설정
    const checkInTime = validatedData.check_in_time || new Date().toISOString();
    const workDate = validatedData.work_date || checkInTime.split('T')[0];

    // 오늘 이미 출근 기록이 있는지 확인
    const { data: existingRecord, error: checkError } = await supabase
      .from('attendance_records')
      .select('id, status')
      .eq('employee_id', validatedData.employee_id)
      .eq('business_id', validatedData.business_id)
      .eq('work_date', workDate)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('기존 기록 확인 오류:', checkError);
      return NextResponse.json(
        { success: false, error: '기존 기록 확인 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    if (existingRecord) {
      return NextResponse.json(
        { 
          success: false, 
          error: '오늘 이미 출근 기록이 있습니다',
          existing_record: existingRecord
        },
        { status: 409 }
      );
    }

    // 새 출근 기록 생성
    const newRecord = {
      employee_id: validatedData.employee_id,
      business_id: validatedData.business_id,
      check_in_time: checkInTime,
      work_date: workDate,
      check_in_location: validatedData.check_in_location,
      verification_method: validatedData.verification_method,
      status: 'active' as const,
      notes: validatedData.notes,
      break_time_minutes: 0,
      overtime_minutes: 0
    };

    const { data, error } = await supabase
      .from('attendance_records')
      .insert(newRecord)
      .select()
      .single();

    if (error) {
      console.error('출근 기록 생성 오류:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '출근 기록이 성공적으로 생성되었습니다',
      data
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/attendance 오류:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: 출근 기록 업데이트 (체크아웃)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 검증
    const validation = validateWithSchema(CheckOutSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: '입력 데이터가 올바르지 않습니다', details: validation.errors },
        { status: 400 }
      );
    }

    const validatedData = validation.data;
    
    // 현재 시간 설정
    const checkOutTime = validatedData.check_out_time || new Date().toISOString();

    // 기존 출근 기록 확인
    const { data: existingRecord, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', validatedData.attendance_id)
      .single();

    if (fetchError) {
      console.error('기존 기록 조회 오류:', fetchError);
      return NextResponse.json(
        { success: false, error: '출근 기록을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (existingRecord.check_out_time) {
      return NextResponse.json(
        { success: false, error: '이미 퇴근 처리된 기록입니다' },
        { status: 409 }
      );
    }

    // 퇴근 기록 업데이트
    const updateData = {
      check_out_time: checkOutTime,
      check_out_location: validatedData.check_out_location,
      break_time_minutes: validatedData.break_time_minutes,
      overtime_minutes: validatedData.overtime_minutes,
      status: 'completed' as const,
      notes: validatedData.notes || existingRecord.notes,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', validatedData.attendance_id)
      .select()
      .single();

    if (error) {
      console.error('퇴근 기록 업데이트 오류:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '퇴근 기록이 성공적으로 업데이트되었습니다',
      data
    });

  } catch (error) {
    console.error('PUT /api/attendance 오류:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: 출근 기록 삭제 (관리자 전용)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendanceId = searchParams.get('id');

    if (!attendanceId) {
      return NextResponse.json(
        { success: false, error: '출근 기록 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // TODO: 관리자 권한 확인 로직 추가
    // const userRole = await getUserRole(request);
    // if (!['admin', 'master'].includes(userRole)) {
    //   return NextResponse.json(
    //     { success: false, error: '권한이 없습니다' },
    //     { status: 403 }
    //   );
    // }

    const { data, error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) {
      console.error('출근 기록 삭제 오류:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '출근 기록이 성공적으로 삭제되었습니다',
      data
    });

  } catch (error) {
    console.error('DELETE /api/attendance 오류:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}