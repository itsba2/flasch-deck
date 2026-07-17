import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Trophy,
  Settings as SettingsIcon
} from 'lucide-react';
import { ConfigProvider, theme, Layout, Menu, Spin, message } from 'antd';
import Dashboard from './components/Dashboard';
import DeckManager from './components/DeckManager';
import StudySession from './components/StudySession';
import QuizMode from './components/QuizMode';
import Settings from './components/Settings';
import { Card, Deck, AppConfig, StudyHistoryItem, QuizHistoryItem } from './global';

const { Sider, Content } = Layout;

export default function App() {
  const [activeRoute, setActiveRoute] = useState<string>('dashboard');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    apiKey: '',
    fontSize: 'small',
    theme: 'light'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load Decks & Configurations on startup
  useEffect(() => {
    async function loadData() {
      try {
        if (window.electronAPI) {
          const loadedDecks = await window.electronAPI.getDecks();
          const loadedConfig = await window.electronAPI.getConfig();
          setDecks(loadedDecks || []);
          setConfig(
            loadedConfig || {
              apiKey: '',
              studyHistory: [],
              quizHistory: [],
              fontSize: 'small',
              theme: 'light'
            }
          );
        } else {
          console.warn('Electron API bulunamadı, tarayıcı modunda çalışıyor.');
        }
      } catch (e) {
        console.error('Veri yükleme hatası:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Update theme and font-size dynamically
  useEffect(() => {
    const root = document.documentElement;
    const themeMode = config.theme || 'light';

    if (themeMode === 'light') {
      root.style.setProperty('--bg-main', '#f8fafc');
      root.style.setProperty('--bg-sidebar', '#ffffff');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-card-hover', '#f1f5f9');
      root.style.setProperty('--border-color', '#cbd5e1');
      root.style.setProperty('--border-hover', '#94a3b8');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-muted', '#64748b');

      root.style.setProperty('--bg-transparent', 'rgba(15, 23, 42, 0.04)');
      root.style.setProperty('--bg-trans-light', 'rgba(15, 23, 42, 0.02)');
      root.style.setProperty('--border-trans', 'rgba(15, 23, 42, 0.08)');
      root.style.setProperty(
        '--card-front-bg',
        'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)'
      );
      root.style.setProperty('--card-back-bg', 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)');
    } else {
      // dark
      root.style.setProperty('--bg-main', '#090b11');
      root.style.setProperty('--bg-sidebar', '#0f131f');
      root.style.setProperty('--bg-card', '#151b2e');
      root.style.setProperty('--bg-card-hover', '#1e263f');
      root.style.setProperty('--border-color', '#263152');
      root.style.setProperty('--border-hover', '#3d4e80');
      root.style.setProperty('--text-primary', '#f1f5f9');
      root.style.setProperty('--text-secondary', '#94a3b8');
      root.style.setProperty('--text-muted', '#64748b');

      root.style.setProperty('--bg-transparent', 'rgba(9, 11, 17, 0.4)');
      root.style.setProperty('--bg-trans-light', 'rgba(255, 255, 255, 0.03)');
      root.style.setProperty('--border-trans', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty(
        '--card-front-bg',
        'radial-gradient(circle at top right, #1d253f, #111627)'
      );
      root.style.setProperty(
        '--card-back-bg',
        'radial-gradient(circle at top right, #161e38, #0e1220)'
      );
    }
  }, [config.theme]);

  useEffect(() => {
    const root = document.documentElement;
    const size = config.fontSize || 'small';
    const sizeMap = {
      small: '14px',
      medium: '18px',
      large: '22px'
    };
    root.style.setProperty('font-size', sizeMap[size]);
  }, [config.fontSize]);

  // Save or update deck in both state and local file
  const handleSaveDeck = async (updatedDeck: Deck) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.saveDeck(updatedDeck);
        if (result.success) {
          setDecks((prevDecks) => {
            const exists = prevDecks.some((d) => d.id === updatedDeck.id);
            if (exists) {
              return prevDecks.map((d) => (d.id === updatedDeck.id ? result.deck : d));
            }
            return [...prevDecks, result.deck];
          });
        }
      }
    } catch (e) {
      console.error('Deste kaydetme hatası:', e);
    }
  };

  // Delete deck
  const handleDeleteDeck = async (deckId: string) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.deleteDeck(deckId);
        if (result.success) {
          setDecks((prevDecks) => prevDecks.filter((d) => d.id !== deckId));
        }
      }
    } catch (e) {
      console.error('Deste silme hatası:', e);
    }
  };

  // Import deck
  const handleImportDeck = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.importDeck();
        if (result.success && result.deck) {
          setDecks((prevDecks) => [...prevDecks, result.deck!]);
          message.success(`"${result.deck.name}" başarıyla içe aktarıldı!`);
        } else if (result.error) {
          message.error(result.error);
        }
      }
    } catch (e) {
      console.error('Deste içe aktarma hatası:', e);
    }
  };

  // Export deck
  const handleExportDeck = async (deck: Deck) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.exportDeck(deck);
        if (result.success) {
          message.success('Deste başarıyla dışarı aktarıldı!');
        }
      }
    } catch (e) {
      console.error('Deste dışarı aktarma hatası:', e);
    }
  };

  // Update a single card within a deck (spaced repetition reviews)
  const handleUpdateCard = async (deckId: string, updatedCard: Card) => {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;

    const updatedDeck: Deck = {
      ...deck,
      cards: deck.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c))
    };

    handleSaveDeck(updatedDeck);
  };

  // Save Gemini Configuration
  const handleSaveConfig = async (newConfig: AppConfig) => {
    try {
      if (window.electronAPI) {
        const updatedConfig = {
          ...config,
          ...newConfig
        };
        await window.electronAPI.saveConfig(updatedConfig);
        setConfig(updatedConfig);
      }
    } catch (e) {
      console.error('Ayar kaydetme hatası:', e);
      throw e;
    }
  };

  // Log study session completion
  const handleLogStudySession = async (sessionStats: { reviewed: number; grades: number[] }) => {
    const today = new Date().toISOString().split('T')[0];
    const currentStudyHistory: StudyHistoryItem[] = [...(config.studyHistory || [])];
    const existingIndex = currentStudyHistory.findIndex((h) => h.date === today);

    if (existingIndex >= 0) {
      currentStudyHistory[existingIndex] = {
        ...currentStudyHistory[existingIndex],
        reviewed: currentStudyHistory[existingIndex].reviewed + sessionStats.reviewed,
        grades: [...(currentStudyHistory[existingIndex].grades || []), ...sessionStats.grades]
      };
    } else {
      currentStudyHistory.push({
        date: today,
        reviewed: sessionStats.reviewed,
        grades: sessionStats.grades
      });
    }

    const updatedConfig: AppConfig = {
      ...config,
      studyHistory: currentStudyHistory
    };
    handleSaveConfig(updatedConfig);
  };

  // Log quiz session completion
  const handleLogQuizSession = async (quizStats: QuizHistoryItem) => {
    const currentQuizHistory: QuizHistoryItem[] = [...(config.quizHistory || [])];
    currentQuizHistory.push(quizStats);

    const updatedConfig: AppConfig = {
      ...config,
      quizHistory: currentQuizHistory
    };
    handleSaveConfig(updatedConfig);
  };

  // Reset application
  const handleResetApp = async () => {
    try {
      if (window.electronAPI) {
        // Delete all decks
        for (const d of decks) {
          await window.electronAPI.deleteDeck(d.id);
        }

        // Reset configuration history but keep API key
        const resetConfig: AppConfig = {
          apiKey: config.apiKey || '',
          studyHistory: [],
          quizHistory: []
        };
        await window.electronAPI.saveConfig(resetConfig);
        setConfig(resetConfig);

        // Save default starter deck
        const defaultDeck: Deck = {
          id: 'default-deutsch-a1',
          name: 'Temel Almanca (A1)',
          description:
            'Yeni başlayanlar için temel Almanca kelimeler (der/die/das renkli ve cümleli)',
          cards: [
            {
              id: 'card-1',
              type: 'noun',
              german: 'Hund',
              turkish: 'köpek',
              article: 'der',
              plural: 'Hunde',
              exampleGerman: 'Der Hund bellt im Garten.',
              exampleTurkish: 'Köpek bahçede havlıyor.',
              interval: 0,
              repetition: 0,
              efactor: 2.5,
              nextReviewDate: new Date().toISOString()
            },
            {
              id: 'card-2',
              type: 'noun',
              german: 'Katze',
              turkish: 'kedi',
              article: 'die',
              plural: 'Katzen',
              exampleGerman: 'Die Katze schläft auf dem Sofa.',
              exampleTurkish: 'Kedi kanepede uyuyor.',
              interval: 0,
              repetition: 0,
              efactor: 2.5,
              nextReviewDate: new Date().toISOString()
            },
            {
              id: 'card-3',
              type: 'noun',
              german: 'Buch',
              turkish: 'kitap',
              article: 'das',
              plural: 'Bücher',
              exampleGerman: 'Ich lese ein interessantes Book.',
              exampleTurkish: 'İlginç bir kitap okuyorum.',
              interval: 0,
              repetition: 0,
              efactor: 2.5,
              nextReviewDate: new Date().toISOString()
            }
          ]
        };

        const result = await window.electronAPI.saveDeck(defaultDeck);
        if (result.success) {
          setDecks([result.deck]);
        }
      }
    } catch (e) {
      console.error('Sıfırlama hatası:', e);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'var(--bg-main)'
        }}
      >
        <Spin size="large" tip="Veriler Yükleniyor..." style={{ color: '#fff' }} />
      </div>
    );
  }

  const uiSize = config.fontSize || 'small';
  const isMedium = uiSize === 'medium';
  const isLarge = uiSize === 'large';

  const antDesignTokens = {
    fontSize: isLarge ? 22 : isMedium ? 18 : 14,
    paddingXS: isLarge ? 12 : isMedium ? 10 : 8,
    paddingSM: isLarge ? 16 : isMedium ? 14 : 12,
    padding: isLarge ? 24 : isMedium ? 20 : 16,
    paddingMD: isLarge ? 28 : isMedium ? 24 : 20,
    paddingLG: isLarge ? 36 : isMedium ? 28 : 24,
    paddingXL: isLarge ? 48 : isMedium ? 38 : 32,
    marginXS: isLarge ? 12 : isMedium ? 10 : 8,
    marginSM: isLarge ? 16 : isMedium ? 14 : 12,
    margin: isLarge ? 24 : isMedium ? 20 : 16,
    marginMD: isLarge ? 28 : isMedium ? 24 : 20,
    marginLG: isLarge ? 36 : isMedium ? 28 : 24,
    marginXL: isLarge ? 48 : isMedium ? 38 : 32,
    borderRadius: isLarge ? 12 : isMedium ? 10 : 8,
    controlHeight: isLarge ? 44 : isMedium ? 38 : 32,
    controlHeightSM: isLarge ? 32 : isMedium ? 28 : 24,
    controlHeightLG: isLarge ? 52 : isMedium ? 46 : 40,
    colorPrimary: config.theme === 'dark' ? '#8b5cf6' : '#7c3aed',
    colorBgContainer: config.theme === 'dark' ? '#1e293b' : '#ffffff',
    colorBgElevated: config.theme === 'dark' ? '#334155' : '#f1f5f9',
    colorBorder: config.theme === 'dark' ? '#475569' : '#cbd5e1',
    colorBgLayout: config.theme === 'dark' ? '#0f172a' : '#f8fafc',
    colorTextBase: config.theme === 'dark' ? '#f8fafc' : '#0f172a'
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: config.theme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: antDesignTokens
      }}
    >
      <Layout style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
        {/* Sidebar Navigation */}
        <Sider
          width={260}
          theme={config.theme || 'light'}
          style={{
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-color)',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'space-between',
              padding: '1.5rem 0'
            }}
          >
            <div>
              <div
                className="logo-container"
                style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}
              >
                <GraduationCap className="logo-icon" size={28} />
                <span className="logo-text">FlaschDeck</span>
              </div>

              <Menu
                mode="inline"
                theme={config.theme || 'light'}
                selectedKeys={[activeRoute === 'settings' ? '' : activeRoute]}
                onClick={({ key }) => setActiveRoute(key)}
                style={{ background: 'transparent', borderRight: 0 }}
                items={[
                  {
                    key: 'dashboard',
                    icon: <LayoutDashboard size={18} />,
                    label: 'Kontrol Paneli'
                  },
                  {
                    key: 'decks',
                    icon: <BookOpen size={18} />,
                    label: 'Destelerim'
                  },
                  {
                    key: 'study',
                    icon: <GraduationCap size={18} />,
                    label: 'Kart Çalışması'
                  },
                  {
                    key: 'quiz',
                    icon: <Trophy size={18} />,
                    label: 'Quiz Arenası'
                  }
                ]}
              />
            </div>

            <div style={{ padding: '0 1rem' }}>
              <Menu
                mode="inline"
                theme={config.theme || 'light'}
                selectedKeys={[activeRoute === 'settings' ? 'settings' : '']}
                onClick={({ key }) => setActiveRoute(key)}
                style={{ background: 'transparent', borderRight: 0 }}
                items={[
                  {
                    key: 'settings',
                    icon: <SettingsIcon size={18} />,
                    label: 'Ayarlar'
                  }
                ]}
              />
            </div>
          </div>
        </Sider>

        {/* Main Content Area */}
        <Layout style={{ marginLeft: 260, background: 'transparent' }}>
          <Content
            style={{
              padding: '2rem',
              overflowY: 'auto',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {activeRoute === 'dashboard' && (
              <Dashboard
                decks={decks}
                studyHistory={config.studyHistory || []}
                quizHistory={config.quizHistory || []}
                onNavigate={setActiveRoute}
              />
            )}
            {activeRoute === 'decks' && (
              <DeckManager
                decks={decks}
                onSaveDeck={handleSaveDeck}
                onDeleteDeck={handleDeleteDeck}
                onImportDeck={handleImportDeck}
                onExportDeck={handleExportDeck}
                apiKey={config.apiKey}
              />
            )}
            {activeRoute === 'study' && (
              <StudySession
                decks={decks}
                onUpdateCard={handleUpdateCard}
                onNavigate={setActiveRoute}
                apiKey={config.apiKey}
                onLogStudySession={handleLogStudySession}
              />
            )}
            {activeRoute === 'quiz' && (
              <QuizMode decks={decks} onLogQuizSession={handleLogQuizSession} />
            )}
            {activeRoute === 'settings' && (
              <Settings
                config={config}
                onSaveConfig={handleSaveConfig}
                onResetApp={handleResetApp}
              />
            )}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
