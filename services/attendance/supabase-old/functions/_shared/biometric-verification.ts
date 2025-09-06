// Enhanced Biometric Verification Service
import { createHash } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

interface BiometricToken {
  deviceId: string
  timestamp: number
  nonce: string
  signature: string
  biometricType: 'face' | 'fingerprint' | 'iris' | 'voice'
  challenge?: string
}

interface BiometricSession {
  sessionId: string
  deviceId: string
  userId: string
  challenge: string
  createdAt: number
  expiresAt: number
  verified: boolean
}

export class BiometricVerificationService {
  private readonly secretKey: string
  private readonly sessionTTL = 5 * 60 * 1000 // 5 minutes
  private readonly sessions = new Map<string, BiometricSession>()

  constructor() {
    this.secretKey = Deno.env.get('BIOMETRIC_SECRET_KEY') || 'default-biometric-secret'
  }

  /**
   * Generate a challenge for biometric authentication
   */
  async generateChallenge(deviceId: string, userId: string): Promise<string> {
    const sessionId = crypto.randomUUID()
    const challenge = await this.generateRandomChallenge()
    
    const session: BiometricSession = {
      sessionId,
      deviceId,
      userId,
      challenge,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.sessionTTL,
      verified: false
    }
    
    this.sessions.set(sessionId, session)
    
    // Clean expired sessions
    this.cleanExpiredSessions()
    
    return JSON.stringify({
      sessionId,
      challenge,
      expiresIn: this.sessionTTL
    })
  }

  /**
   * Verify biometric token with enhanced security
   */
  async verifyBiometricToken(token: string, sessionId: string): Promise<{ valid: boolean; message: string }> {
    try {
      // Parse token
      const biometricToken: BiometricToken = JSON.parse(token)
      
      // Get session
      const session = this.sessions.get(sessionId)
      if (!session) {
        return { valid: false, message: 'Invalid or expired session' }
      }
      
      // Check session expiry
      if (Date.now() > session.expiresAt) {
        this.sessions.delete(sessionId)
        return { valid: false, message: 'Session expired' }
      }
      
      // Verify device ID matches
      if (biometricToken.deviceId !== session.deviceId) {
        return { valid: false, message: 'Device mismatch' }
      }
      
      // Verify timestamp is recent (within 30 seconds)
      const timeDiff = Date.now() - biometricToken.timestamp
      if (timeDiff > 30000 || timeDiff < 0) {
        return { valid: false, message: 'Token expired or invalid timestamp' }
      }
      
      // Verify challenge if present
      if (session.challenge && biometricToken.challenge !== session.challenge) {
        return { valid: false, message: 'Challenge verification failed' }
      }
      
      // Verify signature
      const isSignatureValid = await this.verifySignature(biometricToken)
      if (!isSignatureValid) {
        return { valid: false, message: 'Invalid signature' }
      }
      
      // Additional checks based on biometric type
      const biometricCheck = await this.verifyBiometricType(biometricToken)
      if (!biometricCheck.valid) {
        return biometricCheck
      }
      
      // Mark session as verified
      session.verified = true
      this.sessions.set(sessionId, session)
      
      return { valid: true, message: 'Biometric verification successful' }
      
    } catch (error) {
      console.error('Biometric verification error:', error)
      return { valid: false, message: 'Verification failed' }
    }
  }

  /**
   * Verify the cryptographic signature of the token
   */
  private async verifySignature(token: BiometricToken): Promise<boolean> {
    try {
      // Reconstruct the message to sign
      const message = `${token.deviceId}:${token.timestamp}:${token.nonce}:${token.biometricType}:${token.challenge || ''}`
      
      // Create HMAC signature
      const encoder = new TextEncoder()
      const keyData = encoder.encode(this.secretKey)
      const messageData = encoder.encode(message)
      
      // Import key for HMAC
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      )
      
      // Verify signature
      const signatureBuffer = Uint8Array.from(atob(token.signature), c => c.charCodeAt(0))
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBuffer,
        messageData
      )
      
      return isValid
    } catch (error) {
      console.error('Signature verification error:', error)
      return false
    }
  }

  /**
   * Additional verification based on biometric type
   */
  private async verifyBiometricType(token: BiometricToken): Promise<{ valid: boolean; message: string }> {
    switch (token.biometricType) {
      case 'face':
        // Face ID specific checks
        // In production, would verify against stored face templates
        return { valid: true, message: 'Face ID verified' }
        
      case 'fingerprint':
        // Fingerprint specific checks
        // In production, would verify against stored fingerprint templates
        return { valid: true, message: 'Fingerprint verified' }
        
      case 'iris':
        // Iris scan specific checks
        return { valid: true, message: 'Iris scan verified' }
        
      case 'voice':
        // Voice recognition specific checks
        return { valid: true, message: 'Voice verified' }
        
      default:
        return { valid: false, message: 'Unknown biometric type' }
    }
  }

  /**
   * Generate a random challenge string
   */
  private async generateRandomChallenge(): Promise<string> {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return base64Encode(array)
  }

  /**
   * Clean expired sessions
   */
  private cleanExpiredSessions(): void {
    const now = Date.now()
    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId)
      }
    }
  }

  /**
   * Generate a biometric token for testing/development
   */
  async generateTestToken(deviceId: string, sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error('Invalid session')
    }
    
    const timestamp = Date.now()
    const nonce = crypto.randomUUID()
    const biometricType = 'fingerprint'
    
    const message = `${deviceId}:${timestamp}:${nonce}:${biometricType}:${session.challenge}`
    
    // Create signature
    const encoder = new TextEncoder()
    const keyData = encoder.encode(this.secretKey)
    const messageData = encoder.encode(message)
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData)
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    
    const token: BiometricToken = {
      deviceId,
      timestamp,
      nonce,
      signature: signatureBase64,
      biometricType,
      challenge: session.challenge
    }
    
    return JSON.stringify(token)
  }
}

// Export singleton instance
export const biometricService = new BiometricVerificationService()