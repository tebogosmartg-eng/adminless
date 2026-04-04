import { translations, LanguageCode } from './translations';

export const t = (key: string, language: string = 'en'): string => {
  const lang = language as LanguageCode;
  const dict = translations[lang] || translations['en'];
  return dict[key] || translations['en'][key] || key;
};
