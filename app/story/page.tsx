'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

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
  const [isGeneratingStory, setIsGeneratingStory] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load form data from sessionStorage
    const storedData = sessionStorage.getItem('storyFormData');
    if (!storedData) {
      // No form data, redirect to home
      router.push('/');
      return;
    }

    const data = JSON.parse(storedData) as FormData;
    setFormData(data);

    // Generate story first
    generateStory(data);
  }, [router]);

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

      // After story is generated, generate image if conditions are met
      if (
        data.includeImages === true &&
        data.visualStyle.length > 0
      ) {
        // Generate image even if no photo is uploaded (will use description/names)
        generateImage(
          data.photoBase64 || null,
          data.visualStyle,
          data.customVisualStyle,
          data.photoDescription,
          data.children
        );
      }
    } catch (err) {
      console.error('Error generating story:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate story');
      setIsGeneratingStory(false);
    }
  };

  const generateImage = async (
    photoBase64: string | null,
    visualStyle: string[],
    customVisualStyle: string,
    photoDescription: string,
    children: Array<{ name: string; age: string }>
  ) => {
    try {
      setIsGeneratingImage(true);
      setError(null);

      const stylePrompt = customVisualStyle || visualStyle.join(' and ');

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: photoBase64,
          visualStyle,
          photoDescription: photoDescription,
          children: children,
          prompt: `Create a beautiful ${stylePrompt} style illustration for a children's bedtime story book cover. ${photoDescription ? `The illustration should feature: ${photoDescription}.` : children.length > 0 ? `The illustration should feature ${children.map(c => c.name || 'child').join(' and ')}.` : ''} The style should be ${stylePrompt}, colorful, friendly, and magical, with soft lighting suitable for a bedtime story.`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Extract error message from API response
        const errorMessage = result.error || result.details || 'Failed to generate image';
        throw new Error(errorMessage);
      }
      
      // Set the generated image URL
      if (result.imageUrl) {
        setGeneratedImageUrl(result.imageUrl);
      } else if (result.imageBase64) {
        setGeneratedImageUrl(`data:image/png;base64,${result.imageBase64}`);
      } else {
        throw new Error('No image URL or base64 data received from API');
      }
      
      setIsGeneratingImage(false);
    } catch (err) {
      console.error('Error generating image:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
      setIsGeneratingImage(false);
    }
  };

  const handleNewStory = () => {
    // Clear session storage
    sessionStorage.removeItem('storyFormData');
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
            <div className="w-full rounded-xl overflow-hidden border-2 border-[rgba(30,58,95,0.6)]">
              <img
                src={generatedImageUrl}
                alt="Generated story cover"
                className="w-full h-auto object-contain max-h-96 mx-auto"
                onError={(e) => {
                  console.error('Failed to load generated image:', generatedImageUrl);
                  setError('Failed to load generated image. Please try again.');
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
