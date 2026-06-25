import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState("neon-glow");
  const [glassEffect, setGlassEffect] = useState(true);
  const [loading, setLoading] = useState(true);

  // Apply theme settings directly to the DOM root
  const injectStylesIntoDOM = (themeId, glassActive) => {
    const root = document.documentElement;

    // 1. Synchronize data attribute flags for Tailwind or Custom CSS selection
    root.setAttribute('data-theme', themeId);
    root.setAttribute('data-glass-effect', glassActive ? 'true' : 'false');

    // 2. Clear old root theme flags
    root.classList.remove('theme-neon-glow', 'theme-deep-dark', 'theme-cyber-punk');
    root.classList.add(`theme-${themeId}`);

    // 3. Update CSS variables dynamically
    const themePalettes = {
      'neon-glow': { primary: '#00f2ea', accent: '#ff0050', bg: '#000000' },
      'deep-dark': { primary: '#ffffff', accent: '#333333', bg: '#000000' },
      'cyber-punk': { primary: '#f3ec1a', accent: '#7000ff', bg: '#0b001a' }
    };

    const palette = themePalettes[themeId] || themePalettes['neon-glow'];
    root.style.setProperty('--primary-glow', palette.primary);
    root.style.setProperty('--accent-glow', palette.accent);
    root.style.setProperty('--app-bg', palette.bg);
  };

  useEffect(() => {
    const fetchPersistedTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('user_preferences')
            .select('selected_theme, glass_effect')
            .eq('id', user.id)
            .maybeSingle();

          if (data) {
            setCurrentTheme(data.selected_theme || "neon-glow");
            setGlassEffect(data.glass_effect !== undefined ? data.glass_effect : true);
            injectStylesIntoDOM(data.selected_theme, data.glass_effect);
          }
        }
      } catch (err) {
        console.error("Theme configuration engine fault:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPersistedTheme();
  }, []);

  const updateGlobalTheme = async (themeId, glassActive) => {
    // Immediate local UI response
    setCurrentTheme(themeId);
    setGlassEffect(glassActive);
    injectStylesIntoDOM(themeId, glassActive);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('user_preferences')
        .update({ 
          selected_theme: themeId, 
          glass_effect: glassActive 
        })
        .eq('id', user.id);

      if (error) {
        console.error("Failed synchronization to database:", error);
        return false;
      }
    }
    return true;
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, glassEffect, updateGlobalTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
