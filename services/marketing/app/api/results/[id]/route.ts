/**
 * Results Retrieval API
 * GET /api/results/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, NotFoundError, handleError } from '@/lib/errors';
import { AnalysisStorage } from '@/lib/storage/analysis-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { 
          error: '잘못된 분석 ID',
          message: '올바른 분석 ID를 제공해주세요' 
        },
        { status: 400 }
      );
    }
    
    console.log('🔍 Retrieving analysis result for ID:', id);
    
    const result = AnalysisStorage.get(id);
    
    if (!result) {
      return NextResponse.json(
        { 
          error: '분석 결과를 찾을 수 없습니다',
          message: '분석 ID를 확인하거나 새로 분석을 시작해주세요',
          analysisId: id
        },
        { status: 404 }
      );
    }
    
    // Add retrieval metadata
    const response = {
      success: true,
      ...result,
      retrievedAt: new Date().toISOString(),
      cached: true
    };
    
    console.log('✅ Analysis result retrieved successfully');
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Results API error:', error);
    const handledError = handleError(error);
    
    return NextResponse.json(
      { 
        error: handledError.message,
        statusCode: handledError.statusCode,
        timestamp: handledError.timestamp
      },
      { status: handledError.statusCode }
    );
  }
}

// PUT method - Update analysis result (MVP: not implemented)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    {
      error: '업데이트 기능 지원 예정',
      message: 'PUT /api/results/[id] 는 추후 버전에서 지원됩니다'
    },
    { status: 501 }
  );
}

// DELETE method - Delete analysis result (MVP: not implemented)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    {
      error: '삭제 기능 지원 예정',
      message: 'DELETE /api/results/[id] 는 추후 버전에서 지원됩니다'
    },
    { status: 501 }
  );
}
