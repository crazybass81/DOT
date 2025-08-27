import {
  CreateTableCommand,
  DynamoDBClient,
  DescribeTableCommand,
  ResourceNotFoundException,
  ListTablesCommand,
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

// Table definitions for Marketing Service
const tables = [
  // 1. Stores Table - 가게 정보
  {
    TableName: process.env.STORES_TABLE_NAME || 'dot-marketing-stores',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // STORE#<storeId>
      { AttributeName: 'SK', KeyType: 'RANGE' }, // PROFILE#<timestamp>
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // CATEGORY#<category>
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // STORE#<storeId>
      { AttributeName: 'GSI2PK', AttributeType: 'S' }, // LOCATION#<city>#<district>
      { AttributeName: 'GSI2SK', AttributeType: 'S' }, // STORE#<storeId>
      { AttributeName: 'GSI3PK', AttributeType: 'S' }, // PRICE#<level>
      { AttributeName: 'GSI3SK', AttributeType: 'S' }, // STORE#<storeId>
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'store-category-index',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'store-location-index',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' },
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'store-price-index',
        KeySchema: [
          { AttributeName: 'GSI3PK', KeyType: 'HASH' },
          { AttributeName: 'GSI3SK', KeyType: 'RANGE' },
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
    TimeToLiveSpecification: {
      Enabled: true,
      AttributeName: 'ttl',
    },
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'marketing' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },

  // 2. Creators Table - 크리에이터 정보
  {
    TableName: process.env.CREATORS_TABLE_NAME || 'dot-marketing-creators',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // CREATOR#<creatorId>
      { AttributeName: 'SK', KeyType: 'RANGE' }, // PLATFORM#<platform>#<channelId>
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // CATEGORY#<category>
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // CREATOR#<creatorId>
      { AttributeName: 'GSI2PK', AttributeType: 'S' }, // LOCATION#<region>
      { AttributeName: 'GSI2SK', AttributeType: 'S' }, // CREATOR#<creatorId>
      { AttributeName: 'GSI3PK', AttributeType: 'S' }, // PLATFORM#<platform>
      { AttributeName: 'GSI3SK', AttributeType: 'S' }, // INFLUENCE#<subscribers>
      { AttributeName: 'GSI4PK', AttributeType: 'S' }, // INFLUENCE_TIER#<tier>
      { AttributeName: 'GSI4SK', AttributeType: 'S' }, // ENGAGEMENT#<rate>
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'creator-category-index',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'creator-location-index',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' },
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'creator-platform-index',
        KeySchema: [
          { AttributeName: 'GSI3PK', KeyType: 'HASH' },
          { AttributeName: 'GSI3SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'creator-influence-index',
        KeySchema: [
          { AttributeName: 'GSI4PK', KeyType: 'HASH' },
          { AttributeName: 'GSI4SK', KeyType: 'RANGE' },
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
    TimeToLiveSpecification: {
      Enabled: true,
      AttributeName: 'ttl',
    },
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'marketing' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },

  // 3. Matches Table - 매칭 결과
  {
    TableName: process.env.MATCHES_TABLE_NAME || 'dot-marketing-matches',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // MATCH#<matchId>
      { AttributeName: 'SK', KeyType: 'RANGE' }, // STORE#<storeId>#CREATOR#<creatorId>
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // SCORE#<scoreRange>
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // MATCH#<matchId>
      { AttributeName: 'GSI2PK', AttributeType: 'S' }, // STATUS#<status>
      { AttributeName: 'GSI2SK', AttributeType: 'S' }, // DATE#<date>
      { AttributeName: 'GSI3PK', AttributeType: 'S' }, // DATE#<YYYY-MM-DD>
      { AttributeName: 'GSI3SK', AttributeType: 'S' }, // SCORE#<score>
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'match-score-index',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'match-status-index',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' },
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'match-date-index',
        KeySchema: [
          { AttributeName: 'GSI3PK', KeyType: 'HASH' },
          { AttributeName: 'GSI3SK', KeyType: 'RANGE' },
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
    TimeToLiveSpecification: {
      Enabled: true,
      AttributeName: 'ttl',
    },
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'marketing' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },

  // 4. Campaigns Table - 캠페인 관리
  {
    TableName: process.env.CAMPAIGNS_TABLE_NAME || 'dot-marketing-campaigns',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // CAMPAIGN#<campaignId>
      { AttributeName: 'SK', KeyType: 'RANGE' }, // STORE#<storeId>
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // STATUS#<status>
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // DATE#<startDate>
      { AttributeName: 'GSI2PK', AttributeType: 'S' }, // STORE#<storeId>
      { AttributeName: 'GSI2SK', AttributeType: 'S' }, // DATE#<createdAt>
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'campaign-status-index',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'campaign-store-index',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' },
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
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
      { Key: 'Service', Value: 'marketing' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },

  // 5. Templates Table - 이메일 템플릿
  {
    TableName: process.env.TEMPLATES_TABLE_NAME || 'dot-marketing-templates',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // TEMPLATE#<templateId>
      { AttributeName: 'SK', KeyType: 'RANGE' }, // VERSION#<version>
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // TYPE#<templateType>
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // TEMPLATE#<templateId>
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'template-type-index',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
    ],
    BillingMode: IS_LOCAL ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    ProvisionedThroughput: IS_LOCAL
      ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      : undefined,
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'marketing' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },

  // 6. Analytics Table - 분석 데이터
  {
    TableName: process.env.ANALYTICS_TABLE_NAME || 'dot-marketing-analytics',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // ANALYTICS#<type>#<id>
      { AttributeName: 'SK', KeyType: 'RANGE' }, // DATE#<timestamp>
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // DATE#<YYYY-MM-DD>
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // TYPE#<type>
      { AttributeName: 'GSI2PK', AttributeType: 'S' }, // TYPE#<type>
      { AttributeName: 'GSI2SK', AttributeType: 'S' }, // METRIC#<value>
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'analytics-date-index',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'analytics-type-index',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' },
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
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
    TimeToLiveSpecification: {
      Enabled: true,
      AttributeName: 'ttl',
    },
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'marketing' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },

  // 7. Scraping Cache Table - 스크래핑 캐시
  {
    TableName: process.env.SCRAPING_CACHE_TABLE_NAME || 'dot-marketing-cache',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // URL#<hashed_url>
      { AttributeName: 'SK', KeyType: 'RANGE' }, // TIMESTAMP#<timestamp>
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
    BillingMode: IS_LOCAL ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    ProvisionedThroughput: IS_LOCAL
      ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      : undefined,
    TimeToLiveSpecification: {
      Enabled: true,
      AttributeName: 'ttl',
    },
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'marketing' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },

  // 8. Contacts Table - 연락처 관리
  {
    TableName: process.env.CONTACTS_TABLE_NAME || 'dot-marketing-contacts',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // CONTACT#<contactId>
      { AttributeName: 'SK', KeyType: 'RANGE' }, // TYPE#<type>#<id>
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // EMAIL#<email>
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // CONTACT#<contactId>
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'contact-email-index',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
    ],
    BillingMode: IS_LOCAL ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    ProvisionedThroughput: IS_LOCAL
      ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      : undefined,
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'marketing' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },

  // 9. Email History Table - 이메일 발송 이력
  {
    TableName: process.env.EMAIL_HISTORY_TABLE_NAME || 'dot-marketing-emails',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // EMAIL#<emailId>
      { AttributeName: 'SK', KeyType: 'RANGE' }, // TIMESTAMP#<timestamp>
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // RECIPIENT#<email>
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // DATE#<date>
      { AttributeName: 'GSI2PK', AttributeType: 'S' }, // CAMPAIGN#<campaignId>
      { AttributeName: 'GSI2SK', AttributeType: 'S' }, // STATUS#<status>
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-recipient-index',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
      {
        IndexName: 'email-campaign-index',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' },
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: IS_LOCAL
          ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
          : undefined,
      },
    ],
    BillingMode: IS_LOCAL ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    ProvisionedThroughput: IS_LOCAL
      ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      : undefined,
    TimeToLiveSpecification: {
      Enabled: true,
      AttributeName: 'ttl',
    },
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Service', Value: 'marketing' },
      { Key: 'Application', Value: 'DOT' },
    ],
  },
];

// Helper functions
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
      try {
        const describeResult = await client.send(
          new DescribeTableCommand({ TableName: tableName })
        );
        isActive = describeResult.Table?.TableStatus === 'ACTIVE';
      } catch (error) {
        // Table might not be ready yet
      }
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

async function listTables(): Promise<void> {
  try {
    const result = await client.send(new ListTablesCommand({}));
    console.log('\n📋 Existing tables:');
    result.TableNames?.forEach(name => {
      console.log(`   - ${name}`);
    });
  } catch (error) {
    console.error('Error listing tables:', error);
  }
}

async function main() {
  console.log('🚀 Starting DynamoDB table creation for Marketing Service...');
  console.log(`📍 Region: ${REGION}`);
  console.log(`🏠 Environment: ${IS_LOCAL ? 'Local' : 'AWS'}`);
  
  if (IS_LOCAL) {
    console.log(`🔗 Endpoint: ${process.env.DYNAMODB_LOCAL_ENDPOINT || 'http://localhost:8000'}`);
  }
  
  // List existing tables first
  await listTables();
  
  console.log('\n📦 Creating Marketing Service tables...\n');
  
  try {
    for (const table of tables) {
      await createTable(table);
    }
    
    console.log('\n✅ All Marketing tables created successfully!');
    
    // Print table summary
    console.log('\n📊 Marketing Service Table Summary:');
    console.log('\n🏪 Store Management:');
    console.log('   - dot-marketing-stores (3 GSIs)');
    console.log('   - dot-marketing-creators (4 GSIs)');
    console.log('   - dot-marketing-matches (3 GSIs)');
    
    console.log('\n📢 Campaign Management:');
    console.log('   - dot-marketing-campaigns (2 GSIs)');
    console.log('   - dot-marketing-templates (1 GSI)');
    
    console.log('\n📊 Analytics & Communication:');
    console.log('   - dot-marketing-analytics (2 GSIs)');
    console.log('   - dot-marketing-cache (TTL enabled)');
    console.log('   - dot-marketing-contacts (1 GSI)');
    console.log('   - dot-marketing-emails (2 GSIs)');
    
    console.log('\n🔑 Key Features:');
    console.log('   - DynamoDB Streams enabled for real-time processing');
    console.log('   - TTL enabled for automatic cache cleanup');
    console.log('   - Pay-per-request billing for production');
    console.log('   - 16 Global Secondary Indexes for efficient queries');
    
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