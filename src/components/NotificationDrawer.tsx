import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  X,
  Volume2,
} from 'lucide-react';
import { NotificationItem } from '../types/budget';
import { requestPushPermission, triggerSystemNotification } from '../services/notificationService';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
  onTriggerTestPush: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearNotifications,
  onTriggerTestPush,
}) => {
  const [hasPushPermission, setHasPushPermission] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPushPermission(Notification.permission === 'granted');
    }
  }, []);

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setHasPushPermission(granted);
    if (granted) {
      triggerSystemNotification(
        'KashFlow Push Notifications Active',
        'You will receive instant alerts for budget breaches and scheduled bill reminders.'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 text-neutral-900 dark:text-white">
        
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm">Notifications & Reminders</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Web Push Permission Banner */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              System Web Push: <strong>{hasPushPermission ? 'Enabled' : 'Disabled'}</strong>
            </span>
            {!hasPushPermission ? (
              <button
                onClick={handleEnablePush}
                className="px-2.5 py-1 bg-emerald-600 text-white rounded font-medium text-[11px] cursor-pointer"
              >
                Enable Push
              </button>
            ) : (
              <button
                onClick={onTriggerTestPush}
                className="px-2.5 py-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded font-medium text-[11px] cursor-pointer hover:bg-neutral-300"
              >
                Test Push
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-400">
              <CheckCircle2 className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
              No pending alerts. All budget parameters within safe thresholds.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-colors ${
                  item.read
                    ? 'border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/40 text-neutral-600 dark:text-neutral-400'
                    : 'border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 text-neutral-900 dark:text-neutral-100'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {item.type === 'alert' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    {item.type === 'bill' && <Clock className="w-4 h-4 text-blue-500" />}
                    {item.type === 'anomaly' && <Sparkles className="w-4 h-4 text-rose-500" />}
                    {item.type === 'sync' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    {item.type === 'info' && <Bell className="w-4 h-4 text-neutral-400" />}
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="font-semibold text-neutral-950 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      {item.message}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1.5 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
            <button
              onClick={onMarkAllRead}
              className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Mark all read
            </button>
            <button
              onClick={onClearNotifications}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
