/**
 * Security Metrics API Endpoint
 * Provides real-time security metrics for monitoring dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  rateLimiter,
  piiMasker,
  auditLogger 
} from '../../../../src/middleware/security-middleware';

// Mock data for demonstration - in production, these would come from actual monitoring systems
let mockMetrics = {
  rateLimiting: {
    totalRequests: 0,
    blockedRequests: 0,
    currentThreatLevel: 'LOW' as const,
    topBlockedIPs: [] as Array<{ ip: string; count: number; reason: string }>
  },
  ddosProtection: {
    status: 'IDLE' as const,
    attacksDetected: 0,
    blockedIPs: 0,
    mitigationActive: false
  },
  piiMasking: {
    totalResponses: 0,
    maskedResponses: 0,
    fieldsProtected: 0,
    complianceStatus: 'COMPLIANT' as const
  },
  compliance: {
    gdpr: { status: 'PASS' as const, score: 95 },
    ccpa: { status: 'PASS' as const, score: 92 },
    lastAudit: new Date().toISOString().split('T')[0],
    violations: 0
  }
};

// Simulate metric updates
setInterval(() => {
  // Simulate request traffic
  mockMetrics.rateLimiting.totalRequests += Math.floor(Math.random() * 100);
  mockMetrics.rateLimiting.blockedRequests += Math.floor(Math.random() * 5);
  
  // Update threat level based on block rate
  const blockRate = mockMetrics.rateLimiting.blockedRequests / mockMetrics.rateLimiting.totalRequests;
  if (blockRate > 0.2) {
    mockMetrics.rateLimiting.currentThreatLevel = 'CRITICAL';
  } else if (blockRate > 0.1) {
    mockMetrics.rateLimiting.currentThreatLevel = 'HIGH';
  } else if (blockRate > 0.05) {
    mockMetrics.rateLimiting.currentThreatLevel = 'MEDIUM';
  } else {
    mockMetrics.rateLimiting.currentThreatLevel = 'LOW';
  }
  
  // Simulate PII masking
  mockMetrics.piiMasking.totalResponses += Math.floor(Math.random() * 50);
  mockMetrics.piiMasking.maskedResponses += Math.floor(Math.random() * 10);
  mockMetrics.piiMasking.fieldsProtected += Math.floor(Math.random() * 30);
  
  // Occasionally simulate attacks
  if (Math.random() > 0.95) {
    mockMetrics.ddosProtection.attacksDetected++;
    mockMetrics.ddosProtection.status = 'MONITORING';
    mockMetrics.ddosProtection.blockedIPs += Math.floor(Math.random() * 10);
    
    // Add to blocked IPs list
    const randomIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const existingIP = mockMetrics.rateLimiting.topBlockedIPs.find(item => item.ip === randomIP);
    
    if (existingIP) {
      existingIP.count++;
    } else {
      mockMetrics.rateLimiting.topBlockedIPs.push({
        ip: randomIP,
        count: 1,
        reason: Math.random() > 0.5 ? 'RATE_LIMIT' : 'DDOS_ATTACK'
      });
    }
    
    // Keep only top 10 blocked IPs
    mockMetrics.rateLimiting.topBlockedIPs.sort((a, b) => b.count - a.count);
    mockMetrics.rateLimiting.topBlockedIPs = mockMetrics.rateLimiting.topBlockedIPs.slice(0, 10);
  }
  
  // Reset DDoS status after some time
  if (mockMetrics.ddosProtection.status === 'MONITORING' && Math.random() > 0.8) {
    mockMetrics.ddosProtection.status = 'IDLE';
    mockMetrics.ddosProtection.mitigationActive = false;
  }
}, 5000); // Update every 5 seconds

export async function GET(request: NextRequest) {
  try {
    // In production, gather real metrics from monitoring systems
    const metrics = {
      ...mockMetrics,
      timestamp: new Date().toISOString()
    };
    
    // Apply PII masking to the metrics response itself
    const maskedMetrics = await piiMasker.maskApiResponse(metrics);
    
    return NextResponse.json(maskedMetrics, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching security metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security metrics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle security control actions
    switch (body.action) {
      case 'WHITELIST_IP':
        // Add IP to whitelist
        console.log(`Whitelisting IP: ${body.ip}`);
        return NextResponse.json({ success: true, message: `IP ${body.ip} whitelisted` });
        
      case 'ACTIVATE_EMERGENCY_MODE':
        // Activate emergency security mode
        mockMetrics.ddosProtection.status = 'EMERGENCY';
        mockMetrics.ddosProtection.mitigationActive = true;
        mockMetrics.rateLimiting.currentThreatLevel = 'CRITICAL';
        return NextResponse.json({ success: true, message: 'Emergency mode activated' });
        
      case 'RESET_METRICS':
        // Reset metrics (for testing)
        mockMetrics = {
          rateLimiting: {
            totalRequests: 0,
            blockedRequests: 0,
            currentThreatLevel: 'LOW',
            topBlockedIPs: []
          },
          ddosProtection: {
            status: 'IDLE',
            attacksDetected: 0,
            blockedIPs: 0,
            mitigationActive: false
          },
          piiMasking: {
            totalResponses: 0,
            maskedResponses: 0,
            fieldsProtected: 0,
            complianceStatus: 'COMPLIANT'
          },
          compliance: {
            gdpr: { status: 'PASS', score: 95 },
            ccpa: { status: 'PASS', score: 92 },
            lastAudit: new Date().toISOString().split('T')[0],
            violations: 0
          }
        };
        return NextResponse.json({ success: true, message: 'Metrics reset' });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing security action:', error);
    return NextResponse.json(
      { error: 'Failed to process security action' },
      { status: 500 }
    );
  }
}