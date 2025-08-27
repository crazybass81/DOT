import {
  CreateTableCommand,
  DynamoDBClient,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';

// Configuration
const REGION = process.env.AWS_REGION || 'ap-northeast-2';
const IS_LOCAL = process.env.NODE_ENV === 'development' && process.env.DYNAMODB_LOCAL_ENDPOINT;

const client = new DynamoDBClient({
  region: REGION,
  ...(IS_LOCAL
    ? {
        endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT || 'http://localhost:8000',
        credentials: {
          accessKeyId: 'dummy',
          secretAccessKey: 'dummy',
        },
      }
    : {}),
});

// Table definitions
const tables = [
  {
    TableName: process.env.ATTENDANCE_TABLE_NAME || 'dot-attendance',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'employeeDate', AttributeType: 'S' },
      { AttributeName: 'dateStatus', AttributeType: 'S' },
      { AttributeName: 'date', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'employee-date-index',
        KeySchema: [
          { AttributeName: 'employeeDate', KeyType: 'HASH' },
          { AttributeName: 'date', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'date-status-index',
        KeySchema: [
          { AttributeName: 'dateStatus', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
    ],
    BillingMode: IS_LOCAL ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    ProvisionedThroughput: IS_LOCAL
      ? { ReadCapacityUnits: 10, WriteCapacityUnits: 10 }
      : undefined,
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'attendance' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },
  {
    TableName: process.env.EMPLOYEES_TABLE_NAME || 'dot-employees',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'organizationIndex', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'organization-index',
        KeySchema: [
          { AttributeName: 'organizationIndex', KeyType: 'HASH' },
          { AttributeName: 'email', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
    ],
    BillingMode: IS_LOCAL ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    ProvisionedThroughput: IS_LOCAL
      ? { ReadCapacityUnits: 10, WriteCapacityUnits: 10 }
      : undefined,
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'attendance' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },
  {
    TableName: process.env.SCHEDULES_TABLE_NAME || 'dot-schedules',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'employeeDate', AttributeType: 'S' },
      { AttributeName: 'date', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'employee-date-index',
        KeySchema: [
          { AttributeName: 'employeeDate', KeyType: 'HASH' },
          { AttributeName: 'date', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
    ],
    BillingMode: IS_LOCAL ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    ProvisionedThroughput: IS_LOCAL
      ? { ReadCapacityUnits: 10, WriteCapacityUnits: 10 }
      : undefined,
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'attendance' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },
];

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false;
    }
    throw error;
  }
}

async function createTable(tableDefinition: any): Promise<void> {
  const tableName = tableDefinition.TableName;
  
  try {
    // Check if table already exists
    const exists = await tableExists(tableName);
    if (exists) {
      console.log(`✅ Table ${tableName} already exists`);
      return;
    }

    // Create table
    console.log(`📦 Creating table ${tableName}...`);
    await client.send(new CreateTableCommand(tableDefinition));
    console.log(`✅ Table ${tableName} created successfully`);
    
    // Wait for table to be active
    let isActive = false;
    let attempts = 0;
    while (!isActive && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const describeResult = await client.send(
        new DescribeTableCommand({ TableName: tableName })
      );
      isActive = describeResult.Table?.TableStatus === 'ACTIVE';
      attempts++;
    }
    
    if (isActive) {
      console.log(`✅ Table ${tableName} is now active`);
    } else {
      console.warn(`⚠️ Table ${tableName} is not active after 60 seconds`);
    }
  } catch (error) {
    console.error(`❌ Error creating table ${tableName}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting DynamoDB table creation...');
  console.log(`📍 Region: ${REGION}`);
  console.log(`🏠 Environment: ${IS_LOCAL ? 'Local' : 'AWS'}`);
  
  if (IS_LOCAL) {
    console.log(`🔗 Endpoint: ${process.env.DYNAMODB_LOCAL_ENDPOINT || 'http://localhost:8000'}`);
  }
  
  console.log('');
  
  try {
    for (const table of tables) {
      await createTable(table);
    }
    
    console.log('\n✅ All tables created successfully!');
    
    // Print table summary
    console.log('\n📊 Table Summary:');
    for (const table of tables) {
      console.log(`   - ${table.TableName}`);
      if (table.GlobalSecondaryIndexes) {
        table.GlobalSecondaryIndexes.forEach(gsi => {
          console.log(`     GSI: ${gsi.IndexName}`);
        });
      }
    }
  } catch (error) {
    console.error('\n❌ Table creation failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { createTable, tableExists };