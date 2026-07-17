import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Trophy,
  Settings as SettingsIcon
} from 'lucide-react';
import { ConfigProvider, theme } from 'antd';
import Dashboard from './components/Dashboard';
import DeckManager from './components/DeckManager';
import StudySession from './components/StudySession';
import QuizMode from './components/QuizMode';
import Settings from './components/Settings';
import { Card, Deck, AppConfig, StudyHistoryItem, QuizHistoryItem } from './global';

export default function App() {
  const [activeRoute, setActiveRoute] = useState<string>('dashboard');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [config, setConfig] = useState<AppConfig>({ apiKey: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Load Decks & Configurations on startup
  useEffect(() => {
    async function loadData() {
      try {
        if (window.electronAPI) {
          const loadedDecks = await window.electronAPI.getDecks();
          const loadedConfig = await window.electronAPI.getConfig();
          setDecks(loadedDecks || []);
          setConfig(loadedConfig || { apiKey: '', studyHistory: [], quizHistory: [] });
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
          alert(`"${result.deck.name}" başarıyla içe aktarıldı!`);
        } else if (result.error) {
          alert(result.error);
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
          alert('Deste başarıyla dışarı aktarıldı!');
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
          background: 'var(--bg-main)',
          color: '#fff'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem', fontWeight: 650 }}>Veriler Yükleniyor...</h2>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--accent-light)',
              borderTopColor: 'var(--accent-color)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}
          />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#7c3aed',
          colorBgContainer: '#151b2e',
          colorBgElevated: '#0f131f',
          colorBorder: '#263152',
          colorBgLayout: '#090b11',
          colorTextBase: '#f1f5f9'
        }
      }}
    >
      <div className="app-container">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div>
            <div className="logo-container">
              <GraduationCap className="logo-icon" size={28} />
              <span className="logo-text">FlaschDeck</span>
            </div>

            <nav className="nav-links">
              <div
                className={`nav-item ${activeRoute === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveRoute('dashboard')}
              >
                <LayoutDashboard className="nav-item-icon" />
                <span>Kontrol Paneli</span>
              </div>

              <div
                className={`nav-item ${activeRoute === 'decks' ? 'active' : ''}`}
                onClick={() => setActiveRoute('decks')}
              >
                <BookOpen className="nav-item-icon" />
                <span>Destelerim</span>
              </div>

              <div
                className={`nav-item ${activeRoute === 'study' ? 'active' : ''}`}
                onClick={() => setActiveRoute('study')}
              >
                <GraduationCap className="nav-item-icon" />
                <span>Kart Çalışması</span>
              </div>

              <div
                className={`nav-item ${activeRoute === 'quiz' ? 'active' : ''}`}
                onClick={() => setActiveRoute('quiz')}
              >
                <Trophy className="nav-item-icon" />
                <span>Quiz Arenası</span>
              </div>
            </nav>
          </div>

          <div className="sidebar-footer">
            <div
              className={`nav-item ${activeRoute === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveRoute('settings')}
            >
              <SettingsIcon className="nav-item-icon" />
              <span>Ayarlar</span>
            </div>
          </div>
        </aside>

        {/* Main Content Router */}
        <main className="main-content">
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
              apiKey={config.apiKey}
              onSaveConfig={handleSaveConfig}
              onResetApp={handleResetApp}
            />
          )}
        </main>
      </div>
    </ConfigProvider>
  );
}
