'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Navbar() {
    const [isDark, setIsDark] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check for saved theme preference or default to dark
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = savedTheme === 'dark' || (!savedTheme && true);

        setIsDark(prefersDark);

        if (prefersDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Check if running in PWA standalone mode
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
            || (window.navigator as any).standalone === true;
        setIsStandalone(isStandaloneMode);
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);

        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/dashboard', label: 'Standard' },
        { href: '/scalping', label: 'Scalping ⚡' },
        { href: '/scalping-v2', label: 'Scalping V2 🏛️' },
        { href: '/gold-signals', label: 'Gold 🥇' },
        { href: '/on-chain', label: 'On-Chain 🐋' },
        { href: '/completed', label: 'Completed Signals' },
        { href: '/market-gpt', label: 'MarketGPT 🧠' },
    ];

    if (isStandalone) {
        return (
            <nav className="glass border-b border-border sticky top-0 z-40 backdrop-blur-lg">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-center h-16">
                        <Link href="/" className="flex items-center gap-2 group">
                            <img
                                src="/logo.png"
                                alt="AMG Trading"
                                className="h-16 w-auto transition-transform"
                            />
                        </Link>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <nav className="glass border-b border-border sticky top-0 z-40 backdrop-blur-lg">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-24">
                    <Link href="/" className="flex items-center gap-2 group">
                        <img
                            src="/logo.png"
                            alt="AMG Trading - Professional Trading Signals"
                            className="h-24 w-auto hover:scale-105 transition-transform"
                        />
                    </Link>

                    <div className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium text-[#D4AF37] hover:text-[#FFD700] transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-[#D4AF37]"
                            aria-label="Toggle theme"
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors text-[#D4AF37]"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="md:hidden py-4 border-t border-border"
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block py-2 text-sm font-medium text-[#D4AF37] hover:text-[#FFD700] transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </motion.div>
                )}
            </div>
        </nav>
    );
}
