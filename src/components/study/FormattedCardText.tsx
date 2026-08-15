'use client';

import React from 'react';

interface FormattedCardTextProps {
  content: string;
  className?: string;
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

export function cleanRawHtml(html: string): string {
  if (!html) return '';
  let text = html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '');
  text = decodeHtmlEntities(text);
  return text.trim();
}

export const FormattedCardText: React.FC<FormattedCardTextProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Check if content contains image tags
  const hasImg = /<img[^>]+src=["']([^"']+)["'][^>]*>/i.test(content);

  if (hasImg) {
    // Split by img tag to render images and surrounding text cleanly
    const parts: React.ReactNode[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = imgRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        const cleaned = cleanRawHtml(textBefore).replace(/<[^>]+>/g, '');
        if (cleaned) {
          parts.push(
            <span key={`text-${lastIndex}`} className="whitespace-pre-line block">
              {cleaned}
            </span>
          );
        }
      }

      const src = match[1];
      parts.push(
        <span key={`img-${match.index}`} className="block my-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Card Illustration"
            className="max-h-64 max-w-full rounded-2xl mx-auto border border-[var(--border-subtle)] shadow-sm object-contain"
          />
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    const textAfter = content.substring(lastIndex);
    if (textAfter.trim()) {
      const cleaned = cleanRawHtml(textAfter).replace(/<[^>]+>/g, '');
      if (cleaned) {
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-line block">
            {cleaned}
          </span>
        );
      }
    }

    return <div className={className}>{parts}</div>;
  }

  // Pure text or HTML with tags like <b>, <i>, <br>
  const cleaned = cleanRawHtml(content).replace(/<(?!b|i|strong|em|span|\/b|\/i|\/strong|\/em|\/span)[^>]+>/gi, '');

  return (
    <div
      className={`whitespace-pre-line leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
};
