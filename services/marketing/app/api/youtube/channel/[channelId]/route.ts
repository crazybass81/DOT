import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    const { channelId } = await params;
    
    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Get channel details
    const channelUrl = `${YOUTUBE_API_BASE_URL}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    const channelResponse = await fetch(channelUrl);
    
    if (!channelResponse.ok) {
      const error = await channelResponse.json();
      console.error('YouTube API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch channel data', details: error },
        { status: channelResponse.status }
      );
    }

    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Get recent videos
    const searchParams = request.nextUrl.searchParams;
    const includeVideos = searchParams.get('includeVideos') === 'true';
    const maxVideos = searchParams.get('maxVideos') || '10';

    if (includeVideos) {
      const videosUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxVideos}&key=${YOUTUBE_API_KEY}`;
      const videosResponse = await fetch(videosUrl);
      
      if (videosResponse.ok) {
        const videosData = await videosResponse.json();
        
        // Get video statistics
        if (videosData.items?.length > 0) {
          const videoIds = videosData.items.map((item: any) => item.id.videoId).join(',');
          const videoStatsUrl = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
          const videoStatsResponse = await fetch(videoStatsUrl);
          
          if (videoStatsResponse.ok) {
            const videoStatsData = await videoStatsResponse.json();
            return NextResponse.json({
              channel: channelData.items[0],
              videos: videoStatsData.items
            });
          }
        }
      }
    }

    return NextResponse.json({
      channel: channelData.items[0]
    });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}