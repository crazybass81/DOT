/**
 * Script to create test users in AWS Cognito
 * Run: node scripts/create-cognito-users.js
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'us-east-1'
});

const cognito = new AWS.CognitoIdentityServiceProvider();

// Cognito configuration from .env.local
const USER_POOL_ID = 'us-east-1_EbYMLw6Kj';

// Test users to create
const testUsers = [
  {
    username: 'master.admin@test.com',
    password: 'MasterAdmin123!@#',
    attributes: [
      { Name: 'email', Value: 'master.admin@test.com' },
      { Name: 'name', Value: '마스터 관리자' },
      { Name: 'custom:role', Value: 'MASTER_ADMIN' },
      { Name: 'email_verified', Value: 'true' }
    ]
  },
  {
    username: 'admin@test.com',
    password: 'Admin123!@#',
    attributes: [
      { Name: 'email', Value: 'admin@test.com' },
      { Name: 'name', Value: '조직 관리자' },
      { Name: 'custom:role', Value: 'ADMIN' },
      { Name: 'email_verified', Value: 'true' }
    ]
  },
  {
    username: 'manager@test.com',
    password: 'Manager123!@#',
    attributes: [
      { Name: 'email', Value: 'manager@test.com' },
      { Name: 'name', Value: '지점 매니저' },
      { Name: 'custom:role', Value: 'MANAGER' },
      { Name: 'email_verified', Value: 'true' }
    ]
  },
  {
    username: 'employee@test.com',
    password: 'Employee123!@#',
    attributes: [
      { Name: 'email', Value: 'employee@test.com' },
      { Name: 'name', Value: '김직원' },
      { Name: 'custom:role', Value: 'EMPLOYEE' },
      { Name: 'email_verified', Value: 'true' }
    ]
  }
];

async function createCognitoUsers() {
  console.log('🚀 Starting AWS Cognito test user creation...\n');
  console.log(`User Pool ID: ${USER_POOL_ID}\n`);

  for (const user of testUsers) {
    try {
      // Create user with admin powers (auto-confirmed)
      const params = {
        UserPoolId: USER_POOL_ID,
        Username: user.username,
        UserAttributes: user.attributes,
        TemporaryPassword: user.password,
        MessageAction: 'SUPPRESS', // Don't send welcome email
        DesiredDeliveryMediums: []
      };

      const result = await cognito.adminCreateUser(params).promise();
      console.log(`✅ Created user: ${user.username}`);
      
      // Set permanent password
      const setPasswordParams = {
        UserPoolId: USER_POOL_ID,
        Username: user.username,
        Password: user.password,
        Permanent: true
      };
      
      await cognito.adminSetUserPassword(setPasswordParams).promise();
      console.log(`   ✅ Set permanent password`);
      
    } catch (error) {
      if (error.code === 'UsernameExistsException') {
        console.log(`⚠️  User ${user.username} already exists`);
      } else if (error.code === 'UnauthorizedException' || error.code === 'AccessDeniedException') {
        console.error(`❌ AWS credentials error: ${error.message}`);
        console.log('\n⚠️  Note: This script requires AWS credentials with Cognito admin permissions.');
        console.log('   Please configure AWS CLI or set AWS environment variables.');
        break;
      } else {
        console.error(`❌ Failed to create ${user.username}: ${error.message}`);
      }
    }
  }

  console.log('\n✨ Test user creation process completed!');
  console.log('\n📋 Test Accounts:');
  console.log('=====================================');
  testUsers.forEach(user => {
    const role = user.attributes.find(a => a.Name === 'custom:role')?.Value || 'EMPLOYEE';
    console.log(`${role.padEnd(15)} | ${user.username.padEnd(25)} | ${user.password}`);
  });
  console.log('=====================================');
  console.log('\n🔐 You can now log in at http://localhost:3002/login');
}

// Check if AWS SDK is installed
try {
  require('aws-sdk');
  createCognitoUsers().catch(console.error);
} catch (error) {
  console.log('AWS SDK not installed. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install aws-sdk', { stdio: 'inherit' });
  console.log('AWS SDK installed. Please run the script again.');
}