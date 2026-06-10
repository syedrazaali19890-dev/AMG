'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, Zap, Trophy, Waves, History } from 'lucide-react';

export function BottomNavbar() {
    const pathname = usePathname();
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
                || (window.navigator as any).standalone === true;
            setIsStandalone(isStandaloneMode);
        };
        
        checkStandalone();
        
        // Listen to changes
        const mq = window.matchMedia('(display-mode: standalone)');
        const listener = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
        mq.addEventListener('change', listener);
        return () => mq.removeEventListener('change', listener);
    }, []);

    if (!isStandalone) return null;

    const navItems = [
        { href: '/dashboard', label: 'Standard', icon: Activity },
        { href: '/scalping-v2', label: 'Scalping', icon: Zap },
        { href: '/gold-signals', label: 'Gold', icon: Trophy },
        { href: '/on-chain', label: 'On-Chain', icon: Waves },
        { href: '/completed', label: 'History', icon: History },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border bg-[#050508]/90 backdrop-blur-lg pb-safe-bottom">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${
                                isActive ? 'text-[#FFD700] scale-105' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
