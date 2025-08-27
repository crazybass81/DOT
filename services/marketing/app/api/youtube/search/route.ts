import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export async function GET(request: NextRequest) {
  try {
    // Check for API key
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const maxResults = searchParams.get('maxResults') || '10';
    const type = searchParams.get('type') || 'channel';

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Search for channels
    const searchUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&type=${type}&q=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      console.error('YouTube API error:', error);
      return NextResponse.json(
        { error: 'YouTube API request failed', details: error },
        { status: searchResponse.status }
      );
    }

    const searchData = await searchResponse.json();

    // If searching for channels, get additional channel details
    if (type === 'channel' && searchData.items?.length > 0) {
      const channelIds = searchData.items.map((item: any) => item.id.channelId).join(',');
      
      const channelsUrl = `${YOUTUBE_API_BASE_URL}/channels?part=snippet,statistics,contentDetails&id=${channelIds}&key=${YOUTUBE_API_KEY}`;
      const channelsResponse = await fetch(channelsUrl);
      
      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json();
        return NextResponse.json({
          search: searchData,
          channels: channelsData
        });
      }
    }

    return NextResponse.json(searchData);

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}