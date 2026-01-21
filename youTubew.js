export default {
  async fetch(request) {
    const url = new URL(request.url);
    const youtubeUrl = url.searchParams.get('url');

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (!youtubeUrl) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'YouTube URL parameter is required',
          example: '?url=https://www.youtube.com/watch?v=VIDEO_ID',
          channel: '@old_studio786'
        }, null, 2),
        { status: 400, headers }
      );
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Invalid YouTube URL',
          channel: '@old_studio786'
        }, null, 2),
        { status: 400, headers }
      );
    }

    try {
      const result1 = await extractYouTubeStreamingData(videoId);
      if (result1) return successResponse(result1, headers);

      const result2 = await getYouTubePlayerData(videoId);
      if (result2) return successResponse(result2, headers);

      const result3 = await getYouTubeEmbedData(videoId);
      if (result3) return successResponse(result3, headers);

      const result4 = await tryInvidious(videoId);
      if (result4) return successResponse(result4, headers);

    } catch (err) {
      console.log('All methods failed:', err.message);
    }

    // 🔴 UPDATED FINAL FALLBACK (yt1z.click)
    return new Response(
      JSON.stringify({
        status: 'info',
        message: 'Direct streaming not accessible via browser',
        note: 'Use external downloader tools below (browser required)',
        videoId: videoId,
        tools: [
          {
            name: 'YT1Z',
            url: `https://yt1z.click/en/video/${videoId}`
          },
          {
            name: 'YT5S',
            url: `https://yt5s.com/en?q=https://youtube.com/watch?v=${videoId}`
          }
        ],
        usage: 'Open link manually in browser to download',
        channel: '@old_studio786'
      }, null, 2),
      { headers }
    );
  }
};

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#]+)/,
    /youtube\.com\/embed\/([^&?#]+)/,
    /youtube\.com\/v\/([^&?#]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function successResponse(data, headers) {
  data.channel = '@old_studio786';
  return new Response(JSON.stringify(data, null, 2), { headers });
}

// ================== METHOD 1 ==================
async function extractYouTubeStreamingData(videoId) {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) return null;

    const html = await response.text();
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(' - YouTube', '').trim()
      : 'YouTube Video';

    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!match) return null;

    const playerData = JSON.parse(match[1]);
    return processYouTubePlayerData(playerData, videoId, title);

  } catch {
    return null;
  }
}

function processYouTubePlayerData(playerData, videoId, title) {
  const formats = [];

  const allFormats = [
    ...(playerData.streamingData?.formats || []),
    ...(playerData.streamingData?.adaptiveFormats || [])
  ];

  for (const f of allFormats) {
    let url = f.url;
    if (!url && f.signatureCipher) {
      const p = new URLSearchParams(f.signatureCipher);
      url = p.get('url');
    }
    if (url) {
      formats.push({
        quality: f.qualityLabel || (f.audioQuality ? 'audio' : 'unknown'),
        type: f.mimeType || 'video/mp4',
        url
      });
    }
  }

  if (!formats.length) return null;

  return {
    status: 'success',
    videoId,
    title,
    duration: formatDuration(playerData.videoDetails?.lengthSeconds),
    author: playerData.videoDetails?.author || '',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    formats,
    source: 'youtube-direct'
  };
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ================== METHOD 2 ==================
async function getYouTubePlayerData(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`);
    if (!res.ok) return null;
    const d = await res.json();
    return {
      status: 'success',
      videoId,
      title: d.title,
      author: d.author_name,
      thumbnail: d.thumbnail_url,
      source: 'youtube-oembed'
    };
  } catch {
    return null;
  }
}

// ================== METHOD 3 ==================
async function getYouTubeEmbedData(videoId) {
  return null;
}

// ================== METHOD 4 ==================
async function tryInvidious(videoId) {
  const instances = ['https://yewtu.be', 'https://inv.nadeko.net'];
  for (const i of instances) {
    try {
      const r = await fetch(`${i}/api/v1/videos/${videoId}`);
      if (!r.ok) continue;
      const d = await r.json();
      return {
        status: 'success',
        videoId,
        title: d.title,
        duration: formatDuration(d.duration),
        author: d.author,
        thumbnail: d.videoThumbnails?.[0]?.url,
        source: 'invidious'
      };
    } catch {}
  }
  return null;
}
