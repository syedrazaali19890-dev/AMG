import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const tokensFilePath = path.join(process.cwd(), 'src/data/tokens.json');

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing token parameter' },
        { status: 400 }
      );
    }

    // Read existing tokens
    let tokens: string[] = [];
    try {
      const fileContent = await fs.readFile(tokensFilePath, 'utf-8');
      tokens = JSON.parse(fileContent);
    } catch (error) {
      // If file doesn't exist, start with empty array
      console.warn('tokens.json not found or invalid, initializing empty list');
    }

    // Add token if it's new
    if (!tokens.includes(token)) {
      tokens.push(token);
      await fs.writeFile(tokensFilePath, JSON.stringify(tokens, null, 2), 'utf-8');
      console.log(`✅ Registered new FCM token: ${token.substring(0, 10)}...`);
      return NextResponse.json({ success: true, message: 'Token registered successfully' });
    }

    return NextResponse.json({ success: true, message: 'Token already registered' });
  } catch (error: any) {
    console.error('Error registering token:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
