import { NotificationItem } from '../types/budget';

export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return false;
  }
}

export function triggerSystemNotification(title: string, message: string, tag?: string): void {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: tag || 'budget-alert',
      });
    } catch (e) {
      console.warn('Failed to fire system push notification:', e);
    }
  }
}

export function createInAppNotification(
  title: string,
  message: string,
  type: NotificationItem['type'] = 'alert',
  actionUrl?: string
): NotificationItem {
  return {
    id: 'notif_' + Math.random().toString(36).substring(2, 9),
    title,
    message,
    timestamp: new Date().toISOString(),
    type,
    read: false,
    actionUrl,
  };
}
