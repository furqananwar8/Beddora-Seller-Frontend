import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json({ error: 'API base URL not configured' }, { status: 500 });
  }

  // Forward the Authorization header from the client
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${apiBase}/api/amazon/advertising/authorize`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to initiate login', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    const url = result.data?.authorizationUrl;
    console.log("URL", url)
    if (!url) {
      return NextResponse.json({ error: 'No authorization URL returned' }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('Fetch error:', err.message);
    return NextResponse.json(
      { error: 'Failed to reach backend', message: err.message },
      { status: 500 }
    );
  }
}