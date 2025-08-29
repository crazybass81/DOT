import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * DynamoDB + Lambda 스택 - Firebase와 하이브리드 아키텍처 구성
 * 영구 저장소, 분석, 규정 준수를 위한 AWS 인프라
 */
export class AttendanceDynamoDBStack extends cdk.Stack {
  public readonly attendanceTable: dynamodb.Table;
  public readonly employeesTable: dynamodb.Table;
  public readonly auditTable: dynamodb.Table;
  public readonly analyticsTable: dynamodb.Table;
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==================== DynamoDB 테이블 생성 ====================

    // 1. 출퇴근 기록 테이블
    this.attendanceTable = new dynamodb.Table(this, 'AttendanceRecords', {
      tableName: 'DOT_ATTENDANCE_RECORDS',
      partitionKey: {
        name: 'employee_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.ON_DEMAND, // 초기에는 On-Demand
      timeToLiveAttribute: 'expires_at', // 90일 후 자동 삭제
      pointInTimeRecovery: true, // 백업 활성화
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // DynamoDB Streams
    });

    // GSI1: 날짜별 조회
    this.attendanceTable.addGlobalSecondaryIndex({
      indexName: 'DateEmployeeIndex',
      partitionKey: {
        name: 'date',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'employee_id',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: 부서별 조회
    this.attendanceTable.addGlobalSecondaryIndex({
      indexName: 'DepartmentTimestampIndex',
      partitionKey: {
        name: 'department_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ['employee_id', 'check_type', 'location'],
    });

    // 2. 직원 마스터 테이블
    this.employeesTable = new dynamodb.Table(this, 'Employees', {
      tableName: 'DOT_EMPLOYEES',
      partitionKey: {
        name: 'employee_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'data_type',
        type: dynamodb.AttributeType.STRING, // "PROFILE", "SETTINGS", "PERMISSIONS"
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 2,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI: 이메일로 조회
    this.employeesTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Auto-scaling 설정
    const readScaling = this.employeesTable.autoScaleReadCapacity({
      minCapacity: 5,
      maxCapacity: 100,
    });
    readScaling.scaleOnUtilization({
      targetUtilizationPercent: 70,
    });

    // 3. 감사 로그 테이블
    this.auditTable = new dynamodb.Table(this, 'AuditLogs', {
      tableName: 'DOT_AUDIT_LOGS',
      partitionKey: {
        name: 'date',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp_uuid',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.ON_DEMAND,
      timeToLiveAttribute: 'expires_at', // 규정에 따라 설정
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED, // KMS 암호화
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    // 4. 분석 데이터 테이블
    this.analyticsTable = new dynamodb.Table(this, 'Analytics', {
      tableName: 'DOT_ANALYTICS',
      partitionKey: {
        name: 'metric_type_period',
        type: dynamodb.AttributeType.STRING, // "DAU#2024-01", "DEPT_HOURS#2024-01"
      },
      sortKey: {
        name: 'dimension',
        type: dynamodb.AttributeType.STRING, // "ALL", "DEPT_001", "EMP_001"
      },
      billingMode: dynamodb.BillingMode.ON_DEMAND,
    });

    // ==================== Lambda 함수 생성 ====================

    // Lambda 실행 역할
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // DynamoDB 권한 부여
    [this.attendanceTable, this.employeesTable, this.auditTable, this.analyticsTable].forEach(table => {
      table.grantReadWriteData(lambdaRole);
    });

    // 1. 출퇴근 기록 Lambda
    const saveAttendanceFunction = new lambda.Function(this, 'SaveAttendance', {
      functionName: 'DOT_SaveAttendanceRecord',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'attendance.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        ATTENDANCE_TABLE: this.attendanceTable.tableName,
        AUDIT_TABLE: this.auditTable.tableName,
        REGION: this.region,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE, // X-Ray 추적
    });

    // 2. 리포트 생성 Lambda
    const generateReportFunction = new lambda.Function(this, 'GenerateReport', {
      functionName: 'DOT_GenerateReport',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'report.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        ATTENDANCE_TABLE: this.attendanceTable.tableName,
        ANALYTICS_TABLE: this.analyticsTable.tableName,
        FIREBASE_PROJECT_ID: 'dot-attendance',
      },
      role: lambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
    });

    // 3. 데이터 동기화 Lambda (Firebase → DynamoDB)
    const syncFromFirebaseFunction = new lambda.Function(this, 'SyncFromFirebase', {
      functionName: 'DOT_SyncFromFirebase',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'sync.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        ATTENDANCE_TABLE: this.attendanceTable.tableName,
        EMPLOYEES_TABLE: this.employeesTable.tableName,
        FIREBASE_PROJECT_ID: 'dot-attendance',
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      reservedConcurrentExecutions: 10, // 동시 실행 제한
    });

    // 4. 배치 분석 Lambda (일일 집계)
    const batchAnalyticsFunction = new lambda.Function(this, 'BatchAnalytics', {
      functionName: 'DOT_BatchAnalytics',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'analytics.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        ATTENDANCE_TABLE: this.attendanceTable.tableName,
        ANALYTICS_TABLE: this.analyticsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.minutes(15),
      memorySize: 3008, // 최대 메모리
    });

    // ==================== API Gateway 설정 ====================

    this.api = new apigateway.RestApi(this, 'AttendanceAPI', {
      restApiName: 'DOT Attendance API',
      description: 'Firebase와 DynamoDB 하이브리드 API',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 1000,
        throttlingRateLimit: 500,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // API 엔드포인트 설정
    const attendanceResource = this.api.root.addResource('attendance');
    attendanceResource.addMethod('POST', new apigateway.LambdaIntegration(saveAttendanceFunction));

    const reportResource = this.api.root.addResource('report');
    reportResource.addMethod('GET', new apigateway.LambdaIntegration(generateReportFunction));

    const syncResource = this.api.root.addResource('sync');
    syncResource.addMethod('POST', new apigateway.LambdaIntegration(syncFromFirebaseFunction));

    // ==================== CloudWatch 알람 ====================

    // DynamoDB 스로틀링 알람
    new cdk.aws_cloudwatch.Alarm(this, 'DynamoDBThrottleAlarm', {
      metric: this.attendanceTable.metricUserErrors(),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Lambda 에러 알람
    new cdk.aws_cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      metric: saveAttendanceFunction.metricErrors(),
      threshold: 5,
      evaluationPeriods: 1,
    });

    // ==================== 출력 ====================

    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'AttendanceTableName', {
      value: this.attendanceTable.tableName,
      description: 'Attendance records table name',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });
  }
}