// Device fingerprinting for additional security

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  colorDepth: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  touchSupport: boolean;
  webglVendor?: string;
  webglRenderer?: string;
}

export class DeviceFingerprintService {
  static async generateFingerprint(): Promise<string> {
    const fingerprint = await this.collectDeviceInfo();
    return this.hashFingerprint(fingerprint);
  }

  static async collectDeviceInfo(): Promise<DeviceFingerprint> {
    const info: DeviceFingerprint = {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      colorDepth: screen.colorDepth,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      touchSupport: 'ontouchstart' in window,
    };

    // Try to get WebGL info
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          info.webglVendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          info.webglRenderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) {
      // WebGL not available
    }

    return info;
  }

  static async hashFingerprint(fingerprint: DeviceFingerprint): Promise<string> {
    const str = JSON.stringify(fingerprint);
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  static async verifyDevice(storedFingerprint: string): Promise<boolean> {
    const currentFingerprint = await this.generateFingerprint();
    return currentFingerprint === storedFingerprint;
  }

  static getDeviceId(): string {
    // Get or generate a persistent device ID
    if (typeof window === 'undefined') return '';
    
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = this.generateUUID();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default DeviceFingerprintService;