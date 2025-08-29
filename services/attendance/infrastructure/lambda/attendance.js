const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// DynamoDB 클라이언트 초기화
const client = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Firebase에서 전달된 출퇴근 기록을 DynamoDB에 저장
 * 듀얼 라이트 패턴의 영구 저장소 역할
 */
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event;
    
    // 필수 필드 검증
    const { employeeId, checkType, location, deviceId, verificationMethod } = body;
    
    if (!employeeId || !checkType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }
    
    const timestamp = Date.now();
    const date = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 출퇴근 기록 저장
    const attendanceRecord = {
      employee_id: employeeId,
      timestamp,
      date,
      check_type: checkType, // "IN" or "OUT"
      location: location || null,
      device_id: deviceId || 'unknown',
      verification_method: verificationMethod || 'QR',
      department_id: body.departmentId || 'unknown',
      shift_id: body.shiftId || null,
      created_at: timestamp,
      expires_at: Math.floor(timestamp / 1000) + (90 * 24 * 60 * 60), // 90일 TTL
    };
    
    // DynamoDB에 저장
    await docClient.send(new PutCommand({
      TableName: process.env.ATTENDANCE_TABLE,
      Item: attendanceRecord,
      ConditionExpression: 'attribute_not_exists(employee_id) AND attribute_not_exists(#ts)',
      ExpressionAttributeNames: {
        '#ts': 'timestamp',
      },
    }));
    
    // 감사 로그 저장
    await saveAuditLog({
      action: 'ATTENDANCE_RECORD_CREATED',
      employeeId,
      checkType,
      timestamp,
      metadata: { location, deviceId, verificationMethod },
    });
    
    // 실시간 분석 데이터 업데이트 (비동기)
    updateAnalytics(employeeId, checkType, date).catch(console.error);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        recordId: `${employeeId}#${timestamp}`,
        timestamp,
        message: `${checkType} recorded successfully`,
      }),
    };
    
  } catch (error) {
    console.error('Error saving attendance:', error);
    
    // 에러 타입별 처리
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Duplicate record' }),
      };
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

/**
 * 감사 로그 저장
 */
async function saveAuditLog(logEntry) {
  const timestamp = Date.now();
  const date = new Date(timestamp).toISOString().split('T')[0];
  
  const auditRecord = {
    date,
    timestamp_uuid: `${timestamp}#${uuidv4()}`,
    ...logEntry,
    expires_at: Math.floor(timestamp / 1000) + (365 * 24 * 60 * 60), // 1년 보관
  };
  
  try {
    await docClient.send(new PutCommand({
      TableName: process.env.AUDIT_TABLE,
      Item: auditRecord,
    }));
  } catch (error) {
    console.error('Failed to save audit log:', error);
    // 감사 로그 실패는 메인 프로세스를 중단시키지 않음
  }
}

/**
 * 실시간 분석 데이터 업데이트
 */
async function updateAnalytics(employeeId, checkType, date) {
  // 일일 활성 사용자 (DAU) 업데이트
  const metricKey = `DAU#${date}`;
  
  // TODO: UpdateCommand로 원자적 카운터 증가 구현
  console.log(`Analytics update: ${metricKey} for ${employeeId}`);
}