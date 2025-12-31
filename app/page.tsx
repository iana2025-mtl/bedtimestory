'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from './contexts/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';

interface Child {
  name: string;
  age: string;
}

export default function Home() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [children, setChildren] = useState<Child[]>([
    { name: '', age: '' },
    { name: '', age: '' },
    { name: '', age: '' },
  ]);
  const [enjoyedCharacters, setEnjoyedCharacters] = useState<string>('');
  const [customCharacters, setCustomCharacters] = useState('');
  const [teachingThemes, setTeachingThemes] = useState<string>('');
  const [customTeachingTheme, setCustomTeachingTheme] = useState('');
  const [storyLength, setStoryLength] = useState<string>('');
  const [includeImages, setIncludeImages] = useState<boolean | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const [visualStyle, setVisualStyle] = useState<string>('');
  const [customVisualStyle, setCustomVisualStyle] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const characterOptions = t.options.characters;
  const teachingThemeOptions = t.options.themes;
  const visualStyleOptions = t.options.visualStyles;

  const handleChildChange = (index: number, field: 'name' | 'age', value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  // Single-select handler (radio button style)
  const handleSingleSelect = (
    item: string,
    currentValue: string,
    setValue: (value: string) => void
  ) => {
    // If clicking the same item, deselect it (allow clearing selection)
    if (currentValue === item) {
      setValue('');
    } else {
      setValue(item);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Constants for validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    // Validate file size first (10 MB limit)
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Image size must be 10MB or less.');
      setUploadedPhoto(null);
      setPhotoPreview(null);
      // Clear the input
      e.target.value = '';
      return;
    }

    // Validate file type
    // Note: 'image/jpeg' is the correct MIME type for both .jpg and .jpeg files
    // But we also accept 'image/jpg' for explicit .jpg files
    const fileType = file.type.toLowerCase();
    
    // Also check file extension as fallback (some browsers may not set MIME type correctly)
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.jpg') || 
                              fileName.endsWith('.jpeg') || 
                              fileName.endsWith('.png') || 
                              fileName.endsWith('.webp');

    // Accept if MIME type is valid OR file extension is valid
    if (!allowedTypes.includes(fileType) && !hasValidExtension) {
      setUploadError('Please upload a JPG, PNG, or WebP image.');
      setUploadedPhoto(null);
      setPhotoPreview(null);
      // Clear the input
      e.target.value = '';
      return;
    }

    // All validations passed - clear any previous errors and proceed
    setUploadError(null);
    setUploadedPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError('Failed to read the image file. Please try again.');
      setUploadedPhoto(null);
      setPhotoPreview(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert photo to base64 if uploaded
    let photoBase64: string | null = null;
    if (uploadedPhoto && photoPreview) {
      // photoPreview is already base64 from FileReader
      photoBase64 = photoPreview.split(',')[1]; // Remove data:image/...;base64, prefix
    }

    // Prepare form data
    // Convert single-select values to arrays for backward compatibility with API
    const formData = {
      children: children.filter((c) => c.name || c.age),
      enjoyedCharacters: enjoyedCharacters ? [enjoyedCharacters] : [],
      customCharacters,
      teachingThemes: teachingThemes ? [teachingThemes] : [],
      customTeachingTheme,
      storyLength,
      includeImages,
      photoDescription,
      visualStyle: visualStyle ? [visualStyle] : [],
      customVisualStyle,
      photoBase64, // Include base64 photo for image generation
      language, // Include selected language for story generation
    };

    // Store in sessionStorage for temporary storage (session-based)
    sessionStorage.setItem('storyFormData', JSON.stringify(formData));
    
    // Navigate to story page
    router.push('/story');
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
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[#ffd93d] drop-shadow-[0_0_8px_rgba(255,217,61,0.5)]" style={{ fontFamily: 'var(--font-playfair-sc)' }}>{t.header.title}</h1>
            <p className="text-lg md:text-xl font-bold text-[#fef9e7]" style={{ fontFamily: 'var(--font-playfair)' }}>{t.header.subtitle}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Welcome Section */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-2xl font-semibold text-[#ffd93d] mb-4">{t.form.welcome}</h2>
            <p className="text-[#fef9e7]">
              {t.form.welcomeDescription}
            </p>
          </section>

          {/* Children Names and Ages */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              {t.form.childrenNamesAges}
            </h2>
            <div className="space-y-4">
              {children.map((child, index) => (
                <div key={index} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#5a8fb8] mb-2">{t.form.name}</label>
                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                      className="night-input w-full px-4 py-2 rounded-lg text-[#fef9e7]"
                      placeholder={t.form.namePlaceholder}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#5a8fb8] mb-2">{t.form.age}</label>
                    <input
                      type="text"
                      value={child.age}
                      onChange={(e) => handleChildChange(index, 'age', e.target.value)}
                      className="night-input w-full px-4 py-2 rounded-lg text-[#fef9e7]"
                      placeholder={t.form.agePlaceholder}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Characters/Themes They Enjoy */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              {t.form.charactersQuestion}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {characterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSingleSelect(option, enjoyedCharacters, setEnjoyedCharacters)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                    enjoyedCharacters === option
                      ? 'bg-[#ffd93d] text-[#1a0d2e] border-[#ffd93d] shadow-lg shadow-[#ffd93d]/50 transform scale-105'
                      : 'bg-[rgba(30,58,95,0.3)] text-[#fef9e7] border-[rgba(30,58,95,0.6)] hover:border-[rgba(30,58,95,0.8)] hover:bg-[rgba(30,58,95,0.4)]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customCharacters}
              onChange={(e) => setCustomCharacters(e.target.value)}
              className="night-input w-full px-4 py-2 rounded-lg text-[#fef9e7]"
              placeholder={t.form.somethingElse}
            />
          </section>

          {/* Teaching Themes */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              {t.form.themesQuestion}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {teachingThemeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSingleSelect(option, teachingThemes, setTeachingThemes)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                    teachingThemes === option
                      ? 'bg-[#ffd93d] text-[#1a0d2e] border-[#ffd93d] shadow-lg shadow-[#ffd93d]/50 transform scale-105'
                      : 'bg-[rgba(30,58,95,0.3)] text-[#fef9e7] border-[rgba(30,58,95,0.6)] hover:border-[rgba(30,58,95,0.8)] hover:bg-[rgba(30,58,95,0.4)]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customTeachingTheme}
              onChange={(e) => setCustomTeachingTheme(e.target.value)}
              className="night-input w-full px-4 py-2 rounded-lg text-[#fef9e7]"
              placeholder={t.form.somethingElse}
            />
          </section>

          {/* Story Length */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              {t.form.storyLengthQuestion}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {t.options.storyLengths.map((length) => (
                <button
                  key={length}
                  type="button"
                  onClick={() => setStoryLength(length)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                    storyLength === length
                      ? 'bg-[#ffd93d] text-[#1a0d2e] border-[#ffd93d] shadow-lg shadow-[#ffd93d]/50 transform scale-105'
                      : 'bg-[rgba(30,58,95,0.3)] text-[#fef9e7] border-[rgba(30,58,95,0.6)] hover:border-[rgba(30,58,95,0.8)] hover:bg-[rgba(30,58,95,0.4)]'
                  }`}
                >
                  {length}
                </button>
              ))}
            </div>
          </section>

          {/* Include Images */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              {t.form.includeImagesQuestion}
            </h2>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIncludeImages(true)}
                className={`flex-1 px-6 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                  includeImages === true
                    ? 'bg-[#ffd93d] text-[#1a0d2e] border-[#ffd93d] shadow-lg shadow-[#ffd93d]/50'
                    : 'bg-[rgba(30,58,95,0.3)] text-[#fef9e7] border-[rgba(30,58,95,0.6)] hover:border-[rgba(30,58,95,0.8)] hover:bg-[rgba(30,58,95,0.4)]'
                }`}
              >
                {t.form.yes}
              </button>
              <button
                type="button"
                onClick={() => setIncludeImages(false)}
                className={`flex-1 px-6 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                  includeImages === false
                    ? 'bg-[#ff8c42] text-[#fef9e7] border-[#ff8c42] shadow-lg shadow-[#ff8c42]/50'
                    : 'bg-[rgba(30,58,95,0.3)] text-[#fef9e7] border-[rgba(30,58,95,0.6)] hover:border-[rgba(30,58,95,0.8)] hover:bg-[rgba(30,58,95,0.4)]'
                }`}
              >
                {t.form.no}
              </button>
            </div>
          </section>

          {/* Photo Upload */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              {t.form.photoUpload}
            </h2>
            <div className="border-2 border-dashed border-[rgba(30,58,95,0.6)] rounded-xl p-8 text-center hover:border-[rgba(30,58,95,0.8)] transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer block"
              >
                {photoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={photoPreview}
                      alt="Uploaded photo"
                      className="max-w-full max-h-64 mx-auto rounded-lg object-contain shadow-xl"
                    />
                    <p className="text-sm text-[#fef9e7]">{t.form.clickToChangePhoto}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-4xl">🌙</div>
                    <p className="text-[#fef9e7]">{t.form.clickToUpload}</p>
                    <p className="text-sm text-[#fef9e7]/60">{t.form.fileTypes}</p>
                  </div>
                )}
              </label>
              {uploadError && (
                <div className="mt-4 p-3 bg-[rgba(255,140,66,0.2)] border-2 border-[rgba(255,140,66,0.5)] text-[#ff8c42] rounded-lg">
                  <p className="text-sm font-medium">{uploadError}</p>
                </div>
              )}
            </div>
          </section>

          {/* Photo Description */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              {t.form.photoDescription}
            </h2>
            <textarea
              value={photoDescription}
              onChange={(e) => setPhotoDescription(e.target.value)}
              className="night-input w-full px-4 py-3 rounded-lg text-[#fef9e7] min-h-[120px]"
              placeholder={t.form.photoDescription}
            />
          </section>

          {/* Visual Style */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              {t.form.visualStyleQuestion}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {visualStyleOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSingleSelect(option, visualStyle, setVisualStyle)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                    visualStyle === option
                      ? 'bg-[#ffd93d] text-[#1a0d2e] border-[#ffd93d] shadow-lg shadow-[#ffd93d]/50 transform scale-105'
                      : 'bg-[rgba(30,58,95,0.3)] text-[#fef9e7] border-[rgba(30,58,95,0.6)] hover:border-[rgba(30,58,95,0.8)] hover:bg-[rgba(30,58,95,0.4)]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customVisualStyle}
              onChange={(e) => setCustomVisualStyle(e.target.value)}
              className="night-input w-full px-4 py-2 rounded-lg text-[#fef9e7]"
              placeholder={t.form.somethingElse}
            />
          </section>

          {/* Generate Story Button */}
          <div className="flex justify-center pb-8">
            <button
              type="submit"
              className="px-12 py-4 bg-gradient-to-r from-[#ffd93d] to-[#ff8c42] text-[#1a0d2e] text-xl font-bold rounded-xl shadow-lg shadow-[#ffd93d]/50 hover:shadow-xl hover:shadow-[#ffd93d]/70 transform hover:scale-105 transition-all duration-200"
            >
              {t.form.generateStory}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
