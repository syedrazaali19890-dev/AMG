'use client';

import React from 'react';
import { Signal } from '@/lib/signals/types';
import { AdvancedSignalChart } from './AdvancedSignalChart';

export function AdvancedSignalView({ signal }: { signal: Signal }) {
    return (
        <div className="flex flex-col lg:flex-row gap-4 w-full">
            <div className="flex-1 min-w-0">
                <AdvancedSignalChart signal={signal} />
            </div>
        </div>
    );
}
