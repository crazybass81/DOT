import { SSMClient, GetParameterCommand, GetParametersCommand } from '@aws-sdk/client-ssm';

// SSM Client 초기화
const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
});

// Parameter Store prefix
const PARAMETER_PREFIX = '/dot/marketing';

/**
 * Parameter Store에서 단일 파라미터 가져오기
 */
export async function getParameter(name: string, withDecryption = true): Promise<string | null> {
  try {
    const command = new GetParameterCommand({
      Name: `${PARAMETER_PREFIX}/${name}`,
      WithDecryption: withDecryption,
    });

    const response = await ssmClient.send(command);
    return response.Parameter?.Value || null;
  } catch (error) {
    console.error(`Failed to get parameter ${name}:`, error);
    return null;
  }
}

/**
 * Parameter Store에서 여러 파라미터 가져오기
 */
export async function getParameters(names: string[], withDecryption = true): Promise<Record<string, string>> {
  try {
    const parameterNames = names.map(name => `${PARAMETER_PREFIX}/${name}`);
    
    const command = new GetParametersCommand({
      Names: parameterNames,
      WithDecryption: withDecryption,
    });

    const response = await ssmClient.send(command);
    const parameters: Record<string, string> = {};

    response.Parameters?.forEach((param) => {
      if (param.Name && param.Value) {
        // Remove prefix from name
        const name = param.Name.replace(`${PARAMETER_PREFIX}/`, '');
        parameters[name] = param.Value;
      }
    });

    return parameters;
  } catch (error) {
    console.error('Failed to get parameters:', error);
    return {};
  }
}

/**
 * 환경변수 또는 Parameter Store에서 값 가져오기
 * 로컬 개발: 환경변수 사용
 * 프로덕션: Parameter Store 사용
 */
export async function getConfig(key: string, parameterName?: string): Promise<string | undefined> {
  // 먼저 환경변수 확인
  const envValue = process.env[key];
  if (envValue) {
    return envValue;
  }

  // 프로덕션 환경에서는 Parameter Store 사용
  if (process.env.NODE_ENV === 'production' && parameterName) {
    const paramValue = await getParameter(parameterName);
    return paramValue || undefined;
  }

  return undefined;
}

/**
 * 모든 설정 로드
 */
export async function loadConfiguration() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    // 개발 환경: 환경변수 사용
    return {
      YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
      AWS_REGION: process.env.AWS_REGION || 'ap-northeast-2',
      DYNAMODB_CREATORS_TABLE: process.env.DYNAMODB_CREATORS_TABLE || 'dot-marketing-creators',
      DYNAMODB_CAMPAIGNS_TABLE: process.env.DYNAMODB_CAMPAIGNS_TABLE || 'dot-marketing-campaigns',
      DYNAMODB_EMAIL_HISTORY_TABLE: process.env.DYNAMODB_EMAIL_HISTORY_TABLE || 'dot-marketing-email-history',
      SES_FROM_EMAIL: process.env.SES_FROM_EMAIL || 'marketing@dot-platform.com',
      SES_CONFIGURATION_SET: process.env.SES_CONFIGURATION_SET || 'dot-marketing',
    };
  }

  // 프로덕션: Parameter Store 사용
  const parameters = await getParameters([
    'youtube-api-key',
    'aws-region',
    'dynamodb-creators-table',
    'dynamodb-campaigns-table',
    'dynamodb-email-history-table',
    'ses-from-email',
    'ses-configuration-set',
  ]);

  return {
    YOUTUBE_API_KEY: parameters['youtube-api-key'],
    AWS_REGION: parameters['aws-region'] || 'ap-northeast-2',
    DYNAMODB_CREATORS_TABLE: parameters['dynamodb-creators-table'] || 'dot-marketing-creators',
    DYNAMODB_CAMPAIGNS_TABLE: parameters['dynamodb-campaigns-table'] || 'dot-marketing-campaigns',
    DYNAMODB_EMAIL_HISTORY_TABLE: parameters['dynamodb-email-history-table'] || 'dot-marketing-email-history',
    SES_FROM_EMAIL: parameters['ses-from-email'] || 'marketing@dot-platform.com',
    SES_CONFIGURATION_SET: parameters['ses-configuration-set'] || 'dot-marketing',
  };
}

// 싱글톤 패턴으로 설정 캐싱
let cachedConfig: any = null;
let configLoadPromise: Promise<any> | null = null;

export async function getConfiguration() {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!configLoadPromise) {
    configLoadPromise = loadConfiguration();
    cachedConfig = await configLoadPromise;
  }

  return cachedConfig;
}