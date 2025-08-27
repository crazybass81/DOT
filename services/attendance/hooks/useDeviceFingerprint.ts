import { useEffect, useState } from 'react';

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timezone: string;
  fingerprint: string;
}

export const useDeviceFingerprint = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    const generateFingerprint = () => {
      const components = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // Create fingerprint from components
      const fingerprintString = [
        components.userAgent,
        components.platform,
        components.language,
        components.screenResolution,
        components.timezone
      ].join('|');

      const fingerprint = btoa(fingerprintString).substring(0, 32);

      setDeviceInfo({
        ...components,
        fingerprint
      });
    };

    generateFingerprint();
  }, []);

  return deviceInfo;
};