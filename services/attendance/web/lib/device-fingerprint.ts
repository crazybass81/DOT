/**
 * Device Fingerprinting Utility
 * 
 * Generates a comprehensive device fingerprint for security and device management.
 * Combines multiple data points to create a unique, stable identifier while
 * respecting user privacy and browser limitations.
 */

export interface DeviceFingerprint {
  deviceId: string
  canvas: string
  webgl: string
  audio: string
  screen: {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: number
    pixelDepth: number
    devicePixelRatio: number
  }
  navigator: {
    userAgent: string
    language: string
    languages: string[]
    platform: string
    cookieEnabled: boolean
    doNotTrack: string | null
    maxTouchPoints: number
    hardwareConcurrency: number
    deviceMemory?: number
  }
  timezone: {
    timezone: string
    timezoneOffset: number
  }
  fonts: string[]
  plugins: string[]
  localStorage: boolean
  sessionStorage: boolean
  indexedDB: boolean
  webGL: {
    vendor: string
    renderer: string
    version: string
    shadingLanguageVersion: string
    extensions: string[]
  }
  webRTC: {
    supported: boolean
    localIPs: string[]
  }
  battery?: {
    charging: boolean
    level: number
    chargingTime: number
    dischargingTime: number
  }
  connection?: {
    effectiveType: string
    downlink: number
    rtt: number
    saveData: boolean
  }
  permissions: {
    [key: string]: string
  }
  browser: string
  browserVersion: string
  engine: string
  os: string
  osVersion: string
  appVersion: string
  timestamp: string
  entropy: number
  stability: number
}

// Hash function for generating consistent IDs
async function hashString(str: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } else {
    // Fallback hash for older browsers
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }
}

// Canvas fingerprinting
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    canvas.width = 200
    canvas.height = 50

    // Draw complex patterns
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('Device Fingerprint 🔒', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('Security Check', 4, 30)

    // Add some geometric shapes
    ctx.beginPath()
    ctx.arc(50, 25, 20, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()

    return canvas.toDataURL()
  } catch (e) {
    return 'canvas-error'
  }
}

// WebGL fingerprinting
function getWebGLFingerprint(): { webgl: string; webGL: any } {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return { webgl: 'no-webgl', webGL: {} }

    // Get WebGL parameters
    const debugInfo = (gl as any).getExtension ? (gl as any).getExtension('WEBGL_debug_renderer_info') : null
    const vendor = (gl as any).getParameter ? (gl as any).getParameter(debugInfo?.UNMASKED_VENDOR_WEBGL || (gl as any).VENDOR) || 'unknown' : 'unknown'
    const renderer = (gl as any).getParameter ? (gl as any).getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL || (gl as any).RENDERER) || 'unknown' : 'unknown'
    const version = (gl as any).getParameter ? (gl as any).getParameter((gl as any).VERSION) || 'unknown' : 'unknown'
    const shadingLanguageVersion = (gl as any).getParameter ? (gl as any).getParameter((gl as any).SHADING_LANGUAGE_VERSION) || 'unknown' : 'unknown'
    
    const extensions = (gl as any).getSupportedExtensions ? (gl as any).getSupportedExtensions() || [] : []

    // Draw WebGL scene for fingerprinting
    const glCtx = gl as any
    if (glCtx.createShader && glCtx.VERTEX_SHADER) {
      const vertexShader = glCtx.createShader(glCtx.VERTEX_SHADER)!
      glCtx.shaderSource(vertexShader, 'attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0,1);}')
      glCtx.compileShader(vertexShader)

      const fragmentShader = glCtx.createShader(glCtx.FRAGMENT_SHADER)!
      glCtx.shaderSource(fragmentShader, 'precision mediump float;void main(){gl_FragColor=vec4(1,0,0.5,1);}')
      glCtx.compileShader(fragmentShader)

      const program = glCtx.createProgram()!
      glCtx.attachShader(program, vertexShader)
      glCtx.attachShader(program, fragmentShader)
      glCtx.linkProgram(program)
      glCtx.useProgram(program)

      const buffer = glCtx.createBuffer()
      glCtx.bindBuffer(glCtx.ARRAY_BUFFER, buffer)
      glCtx.bufferData(glCtx.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 1, 1, -1]), glCtx.STATIC_DRAW)

      const positionLocation = glCtx.getAttribLocation(program, 'a_position')
      glCtx.enableVertexAttribArray(positionLocation)
      glCtx.vertexAttribPointer(positionLocation, 2, glCtx.FLOAT, false, 0, 0)

      glCtx.drawArrays(glCtx.TRIANGLES, 0, 3)
    }

    const fingerprint = canvas.toDataURL()

    return {
      webgl: fingerprint,
      webGL: {
        vendor,
        renderer,
        version,
        shadingLanguageVersion,
        extensions: extensions.sort()
      }
    }
  } catch (e) {
    return { webgl: 'webgl-error', webGL: {} }
  }
}

// Audio fingerprinting
function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = context.createOscillator()
      const analyser = context.createAnalyser()
      const gainNode = context.createGain()
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1)

      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(10000, context.currentTime)

      gainNode.gain.setValueAtTime(0, context.currentTime)

      oscillator.connect(analyser)
      analyser.connect(scriptProcessor)
      scriptProcessor.connect(gainNode)
      gainNode.connect(context.destination)

      scriptProcessor.onaudioprocess = (e) => {
        const samples = e.inputBuffer.getChannelData(0)
        let sum = 0
        for (let i = 0; i < samples.length; i++) {
          sum += Math.abs(samples[i])
        }
        const fingerprint = sum.toString()
        scriptProcessor.disconnect()
        oscillator.disconnect()
        analyser.disconnect()
        gainNode.disconnect()
        context.close()
        resolve(fingerprint)
      }

      oscillator.start(0)
      
      // Fallback in case audio processing fails
      setTimeout(() => resolve('audio-timeout'), 1000)
    } catch (e) {
      resolve('audio-error')
    }
  })
}

// Font detection
function getInstalledFonts(): string[] {
  const baseFonts = ['monospace', 'sans-serif', 'serif']
  const testFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia',
    'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact', 'Palatino Linotype',
    'Tahoma', 'Geneva', 'Lucida Sans Unicode', 'Lucida Grande', 'MS Sans Serif',
    'MS Serif', 'Palatino', 'Times', 'Courier', 'System', 'Apple SD Gothic Neo',
    'Malgun Gothic', 'Microsoft YaHei', 'SimSun', 'SimHei', 'NSimSun', 'KaiTi',
    'FangSong', 'Ubuntu', 'Cantarell', 'DejaVu Sans', 'Liberation Sans'
  ]

  const availableFonts: string[] = []
  const testString = 'mmmmmmmmmmlli'
  const testSize = '72px'
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!

  // Measure baseline widths
  const baseWidths: { [key: string]: number } = {}
  for (const baseFont of baseFonts) {
    context.font = `${testSize} ${baseFont}`
    baseWidths[baseFont] = context.measureText(testString).width
  }

  // Test each font
  for (const testFont of testFonts) {
    let detected = false
    for (const baseFont of baseFonts) {
      context.font = `${testSize} ${testFont}, ${baseFont}`
      const width = context.measureText(testString).width
      if (width !== baseWidths[baseFont]) {
        detected = true
        break
      }
    }
    if (detected) {
      availableFonts.push(testFont)
    }
  }

  return availableFonts.sort()
}

// Plugin detection
function getPlugins(): string[] {
  const plugins: string[] = []
  if (navigator.plugins) {
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name)
    }
  }
  return plugins.sort()
}

// WebRTC fingerprinting
function getWebRTCFingerprint(): Promise<{ supported: boolean; localIPs: string[] }> {
  return new Promise((resolve) => {
    const localIPs: string[] = []
    
    try {
      const RTCPeerConnection = window.RTCPeerConnection || 
                               (window as any).webkitRTCPeerConnection || 
                               (window as any).mozRTCPeerConnection
      
      if (!RTCPeerConnection) {
        resolve({ supported: false, localIPs: [] })
        return
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })

      pc.createDataChannel('')
      pc.createOffer().then(offer => pc.setLocalDescription(offer))

      pc.onicecandidate = (ice) => {
        if (ice.candidate) {
          const match = /([0-9]{1,3}\.){3}[0-9]{1,3}/.exec(ice.candidate.candidate)
          if (match && !localIPs.includes(match[0])) {
            localIPs.push(match[0])
          }
        }
      }

      setTimeout(() => {
        pc.close()
        resolve({ supported: true, localIPs })
      }, 2000)
    } catch (e) {
      resolve({ supported: false, localIPs: [] })
    }
  })
}

// Battery API
function getBatteryInfo(): Promise<any> {
  return new Promise((resolve) => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        resolve({
          charging: battery.charging,
          level: Math.round(battery.level * 100) / 100,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        })
      }).catch(() => resolve(undefined))
    } else {
      resolve(undefined)
    }
  })
}

// Connection information
function getConnectionInfo(): any {
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection

  if (connection) {
    return {
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    }
  }
  return undefined
}

// Permission status
async function getPermissionStatus(): Promise<{ [key: string]: string }> {
  const permissions = ['geolocation', 'notifications', 'camera', 'microphone']
  const status: { [key: string]: string } = {}

  for (const permission of permissions) {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: permission as PermissionName })
        status[permission] = result.state
      }
    } catch (e) {
      status[permission] = 'unknown'
    }
  }

  return status
}

// Browser and OS detection
function getBrowserInfo(): { browser: string; browserVersion: string; engine: string; os: string; osVersion: string } {
  const userAgent = navigator.userAgent
  let browser = 'Unknown'
  let browserVersion = 'Unknown'
  let engine = 'Unknown'
  let os = 'Unknown'
  let osVersion = 'Unknown'

  // Browser detection
  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
    browser = 'Chrome'
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : 'Unknown'
    engine = 'Blink'
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox'
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : 'Unknown'
    engine = 'Gecko'
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari'
    const match = userAgent.match(/Version\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : 'Unknown'
    engine = 'WebKit'
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge'
    const match = userAgent.match(/Edge\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : 'Unknown'
    engine = 'EdgeHTML'
  }

  // OS detection
  if (userAgent.includes('Windows NT')) {
    os = 'Windows'
    const match = userAgent.match(/Windows NT (\d+\.\d+)/)
    osVersion = match ? match[1] : 'Unknown'
  } else if (userAgent.includes('Mac OS X')) {
    os = 'macOS'
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/)
    osVersion = match ? match[1].replace('_', '.') : 'Unknown'
  } else if (userAgent.includes('Linux')) {
    os = 'Linux'
  } else if (userAgent.includes('iPhone')) {
    os = 'iOS'
    const match = userAgent.match(/OS (\d+_\d+)/)
    osVersion = match ? match[1].replace('_', '.') : 'Unknown'
  } else if (userAgent.includes('Android')) {
    os = 'Android'
    const match = userAgent.match(/Android (\d+\.\d+)/)
    osVersion = match ? match[1] : 'Unknown'
  }

  return { browser, browserVersion, engine, os, osVersion }
}

// Calculate entropy (uniqueness measure)
function calculateEntropy(fingerprint: DeviceFingerprint): number {
  const values = [
    fingerprint.canvas,
    fingerprint.webgl,
    fingerprint.audio,
    fingerprint.screen.width + 'x' + fingerprint.screen.height,
    fingerprint.navigator.userAgent,
    fingerprint.navigator.language,
    fingerprint.timezone.timezone,
    fingerprint.fonts.join(','),
    fingerprint.plugins.join(','),
    fingerprint.webGL.vendor + fingerprint.webGL.renderer
  ]

  let entropy = 0
  for (const value of values) {
    if (value && value.length > 0) {
      entropy += Math.log2(value.length + 1)
    }
  }

  return Math.round(entropy * 10) / 10
}

// Calculate stability score (how consistent the fingerprint is)
function calculateStability(fingerprint: DeviceFingerprint): number {
  let stableFactors = 0
  let totalFactors = 0

  // Check stable factors
  const stableChecks = [
    fingerprint.screen.width > 0,
    fingerprint.screen.height > 0,
    fingerprint.navigator.platform.length > 0,
    fingerprint.navigator.language.length > 0,
    fingerprint.timezone.timezone.length > 0,
    fingerprint.fonts.length > 0,
    fingerprint.browser !== 'Unknown',
    fingerprint.os !== 'Unknown'
  ]

  for (const check of stableChecks) {
    totalFactors++
    if (check) stableFactors++
  }

  return totalFactors > 0 ? Math.round((stableFactors / totalFactors) * 100) / 100 : 0
}

// Main fingerprinting function
export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  // Get basic browser info first
  const browserInfo = getBrowserInfo()
  
  // Get all fingerprinting data in parallel
  const [
    canvas,
    webglData,
    audio,
    fonts,
    webrtc,
    battery,
    permissions
  ] = await Promise.all([
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    getAudioFingerprint(),
    getInstalledFonts(),
    getWebRTCFingerprint(),
    getBatteryInfo(),
    getPermissionStatus()
  ])

  const plugins = getPlugins()
  const connection = getConnectionInfo()

  const fingerprint: DeviceFingerprint = {
    deviceId: '', // Will be calculated below
    canvas,
    webgl: webglData.webgl,
    audio,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
      devicePixelRatio: window.devicePixelRatio || 1
    },
    navigator: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: Array.from(navigator.languages || []),
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory
    },
    timezone: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset()
    },
    fonts,
    plugins,
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test')
        localStorage.removeItem('test')
        return true
      } catch {
        return false
      }
    })(),
    sessionStorage: (() => {
      try {
        sessionStorage.setItem('test', 'test')
        sessionStorage.removeItem('test')
        return true
      } catch {
        return false
      }
    })(),
    indexedDB: 'indexedDB' in window,
    webGL: webglData.webGL,
    webRTC: webrtc,
    battery,
    connection,
    permissions,
    browser: browserInfo.browser,
    browserVersion: browserInfo.browserVersion,
    engine: browserInfo.engine,
    os: browserInfo.os,
    osVersion: browserInfo.osVersion,
    appVersion: navigator.appVersion,
    timestamp: new Date().toISOString(),
    entropy: 0, // Will be calculated below
    stability: 0 // Will be calculated below
  }

  // Calculate entropy and stability
  fingerprint.entropy = calculateEntropy(fingerprint)
  fingerprint.stability = calculateStability(fingerprint)

  // Generate device ID from the most stable components
  const stableComponents = [
    fingerprint.navigator.platform,
    fingerprint.screen.width + 'x' + fingerprint.screen.height,
    fingerprint.screen.colorDepth.toString(),
    fingerprint.timezone.timezone,
    fingerprint.navigator.language,
    fingerprint.fonts.slice(0, 10).join(','), // Top 10 fonts
    fingerprint.webGL.vendor,
    fingerprint.webGL.renderer
  ].join('|')

  fingerprint.deviceId = await hashString(stableComponents)

  return fingerprint
}

// Utility function to compare fingerprints
export function compareFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): {
  similarity: number
  differences: string[]
} {
  const differences: string[] = []
  let matches = 0
  let total = 0

  const comparisons = [
    { key: 'deviceId', weight: 3 },
    { key: 'canvas', weight: 2 },
    { key: 'webgl', weight: 2 },
    { key: 'audio', weight: 1 },
    { key: 'screen.width', weight: 2 },
    { key: 'screen.height', weight: 2 },
    { key: 'navigator.userAgent', weight: 1 },
    { key: 'navigator.platform', weight: 2 },
    { key: 'timezone.timezone', weight: 2 },
    { key: 'fonts', weight: 1 },
    { key: 'webGL.vendor', weight: 2 },
    { key: 'webGL.renderer', weight: 2 }
  ]

  for (const comparison of comparisons) {
    total += comparison.weight
    
    const getValue = (obj: any, key: string) => {
      return key.split('.').reduce((o, k) => o && o[k], obj)
    }
    
    const val1 = getValue(fp1, comparison.key)
    const val2 = getValue(fp2, comparison.key)
    
    if (Array.isArray(val1) && Array.isArray(val2)) {
      const intersection = val1.filter(x => val2.includes(x))
      const union = [...new Set([...val1, ...val2])]
      const similarity = intersection.length / union.length
      matches += similarity * comparison.weight
      
      if (similarity < 0.8) {
        differences.push(`${comparison.key}: ${Math.round(similarity * 100)}% match`)
      }
    } else if (val1 === val2) {
      matches += comparison.weight
    } else {
      differences.push(`${comparison.key}: ${val1} vs ${val2}`)
    }
  }

  return {
    similarity: Math.round((matches / total) * 100) / 100,
    differences
  }
}

// Utility to detect if fingerprint has changed significantly
export function hasSignificantChange(
  oldFingerprint: DeviceFingerprint, 
  newFingerprint: DeviceFingerprint
): boolean {
  const comparison = compareFingerprints(oldFingerprint, newFingerprint)
  return comparison.similarity < 0.85 // Less than 85% similarity indicates significant change
}

// Export for server-side usage (simplified version)
export function generateServerFingerprint(userAgent: string, acceptLanguage: string): {
  deviceId: string
  userAgent: string
  language: string
  timestamp: string
} {
  const components = [userAgent, acceptLanguage, 'server'].join('|')
  
  // Simple hash for server-side
  let hash = 0
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return {
    deviceId: Math.abs(hash).toString(16),
    userAgent,
    language: acceptLanguage,
    timestamp: new Date().toISOString()
  }
}