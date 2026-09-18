/**
 * Helper to parse any YouTube / YouTube Music URL into an embeddable player URL.
 */
export function parseYouTubeUrl(rawUrl: string): {
  embedUrl: string;
  videoId?: string;
  playlistId?: string;
  isValid: boolean;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { embedUrl: '', isValid: false };
  }

  const trimmed = rawUrl.trim();

  try {
    let videoId = '';
    let playlistId = '';

    // Extract list parameter if present
    const listMatch = trimmed.match(/[?&]list=([^#&?]+)/);
    if (listMatch) {
      playlistId = listMatch[1];
    }

    if (trimmed.includes('youtu.be/')) {
      const parts = trimmed.split('youtu.be/')[1]?.split(/[?#&]/);
      videoId = parts?.[0] || '';
    } else if (trimmed.includes('/watch')) {
      const vMatch = trimmed.match(/[?&]v=([^#&?]+)/);
      if (vMatch) {
        videoId = vMatch[1];
      }
    } else if (trimmed.includes('/embed/')) {
      const parts = trimmed.split('/embed/')[1]?.split(/[?#&]/);
      if (parts?.[0] && parts[0] !== 'videoseries') {
        videoId = parts[0];
      }
    } else if (trimmed.includes('/live/')) {
      const parts = trimmed.split('/live/')[1]?.split(/[?#&]/);
      videoId = parts?.[0] || '';
    } else if (trimmed.includes('/shorts/')) {
      const parts = trimmed.split('/shorts/')[1]?.split(/[?#&]/);
      videoId = parts?.[0] || '';
    }

    // Direct playlist without video ID
    if (!videoId && playlistId) {
      return {
        embedUrl: `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&enablejsapi=1&playsinline=1`,
        playlistId,
        isValid: true
      };
    }

    // Video with playlist or standalone video
    if (videoId) {
      const extra = playlistId ? `&list=${playlistId}` : '';
      return {
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&playsinline=1${extra}`,
        videoId,
        playlistId,
        isValid: true
      };
    }

    // If already starts with https://www.youtube.com/embed/
    if (trimmed.startsWith('https://www.youtube.com/embed/')) {
      return {
        embedUrl: trimmed,
        isValid: true
      };
    }
  } catch (e) {
    console.error('Error parsing YouTube URL:', e);
  }

  return { embedUrl: '', isValid: false };
}
