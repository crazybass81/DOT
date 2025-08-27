/**
 * AWS Parameter Store에서 환경변수 로드
 * Production 환경에서 안전한 시크릿 관리
 */

import { SSMClient, GetParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });

/**
 * Parameter Store에서 단일 파라미터 가져오기
 */
export async function getParameter(name: string, withDecryption = true): Promise<string | undefined> {
  try {
    const command = new GetParameterCommand({
      Name: name,
      WithDecryption: withDecryption,
    });
    
    const response = await ssmClient.send(command);
    return response.Parameter?.Value;
  } catch (error) {
    console.error(`Failed to get parameter ${name}:`, error);
    return undefined;
  }
}

/**
 * Parameter Store에서 경로별로 모든 파라미터 가져오기
 */
export async function getParametersByPath(path: string): Promise<Record<string, string>> {
  try {
    const command = new GetParametersByPathCommand({
      Path: path,
      WithDecryption: true,
      Recursive: true,
    });
    
    const response = await ssmClient.send(command);
    const parameters: Record<string, string> = {};
    
    response.Parameters?.forEach(param => {
      if (param.Name && param.Value) {
        // /dot/marketing/google/client-id -> google.client-id
        const key = param.Name.replace(`${path}/`, '').replace(/\//g, '.');
        parameters[key] = param.Value;
      }
    });
    
    return parameters;
  } catch (error) {
    console.error(`Failed to get parameters by path ${path}:`, error);
    return {};
  }
}

/**
 * Production 환경에서 Parameter Store 값 사용, 개발환경에서는 .env.local 사용
 */
export async function loadConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd) {
    console.log('🔐 Loading configuration from AWS Parameter Store...');
    const params = await getParametersByPath('/dot/marketing');
    
    return {
      google: {
        clientId: params['google.client-id'] || process.env.GOOGLE_CLIENT_ID,
        clientSecret: params['google.client-secret'] || process.env.GOOGLE_CLIENT_SECRET,
        mapsApiKey: params['google.maps-api-key'] || process.env.GOOGLE_MAPS_API_KEY,
      },
      nextAuth: {
        url: params['nextauth.url'] || process.env.NEXTAUTH_URL,
        secret: params['nextauth.secret'] || process.env.NEXTAUTH_SECRET,
      },
      dynamodb: {
        storesTable: params['dynamodb.stores-table'] || process.env.STORES_TABLE_NAME,
        creatorsTable: params['dynamodb.creators-table'] || process.env.DYNAMODB_CREATORS_TABLE,
        matchesTable: params['dynamodb.matches-table'] || process.env.MATCHES_TABLE_NAME,
      },
    };
  } else {
    console.log('💻 Using local environment variables...');
    return {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
      nextAuth: {
        url: process.env.NEXTAUTH_URL,
        secret: process.env.NEXTAUTH_SECRET,
      },
      dynamodb: {
        storesTable: process.env.STORES_TABLE_NAME,
        creatorsTable: process.env.DYNAMODB_CREATORS_TABLE,
        matchesTable: process.env.MATCHES_TABLE_NAME,
      },
    };
  }
}

/**
 * 환경별 설정 가져오기
 */
export function getConfig() {
  return {
    isProd: process.env.NODE_ENV === 'production',
    isDev: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
    baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  };
}