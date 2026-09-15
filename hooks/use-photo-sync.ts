import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { photoSyncService } from '@/services/photos';
import { sanitizeSyncError } from '@/services/photos/photo-sync-service';

export function usePhotoSync(): { triggerSync(force?: boolean): void } {
  const { status, userId } = useAuth();
  const wasOnline = useRef<boolean | null>(null);

  const triggerSync = useCallback(
    (force = false) => {
      if (status !== 'authenticated' || !userId) {
        return;
      }

      void photoSyncService
        .reconcile()
        .then(() => photoSyncService.processQueue(force))
        .catch((error: unknown) => {
          if (__DEV__) {
            console.warn(`[PhotoSync] ${sanitizeSyncError(error)}`);
          }
        });
    },
    [status, userId],
  );

  useEffect(() => {
    triggerSync();
  }, [triggerSync]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        triggerSync();
      }
    });
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (wasOnline.current === false && isOnline) {
        triggerSync(true);
      }
      wasOnline.current = isOnline;
    });

    return () => {
      appStateSubscription.remove();
      netInfoUnsubscribe();
    };
  }, [triggerSync]);

  return { triggerSync };
}
