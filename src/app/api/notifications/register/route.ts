import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { token, origin } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing token parameter' },
        { status: 400 }
      );
    }

    const docRef = db.collection('fcm_tokens').doc(token);
    const docSnap = await docRef.get();

    const isLocal = origin ? (origin.includes('localhost') || origin.includes('127.0.0.1')) : false;
    const tokenEnv = isLocal ? 'development' : 'production';

    const tokenData = {
      token,
      origin: origin || '',
      env: tokenEnv,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: docSnap.exists ? (docSnap.data()?.createdAt || admin.firestore.FieldValue.serverTimestamp()) : admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(tokenData);
    console.log(`✅ Registered/Updated FCM token: ${token.substring(0, 10)}... [Env: ${tokenEnv}, Origin: ${origin || 'unknown'}]`);
    return NextResponse.json({ success: true, message: 'Token registered/updated successfully' });
  } catch (error: any) {
    console.error('Error registering token:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

