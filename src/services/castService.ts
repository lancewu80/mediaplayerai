/**
 * Chromecast / Google Cast service
 *
 * Mobile  (iOS/Android) → react-native-google-cast
 * Electron / web        → castv2-client (Node.js) or Web Presentation API
 *
 * This module provides a unified interface. Heavy libs are imported
 * lazily so the bundle isn't bloated on platforms that don't support casting.
 */

import { Platform } from 'react-native';

export interface CastDevice {
  id: string;
  name: string;
  model?: string;
  ipAddress?: string;
}

export interface CastSession {
  deviceId: string;
  deviceName: string;
}

// ─── Mobile (react-native-google-cast) ───────────────────────────────────────

let _mobileClient: any = null;

async function getMobileClient() {
  if (_mobileClient) return _mobileClient;
  const { CastContext } = await import('react-native-google-cast');
  _mobileClient = CastContext;
  return _mobileClient;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Discover available Cast devices on the local network.
 */
export async function discoverDevices(): Promise<CastDevice[]> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      const ctx = await getMobileClient();
      const devices = await ctx.getDiscoveryManager().getDevices();
      return devices.map((d: any) => ({
        id: d.deviceId,
        name: d.friendlyName,
        model: d.modelName,
      }));
    } catch {
      return [];
    }
  }

  // Electron / web: use Presentation API or mDNS
  if (Platform.OS === 'web' && (window as any).electronAPI) {
    try {
      const devices: CastDevice[] = await (window as any).electronAPI.castDiscover();
      return devices;
    } catch {
      return [];
    }
  }

  // Browser: Presentation API — just signals availability
  if (typeof (window as any).PresentationRequest !== 'undefined') {
    return [{ id: 'presentation-api', name: 'Cast to TV (Presentation API)' }];
  }

  return [];
}

/**
 * Start casting the given media URI to the chosen device.
 */
export async function startCasting(
  device: CastDevice,
  uri: string,
  title: string,
  contentType = 'video/mp4'
): Promise<CastSession> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const ctx = await getMobileClient();
    await ctx.castMedia({
      mediaUrl: uri,
      title,
      contentType,
      deviceId: device.id,
    });
    return { deviceId: device.id, deviceName: device.name };
  }

  if (Platform.OS === 'web' && (window as any).electronAPI) {
    await (window as any).electronAPI.castStart(device.id, uri, title, contentType);
    return { deviceId: device.id, deviceName: device.name };
  }

  throw new Error('Chromecast not available on this platform');
}

/**
 * Stop the current Cast session.
 */
export async function stopCasting(): Promise<void> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      const ctx = await getMobileClient();
      await ctx.endCurrentSession(true);
    } catch { /* ignore */ }
    return;
  }
  if (Platform.OS === 'web' && (window as any).electronAPI) {
    await (window as any).electronAPI.castStop();
  }
}

/**
 * Send a seek command to the cast receiver.
 */
export async function castSeek(seconds: number): Promise<void> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const ctx = await getMobileClient();
    const session = ctx.getSessionManager().getCurrentCastSession();
    await session?.getRemoteMediaClient()?.seek({ position: seconds });
  }
}

export async function castSetVolume(vol: number): Promise<void> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const ctx = await getMobileClient();
    const session = ctx.getSessionManager().getCurrentCastSession();
    await session?.setVolume(vol);
  }
}
