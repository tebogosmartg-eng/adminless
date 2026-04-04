import { translations, LanguageCode } from './translations';
import { translateTextWithGemini } from '@/services/gemini';

export const t = (key: string, language: string = 'en'): string => {
  const lang = language as LanguageCode;
  const dict = translations[lang] || translations['en'];
  return dict[key] || translations['en'][key] || key;
};

export const translateText = async (text: string, language: string = 'en'): Promise<string> => {
  if (!text) return text;
  
  const langCode = language as LanguageCode;
  const enDict = translations['en'];
  const langDict = translations[langCode] || translations['en'];
  
  // Check if the input text matches any English dictionary values
  const matchedKey = Object.keys(enDict).find(key => enDict[key] === text);
  
  if (matchedKey) {
    return langDict[matchedKey] || enDict[matchedKey] || text;
  }
  
  // Alternatively, check if the input is directly a key
  if (enDict[text] || langDict[text]) {
    return langDict[text] || enDict[text] || text;
  }
  
  // If no static match is found and language is not English, dynamically translate
  if (language !== 'en') {
    try {
      return await translateTextWithGemini(text, language);
    } catch (e) {
      console.error("AI Translation fallback failed:", e);
    }
  }

  // Fallback to the original English text if no translation is found
  return text;
};
