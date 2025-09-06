/**
 * Security Monitoring Dashboard
 * Real-time visualization of security metrics and threats
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Lock, Eye, Activity, Users, Globe, Database } from 'lucide-react';

interface SecurityMetrics {
  rateLimiting: {
    totalRequests: number;
    blockedRequests: number;
    currentThreatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    topBlockedIPs: Array<{ ip: string; count: number; reason: string }>;
  };
  ddosProtection: {
    status: 'IDLE' | 'MONITORING' | 'MITIGATING' | 'EMERGENCY';
    attacksDetected: number;
    blockedIPs: number;
    mitigationActive: boolean;
  };
  piiMasking: {
    totalResponses: number;
    maskedResponses: number;
    fieldsProtected: number;
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
  };
  compliance: {
    gdpr: { status: 'PASS' | 'FAIL' | 'PARTIAL'; score: number };
    ccpa: { status: 'PASS' | 'FAIL' | 'PARTIAL'; score: number };
    lastAudit: string;
    violations: number;
  };
}

export default function SecurityMonitoringDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [realTimeAlerts, setRealTimeAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial metrics
    fetchSecurityMetrics();
    
    // Set up real-time updates
    const interval = setInterval(fetchSecurityMetrics, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityMetrics = async () => {
    try {
      const response = await fetch('/api/security/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-500';
      case 'MEDIUM': return 'text-yellow-500';
      case 'HIGH': return 'text-orange-500';
      case 'CRITICAL': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
      case 'COMPLIANT':
      case 'IDLE':
        return 'bg-green-100 text-green-800';
      case 'PARTIAL':
      case 'MONITORING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAIL':
      case 'NON_COMPLIANT':
      case 'MITIGATING':
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <p className="text-red-600">Failed to load security metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Security Monitoring Dashboard</h2>
              <p className="text-blue-100">Real-time threat detection and compliance monitoring</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full bg-white/20 backdrop-blur ${getThreatLevelColor(metrics.rateLimiting.currentThreatLevel)}`}>
            <span className="font-semibold">Threat Level: {metrics.rateLimiting.currentThreatLevel}</span>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rate Limiting Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Rate Limiting</h3>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor('ACTIVE')}`}>
              ACTIVE
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Requests</span>
              <span className="font-medium">{metrics.rateLimiting.totalRequests.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Blocked</span>
              <span className="font-medium text-red-600">{metrics.rateLimiting.blockedRequests.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Block Rate</span>
              <span className="font-medium">
                {((metrics.rateLimiting.blockedRequests / metrics.rateLimiting.totalRequests) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* DDoS Protection Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold">DDoS Protection</h3>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(metrics.ddosProtection.status)}`}>
              {metrics.ddosProtection.status}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Attacks Detected</span>
              <span className="font-medium">{metrics.ddosProtection.attacksDetected}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Blocked IPs</span>
              <span className="font-medium">{metrics.ddosProtection.blockedIPs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mitigation</span>
              <span className={`font-medium ${metrics.ddosProtection.mitigationActive ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.ddosProtection.mitigationActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* PII Masking Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">PII Masking</h3>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(metrics.piiMasking.complianceStatus)}`}>
              {metrics.piiMasking.complianceStatus}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Responses</span>
              <span className="font-medium">{metrics.piiMasking.totalResponses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Masked</span>
              <span className="font-medium">{metrics.piiMasking.maskedResponses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fields Protected</span>
              <span className="font-medium">{metrics.piiMasking.fieldsProtected.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Compliance Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold">Compliance</h3>
            </div>
            <span className="text-xs text-gray-500">
              {metrics.compliance.lastAudit}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">GDPR</span>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(metrics.compliance.gdpr.status)}`}>
                  {metrics.compliance.gdpr.score}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">CCPA</span>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(metrics.compliance.ccpa.status)}`}>
                  {metrics.compliance.ccpa.score}%
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Violations</span>
              <span className={`font-medium ${metrics.compliance.violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.compliance.violations}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Blocked IPs Table */}
      {metrics.rateLimiting.topBlockedIPs.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Top Blocked IPs</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Block Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.rateLimiting.topBlockedIPs.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.reason === 'RATE_LIMIT' ? 'bg-yellow-100 text-yellow-800' :
                        item.reason === 'DDOS_ATTACK' ? 'bg-red-100 text-red-800' :
                        item.reason === 'SQL_INJECTION' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-blue-600 hover:text-blue-900">
                        Whitelist
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Real-time Alerts */}
      {realTimeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-3">Active Security Alerts</h3>
          <div className="space-y-2">
            {realTimeAlerts.map((alert, index) => (
              <div key={index} className="bg-white rounded p-3 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{alert.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">{alert.timestamp}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}