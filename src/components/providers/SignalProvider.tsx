'use client';

import { useEffect } from 'react';
import { BackgroundMonitor } from '@/lib/services/backgroundMonitor';
import { AutoGenerator } from '@/lib/services/autoGenerator';

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

        // Register service worker on load for PWA/FCM support
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/firebase-messaging-sw.js')
                .then(reg => console.log('✅ PWA Service Worker registered:', reg.scope))
                .catch(err => console.warn('⚠️ Service Worker registration failed:', err));
        }

        // Request notification permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        console.log('✅ Notification permission granted');
                    }
                });
            }
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
