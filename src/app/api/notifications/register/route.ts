import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing token parameter' },
        { status: 400 }
      );
    }

    const docRef = db.collection('fcm_tokens').doc(token);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      await docRef.set({
        token,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Registered new FCM token: ${token.substring(0, 10)}...`);
      return NextResponse.json({ success: true, message: 'Token registered successfully' });
    }

    return NextResponse.json({ success: true, message: 'Token already registered' });
  } catch (error: any) {
    console.error('Error registering token:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

