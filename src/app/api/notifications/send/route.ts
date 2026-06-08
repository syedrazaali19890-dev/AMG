import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';

const tokensFilePath = path.join(process.cwd(), 'src/data/tokens.json');

// Helper to initialize firebase-admin service
function initAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin SDK environment variables in .env.local');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('🔥 Firebase Admin SDK Initialized Successfully');
  }
  return admin;
}

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
    initAdmin();

    // Read device tokens
    let tokens: string[] = [];
    try {
      const fileContent = await fs.readFile(tokensFilePath, 'utf-8');
      tokens = JSON.parse(fileContent);
    } catch (error) {
      console.warn('tokens.json not found or empty');
    }

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
    const response = await admin.messaging().sendEachForMulticast(messagePayload);
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
        const remainingTokens = tokens.filter(t => !tokensToRemove.includes(t));
        await fs.writeFile(tokensFilePath, JSON.stringify(remainingTokens, null, 2), 'utf-8');
        console.log(`🧹 Pruned ${tokensToRemove.length} inactive/invalid FCM tokens.`);
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
