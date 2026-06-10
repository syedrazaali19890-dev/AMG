import { NextRequest, NextResponse } from 'next/server';
import { db, initAdmin } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const signal = await request.json();

    if (!signal || !signal.pair || !signal.type || !signal.entry) {
      return NextResponse.json(
        { error: 'Invalid or missing signal payload' },
        { status: 400 }
      );
    }

    // Initialize admin
    const adminInstance = initAdmin();

    // Read device tokens from Firestore
    const snapshot = await db.collection('fcm_tokens').get();
    const tokens = snapshot.docs.map(doc => doc.id);

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, message: 'No registered tokens found, notification skipped.' });
    }

    const isBuy = signal.type === 'BUY';
    const directionEmoji = isBuy ? '🟢' : '🔴';
    
    // Check if it is a pending trigger or live activation
    const statusText = signal.status === 'PENDING' ? 'PENDING setup' : 'ACTIVE entry';
    const title = `${directionEmoji} ${signal.pair} ${signal.type} (${statusText})`;
    
    // Format numbers
    const format = (val: any) => typeof val === 'number' ? val.toFixed(2) : val;
    const body = `Entry: $${format(signal.entry)} | SL: $${format(signal.stopLoss)} | TP1: $${format(signal.tp1)}`;

    const messagePayload = {
      notification: {
        title,
        body,
      },
      data: {
        id: signal.id || '',
        pair: signal.pair,
        type: signal.type,
        entry: String(signal.entry),
        click_action: signal.pair.includes('XAU') ? '/gold-signals' : '/scalping-v2',
      },
      webpush: {
        notification: {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: true,
        },
        fcmOptions: {
          link: signal.pair.includes('XAU') ? '/gold-signals' : '/scalping-v2',
        }
      },
      tokens: tokens,
    };

    console.log(`📤 Broadcasting push notification to ${tokens.length} devices...`);
    const response = await adminInstance.messaging().sendEachForMulticast(messagePayload);
    console.log(`✅ Push results: ${response.successCount} success, ${response.failureCount} failed.`);

    // If there are failures, prune invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code;
          // Prune tokens that are invalid, expired or not registered
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        const batch = db.batch();
        tokensToRemove.forEach(t => {
          const docRef = db.collection('fcm_tokens').doc(t);
          batch.delete(docRef);
        });
        await batch.commit();
        console.log(`🧹 Pruned ${tokensToRemove.length} inactive/invalid FCM tokens from Firestore.`);
      }
    }

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error: any) {
    console.error('Error broadcasting push notification:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

