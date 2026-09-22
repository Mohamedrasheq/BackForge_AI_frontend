import { haptics } from '@/lib/haptics';
import {
  enableAlertsOnDevice,
  type NotificationPermission,
} from '@/lib/notifications-enable';
import { getNotificationPermissionStatus } from '@/services/notifications';
import { useCallback, useState } from 'react';

export function useNotificationEnable() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshPermission = useCallback(async () => {
    const status = await getNotificationPermissionStatus();
    setPermission(status);
    return status;
  }, []);

  const enableAlerts = useCallback(async () => {
    setRegistering(true);
    setMessage(null);
    try {
      const result = await enableAlertsOnDevice();
      setPermission(result.permission);
      setMessage(result.message);
      if (result.registered) haptics.success();
    } catch (err) {
      haptics.error();
      setMessage(err instanceof Error ? err.message : 'Could not register this device');
    } finally {
      setRegistering(false);
    }
  }, []);

  return {
    permission,
    registering,
    message,
    refreshPermission,
    enableAlerts,
  };
}
