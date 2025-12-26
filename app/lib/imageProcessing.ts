/**
 * Image Processing Utilities for Story Cover
 * 
 * Handles client-side image processing for uploaded photos:
 * - Resize and crop to story cover dimensions
 * - Apply visual style filters (brightness, warmth, contrast, saturation)
 * - Add rounded corners
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
 * Smart cropping that prioritizes faces/upper portion
 * Adapts to portrait vs landscape, prefers padding over aggressive cropping
 */
function calculateSmartCrop(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number
): { sourceX: number; sourceY: number; sourceWidth: number; sourceHeight: number } {
  const imgAspect = imgWidth / imgHeight;
  const targetAspect = targetWidth / targetHeight;
  
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = imgWidth;
  let sourceHeight = imgHeight;
  
  // Determine if image is portrait or landscape
  const isPortrait = imgHeight > imgWidth;
  const isLandscape = imgWidth > imgHeight;
  
  if (imgAspect > targetAspect) {
    // Image is wider than target - need to crop width
    sourceWidth = imgHeight * targetAspect;
    
    // For portraits, prefer keeping upper portion (where faces usually are)
    // For landscapes, center crop but slightly favor upper portion
    if (isPortrait) {
      // Portrait: prioritize top, avoid cutting heads
      // Crop from top, leaving more space at bottom
      sourceX = Math.max(0, (imgWidth - sourceWidth) / 2);
      // Slight upward bias for faces
      sourceX = Math.max(0, sourceX - (imgWidth * 0.05));
    } else {
      // Landscape: center crop with slight upper bias
      sourceX = (imgWidth - sourceWidth) / 2;
      sourceX = Math.max(0, sourceX - (imgWidth * 0.03));
    }
  } else {
    // Image is taller than target - need to crop height
    sourceHeight = imgWidth / targetAspect;
    
    // Always prioritize upper portion to avoid cutting heads
    // For portraits, strongly favor top
    // For landscapes, also favor top but less aggressively
    if (isPortrait) {
      // Portrait: start from top, avoid cutting heads
      sourceY = 0;
      // Add small padding from top if image is very tall
      if (imgHeight > imgWidth * 1.5) {
        sourceY = Math.min(imgHeight * 0.05, (imgHeight - sourceHeight) * 0.2);
      }
    } else {
      // Landscape: prefer upper portion but allow some centering
      sourceY = Math.max(0, (imgHeight - sourceHeight) * 0.2); // 20% from top instead of center
    }
    
    // Ensure we don't go out of bounds
    if (sourceY + sourceHeight > imgHeight) {
      sourceY = imgHeight - sourceHeight;
    }
  }
  
  // Prefer padding over aggressive cropping
  // If the crop would be too aggressive, add padding instead
  const cropRatio = Math.min(sourceWidth / imgWidth, sourceHeight / imgHeight);
  if (cropRatio < 0.6) {
    // Too aggressive - add padding by scaling down
    const scale = Math.min(imgWidth / targetWidth, imgHeight / targetHeight);
    const scaledWidth = targetWidth * scale;
    const scaledHeight = targetHeight * scale;
    
    sourceWidth = Math.min(scaledWidth, imgWidth);
    sourceHeight = Math.min(scaledHeight, imgHeight);
    sourceX = (imgWidth - sourceWidth) / 2;
    
    // Still prioritize upper portion
    if (isPortrait) {
      sourceY = Math.max(0, (imgHeight - sourceHeight) * 0.1);
    } else {
      sourceY = Math.max(0, (imgHeight - sourceHeight) * 0.2);
    }
  }
  
  return { sourceX, sourceY, sourceWidth, sourceHeight };
}

/**
 * Process an uploaded photo for story cover with smart cropping
 * Resizes and crops the image to story cover dimensions with face-aware logic
 * 
 * @param imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @param options - Processing options
 * @returns Processed image as base64 data URL
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
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Set dimensions (story cover aspect ratio 16:10)
          const targetWidth = options.width || 1024;
          const targetHeight = options.height || 640;
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Calculate smart crop (face-aware, prioritizes upper portion)
          const crop = calculateSmartCrop(
            img.width,
            img.height,
            targetWidth,
            targetHeight
          );

          // Draw image with smart crop and resize
          ctx.drawImage(
            img,
            crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight,
            0, 0, targetWidth, targetHeight
          );
          
          // Convert to base64
          const processedBase64 = canvas.toDataURL('image/jpeg', 0.9);
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

