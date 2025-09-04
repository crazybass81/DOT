// Biometric Authentication Service - SOLID Principles Applied
// Handles Face ID, Touch ID, and fingerprint authentication

// Interface Segregation Principle
export interface IBiometricAuth {
  isAvailable(): Promise<boolean>
  authenticate(reason: string): Promise<BiometricResult>
  getSupportedTypes(): Promise<BiometricType[]>
}

export interface IBiometricStorage {
  saveBiometricPreference(enabled: boolean): Promise<void>
  getBiometricPreference(): Promise<boolean>
  saveDeviceId(deviceId: string): Promise<void>
  getDeviceId(): Promise<string | null>
}

export interface BiometricResult {
  success: boolean
  error?: BiometricError
  authenticatedAt?: Date
}

export enum BiometricType {
  FaceID = 'face',
  TouchID = 'touch',
  Fingerprint = 'fingerprint',
  Iris = 'iris',
  None = 'none'
}

export enum BiometricError {
  NotAvailable = 'NOT_AVAILABLE',
  NotEnrolled = 'NOT_ENROLLED',
  UserCancel = 'USER_CANCEL',
  SystemCancel = 'SYSTEM_CANCEL',
  PasscodeFallback = 'PASSCODE_FALLBACK',
  LockedOut = 'LOCKED_OUT',
  Unknown = 'UNKNOWN'
}

// Single Responsibility: Handle Web Authentication API
export class WebBiometricAuth implements IBiometricAuth {
  private publicKeyCredential: PublicKeyCredential | null = null

  async isAvailable(): Promise<boolean> {
    // Check if Web Authentication API is available
    if (!window.PublicKeyCredential) {
      return false
    }

    // Check if platform authenticator is available
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      return available
    } catch {
      return false
    }
  }

  async authenticate(reason: string): Promise<BiometricResult> {
    try {
      if (!(await this.isAvailable())) {
        return {
          success: false,
          error: BiometricError.NotAvailable
        }
      }

      // Create credential options
      const challenge = this.generateChallenge()
      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'DOT Attendance System',
          id: window.location.hostname
        },
        user: {
          id: this.generateUserId(),
          name: 'attendance-user',
          displayName: 'Attendance User'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000,
        attestation: 'none'
      }

      // Request biometric authentication
      const credential = await navigator.credentials.create({
        publicKey
      }) as PublicKeyCredential

      if (credential) {
        this.publicKeyCredential = credential
        return {
          success: true,
          authenticatedAt: new Date()
        }
      }

      return {
        success: false,
        error: BiometricError.Unknown
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  async getSupportedTypes(): Promise<BiometricType[]> {
    if (!(await this.isAvailable())) {
      return [BiometricType.None]
    }

    // Try to detect the type based on user agent and platform
    const types: BiometricType[] = []
    
    // iOS devices
    if (/iPhone|iPad/.test(navigator.userAgent)) {
      // iPhone X and later have Face ID
      if (this.hasFaceID()) {
        types.push(BiometricType.FaceID)
      } else {
        types.push(BiometricType.TouchID)
      }
    }
    // Android devices
    else if (/Android/.test(navigator.userAgent)) {
      types.push(BiometricType.Fingerprint)
      // Some Android devices support face recognition
      if (this.hasFaceRecognition()) {
        types.push(BiometricType.FaceID)
      }
    }
    // Windows Hello
    else if (/Windows/.test(navigator.userAgent)) {
      types.push(BiometricType.Fingerprint)
      types.push(BiometricType.FaceID)
    }
    // macOS with Touch ID
    else if (/Mac/.test(navigator.userAgent)) {
      types.push(BiometricType.TouchID)
    }

    return types.length > 0 ? types : [BiometricType.Fingerprint]
  }

  private generateChallenge(): Uint8Array {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return array
  }

  private generateUserId(): Uint8Array {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return array
  }

  private hasFaceID(): boolean {
    // Check for iPhone X and later (with notch)
    const isIPhoneX = /iPhone/.test(navigator.userAgent) && 
                     window.screen.height >= 812
    return isIPhoneX
  }

  private hasFaceRecognition(): boolean {
    // Check for Android devices with face recognition
    // This is a simplified check - in production would use device capabilities API
    return /Android/.test(navigator.userAgent) && 
           parseInt(navigator.userAgent.match(/Android (\d+)/)?.[1] || '0') >= 10
  }

  private handleError(error: any): BiometricResult {
    if (error.name === 'NotAllowedError') {
      return { success: false, error: BiometricError.UserCancel }
    }
    if (error.name === 'AbortError') {
      return { success: false, error: BiometricError.SystemCancel }
    }
    if (error.name === 'NotSupportedError') {
      return { success: false, error: BiometricError.NotAvailable }
    }
    if (error.name === 'SecurityError') {
      return { success: false, error: BiometricError.LockedOut }
    }
    
    return { success: false, error: BiometricError.Unknown }
  }
}

// Single Responsibility: Handle native biometric (for mobile apps)
export class NativeBiometricAuth implements IBiometricAuth {
  async isAvailable(): Promise<boolean> {
    // Check if running in a mobile app context (React Native, Flutter, etc.)
    if (typeof (window as any).ReactNativeWebView !== 'undefined') {
      // React Native WebView
      return this.checkReactNativeBiometric()
    }
    
    if (typeof (window as any).flutter !== 'undefined') {
      // Flutter WebView
      return this.checkFlutterBiometric()
    }
    
    // Capacitor/Cordova
    if (typeof (window as any).Capacitor !== 'undefined') {
      return this.checkCapacitorBiometric()
    }
    
    return false
  }

  async authenticate(reason: string): Promise<BiometricResult> {
    // React Native
    if (typeof (window as any).ReactNativeWebView !== 'undefined') {
      return this.authenticateReactNative(reason)
    }
    
    // Flutter
    if (typeof (window as any).flutter !== 'undefined') {
      return this.authenticateFlutter(reason)
    }
    
    // Capacitor
    if (typeof (window as any).Capacitor !== 'undefined') {
      return this.authenticateCapacitor(reason)
    }
    
    return { success: false, error: BiometricError.NotAvailable }
  }

  async getSupportedTypes(): Promise<BiometricType[]> {
    // React Native
    if (typeof (window as any).ReactNativeWebView !== 'undefined') {
      return this.getReactNativeTypes()
    }
    
    // Flutter
    if (typeof (window as any).flutter !== 'undefined') {
      return this.getFlutterTypes()
    }
    
    return [BiometricType.None]
  }

  private async checkReactNativeBiometric(): Promise<boolean> {
    return new Promise((resolve) => {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'CHECK_BIOMETRIC' })
      )
      
      // Listen for response
      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data)
        if (data.type === 'BIOMETRIC_AVAILABLE') {
          window.removeEventListener('message', handler)
          resolve(data.available)
        }
      }
      window.addEventListener('message', handler)
      
      // Timeout after 2 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler)
        resolve(false)
      }, 2000)
    })
  }

  private async checkFlutterBiometric(): Promise<boolean> {
    try {
      const result = await (window as any).flutter.checkBiometric()
      return result === true
    } catch {
      return false
    }
  }

  private async checkCapacitorBiometric(): Promise<boolean> {
    try {
      const { BiometricAuth } = (window as any).Capacitor.Plugins
      const result = await BiometricAuth.isAvailable()
      return result.isAvailable
    } catch {
      return false
    }
  }

  private async authenticateReactNative(reason: string): Promise<BiometricResult> {
    return new Promise((resolve) => {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'AUTHENTICATE_BIOMETRIC', reason })
      )
      
      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data)
        if (data.type === 'BIOMETRIC_RESULT') {
          window.removeEventListener('message', handler)
          resolve({
            success: data.success,
            error: data.error,
            authenticatedAt: data.success ? new Date() : undefined
          })
        }
      }
      window.addEventListener('message', handler)
      
      // Timeout
      setTimeout(() => {
        window.removeEventListener('message', handler)
        resolve({ success: false, error: BiometricError.Unknown })
      }, 60000)
    })
  }

  private async authenticateFlutter(reason: string): Promise<BiometricResult> {
    try {
      const result = await (window as any).flutter.authenticate(reason)
      return {
        success: result.success,
        error: result.error,
        authenticatedAt: result.success ? new Date() : undefined
      }
    } catch {
      return { success: false, error: BiometricError.Unknown }
    }
  }

  private async authenticateCapacitor(reason: string): Promise<BiometricResult> {
    try {
      const { BiometricAuth } = (window as any).Capacitor.Plugins
      const result = await BiometricAuth.authenticate({ reason })
      return {
        success: true,
        authenticatedAt: new Date()
      }
    } catch (error: any) {
      return {
        success: false,
        error: this.mapCapacitorError(error)
      }
    }
  }

  private mapCapacitorError(error: any): BiometricError {
    switch (error.code) {
      case 'USER_CANCEL': return BiometricError.UserCancel
      case 'NOT_ENROLLED': return BiometricError.NotEnrolled
      case 'LOCKED_OUT': return BiometricError.LockedOut
      default: return BiometricError.Unknown
    }
  }

  private async getReactNativeTypes(): Promise<BiometricType[]> {
    return new Promise((resolve) => {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'GET_BIOMETRIC_TYPES' })
      )
      
      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data)
        if (data.type === 'BIOMETRIC_TYPES') {
          window.removeEventListener('message', handler)
          resolve(data.types || [BiometricType.None])
        }
      }
      window.addEventListener('message', handler)
      
      setTimeout(() => {
        window.removeEventListener('message', handler)
        resolve([BiometricType.None])
      }, 2000)
    })
  }

  private async getFlutterTypes(): Promise<BiometricType[]> {
    try {
      const types = await (window as any).flutter.getBiometricTypes()
      return types || [BiometricType.None]
    } catch {
      return [BiometricType.None]
    }
  }
}

// Main Service - Facade pattern
export class BiometricService {
  private webAuth: WebBiometricAuth
  private nativeAuth: NativeBiometricAuth
  private currentAuth: IBiometricAuth

  constructor() {
    this.webAuth = new WebBiometricAuth()
    this.nativeAuth = new NativeBiometricAuth()
    this.currentAuth = this.webAuth // Default to web
    
    // Detect and switch to appropriate implementation
    this.detectPlatform()
  }

  private async detectPlatform(): Promise<void> {
    // Check if native is available first
    if (await this.nativeAuth.isAvailable()) {
      this.currentAuth = this.nativeAuth
    } else if (await this.webAuth.isAvailable()) {
      this.currentAuth = this.webAuth
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.currentAuth.isAvailable()
  }

  async authenticate(reason: string = 'Authenticate for attendance'): Promise<BiometricResult> {
    // Add user-friendly message
    const fullReason = `${reason}\n\nUse your biometric authentication to continue.`
    return this.currentAuth.authenticate(fullReason)
  }

  async getSupportedTypes(): Promise<BiometricType[]> {
    return this.currentAuth.getSupportedTypes()
  }

  async enableBiometric(): Promise<boolean> {
    if (!(await this.isAvailable())) {
      return false
    }

    const result = await this.authenticate('Enable biometric authentication for quick access')
    if (result.success) {
      // Save preference
      localStorage.setItem('biometric_enabled', 'true')
      localStorage.setItem('biometric_enrolled_at', new Date().toISOString())
    }
    
    return result.success
  }

  async disableBiometric(): Promise<void> {
    localStorage.removeItem('biometric_enabled')
    localStorage.removeItem('biometric_enrolled_at')
  }

  isBiometricEnabled(): boolean {
    return localStorage.getItem('biometric_enabled') === 'true'
  }

  async quickAuthenticate(): Promise<boolean> {
    if (!this.isBiometricEnabled()) {
      return false
    }

    const result = await this.authenticate('Quick authentication')
    return result.success
  }
}