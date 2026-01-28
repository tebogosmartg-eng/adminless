import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export const SystemThemeManager = () => {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const updateContextualTheme = () => {
      // Remove all variant classes first
      document.documentElement.classList.remove('theme-morning', 'theme-afternoon');

      if (theme !== 'system') return;

      const hour = new Date().getHours();

      // "AI" Logic for theme selection
      if (resolvedTheme === 'light') {
        if (hour >= 5 && hour < 11) {
          // Early morning: Fresh morning theme
          document.documentElement.classList.add('theme-morning');
        } else if (hour >= 16 && hour < 21) {
          // Late afternoon/Evening: Relaxed warmer theme
          document.documentElement.classList.add('theme-afternoon');
        }
        // Mid-day uses standard Calm Classroom
      }
      // Resolved Dark mode uses standard Night Marker
    };

    updateContextualTheme();
    
    // Update every 15 minutes
    const interval = setInterval(updateContextualTheme, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [theme, resolvedTheme]);

  return null;
};