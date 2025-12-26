'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Child {
  name: string;
  age: string;
}

export default function Home() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([
    { name: '', age: '' },
    { name: '', age: '' },
    { name: '', age: '' },
  ]);
  const [enjoyedCharacters, setEnjoyedCharacters] = useState<string[]>([]);
  const [customCharacters, setCustomCharacters] = useState('');
  const [teachingThemes, setTeachingThemes] = useState<string[]>([]);
  const [customTeachingTheme, setCustomTeachingTheme] = useState('');
  const [storyLength, setStoryLength] = useState<string>('');
  const [includeImages, setIncludeImages] = useState<boolean | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const [visualStyle, setVisualStyle] = useState<string[]>([]);
  const [customVisualStyle, setCustomVisualStyle] = useState('');

  const characterOptions = ['Princesses', 'Superheroes', 'Animals', 'Dragons'];
  const teachingThemeOptions = ['Kindness', 'Bravery', 'Friendship', 'Honesty'];
  const visualStyleOptions = ['Cartoon', 'Realistic', 'Fantasy', 'Modern'];

  const handleChildChange = (index: number, field: 'name' | 'age', value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const toggleSelection = (
    item: string,
    selectedItems: string[],
    setSelectedItems: (items: string[]) => void
  ) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter((i) => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
    const formData = {
      children: children.filter((c) => c.name || c.age),
      enjoyedCharacters,
      customCharacters,
      teachingThemes,
      customTeachingTheme,
      storyLength,
      includeImages,
      photoDescription,
      visualStyle,
      customVisualStyle,
      photoBase64, // Include base64 photo for image generation
    };

    // Store in sessionStorage for temporary storage (session-based)
    sessionStorage.setItem('storyFormData', JSON.stringify(formData));
    
    console.log('Form Data stored:', { ...formData, photoBase64: photoBase64 ? 'Base64 image data present' : 'No image' });
    
    // Navigate to story page
    router.push('/story');
  };

  return (
    <div className="min-h-screen night-sky-bg relative">
      {/* Header */}
      <header className="text-[#ffd93d] py-6 px-4 shadow-xl border-b border-[#ffd93d]/20 relative z-10 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[#ffd93d] drop-shadow-[0_0_8px_rgba(255,217,61,0.5)]" style={{ fontFamily: 'var(--font-playfair-sc)' }}>No More Night Time Fussies</h1>
          <p className="text-lg md:text-xl font-bold text-[#fef9e7]" style={{ fontFamily: 'var(--font-playfair)' }}>Bedtime Story Generator</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Welcome Section */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-2xl font-semibold text-[#ffd93d] mb-4">Welcome!</h2>
            <p className="text-[#fef9e7]">
              Create a personalized bedtime story for your children. Fill out the form below to get started.
            </p>
          </section>

          {/* Children Names and Ages */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              What Are Your Children&apos;s Names and Ages?
            </h2>
            <div className="space-y-4">
              {children.map((child, index) => (
                <div key={index} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#5a8fb8] mb-2">Name</label>
                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                      className="night-input w-full px-4 py-2 rounded-lg text-[#fef9e7]"
                      placeholder="Child's name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#5a8fb8] mb-2">Age</label>
                    <input
                      type="text"
                      value={child.age}
                      onChange={(e) => handleChildChange(index, 'age', e.target.value)}
                      className="night-input w-full px-4 py-2 rounded-lg text-[#fef9e7]"
                      placeholder="Age"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Characters/Themes They Enjoy */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              What kind of characters or themes do they enjoy?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {characterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleSelection(option, enjoyedCharacters, setEnjoyedCharacters)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                    enjoyedCharacters.includes(option)
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
              placeholder="Something Else"
            />
          </section>

          {/* Teaching Themes */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              What themes are you trying to teach?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {teachingThemeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleSelection(option, teachingThemes, setTeachingThemes)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                    teachingThemes.includes(option)
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
              placeholder="Something Else"
            />
          </section>

          {/* Story Length */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              How Long Do You Want the Story To Be?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['3-5 Mins', '5-10 Mins', '10-15 Mins', '15-20 Mins'].map((length) => (
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
              Would you like to include images?
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
                Yes
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
                No
              </button>
            </div>
          </section>

          {/* Photo Upload */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              Please Upload a Photo of Your Children
            </h2>
            <div className="border-2 border-dashed border-[rgba(30,58,95,0.6)] rounded-xl p-8 text-center hover:border-[rgba(30,58,95,0.8)] transition-colors">
              <input
                type="file"
                accept="image/*"
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
                    <p className="text-sm text-[#fef9e7]">Click to change photo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-4xl">🌙</div>
                    <p className="text-[#fef9e7]">Click to upload photo</p>
                    <p className="text-sm text-[#fef9e7]/60">PNG, JPG, GIF up to 10MB</p>
                  </div>
                )}
              </label>
            </div>
          </section>

          {/* Photo Description */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              Describe Which Child is Which in the Photo
            </h2>
            <textarea
              value={photoDescription}
              onChange={(e) => setPhotoDescription(e.target.value)}
              className="night-input w-full px-4 py-3 rounded-lg text-[#fef9e7] min-h-[120px]"
              placeholder="Describe which child is which in the photo..."
            />
          </section>

          {/* Visual Style */}
          <section className="night-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[#ffd93d] mb-4">
              What Visual Style Might Your Child Like?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {visualStyleOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleSelection(option, visualStyle, setVisualStyle)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                    visualStyle.includes(option)
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
              placeholder="Something Else"
            />
          </section>

          {/* Generate Story Button */}
          <div className="flex justify-center pb-8">
            <button
              type="submit"
              className="px-12 py-4 bg-gradient-to-r from-[#ffd93d] to-[#ff8c42] text-[#1a0d2e] text-xl font-bold rounded-xl shadow-lg shadow-[#ffd93d]/50 hover:shadow-xl hover:shadow-[#ffd93d]/70 transform hover:scale-105 transition-all duration-200"
            >
              Generate Story ✨
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
