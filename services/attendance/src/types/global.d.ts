// Global type declarations for browser APIs

interface PublicKeyCredentialCreationOptions {
  challenge: ArrayBuffer;
  rp: {
    name: string;
    id?: string;
  };
  user: {
    id: ArrayBuffer;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    alg: number;
    type: string;
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: string;
    userVerification?: string;
  };
  timeout?: number;
  attestation?: string;
}

interface PublicKeyCredential extends Credential {
  rawId: ArrayBuffer;
  response: AuthenticatorResponse;
}

interface AuthenticatorResponse {
  clientDataJSON: ArrayBuffer;
}

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    flutter?: {
      checkBiometric: () => Promise<boolean>;
      authenticate: (reason: string) => Promise<any>;
      getBiometricTypes: () => Promise<string[]>;
    };
    Capacitor?: {
      Plugins: {
        BiometricAuth: {
          isAvailable: () => Promise<{ isAvailable: boolean }>;
          authenticate: (options: { reason: string }) => Promise<void>;
        };
      };
    };
  }

  interface Navigator {
    connection?: {
      type?: string;
      effectiveType?: string;
      rtt?: number;
    };
    mozConnection?: any;
    webkitConnection?: any;
  }

  const PublicKeyCredential: {
    isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean>;
  };
}

export {};