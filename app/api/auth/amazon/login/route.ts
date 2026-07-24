import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/amazon/advertising/authorize`,
      {
        headers: {
          cookie: req.headers.get('cookie') || '',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to initiate login' },
        { status: response.status }
      );
    }

    const result = await response.json();
    const url = result.data?.authorizationUrl;

    if (!url) {
      return NextResponse.json(
        { error: 'No authorization URL returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: 'Failed to initiate login' },
      { status: 500 }
    );
  }
}