const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Signatures are checked against the actual file bytes, never the client-supplied
// Content-Type/mimetype, since that header is trivially spoofed by the uploader.
const IMAGE_SIGNATURES = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
];

function detectImageMime(buffer) {
  for (const sig of IMAGE_SIGNATURES) {
    if (buffer.length >= sig.bytes.length && sig.bytes.every((b, i) => buffer[i] === b)) {
      return sig.mime;
    }
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function validateImage(buffer) {
  if (buffer.length > MAX_IMAGE_SIZE) {
    return { ok: false, error: `La imagen no debe superar ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` };
  }

  const mime = detectImageMime(buffer);
  if (!mime) {
    return {
      ok: false,
      error: 'El archivo no es una imagen válida. Formatos permitidos: PNG, JPEG, GIF, WEBP',
    };
  }

  return { ok: true, mime };
}

export { MAX_IMAGE_SIZE };
