'use client';

import React, { useMemo } from 'react';
import { useNutriStore } from '@/lib/store/useNutriStore';
import { parseYouTubeUrl } from '@/lib/music/youtubeUrlHelper';

/**
 * Global singleton music host mounted at RootLayout.
 * Stays alive across all page navigation and session state changes,
 * preventing YouTube playback from restarting when moving to the cards/quiz view.
 */
export const GlobalMusicHost: React.FC = () => {
  const { musicSettings } = useNutriStore();

  const parsed = useMemo(() => {
    return parseYouTubeUrl(musicSettings.customUrl);
  }, [musicSettings.customUrl]);

  if (!parsed.isValid || !musicSettings.isPlaying) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed -left-[9999px] top-0 w-[320px] h-[240px] pointer-events-none overflow-hidden z-[-1]"
    >
      <iframe
        key={parsed.embedUrl}
        src={parsed.embedUrl}
        width="320"
        height="240"
        title="NutriAnki Persistent Background Audio"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};
