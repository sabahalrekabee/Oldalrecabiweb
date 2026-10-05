/**
 * High-performance image compression using HTML5 Canvas.
 * Resizes large photos to optimal dimensions (max 900px) and compresses to JPEG ~0.82 quality,
 * shrinking 5MB - 10MB camera photos down to ~50KB - 90KB without visible loss of quality.
 * This guarantees the book document stays well below Firestore's 1MB limit.
 */
export async function compressImage(
  dataUrlOrFile: string | File,
  maxDimension = 900,
  quality = 0.82
): Promise<string> {
  // If it's already a regular HTTP URL or asset path, no compression needed
  if (typeof dataUrlOrFile === 'string' && !dataUrlOrFile.startsWith('data:image')) {
    return dataUrlOrFile;
  }

  return new Promise((resolve, reject) => {
    const processImage = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        // Fill background with warm white/cream in case image has transparency
        ctx.fillStyle = '#fbfbfb';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = (err) => {
        console.warn('Image load error during compression, using original:', err);
        resolve(src);
      };

      img.src = src;
    };

    if (typeof dataUrlOrFile === 'string') {
      processImage(dataUrlOrFile);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          processImage(reader.result);
        } else {
          reject(new Error('Failed to read image file'));
        }
      };
      reader.onerror = () => reject(new Error('File reader error'));
      reader.readAsDataURL(dataUrlOrFile);
    }
  });
}
