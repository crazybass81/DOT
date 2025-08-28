import { Amplify } from 'aws-amplify';

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || 'us-east-1_EbYMLw6Kj',
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '32pd1i2idlso1nakce8tfjtpmq',
      loginWith: {
        email: true
      },
      signUpVerificationMethod: 'code' as const,
      mfa: {
        status: 'optional' as const,
        smsEnabled: true,
        totpEnabled: true
      }
    }
  },
  API: {
    REST: {
      'AttendanceAPI': {
        endpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || 'https://426y70ok24.execute-api.us-east-1.amazonaws.com/prod',
        region: 'us-east-1'
      }
    }
  }
};

export function configureAmplify() {
  Amplify.configure(amplifyConfig);
}

export default amplifyConfig;