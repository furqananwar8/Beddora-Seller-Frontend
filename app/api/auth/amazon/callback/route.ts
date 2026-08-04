// app/api/auth/amazon/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const backendUrl = new URL(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/amazon/callback`
  );
  searchParams.forEach((value, key) => backendUrl.searchParams.set(key, value));

  console.log("Callback route =>", backendUrl, process.env.NEXT_PUBLIC_API_BASE_URL)
  const response = await fetch(backendUrl.toString(), { method: 'GET' });
  const data = await response.json();
  if (!data.success || !data.sessionId) {
    const errorCode = data.error || 'auth_failed';
    const errorMessage = encodeURIComponent(data.message || 'Authentication failed');
    console.log(`${process.env.NEXT_PUBLIC_FRONTEND_BASE_URL}/amazon/callback?error=${errorCode}&message=${errorMessage}`)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_FRONTEND_BASE_URL}/amazon/callback?error=${errorCode}&message=${errorMessage}`,
      302
    );
  }

  // Redirect to frontend callback page with session data in query params
  const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_FRONTEND_BASE_URL}/amazon/callback`);
  redirectUrl.searchParams.set('success', 'true');
  redirectUrl.searchParams.set('sessionId', data.sessionId);
  redirectUrl.searchParams.set('email', data.email);
  redirectUrl.searchParams.set('name', data.name || '');
  redirectUrl.searchParams.set('amazonUserId', data.amazonUserId || '');
  if (data.profileId) redirectUrl.searchParams.set('profileId', String(data.profileId));
  if (data.region) redirectUrl.searchParams.set('region', data.region);

  return NextResponse.redirect(redirectUrl.toString(), 302);
}