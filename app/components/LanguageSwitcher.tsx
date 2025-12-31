'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'en' | 'fr')}
        className="px-3 py-2 bg-[rgba(30,58,95,0.3)] text-[#fef9e7] border-2 border-[rgba(30,58,95,0.6)] rounded-lg text-sm font-medium hover:border-[rgba(30,58,95,0.8)] hover:bg-[rgba(30,58,95,0.4)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ffd93d]/50 cursor-pointer"
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
    </div>
  );
}


