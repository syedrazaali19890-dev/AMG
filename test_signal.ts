import { MarketDataManager } from '../src/lib/signals/marketData';
import { SignalGenerator } from '../src/lib/signals/generator';
import { MarketType, SignalType } from '../src/lib/signals/types';

async function test() {
    const marketData = MarketDataManager.generateSimulatedData('BTC/USDT', MarketType.CRYPTO, 100);
    const signal = await SignalGenerator.generateSignal(marketData, SignalType.FUTURE);
    
    if (signal) {
        console.log('Entry:', signal.entryPrice);
        console.log('Stop Loss:', signal.stopLoss);
        const distance = Math.abs(signal.entryPrice - signal.stopLoss) / signal.entryPrice * 100;
        console.log(`SL Distance: ${distance.toFixed(2)}%`);
    } else {
        console.log('No signal generated.');
    }
}

test();
