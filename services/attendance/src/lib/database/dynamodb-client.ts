import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// DynamoDB Client Configuration
const REGION = process.env.AWS_REGION || 'ap-northeast-2'; // Seoul region for Korean market

// Create base DynamoDB client
const client = new DynamoDBClient({
  region: REGION,
  ...(process.env.NODE_ENV === 'development' && process.env.DYNAMODB_LOCAL_ENDPOINT
    ? {
        endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT,
        credentials: {
          accessKeyId: 'dummy',
          secretAccessKey: 'dummy',
        },
      }
    : {}),
  maxAttempts: 3,
  retryMode: 'adaptive',
});

// Create document client for simplified operations
export const dynamoDBClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Table names configuration
export const TABLE_NAMES = {
  ATTENDANCE: process.env.ATTENDANCE_TABLE_NAME || 'dot-attendance',
  EMPLOYEES: process.env.EMPLOYEES_TABLE_NAME || 'dot-employees',
  SCHEDULES: process.env.SCHEDULES_TABLE_NAME || 'dot-schedules',
  NOTIFICATIONS: process.env.NOTIFICATIONS_TABLE_NAME || 'dot-notifications',
} as const;

// GSI names for efficient querying
export const GSI_NAMES = {
  EMPLOYEE_DATE_INDEX: 'employee-date-index',
  DATE_STATUS_INDEX: 'date-status-index',
  ORGANIZATION_INDEX: 'organization-index',
} as const;

export default dynamoDBClient;