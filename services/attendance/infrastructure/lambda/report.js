const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * 출퇴근 리포트 생성
 * 캐싱 전략 적용하여 Firebase와 연동
 */
exports.handler = async (event) => {
  console.log('Report request:', JSON.stringify(event, null, 2));
  
  try {
    const { employeeId, startDate, endDate, reportType = 'monthly' } = 
      event.queryStringParameters || {};
    
    if (!employeeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'employeeId is required' }),
      };
    }
    
    // 날짜 범위 설정
    const start = startDate ? new Date(startDate) : getMonthStart();
    const end = endDate ? new Date(endDate) : new Date();
    
    // DynamoDB 쿼리
    const records = await queryAttendanceRecords(employeeId, start, end);
    
    // 리포트 생성
    const report = generateReport(records, reportType);
    
    // 분석 데이터 집계
    const analytics = await aggregateAnalytics(records, employeeId);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=3600', // 1시간 캐싱
      },
      body: JSON.stringify({
        employeeId,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        report,
        analytics,
        generatedAt: new Date().toISOString(),
      }),
    };
    
  } catch (error) {
    console.error('Report generation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate report',
        message: error.message,
      }),
    };
  }
};

/**
 * DynamoDB에서 출퇴근 기록 조회
 */
async function queryAttendanceRecords(employeeId, startDate, endDate) {
  const records = [];
  let lastEvaluatedKey = null;
  
  do {
    const params = {
      TableName: process.env.ATTENDANCE_TABLE,
      KeyConditionExpression: 'employee_id = :empId AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':empId': employeeId,
        ':start': startDate.getTime(),
        ':end': endDate.getTime(),
      },
      ExclusiveStartKey: lastEvaluatedKey,
    };
    
    const response = await docClient.send(new QueryCommand(params));
    records.push(...response.Items);
    lastEvaluatedKey = response.LastEvaluatedKey;
    
  } while (lastEvaluatedKey);
  
  return records;
}

/**
 * 리포트 생성
 */
function generateReport(records, reportType) {
  const report = {
    totalDays: 0,
    totalHours: 0,
    averageCheckInTime: null,
    averageCheckOutTime: null,
    lateCount: 0,
    earlyLeaveCount: 0,
    overtimeHours: 0,
    dailyRecords: [],
  };
  
  // 날짜별 그룹화
  const dailyMap = new Map();
  
  records.forEach(record => {
    const date = new Date(record.timestamp).toISOString().split('T')[0];
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { checkIn: null, checkOut: null });
    }
    
    const daily = dailyMap.get(date);
    
    if (record.check_type === 'IN') {
      daily.checkIn = record;
    } else if (record.check_type === 'OUT') {
      daily.checkOut = record;
    }
  });
  
  // 일별 분석
  const checkInTimes = [];
  const checkOutTimes = [];
  
  dailyMap.forEach((daily, date) => {
    if (daily.checkIn && daily.checkOut) {
      // 근무 시간 계산
      const workHours = (daily.checkOut.timestamp - daily.checkIn.timestamp) / (1000 * 60 * 60);
      report.totalHours += workHours;
      report.totalDays++;
      
      // 평균 출퇴근 시간 계산용
      const checkInTime = new Date(daily.checkIn.timestamp);
      const checkOutTime = new Date(daily.checkOut.timestamp);
      
      checkInTimes.push(checkInTime.getHours() * 60 + checkInTime.getMinutes());
      checkOutTimes.push(checkOutTime.getHours() * 60 + checkOutTime.getMinutes());
      
      // 지각 체크 (09:00 기준)
      if (checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 0)) {
        report.lateCount++;
      }
      
      // 조퇴 체크 (18:00 기준)
      if (checkOutTime.getHours() < 18) {
        report.earlyLeaveCount++;
      }
      
      // 초과 근무 (9시간 초과)
      if (workHours > 9) {
        report.overtimeHours += (workHours - 9);
      }
      
      report.dailyRecords.push({
        date,
        checkIn: daily.checkIn.timestamp,
        checkOut: daily.checkOut.timestamp,
        workHours: workHours.toFixed(2),
        location: daily.checkIn.location,
      });
    }
  });
  
  // 평균 계산
  if (checkInTimes.length > 0) {
    const avgCheckIn = checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length;
    report.averageCheckInTime = `${Math.floor(avgCheckIn / 60).toString().padStart(2, '0')}:${Math.floor(avgCheckIn % 60).toString().padStart(2, '0')}`;
  }
  
  if (checkOutTimes.length > 0) {
    const avgCheckOut = checkOutTimes.reduce((a, b) => a + b, 0) / checkOutTimes.length;
    report.averageCheckOutTime = `${Math.floor(avgCheckOut / 60).toString().padStart(2, '0')}:${Math.floor(avgCheckOut % 60).toString().padStart(2, '0')}`;
  }
  
  return report;
}

/**
 * 분석 데이터 집계
 */
async function aggregateAnalytics(records, employeeId) {
  const analytics = {
    punctualityScore: 100,
    attendanceRate: 100,
    averageWorkHours: 0,
    trend: 'stable', // 'improving', 'declining', 'stable'
  };
  
  // 출석률 계산 (예상 근무일 대비)
  const expectedDays = 22; // 월 평균 근무일
  const actualDays = new Set(records.map(r => 
    new Date(r.timestamp).toISOString().split('T')[0]
  )).size / 2; // 체크인/아웃 쌍
  
  analytics.attendanceRate = Math.min(100, (actualDays / expectedDays) * 100);
  
  // 정시 출근율
  const lateRecords = records.filter(r => {
    if (r.check_type !== 'IN') return false;
    const time = new Date(r.timestamp);
    return time.getHours() > 9 || (time.getHours() === 9 && time.getMinutes() > 0);
  });
  
  analytics.punctualityScore = Math.max(0, 100 - (lateRecords.length * 5));
  
  return analytics;
}

/**
 * 월 시작일 가져오기
 */
function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}