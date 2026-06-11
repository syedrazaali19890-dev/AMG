'use client';

import { useEffect } from 'react';
import { BackgroundMonitor } from '@/lib/services/backgroundMonitor';
import { AutoGenerator } from '@/lib/services/autoGenerator';
import { requestNotificationPermission } from '@/lib/firebase/client';

/**
 * Signal Provider
 * Starts background services when app loads
 */

interface SignalProviderProps {
    children: React.ReactNode;
}

export function SignalProvider({ children }: SignalProviderProps) {
    useEffect(() => {
        console.log('🚀 Initializing signal services...');

        // Start background monitor
        BackgroundMonitor.start();

        // ===== FCM TOKEN AUTO-REFRESH =====
        // If user previously subscribed to push notifications on ANY page,
        // re-register the FCM token on every app visit.
        // This ensures the token stays fresh even if Firebase rotates it.
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const hasAnySubscription = 
                localStorage.getItem('goldPushSubscribed') === 'true' ||
                localStorage.getItem('cryptoPushSubscribed') === 'true';

            if (hasAnySubscription && Notification.permission === 'granted') {
                // Re-register token in the background (don't block UI)
                requestNotificationPermission()
                    .then(token => {
                        if (token) {
                            console.log('✅ FCM token auto-refreshed on app load');
                        }
                    })
                    .catch(err => {
                        console.warn('⚠️ FCM token auto-refresh failed:', err);
                    });
            } else if (Notification.permission === 'default') {
                // First-time visitor: don't auto-prompt, let individual pages handle it
                console.log('ℹ️ Notification permission not yet requested');
            }
        }

        // Register service worker for PWA support
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/firebase-messaging-sw.js')
                .then(reg => {
                    console.log('✅ PWA Service Worker registered:', reg.scope);
                    // Periodically check for service worker updates
                    reg.update().catch(() => {});
                })
                .catch(err => console.warn('⚠️ Service Worker registration failed:', err));
        }

        // Cleanup on unmount
        return () => {
            BackgroundMonitor.stop();
            AutoGenerator.stopAll();
            console.log('🛑 Signal services stopped');
        };
    }, []);

    return <>{children}</>;
}
