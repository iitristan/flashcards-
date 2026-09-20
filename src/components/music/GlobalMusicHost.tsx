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
      className="fixed bottom-0 right-0 w-[200px] h-[120px] pointer-events-none opacity-[0.001] z-[-50] overflow-hidden"
    >
      <iframe
        key={parsed.embedUrl}
        src={parsed.embedUrl}
        width="200"
        height="120"
        title="NutriAnki Persistent Background Audio"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};
