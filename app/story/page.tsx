'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { processUploadedPhoto, getStyleFilterCSS } from '../lib/imageProcessing';

interface FormData {
  children: Array<{ name: string; age: string }>;
  enjoyedCharacters: string[];
  customCharacters: string;
  teachingThemes: string[];
  customTeachingTheme: string;
  storyLength: string;
  includeImages: boolean | null;
  photoDescription: string;
  visualStyle: string[];
  customVisualStyle: string;
  photoBase64: string | null;
  language?: 'en' | 'fr';
}

interface StoryData {
  title: string;
  sections: Array<{
    headline: string;
    body: string;
  }>;
}

export default function StoryPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [story, setStory] = useState<StoryData | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isUploadedPhoto, setIsUploadedPhoto] = useState(false); // Track if image is from uploaded photo
  const [currentVisualStyle, setCurrentVisualStyle] = useState<string | string[]>([]); // Store visual style for CSS filters
  const [isGeneratingStory, setIsGeneratingStory] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Critical: Lock mechanism to prevent duplicate generation and auto-regeneration
  const imageLockedRef = useRef<boolean>(false); // Lock flag - once true, image is final
  const generationRequestIdRef = useRef<number>(0); // Track current generation request to ignore late responses
  const imageGenerationStartedRef = useRef<boolean>(false); // Track if generation has started
  const initializationCompleteRef = useRef<boolean>(false); // Track if initialization has completed

  useEffect(() => {
    // CRITICAL: Only initialize once - prevent re-runs on re-renders, language changes, etc.
    if (initializationCompleteRef.current) {
      return; // Already initialized - do nothing
    }

    // Load form data from sessionStorage
    const storedData = sessionStorage.getItem('storyFormData');
    if (!storedData) {
      // No form data, redirect to home
      router.push('/');
      return;
    }

    const data = JSON.parse(storedData) as FormData;
    setFormData(data);

    // Check if story cover image is already persisted and locked
    const storedImageData = sessionStorage.getItem('storyCoverImage');
    if (storedImageData) {
      try {
        const imageData = JSON.parse(storedImageData);
        if (imageData.imageUrl) {
          // Image exists - restore it and lock it (no regeneration)
          setGeneratedImageUrl(imageData.imageUrl);
          setIsUploadedPhoto(imageData.isUploadedPhoto || false);
          setCurrentVisualStyle(imageData.visualStyle || []);
          imageLockedRef.current = true; // Lock the image - it's final
          imageGenerationStartedRef.current = true; // Mark as already generated
          initializationCompleteRef.current = true; // Mark initialization as complete
          return; // Exit early - image is locked, no generation needed
        }
      } catch (err) {
        console.warn('Failed to parse stored image data:', err);
        sessionStorage.removeItem('storyCoverImage');
      }
    }

    // CRITICAL: Only generate story if image is not locked
    // This prevents regeneration on re-renders, language changes, or state updates
    if (!imageLockedRef.current) {
      // Generate story first
      generateStory(data);
    }
    
    // Mark initialization as complete
    initializationCompleteRef.current = true;
  }, [router]); // Include router for navigation, but use ref to prevent duplicate runs

  const generateStory = async (data: FormData) => {
    try {
      setIsGeneratingStory(true);
      setError(null);

      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          children: data.children,
          enjoyedCharacters: data.enjoyedCharacters,
          customCharacters: data.customCharacters,
          teachingThemes: data.teachingThemes,
          customTeachingTheme: data.customTeachingTheme,
          storyLength: data.storyLength,
          includeImages: data.includeImages,
          photoDescription: data.photoDescription,
          visualStyle: data.visualStyle,
          customVisualStyle: data.customVisualStyle,
          language: data.language || language, // Use stored language or current language
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Extract error message from API response
        const errorMessage = result.error || result.details || 'Failed to generate story';
        throw new Error(errorMessage);
      }
      
      // Handle both old string format and new JSON format
      if (typeof result.story === 'string') {
        // Legacy format - convert to new format
        setStory({
          title: 'Your Bedtime Story',
          sections: [{ headline: 'Story', body: result.story }],
        });
      } else {
        // New JSON format
        setStory(result.story);
      }
      
      setIsGeneratingStory(false);

      // After story is generated, handle story cover image
      // CRITICAL: Only generate ONCE if image is not locked and generation hasn't started
      // Check if visual style exists (handle both array and string formats)
      const hasVisualStyle = Array.isArray(data.visualStyle) 
        ? data.visualStyle.length > 0 
        : !!data.visualStyle;
      
      if (
        data.includeImages === true && 
        hasVisualStyle &&
        !imageLockedRef.current &&
        !imageGenerationStartedRef.current
      ) {
        // Mark generation as started to prevent duplicate calls
        imageGenerationStartedRef.current = true;
        
        if (data.photoBase64) {
          // CASE B: Photo uploaded - process the uploaded photo
          processUploadedPhotoImage(
            data.photoBase64,
            data.visualStyle
          );
        } else {
          // CASE A: No photo uploaded - generate AI image
          generateAIImage(
            data.visualStyle,
            data.customVisualStyle,
            data.photoDescription,
            data.children,
            data.enjoyedCharacters || []
          );
        }
      }
    } catch (err) {
      console.error('Error generating story:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate story');
      setIsGeneratingStory(false);
    }
  };

  /**
   * CASE A: Generate AI image when no photo is uploaded
   * CRITICAL: Only generates once, locks image after generation, ignores late responses
   */
  const generateAIImage = async (
    visualStyle: string[],
    customVisualStyle: string,
    photoDescription: string,
    children: Array<{ name: string; age: string }>,
    enjoyedCharacters: string[]
  ) => {
    // CRITICAL: Check if image is already locked - if so, do nothing
    if (imageLockedRef.current) {
      // Image is locked - skipping generation
      return;
    }

    // Generate unique request ID to track this specific generation request
    const requestId = ++generationRequestIdRef.current;
    
    try {
      setIsGeneratingImage(true);
      setError(null);

      // The API will extract the single style and apply style-specific modifiers
      // Only pass customVisualStyle as prompt if provided, otherwise let API build style-specific prompt
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visualStyle, // Pass as-is (array or string), API handles single style extraction
          photoDescription: photoDescription,
          children: children,
          enjoyedCharacters: enjoyedCharacters, // Pass theme for companion inclusion
          // Only include prompt if customVisualStyle is provided, otherwise API builds style-specific prompt
          ...(customVisualStyle ? { prompt: customVisualStyle } : {}),
        }),
      });

      const result = await response.json();

      // CRITICAL: Check if this response is still valid (not a late/duplicate response)
      if (requestId !== generationRequestIdRef.current) {
        // Ignoring late/duplicate image generation response
        return;
      }

      // CRITICAL: Double-check lock before setting image
      if (imageLockedRef.current) {
        // Image was locked during generation - ignoring response
        return;
      }

      if (!response.ok) {
        const errorMessage = result.error || result.details || 'Failed to generate image';
        throw new Error(errorMessage);
      }
      
      let finalImageUrl: string | null = null;
      if (result.imageUrl) {
        finalImageUrl = result.imageUrl;
      } else if (result.imageBase64) {
        finalImageUrl = `data:image/png;base64,${result.imageBase64}`;
      } else {
        throw new Error('No image URL or base64 data received from API');
      }
      
      // CRITICAL: Final check before setting and locking
      if (imageLockedRef.current || requestId !== generationRequestIdRef.current) {
        // Image locked or request outdated - ignoring response
        return;
      }
      
      // Mark as AI-generated (not uploaded photo)
      setIsUploadedPhoto(false);
      setGeneratedImageUrl(finalImageUrl);
      setCurrentVisualStyle(visualStyle);
      
      // CRITICAL: Lock the image immediately after setting it
      imageLockedRef.current = true;
      
      // Persist the generated image
      if (finalImageUrl) {
        persistStoryCoverImage(finalImageUrl, false, visualStyle);
      }
      
      setIsGeneratingImage(false);
    } catch (err) {
      // CRITICAL: Only handle error if this is still the current request
      if (requestId === generationRequestIdRef.current && !imageLockedRef.current) {
        console.error('Error generating AI image:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate image');
        setIsGeneratingImage(false);
        // Reset generation flag on error so user can retry by starting new story
        imageGenerationStartedRef.current = false;
      }
    }
  };

  /**
   * CASE B: Process uploaded photo with smart cropping and AI enhancement
   * Flow: Smart Crop -> AI Enhancement (with fallback) -> Display
   * CRITICAL: Only processes once, locks image after generation, ignores late responses
   */
  const processUploadedPhotoImage = async (
    photoBase64: string,
    visualStyle: string[]
  ) => {
    // CRITICAL: Check if image is already locked - if so, do nothing
    if (imageLockedRef.current) {
      // Image is locked - skipping processing
      return;
    }

    // Generate unique request ID to track this specific generation request
    const requestId = ++generationRequestIdRef.current;
    
    try {
      setIsGeneratingImage(true);
      setError(null);
      setCurrentVisualStyle(visualStyle);

      // Step 1: Process photo with higher resolution for better quality
      const croppedImage = await processUploadedPhoto(photoBase64, {
        visualStyle,
        width: 1536, // Increased from 1024 for better resolution
        height: 960, // Increased from 640 for better resolution
      });

      // CRITICAL: Check if request is still valid before continuing
      if (requestId !== generationRequestIdRef.current || imageLockedRef.current) {
        // Request outdated or image locked - stopping processing
        return;
      }

      // Step 2: Try AI enhancement (with graceful fallback)
      let finalImage = croppedImage;
      try {
        const enhancedImage = await enhanceImageWithAI(
          croppedImage,
          visualStyle,
          formData?.children || []
        );
        
        // CRITICAL: Check again before using enhanced image
        if (requestId !== generationRequestIdRef.current || imageLockedRef.current) {
          // Request outdated or image locked - using cropped image only
          finalImage = croppedImage;
        } else if (enhancedImage) {
          // AI enhancement succeeded
          finalImage = enhancedImage;
        }
        // If enhancement not available, use cropped image with CSS filters
      } catch (enhanceError) {
        // AI enhancement failed, gracefully fall back to cropped image
        console.warn('AI enhancement failed, using cropped image:', enhanceError);
      }

      // CRITICAL: Final check before setting and locking
      if (imageLockedRef.current || requestId !== generationRequestIdRef.current) {
        // Image locked or request outdated - ignoring processed image
        return;
      }

      // Mark as uploaded photo (will apply CSS filters)
      setIsUploadedPhoto(true);
      setGeneratedImageUrl(finalImage);
      
      // Ensure visual style is set for filter application
      if (visualStyle && (Array.isArray(visualStyle) ? visualStyle.length > 0 : !!visualStyle)) {
        setCurrentVisualStyle(visualStyle);
      }
      
      // CRITICAL: Lock the image immediately after setting it
      imageLockedRef.current = true;
      
      // Persist the processed image
      persistStoryCoverImage(finalImage, true, visualStyle);
      
      setIsGeneratingImage(false);
    } catch (err) {
      // CRITICAL: Only handle error if this is still the current request
      if (requestId === generationRequestIdRef.current && !imageLockedRef.current) {
        console.error('Error processing uploaded photo:', err);
        setError(err instanceof Error ? err.message : 'Failed to process photo');
        setIsGeneratingImage(false);
        // Reset generation flag on error so user can retry by starting new story
        imageGenerationStartedRef.current = false;
      }
    }
  };

  /**
   * AI Enhancement: Apply subtle AI enhancement to cropped photo
   * Returns enhanced image URL or null if enhancement not available (fallback)
   */
  const enhanceImageWithAI = async (
    croppedImageBase64: string,
    visualStyle: string[],
    children: Array<{ name: string; age: string }>
  ): Promise<string | null> => {
    try {
      // Extract base64 data (remove data URL prefix if present)
      let base64Data = croppedImageBase64;
      if (croppedImageBase64.startsWith('data:')) {
        base64Data = croppedImageBase64.split(',')[1];
      }

      const response = await fetch('/api/enhance-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          visualStyle,
          children,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Enhancement not available or failed - return null for fallback
        return null;
      }

      // If AI enhancement returns an image URL, use it
      if (result.imageUrl) {
        return result.imageUrl;
      }

      // If enhancement indicates to use client-side filters, return null
      // (we'll use CSS filters as fallback)
      return null;
    } catch (err) {
      console.warn('AI enhancement error:', err);
      return null; // Graceful fallback
    }
  };

  /**
   * Persist story cover image to sessionStorage
   */
  const persistStoryCoverImage = (
    imageUrl: string,
    isUploadedPhoto: boolean,
    visualStyle: string[]
  ) => {
    try {
      const imageData = {
        imageUrl,
        isUploadedPhoto,
        visualStyle,
        timestamp: Date.now(),
      };
      sessionStorage.setItem('storyCoverImage', JSON.stringify(imageData));
      // Image persisted successfully
    } catch (err) {
      console.warn('Failed to persist story cover image:', err);
    }
  };

  const handleNewStory = () => {
    // Clear session storage and reset all locks
    sessionStorage.removeItem('storyFormData');
    sessionStorage.removeItem('storyCoverImage');
    imageLockedRef.current = false;
    imageGenerationStartedRef.current = false;
    generationRequestIdRef.current = 0;
    router.push('/');
  };

  return (
    <div className="min-h-screen night-sky-bg relative">
      {/* Header */}
      <header className="text-[#ffd93d] py-6 px-4 shadow-xl border-b border-[#ffd93d]/20 relative z-10 overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[#ffd93d] drop-shadow-[0_0_8px_rgba(255,217,61,0.5)]" style={{ fontFamily: 'var(--font-playfair-sc)' }}>{t.header.title}</h1>
              <p className="text-lg md:text-xl font-bold text-[#fef9e7]" style={{ fontFamily: 'var(--font-playfair)' }}>{t.header.subtitle}</p>
            </div>
            <button
              onClick={handleNewStory}
              className="px-4 py-2 bg-[#ffd93d]/20 hover:bg-[#ffd93d]/30 text-[#ffd93d] border border-[#ffd93d]/40 rounded-lg transition-colors text-sm font-medium"
            >
              {t.story.newStory}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-[rgba(255,140,66,0.2)] border-2 border-[rgba(255,140,66,0.5)] text-[#ff8c42] px-4 py-3 rounded-xl">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {/* Story Cover / Generated Image */}
        <section className="night-card rounded-2xl p-6 mb-6">
          {isGeneratingImage ? (
            <div className="w-full h-64 rounded-xl flex items-center justify-center border-2 border-dashed border-[rgba(30,58,95,0.6)]">
              <div className="text-center text-[#fef9e7]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd93d] mx-auto mb-4"></div>
                <p className="text-lg font-medium">{t.story.generatingImage}</p>
              </div>
            </div>
          ) : generatedImageUrl ? (
            <div className="w-full rounded-xl overflow-hidden border-2 border-[rgba(30,58,95,0.6)] relative">
              {/* Glow effect wrapper for uploaded photos */}
              {isUploadedPhoto && (Array.isArray(currentVisualStyle) ? currentVisualStyle.length > 0 : !!currentVisualStyle) && (
                <div 
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{
                    boxShadow: '0 0 40px rgba(255, 217, 61, 0.2), 0 0 80px rgba(255, 217, 61, 0.1), inset 0 0 60px rgba(255, 217, 61, 0.05)',
                    zIndex: 1,
                  }}
                />
              )}
              <img
                src={generatedImageUrl}
                alt="Story cover"
                className="w-full h-auto rounded-xl relative z-10"
                style={{
                  borderRadius: '12px',
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  // CRITICAL: Always apply filters to uploaded photos when visual style is selected
                  // Filters MUST be applied - this is non-negotiable
                  ...(isUploadedPhoto && (Array.isArray(currentVisualStyle) ? currentVisualStyle.length > 0 : !!currentVisualStyle) ? {
                    filter: getStyleFilterCSS(currentVisualStyle),
                    WebkitFilter: getStyleFilterCSS(currentVisualStyle), // Webkit prefix for Safari compatibility
                    objectFit: 'fill' as const, // Fill container - processed image has background layer
                  } : {
                    objectFit: 'contain' as const,
                    maxHeight: '24rem',
                  }),
                }}
                onLoad={() => {
                  // Image loaded successfully - filters applied via CSS
                }}
                onError={(e) => {
                  console.error('Failed to load story cover image:', generatedImageUrl);
                  setError('Failed to load story cover image. Please try again.');
                }}
              />
            </div>
          ) : (
            <div className="w-full h-64 rounded-xl flex items-center justify-center border-2 border-dashed border-[rgba(30,58,95,0.6)]">
              <div className="text-center text-[#fef9e7]">
                <div className="text-6xl mb-2">🌙</div>
                <p className="text-lg font-medium">{t.story.coverPlaceholder}</p>
                {formData && !formData.includeImages && (
                  <p className="text-sm text-[#fef9e7]/60 mt-2">{t.story.imagesNotRequested}</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Story Text */}
        <section className="night-card rounded-2xl p-6">
          {isGeneratingStory ? (
            <div className="w-full min-h-96 rounded-xl p-8 border-2 border-dashed border-[rgba(30,58,95,0.6)] flex items-center justify-center">
              <div className="text-center text-[#fef9e7] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd93d] mx-auto"></div>
                <p className="text-lg font-medium">{t.story.generatingStory}</p>
                <p className="text-sm text-[#fef9e7]/70">
                  {t.story.mayTakeMoment}
                </p>
              </div>
            </div>
          ) : story ? (
            <div className="w-full rounded-xl p-8 border-2 border-[rgba(30,58,95,0.6)]">
              {/* Story Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-[#ffd93d] mb-8 text-center drop-shadow-[0_0_8px_rgba(255,217,61,0.3)]" style={{ fontFamily: 'var(--font-playfair-sc)' }}>
                {story.title}
              </h1>
              
              {/* Story Sections */}
              <div className="space-y-8">
                {story.sections.map((section, index) => (
                  <div key={index} className="border-l-4 border-[rgba(30,58,95,0.8)] pl-6 py-4">
                    <h2 className="text-2xl font-semibold text-[#ffd93d] mb-4">
                      {section.headline}
                    </h2>
                    <div className="prose prose-lg max-w-none">
                      <p className="text-[#fef9e7] whitespace-pre-wrap leading-relaxed text-lg">
                        {section.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div className="w-full min-h-96 rounded-xl p-8 border-2 border-dashed border-[rgba(30,58,95,0.6)]">
              <div className="text-center text-[#fef9e7] space-y-4">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-lg font-medium">{t.story.storyPlaceholder}</p>
              </div>
            </div>
          )}
        </section>

        {/* Status Indicators */}
        {(isGeneratingStory || isGeneratingImage) && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 night-card rounded-xl border border-[rgba(30,58,95,0.6)]">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#ffd93d]"></div>
              <span className="text-[#fef9e7] font-medium">
                {isGeneratingStory
                  ? t.story.generatingStory
                  : isGeneratingImage
                  ? t.story.generatingImage
                  : t.story.generatingStory}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
