import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ro from './locales/ro.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
  fr: { translation: fr },
  de: { translation: de },
  ro: { translation: ro },
};

// Get language from localStorage first, fallback to browser language, then 'en'
const getInitialLanguage = () => {
  const stored = localStorage.getItem('language');
  if (stored && resources[stored as keyof typeof resources]) {
    return stored;
  }
  
  const browserLang = navigator.language.split('-')[0];
  if (resources[browserLang as keyof typeof resources]) {
    return browserLang;
  }
  
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Helper function to change language and persist
export const changeLanguage = async (lang: string) => {
  await i18n.changeLanguage(lang);
  localStorage.setItem('language', lang);
};

// Helper function to sync language from user metadata
export const syncLanguageFromUser = (userLanguage: string | undefined) => {
  if (userLanguage && resources[userLanguage as keyof typeof resources]) {
    const currentLang = i18n.language;
    if (currentLang !== userLanguage) {
      changeLanguage(userLanguage);
    }
  }
};

export default i18n;