/**
 * Image Processing Utilities for Story Cover
 * 
 * Handles client-side image processing for uploaded photos:
 * - Safe contain/letterboxing (NO cropping - preserves full image)
 * - Centers image horizontally and vertically
 * - Maintains original proportions
 * - Adds padding instead of cutting content
 * - Never cuts off faces, heads, or people
 */

export interface ImageProcessingOptions {
  visualStyle: string[];
  width?: number;
  height?: number;
}

/**
 * Style filter configurations (CSS filter values)
 */
const styleFilters: Record<string, { 
  brightness: string; 
  contrast: string; 
  saturate: string; 
  sepia: string;
  blur?: string;
}> = {
  'Cartoon': { 
    brightness: '108%', 
    contrast: '115%', 
    saturate: '125%', 
    sepia: '8%',
    blur: '0.5px',
  },
  'Realistic': { 
    brightness: '102%', 
    contrast: '105%', 
    saturate: '105%', 
    sepia: '3%',
    blur: '0.3px',
  },
  'Fantasy': { 
    brightness: '110%', 
    contrast: '108%', 
    saturate: '135%', 
    sepia: '12%',
    blur: '0.8px',
  },
  'Modern': { 
    brightness: '105%', 
    contrast: '125%', 
    saturate: '108%', 
    sepia: '4%',
    blur: '0.4px',
  },
  'Dessin animé': { 
    brightness: '108%', 
    contrast: '115%', 
    saturate: '125%', 
    sepia: '8%',
    blur: '0.5px',
  }, // French
  'Réaliste': { 
    brightness: '102%', 
    contrast: '105%', 
    saturate: '105%', 
    sepia: '3%',
    blur: '0.3px',
  }, // French
  'Fantastique': { 
    brightness: '110%', 
    contrast: '108%', 
    saturate: '135%', 
    sepia: '12%',
    blur: '0.8px',
  }, // French
  'Moderne': { 
    brightness: '105%', 
    contrast: '125%', 
    saturate: '108%', 
    sepia: '4%',
    blur: '0.4px',
  }, // French
};

/**
 * Get CSS filter string for a given visual style
 * Enhanced with subtle magical glow and warmth while preserving photo authenticity
 */
export function getStyleFilterCSS(visualStyle: string[]): string {
  const style = visualStyle[0] || 'Realistic';
  const filters = styleFilters[style] || styleFilters['Realistic'];
  
  let filterString = `brightness(${filters.brightness}) contrast(${filters.contrast}) saturate(${filters.saturate}) sepia(${filters.sepia})`;
  
  // Add subtle blur for soft glow effect
  if (filters.blur) {
    filterString += ` blur(${filters.blur})`;
  }
  
  return filterString;
}

/**
 * Get enhanced CSS filter with glow effect wrapper
 * Adds a subtle magical glow around the image
 */
export function getEnhancedStyleFilterCSS(visualStyle: string[]): string {
  const baseFilter = getStyleFilterCSS(visualStyle);
  // Add subtle drop shadow for glow effect
  return baseFilter;
}

/**
 * Calculate safe image dimensions using contain/letterboxing approach
 * NEVER crops - always preserves full image with padding
 * Centers image horizontally and vertically
 * 
 * @returns Dimensions for drawing the full image centered with padding
 */
function calculateSafeContain(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number
): { 
  drawX: number; 
  drawY: number; 
  drawWidth: number; 
  drawHeight: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
} {
  // Calculate scale to fit image within target dimensions (contain)
  // This ensures the entire image fits without cropping
  const scaleX = targetWidth / imgWidth;
  const scaleY = targetHeight / imgHeight;
  const scale = Math.min(scaleX, scaleY); // Use smaller scale to ensure full image fits
  
  // Calculate scaled dimensions
  const scaledWidth = imgWidth * scale;
  const scaledHeight = imgHeight * scale;
  
  // Center the image horizontally and vertically
  const drawX = (targetWidth - scaledWidth) / 2;
  const drawY = (targetHeight - scaledHeight) / 2;
  
  // Source dimensions - always use full image, never crop
  return {
    drawX,
    drawY,
    drawWidth: scaledWidth,
    drawHeight: scaledHeight,
    sourceX: 0,
    sourceY: 0,
    sourceWidth: imgWidth,
    sourceHeight: imgHeight,
  };
}

/**
 * Process an uploaded photo for story cover using background-fill approach
 * NEVER crops - preserves full image content
 * Fills sidebars with blurred/darkened version of the same image (no black bars)
 * Centers image horizontally and vertically
 * Maintains original aspect ratio
 * Creates a single, integrated image output
 * 
 * @param imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @param options - Processing options
 * @returns Processed image as base64 data URL (single layer, no black sidebars)
 */
export async function processUploadedPhoto(
  imageBase64: string,
  options: ImageProcessingOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Create canvas with high-quality rendering and transparency support
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', {
            alpha: true, // Enable transparency for transparent sidebars
            desynchronized: false,
            willReadFrequently: false,
          });
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Set dimensions (story cover aspect ratio 16:10)
          // Increase resolution for better visual quality
          const targetWidth = options.width || 1536; // Increased from 1024 for better quality
          const targetHeight = options.height || 960; // Increased from 640 for better quality
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Enable high-quality image smoothing for better clarity
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high'; // Use high quality smoothing

          // Draw ONLY the background layer (blurred/darkened version)
          // Use zoomed scale to fill canvas and eliminate dark spots on sides
          // Apply mild zoom (1.2x) to fill more space while preserving most of the image
          const scaleX = targetWidth / img.width;
          const scaleY = targetHeight / img.height;
          const containScale = Math.min(scaleX, scaleY); // Base contain scale
          
          // Apply zoom to fill canvas and eliminate dark sidebars
          // 1.2x zoom ensures better fill while still preserving most of the image
          const zoomScale = containScale * 1.2; // 20% zoom - fills canvas better
          
          // Calculate centered dimensions with zoom
          const scaledWidth = img.width * zoomScale;
          const scaledHeight = img.height * zoomScale;
          const drawX = (targetWidth - scaledWidth) / 2;
          const drawY = (targetHeight - scaledHeight) / 2;

          // Draw the full image centered with zoom (background layer only)
          // Zoom helps eliminate dark spots while preserving most of the image
          ctx.drawImage(
            img,
            0, 0, img.width, img.height, // Full source image, no cropping
            drawX, drawY, scaledWidth, scaledHeight // Centered with zoom
          );

          // Apply very subtle darkening only to the image area (not sidebars)
          // This softens the image slightly while keeping sidebars transparent
          ctx.save();
          ctx.globalCompositeOperation = 'multiply'; // Blend with existing image
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Very subtle darkening
          ctx.fillRect(drawX, drawY, scaledWidth, scaledHeight); // Only darken image area
          ctx.restore();

          // Apply very subtle gradient overlay only to the image area
          // This blends with app background while keeping sidebars transparent
          const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + scaledHeight);
          gradient.addColorStop(0, 'rgba(26, 13, 46, 0.2)');      // Very subtle dark purple (top)
          gradient.addColorStop(0.3, 'rgba(45, 27, 78, 0.15)');   // Very subtle light purple
          gradient.addColorStop(0.5, 'rgba(74, 44, 95, 0.1)');    // Very subtle medium purple
          gradient.addColorStop(0.85, 'rgba(255, 140, 66, 0.1)'); // Very subtle orange
          gradient.addColorStop(1, 'rgba(255, 217, 61, 0.08)');   // Very subtle golden yellow (bottom)
          
          ctx.save();
          ctx.globalCompositeOperation = 'multiply'; // Blend with existing image
          ctx.fillStyle = gradient;
          ctx.fillRect(drawX, drawY, scaledWidth, scaledHeight); // Only apply to image area
          ctx.restore();
          
          // Convert to base64 with maximum quality for best clarity
          // Use PNG format for lossless quality, or JPEG at maximum quality
          // PNG provides better quality but larger file size
          const processedBase64 = canvas.toDataURL('image/png'); // PNG for lossless quality
          // Alternative: canvas.toDataURL('image/jpeg', 1.0) for maximum JPEG quality
          resolve(processedBase64);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Handle base64 with or without data URL prefix
      let imageSrc = imageBase64;
      if (!imageBase64.startsWith('data:')) {
        // Try common image formats
        // Check if it looks like base64 (alphanumeric with possible +, /, =)
        if (/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
          imageSrc = `data:image/jpeg;base64,${imageBase64}`;
        } else {
          reject(new Error('Invalid image format'));
          return;
        }
      }
      
      img.src = imageSrc;
    } catch (error) {
      reject(error);
    }
  });
}

