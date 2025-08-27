// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.YOUTUBE_API_KEY = 'test-youtube-api-key';
process.env.AWS_REGION = 'ap-northeast-2';
process.env.DYNAMODB_CREATORS_TABLE = 'test-creators-table';
process.env.DYNAMODB_CAMPAIGNS_TABLE = 'test-campaigns-table';
process.env.DYNAMODB_EMAIL_HISTORY_TABLE = 'test-email-history-table';