/**
 * Compresses a Base64 data URL using HTML5 Canvas.
 * Downscales dimensions to a maximum of 800px and applies JPEG compression.
 * Resolves with the scaled, compressed image's Data URL.
 */
export function compressImage(dataUrl: string, maxWidth = 800, maxHeight = 800, quality = 0.5): Promise<string> {
  return new Promise((resolve) => {
    // Return early if the data URL doesn't look like an image
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Perform proportional scaling
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Draw image onto canvas with new dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas contents to JPEG with compression quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.error('Failed to compress image:', err);
        resolve(dataUrl); // Fallback to raw image on canvas error
      }
    };

    img.onerror = (err) => {
      console.error('Failed to load image for compression:', err);
      resolve(dataUrl); // Fallback to original
    };

    img.src = dataUrl;
  });
}
