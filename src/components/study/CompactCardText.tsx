'use client';

import React, { useState } from 'react';
import { cleanRawHtml } from './FormattedCardText';
import { ImageIcon, ExternalLink, X, ZoomIn } from 'lucide-react';

interface CompactCardTextProps {
  content: string;
  className?: string;
  onPreviewImage?: (src: string, alt?: string) => void;
}

export interface ExtractedImage {
  src: string;
  alt?: string;
}

/**
 * Checks if the content string contains image markup, data URLs, or image links.
 */
export function hasImageContent(content: string): boolean {
  if (!content) return false;
  return (
    /<img\b[^>]*>/i.test(content) ||
    /!\[([^\]]*)\]\(([^)]+)\)/i.test(content) ||
    /data:image\/[a-zA-Z0-9.+_-]+;base64,[A-Za-z0-9+/=]{20,}/i.test(content) ||
    /https?:\/\/[^\s<"']+\.(?:png|jpe?g|gif|webp|svg|bmp)(?:\?[^\s<"']*)?/i.test(content)
  );
}

/**
 * Strips out heavy image markup, leaving only readable text.
 */
export function stripImageMarkup(content: string): string {
  if (!content) return '';
  return cleanRawHtml(content)
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/gi, ' ')
    .replace(/data:image\/[a-zA-Z0-9.+_-]+;base64,[A-Za-z0-9+/=]+/gi, ' ')
    .replace(/https?:\/\/[^\s<"']+\.(?:png|jpe?g|gif|webp|svg|bmp)(?:\?[^\s<"']*)?/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Modal to display an image preview when a compact image link is clicked.
 */
export const ImagePreviewModal: React.FC<{
  isOpen: boolean;
  src: string | null;
  alt?: string;
  onClose: () => void;
}> = ({ isOpen, src, alt, onClose }) => {
  if (!isOpen || !src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image Preview"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center gap-3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
              {alt || 'Card Image Attachment'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {src.startsWith('http') && (
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors"
                title="Open image in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Original</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 w-full max-h-[70vh] flex items-center justify-center overflow-auto rounded-2xl bg-[var(--bg-surface-subtle)]/50 p-2 border border-[var(--border-subtle)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || 'Flashcard Image'}
            className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-xs"
          />
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-[var(--text-subtle)] text-center">
          Click outside or press Escape to close
        </p>
      </div>
    </div>
  );
};

/**
 * Extracts src and alt attributes from any <img> tag string.
 */
function parseImgTag(imgTag: string): { src: string; alt?: string } {
  const srcMatch = imgTag.match(/\bsrc=["']([^"']+)["']/i);
  const altMatch = imgTag.match(/\balt=["']([^"']*)["']/i);
  return {
    src: srcMatch ? srcMatch[1] : '',
    alt: altMatch ? altMatch[1] : undefined,
  };
}

/**
 * Renders text while converting any embedded image tags, markdown images, or data URLs
 * into compact, functional clickable link pills that open a preview modal.
 * Prevents giant base64 text from blowing up the bulk manage cards UI.
 */
export const CompactCardText: React.FC<CompactCardTextProps> = ({
  content,
  className = '',
  onPreviewImage,
}) => {
  const [modalImage, setModalImage] = useState<{ src: string; alt?: string } | null>(null);

  if (!content) return null;

  // If no images exist at all, return normal cleaned text safely
  if (!hasImageContent(content)) {
    return <span className={className}>{cleanRawHtml(content)}</span>;
  }

  // Parse out images and text fragments
  const nodes: React.ReactNode[] = [];
  const raw = cleanRawHtml(content);
  let keyIndex = 0;

  // Master regex matching:
  // 1. <img ...>
  // 2. ![alt](url)
  // 3. raw data:image/... base64 URLs
  // 4. standalone image URLs http...png|jpg|webp
  const imgPattern =
    /(<img\b[^>]*>)|(!\[([^\]]*)\]\(([^)]+)\))|(data:image\/[a-zA-Z0-9.+_-]+;base64,[A-Za-z0-9+/=]{20,})|(https?:\/\/[^\s<"']+\.(?:png|jpe?g|gif|webp|svg|bmp)(?:\?[^\s<"']*)?)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imgPattern.exec(raw)) !== null) {
    const textBefore = raw.substring(lastIndex, match.index);
    if (textBefore) {
      // Clean any stray tags and decode entities
      const cleanBefore = textBefore.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ');
      if (cleanBefore.trim()) {
        nodes.push(<span key={`text-${keyIndex++}`}>{cleanBefore}</span>);
      }
    }

    let src = '';
    let alt = '';

    if (match[1]) {
      // <img ...> tag
      const parsed = parseImgTag(match[1]);
      src = parsed.src;
      alt = parsed.alt || 'Image Attachment';
    } else if (match[2]) {
      // Markdown ![alt](url)
      alt = match[3] || 'Image Attachment';
      src = match[4];
    } else if (match[5]) {
      // Raw data URL
      src = match[5];
      alt = 'Embedded Image';
    } else if (match[6]) {
      // Direct HTTP URL
      src = match[6];
      alt = 'Image Link';
    }

    if (src) {
      const currentSrc = src;
      const currentAlt = alt;

      const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onPreviewImage) {
          onPreviewImage(currentSrc, currentAlt);
        } else {
          setModalImage({ src: currentSrc, alt: currentAlt });
        }
      };

      nodes.push(
        <button
          key={`img-btn-${keyIndex++}`}
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 mx-1 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white border border-[var(--primary)]/30 text-[11px] font-bold cursor-pointer transition-all shadow-2xs group"
          title="Click to preview image attachment"
        >
          <ImageIcon className="w-3 h-3 group-hover:scale-110 transition-transform shrink-0" />
          <span className="truncate max-w-[140px]">
            {currentAlt ? `[🖼️ ${currentAlt}]` : '[🖼️ View Image]'}
          </span>
          <ZoomIn className="w-2.5 h-2.5 opacity-70 shrink-0 ml-0.5" />
        </button>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  const textAfter = raw.substring(lastIndex);
  if (textAfter) {
    const cleanAfter = textAfter.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ');
    if (cleanAfter.trim()) {
      nodes.push(<span key={`text-${keyIndex++}`}>{cleanAfter}</span>);
    }
  }

  return (
    <>
      <span className={className}>{nodes}</span>
      {!onPreviewImage && modalImage && (
        <ImagePreviewModal
          isOpen={Boolean(modalImage)}
          src={modalImage.src}
          alt={modalImage.alt}
          onClose={() => setModalImage(null)}
        />
      )}
    </>
  );
};
