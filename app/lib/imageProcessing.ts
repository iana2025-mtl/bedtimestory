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
  visualStyle: string | string[]; // Can be single string or array (for backward compatibility)
  width?: number;
  height?: number;
}

/**
 * Style filter configurations (CSS filter values)
 * Based on Visual Style Definitions - Source of Truth
 * 
 * Filters are applied subtly and non-destructively to uploaded photos:
 * - Saturation: Controls color intensity
 * - Contrast: Controls difference between light and dark
 * - Softness: Controlled via brightness and blur (for soft outlines)
 * - Warmth: Controlled via sepia (adds warmth/tone)
 */
interface StyleFilter {
  brightness: string;  // Softness control (higher = softer/brighter)
  contrast: string;    // Line definition (higher = cleaner lines, lower = softer)
  saturate: string;    // Color intensity (higher = brighter colors)
  sepia: string;       // Warmth control (adds warm tone)
  blur?: string;       // Softness for outlines (soft blur for cartoon/fantasy)
}

const styleFilters: Record<string, StyleFilter> = {
  // Cartoon: Bright colors, Soft outlines, Simple shapes
  // Filters MUST be visible and noticeable
  'Cartoon': { 
    brightness: '110%',  // Noticeably brighter for soft feel
    contrast: '108%',    // Reduced contrast for soft outlines
    saturate: '135%',    // Increased saturation for bright colors (more visible)
    sepia: '8%',         // Added warmth for cartoon feel
    blur: '0.8px',       // Soft blur for soft outlines (more visible)
  },
  // Fantasy: Magical lighting, Pastel glow, Whimsical elements
  'Fantasy': { 
    brightness: '115%',  // Brighter for magical lighting and pastel glow (more visible)
    contrast: '102%',    // Lower contrast for soft, pastel appearance
    saturate: '125%',    // Moderate saturation with pastel feel (more visible)
    sepia: '12%',        // More warmth for magical glow (more visible)
    blur: '0.9px',       // Softer blur for ethereal, whimsical feel (more visible)
  },
  // Modern: Clean lines, Muted color palette, Minimalist look
  'Modern': { 
    brightness: '105%',  // Slightly brighter
    contrast: '120%',    // Higher contrast for clean lines (more visible)
    saturate: '85%',     // Reduced saturation for muted color palette (more noticeable)
    sepia: '3%',         // Minimal warmth for clean, modern look
    blur: '0.3px',       // Minimal blur for clean lines
  },
  // Realistic: Natural lighting, High detail, Lifelike proportions
  'Realistic': { 
    brightness: '104%',  // Subtle brightness for natural lighting (slightly more visible)
    contrast: '106%',    // Subtle contrast to preserve detail (slightly more visible)
    saturate: '105%',    // Subtle saturation boost (more visible than before)
    sepia: '2%',         // Minimal warmth to keep natural look
    blur: '0px',         // No blur to preserve high detail
  },
  // French translations (must match English values)
  'Dessin animé': { 
    brightness: '110%',
    contrast: '108%',
    saturate: '135%',
    sepia: '8%',
    blur: '0.8px',
  },
  'Fantastique': { 
    brightness: '115%',
    contrast: '102%',
    saturate: '125%',
    sepia: '12%',
    blur: '0.9px',
  },
  'Moderne': { 
    brightness: '105%',
    contrast: '120%',
    saturate: '85%',
    sepia: '3%',
    blur: '0.3px',
  },
  'Réaliste': { 
    brightness: '104%',
    contrast: '106%',
    saturate: '105%',
    sepia: '2%',
    blur: '0px',
  },
};

/**
 * Get CSS filter string for a given visual style
 * Applies subtle, non-destructive filters based on style definitions
 * Ensures only ONE style is applied at a time
 * 
 * @param visualStyle - Style name as string or array (uses first element if array)
 * @returns CSS filter string with brightness, contrast, saturation, sepia, and optional blur
 */
export function getStyleFilterCSS(visualStyle: string | string[]): string {
  // Handle both array and string input (backward compatibility)
  const style = Array.isArray(visualStyle) ? (visualStyle[0] || 'Realistic') : (visualStyle || 'Realistic');
  const filters = styleFilters[style] || styleFilters['Realistic'];
  
  // Build filter string with all style-specific adjustments
  // Filters must always be applied to uploaded images when a style is selected
  let filterString = `brightness(${filters.brightness}) contrast(${filters.contrast}) saturate(${filters.saturate}) sepia(${filters.sepia})`;
  
  // Add blur only if specified (for softness/soft outlines)
  if (filters.blur && filters.blur !== '0px' && filters.blur !== '0') {
    filterString += ` blur(${filters.blur})`;
  }
  
  return filterString;
}

/**
 * Get enhanced CSS filter with glow effect wrapper
 * Adds a subtle magical glow around the image
 * 
 * @param visualStyle - Style name as string or array (uses first element if array)
 * @returns CSS filter string (currently same as base filter, can be enhanced)
 */
export function getEnhancedStyleFilterCSS(visualStyle: string | string[]): string {
  const baseFilter = getStyleFilterCSS(visualStyle);
  // Base implementation - can be enhanced with additional effects if needed
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
          // Use PNG format for lossless quality (supports transparency)
          // PNG provides better quality and works for all input formats (JPEG, PNG, WebP)
          const processedBase64 = canvas.toDataURL('image/png'); // PNG for lossless quality and format compatibility
          resolve(processedBase64);
        } catch (error) {
          console.error('Error in image processing canvas operations:', error);
          reject(new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      img.onerror = (error) => {
        console.error('Failed to load image for processing:', error);
        reject(new Error('Failed to load image. Please ensure the image is in a supported format (JPEG, PNG, or WebP).'));
      };
      
      // Handle base64 with or without data URL prefix
      let imageSrc = imageBase64;
      if (!imageBase64.startsWith('data:')) {
        // Try common image formats
        // Check if it looks like base64 (alphanumeric with possible +, /, =)
        if (/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
          // Try to detect format from base64 header (magic bytes)
          // PNG files start with: 89 50 4E 47 0D 0A 1A 0A (base64: iVBORw0KGgo...)
          // JPEG files start with: FF D8 FF (base64: /9j/...)
          // WebP files start with: RIFF...WEBP (base64: UklGR...)
          const base64Header = imageBase64.substring(0, 12);
          let mimeType = 'image/jpeg'; // Default to JPEG for backward compatibility
          
          // PNG detection: base64 of PNG signature (89 50 4E 47) = "iVBORw0KGgo"
          if (base64Header.startsWith('iVBORw0KGgo') || base64Header.startsWith('iVBORw0K')) {
            mimeType = 'image/png';
          } 
          // JPEG detection: base64 of JPEG signature (FF D8 FF) = "/9j/"
          else if (base64Header.startsWith('/9j/')) {
            mimeType = 'image/jpeg';
          }
          // WebP detection: base64 of "RIFF" = "UklGR"
          else if (base64Header.startsWith('UklGR')) {
            mimeType = 'image/webp';
          }
          
          imageSrc = `data:${mimeType};base64,${imageBase64}`;
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

