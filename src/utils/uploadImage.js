// src/utils/uploadImage.js
// Compresses images to ~80KB and uploads to Supabase Storage.
// Falls back to base64 if upload fails (e.g. server not running locally).

import { SB_URL, SB_KEY } from '../config/constants.js';

const MAX_WIDTH = 800;   // px — profile avatars / post images
const MAX_QUALITY = 0.75; // JPEG quality
const TARGET_KB = 80;    // target size

/**
 * Compresses a File/Blob to JPEG using canvas.
 * Progressively reduces quality until under TARGET_KB or quality hits 0.3.
 */
export async function compressImage(file, maxWidth = MAX_WIDTH) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // Try reducing quality until under TARGET_KB
      let quality = MAX_QUALITY;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
            if (blob.size <= TARGET_KB * 1024 || quality <= 0.3) {
              resolve(blob);
            } else {
              quality = Math.max(0.3, quality - 0.1);
              tryCompress();
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress();
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}

/**
 * Uploads a Blob to Supabase Storage and returns the public URL.
 * Bucket: 'images'
 */
export async function uploadToStorage(blob, fileName, bucket = 'images') {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext === 'jpeg' ? 'jpg' : ext}`;

  const sess = (() => {
    try { return JSON.parse(localStorage.getItem('rs_session') || 'null'); } catch { return null; }
  })();

  const headers = {
    'apikey': SB_KEY,
    'Content-Type': blob.type || 'image/jpeg',
  };
  if (sess?.access_token) {
    headers['Authorization'] = `Bearer ${sess.access_token}`;
  }

  const res = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${uniqueName}`, {
    method: 'POST',
    headers,
    body: blob,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status);
    throw new Error(`Storage upload failed: ${err}`);
  }

  return `${SB_URL}/storage/v1/object/public/${bucket}/${uniqueName}`;
}

/**
 * Main utility: compress image + upload to Supabase Storage.
 * Returns a public URL string.
 * Falls back to base64 data URL if upload fails.
 */
export async function processAndUploadImage(file, { bucket = 'images', maxWidth = MAX_WIDTH } = {}) {
  // 1. Strict 5MB limit for ALL files (PDFs, Docs, Images, Audio)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File exceeds maximum size of 5MB. Please choose a smaller file.');
  }

  // Non-image files (videos, audio, PDFs): skip compression, upload raw
  if (!file.type.startsWith('image/')) {
    try {
      return await uploadToStorage(file, file.name, bucket);
    } catch {
      // Fallback to base64
      return await fileToDataUrl(file);
    }
  }

  try {
    const compressed = await compressImage(file, maxWidth);
    const url = await uploadToStorage(compressed, file.name.replace(/\.[^.]+$/, '.jpg'), bucket);
    return url;
  } catch (err) {
    console.warn('[uploadImage] Storage upload failed, falling back to base64:', err.message);
    // Fallback: return compressed blob as base64 (still saves bandwidth vs raw file)
    try {
      const compressed = await compressImage(file, maxWidth);
      return await blobToDataUrl(compressed);
    } catch {
      return await fileToDataUrl(file);
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    if (file.size > 5 * 1024 * 1024) { rej(new Error('Max 5MB')); return; }
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
