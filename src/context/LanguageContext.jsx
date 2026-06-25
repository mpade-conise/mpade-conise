import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const LanguageContext = createContext();

// Production Translation Dictionary Matrix
const dictionaries = {
  "en-MW": {
    saveChanges: "Save Changes",
    syncing: "Syncing...",
    searchPlaceholder: "Search all languages...",
    liveTranslator: "Live Translator Active",
    previewDesc: "Previewing UI labels for your selection.",
    infoNotice: "Choosing a new language triggers an automated sync across your Mpade Universe profile.",
    title: "Universe Language"
  },
  "ny-MW": {
    saveChanges: "Sungani Kusintha",
    syncing: "Zikusintha...",
    searchPlaceholder: "Sakasaka zilankhulo zonse...",
    liveTranslator: "Womasulira Wachangu",
    previewDesc: "Kuwonera zolemba za maonekedwe a chisankho chanu.",
    infoNotice: "Kusankha chinenero chatsopano kumasintha mbiri yanu yonse ya Mpade Universe.",
    title: "Chilankhulo cha Dziko"
  },
  "fr-FR": {
    saveChanges: "Enregistrer les modifications",
    syncing: "Synchronisation...",
    searchPlaceholder: "Rechercher toutes les langues...",
    liveTranslator: "Traducteur en Direct Actif",
    previewDesc: "Aperçu des libellés de l'interface pour votre sélection.",
    infoNotice: "Le choix d'une nouvelle langue déclenche une synchronisation automatique sur votre profil Mpade Universe.",
    title: "Langue de L'univers"
  },
  "pt-MZ": {
    saveChanges: "Salvar Alterações",
    syncing: "Sincronizando...",
    searchPlaceholder: "Pesquisar todos os idiomas...",
    liveTranslator: "Tradutor ao Vivo Ativo",
    previewDesc: "Visualizando rótulos de interface para sua seleção.",
    infoNotice: "A escolha de um novo idioma aciona uma sincronização automática em todo o seu perfil Mpade Universe.",
    title: "Idioma do Universo"
  },
  "sw-KE": {
    saveChanges: "Hifadhi Mabadiliko",
    syncing: "Inasawazisha...",
    searchPlaceholder: "Tafuta lugha zote...",
    liveTranslator: "Mtafsiri wa Moja kwa Moja",
    previewDesc: "Kuangalia lebo za UI kwa uteuzi wako.",
    infoNotice: "Kuchagua lugha mpya kunasababisha usawazishaji wa kiotomatiki kwenye wasifu wako wa Mpade Universe.",
    title: "Lugha ya Ulimwengu"
  },
  "zh-CN": {
    saveChanges: "保存更改",
    syncing: "同步中...",
    searchPlaceholder: "搜索所有语言...",
    liveTranslator: "实时翻译已启用",
    previewDesc: "正在预览您选择的界面标签。",
    infoNotice: "选择新语言将触发您 Mpade Universe 个人资料的的自动同步。",
    title: "宇宙语言"
  },
  "ar-SA": {
    saveChanges: "حفظ التغييرات",
    syncing: "جاري المزامنة...",
    searchPlaceholder: "البحث في كل اللغات...",
    liveTranslator: "المترجم المباشر نشط",
    previewDesc: "معاينة تسميات الواجهة لاختيارك.",
    infoNotice: "يؤدي اختيار لغة جديدة إلى تشغيل مزامنة تلقائية عبر ملف تعريف Mpade Universe الخاص بك.",
    title: "لغة الكون"
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState("en-MW");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPersistedLanguage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('user_preferences')
            .select('app_language')
            .eq('id', user.id)
            .maybeSingle();

          if (data?.app_language && dictionaries[data.app_language]) {
            setCurrentLang(data.app_language);
          }
        }
      } catch (err) {
        console.error("Error loading localization tokens:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPersistedLanguage();
  }, []);

  // Helper function to pull structural translation strings
  const t = (key) => {
    return dictionaries[currentLang]?.[key] || dictionaries["en-MW"]?.[key] || key;
  };

  const updateLanguage = async (langId) => {
    if (!dictionaries[langId]) return false;
    
    setCurrentLang(langId); // Instant global UI response

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('user_preferences')
        .update({ app_language: langId })
        .eq('id', user.id);
        
      if (error) {
        console.error("Failed cloud translation sync:", error);
        return false;
      }
    }
    return true;
  };

  return (
    <LanguageContext.Provider value={{ currentLang, updateLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
