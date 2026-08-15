import JSZip from 'jszip';
import { decompress } from 'fzstd';

export interface ExtractedArchive {
  dbBuffer: Uint8Array;
  dbType: 'anki21b' | 'anki21' | 'anki2';
  mediaMap: Map<string, string>; // "0" -> "filename.jpg"
  reverseMediaMap: Map<string, string>; // "filename.jpg" -> "0"
  getMediaFile: (filenameOrIndex: string) => Promise<Uint8Array | null>;
  getMediaDataUrl: (filenameOrIndex: string) => Promise<string | null>;
  hasMedia: boolean;
}

/**
 * Validate that zip entry paths do not attempt directory traversal attacks (Zip Slip)
 */
function validateZipEntryPath(name: string): void {
  if (name.includes('..') || name.startsWith('/') || name.startsWith('\\')) {
    throw new Error(`Security Exception: Path traversal attempt detected in zip archive: ${name}`);
  }
}

/**
 * Parses binary protobuf format used by Anki 2.1b for media dictionary
 */
function parseProtobufMedia(buf: Uint8Array): Map<string, string> {
  const map = new Map<string, string>();
  let pos = 0;
  let entryIndex = 0;

  while (pos < buf.length) {
    if (buf[pos] === 0x0a) {
      pos++;
      let len = 0;
      let shift = 0;
      while (pos < buf.length) {
        const b = buf[pos++];
        len |= (b & 0x7f) << shift;
        if (!(b & 0x80)) break;
        shift += 7;
      }

      const entryEnd = pos + len;
      if (entryEnd > buf.length) break;

      let entryPos = pos;
      while (entryPos < entryEnd) {
        const tag = buf[entryPos++];
        const wire = tag & 7;
        const fieldNum = tag >> 3;

        if (fieldNum === 1 && wire === 2) {
          let strLen = 0;
          let sShift = 0;
          while (entryPos < entryEnd) {
            const b = buf[entryPos++];
            strLen |= (b & 0x7f) << sShift;
            if (!(b & 0x80)) break;
            sShift += 7;
          }
          const nameBytes = buf.slice(entryPos, entryPos + strLen);
          const name = new TextDecoder('utf-8').decode(nameBytes);
          map.set(String(entryIndex), name);
          entryPos += strLen;
        } else if (wire === 0) {
          while (entryPos < entryEnd && (buf[entryPos++] & 0x80));
        } else if (wire === 2) {
          let vLen = 0;
          let vShift = 0;
          while (entryPos < entryEnd) {
            const b = buf[entryPos++];
            vLen |= (b & 0x7f) << vShift;
            if (!(b & 0x80)) break;
            vShift += 7;
          }
          entryPos += vLen;
        } else {
          break;
        }
      }

      entryIndex++;
      pos = entryEnd;
    } else {
      pos++;
    }
  }

  return map;
}

/**
 * Determines MIME type from filename extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/mp4';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Converts a Uint8Array into a Base64 string safely across browser and node environments
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Opens and extracts an Anki package (.colpkg / .apkg) archive safely
 */
export async function extractAnkiArchive(
  fileOrData: File | ArrayBuffer | Uint8Array
): Promise<ExtractedArchive> {
  let zipData: ArrayBuffer | Uint8Array;

  if (typeof File !== 'undefined' && fileOrData instanceof File) {
    zipData = await fileOrData.arrayBuffer();
  } else {
    zipData = fileOrData as ArrayBuffer | Uint8Array;
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipData);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Corrupted zip archive';
    throw new Error(`Invalid Anki package: Unable to read zip archive (${msg})`);
  }

  // Validate all paths in zip archive to prevent directory traversal
  const allFiles = Object.keys(zip.files);
  for (const filename of allFiles) {
    validateZipEntryPath(filename);
  }

  // Detect and extract SQLite collection database
  let dbBuffer: Uint8Array | null = null;
  let dbType: 'anki21b' | 'anki21' | 'anki2' = 'anki2';

  if (zip.file('collection.anki21b')) {
    dbType = 'anki21b';
    const compressed = await zip.file('collection.anki21b')!.async('uint8array');
    try {
      dbBuffer = decompress(compressed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Zstandard decompression error';
      throw new Error(`Failed to decompress collection.anki21b (${msg})`);
    }
  } else if (zip.file('collection.anki21')) {
    dbType = 'anki21';
    dbBuffer = await zip.file('collection.anki21')!.async('uint8array');
  } else if (zip.file('collection.anki2')) {
    dbType = 'anki2';
    dbBuffer = await zip.file('collection.anki2')!.async('uint8array');
  }

  if (!dbBuffer || dbBuffer.length === 0) {
    throw new Error('Unsupported or corrupted Anki package: No collection database (collection.anki21b/anki21/anki2) found.');
  }

  // Parse media manifest
  const mediaMap = new Map<string, string>();
  const reverseMediaMap = new Map<string, string>();

  const mediaFile = zip.file('media');
  if (mediaFile) {
    let rawMedia = await mediaFile.async('uint8array');
    // Check if media is zstd compressed (magic bytes: 0x28 0xb5 0x2f 0xfd)
    if (rawMedia.length >= 4 && rawMedia[0] === 0x28 && rawMedia[1] === 0xb5 && rawMedia[2] === 0x2f && rawMedia[3] === 0xfd) {
      try {
        rawMedia = decompress(rawMedia);
      } catch (err: unknown) {
        console.warn('Warning: Failed to decompress zstd media file in Anki package:', err);
      }
    }

    // Try parsing as JSON first (standard Anki 2.0/2.1 format)
    try {
      const text = new TextDecoder('utf-8').decode(rawMedia);
      const jsonParsed = JSON.parse(text);
      if (typeof jsonParsed === 'object' && jsonParsed !== null) {
        for (const [key, value] of Object.entries(jsonParsed)) {
          if (typeof value === 'string') {
            mediaMap.set(key, value);
            reverseMediaMap.set(value, key);
          }
        }
      }
    } catch {
      // If not JSON, parse as Anki 2.1b binary protobuf
      try {
        const protoMap = parseProtobufMedia(rawMedia);
        for (const [key, value] of protoMap.entries()) {
          mediaMap.set(key, value);
          reverseMediaMap.set(value, key);
        }
      } catch (err: unknown) {
        console.warn('Warning: Failed to parse media dictionary in Anki package:', err);
      }
    }
  }

  // Media retrieval helper
  const getMediaFile = async (filenameOrIndex: string): Promise<Uint8Array | null> => {
    let zipKey = filenameOrIndex;
    if (!zip.file(zipKey)) {
      // If given a real filename, look up its numeric key
      const keyFromFilename = reverseMediaMap.get(filenameOrIndex);
      if (keyFromFilename && zip.file(keyFromFilename)) {
        zipKey = keyFromFilename;
      } else {
        return null;
      }
    }

    const file = zip.file(zipKey);
    if (!file) return null;
    return file.async('uint8array');
  };

  const getMediaDataUrl = async (filenameOrIndex: string): Promise<string | null> => {
    const raw = await getMediaFile(filenameOrIndex);
    if (!raw) return null;

    let realName = filenameOrIndex;
    if (mediaMap.has(filenameOrIndex)) {
      realName = mediaMap.get(filenameOrIndex)!;
    }

    const mime = getMimeType(realName);
    const base64 = uint8ArrayToBase64(raw);
    return `data:${mime};base64,${base64}`;
  };

  return {
    dbBuffer,
    dbType,
    mediaMap,
    reverseMediaMap,
    getMediaFile,
    getMediaDataUrl,
    hasMedia: mediaMap.size > 0
  };
}
