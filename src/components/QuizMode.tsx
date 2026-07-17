import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Check, X, Timer, Award, ArrowRight } from 'lucide-react';
import { Card, Deck, QuizHistoryItem } from '../global';

interface QuizModeProps {
  decks: Deck[];
  onLogQuizSession?: (session: QuizHistoryItem) => void;
}

interface QuizHistoryDetail {
  card: Card;
  answer: string;
  isCorrect: boolean;
}

interface QuizStats {
  correct: number;
  incorrect: number;
  totalTime: number;
  history: QuizHistoryDetail[];
}

export default function QuizMode({ decks, onLogQuizSession }: QuizModeProps) {
  const [selectedDeckId, setSelectedDeckId] = useState('all');
  const [quizType, setQuizType] = useState<'spelling' | 'articles' | 'mixed'>('spelling');
  const [quizActive, setQuizActive] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  // Quiz cards state
  const [quizCards, setQuizCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(''); // for article quiz
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stats state
  const [stats, setStats] = useState<QuizStats>({
    correct: 0,
    incorrect: 0,
    totalTime: 0,
    history: []
  });

  const getQuizCardsCount = (deckId: string, type: 'spelling' | 'articles' | 'mixed') => {
    let cards: Card[] = [];
    if (deckId === 'all') {
      decks.forEach((d) => cards.push(...d.cards));
    } else {
      const deck = decks.find((d) => d.id === deckId);
      if (deck) cards = deck.cards;
    }

    if (type === 'articles') {
      return cards.filter((c) => c.type === 'noun').length;
    }
    return cards.length;
  };

  // Start the Quiz
  const startQuiz = () => {
    let cards: Card[] = [];
    if (selectedDeckId === 'all') {
      decks.forEach((d) => cards.push(...d.cards));
    } else {
      const deck = decks.find((d) => d.id === selectedDeckId);
      if (deck) cards = [...deck.cards];
    }

    // Filter for articles mode
    if (quizType === 'articles') {
      cards = cards.filter((c) => c.type === 'noun');
    }

    if (cards.length === 0) {
      alert('Seçilen kategoride kelime bulunamadı!');
      return;
    }

    // Shuffle and pick max 10 cards for a quick quiz session
    cards.sort(() => Math.random() - 0.5);
    const selectedCards = cards.slice(0, 10); // 10 cards per quiz

    setQuizCards(selectedCards);
    setCurrentIndex(0);
    setUserAnswer('');
    setSelectedArticle('');
    setChecked(false);
    setQuizActive(true);
    setQuizFinished(false);
    setTimeLeft(15);
    setStats({
      correct: 0,
      incorrect: 0,
      totalTime: 0,
      history: []
    });
  };

  // Timer countdown hook
  useEffect(() => {
    if (quizActive && !checked && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        setStats((prev) => ({ ...prev, totalTime: prev.totalTime + 1 }));
      }, 1000);
    } else if (timeLeft === 0 && !checked) {
      handleVerify(true); // timeout verification
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [quizActive, checked, timeLeft]);

  // Handle Verify/Answer Submission
  const handleVerify = (isTimeout = false) => {
    if (checked) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setChecked(true);

    const card = quizCards[currentIndex];
    let correct = false;

    if (quizType === 'articles') {
      correct = selectedArticle.toLowerCase() === (card.article || '').toLowerCase();
    } else if (quizType === 'spelling') {
      correct = userAnswer.trim().toLowerCase() === card.german.toLowerCase();
    } else {
      // mixed
      if (card.type === 'noun') {
        const fullAnswer = `${selectedArticle.trim()} ${userAnswer.trim()}`.toLowerCase();
        const fullCorrect = `${card.article || ''} ${card.german}`.toLowerCase();
        correct = fullAnswer === fullCorrect;
      } else {
        correct = userAnswer.trim().toLowerCase() === card.german.toLowerCase();
      }
    }

    if (isTimeout) {
      correct = false;
    }

    setIsCorrect(correct);
    setStats((prev) => ({
      ...prev,
      correct: correct ? prev.correct + 1 : prev.correct,
      incorrect: !correct ? prev.incorrect + 1 : prev.incorrect,
      history: [
        ...prev.history,
        {
          card,
          answer:
            quizType === 'articles'
              ? selectedArticle
              : quizType === 'mixed' && card.type === 'noun'
                ? `${selectedArticle} ${userAnswer}`
                : userAnswer,
          isCorrect: correct
        }
      ]
    }));
  };

  // Next Card / Finish Quiz
  const handleNext = () => {
    if (currentIndex + 1 < quizCards.length) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setSelectedArticle('');
      setChecked(false);
      setTimeLeft(15);
    } else {
      setQuizActive(false);
      setQuizFinished(true);
      if (onLogQuizSession) {
        onLogQuizSession({
          date: new Date().toISOString(),
          deckId: selectedDeckId,
          deckName:
            selectedDeckId === 'all'
              ? 'Bütün Desteler'
              : decks.find((d) => d.id === selectedDeckId)?.name || 'Bilinmeyen Deste',
          type: quizType,
          correct: stats.correct,
          total: quizCards.length,
          timeSpent: stats.totalTime
        });
      }
    }
  };

  // Render character difference helper
  const renderDiff = (input: string, target: string) => {
    const inputSpans = [];
    const targetSpans = [];
    const maxLen = Math.max(input.length, target.length);

    for (let i = 0; i < maxLen; i++) {
      const inputChar = input[i] || '';
      const targetChar = target[i] || '';

      if (inputChar.toLowerCase() === targetChar.toLowerCase()) {
        inputSpans.push(
          <span key={`in-${i}`} style={{ color: 'var(--text-secondary)' }}>
            {inputChar || ' '}
          </span>
        );
        targetSpans.push(
          <span key={`tar-${i}`} style={{ color: 'var(--text-primary)' }}>
            {targetChar || ' '}
          </span>
        );
      } else {
        inputSpans.push(
          <span
            key={`in-${i}`}
            style={{
              color: '#fff',
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
              borderRadius: '4px',
              padding: '0 2px',
              borderBottom: '2.5px solid var(--danger)',
              textDecoration: 'line-through',
              opacity: inputChar ? 1 : 0.4
            }}
          >
            {inputChar || '_'}
          </span>
        );
        targetSpans.push(
          <span
            key={`tar-${i}`}
            style={{
              color: '#fff',
              backgroundColor: 'rgba(16, 185, 129, 0.25)',
              borderRadius: '4px',
              padding: '0 2px',
              borderBottom: '2.5px solid var(--success)',
              fontWeight: 800
            }}
          >
            {targetChar || '_'}
          </span>
        );
      }
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginTop: '0.75rem',
          background: 'rgba(9, 11, 17, 0.4)',
          padding: '0.85rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)', width: '120px', textAlign: 'right' }}>
            Sizin Cevabınız:
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              letterSpacing: '3px',
              fontSize: '1.2rem',
              fontWeight: 600
            }}
          >
            {inputSpans}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)', width: '120px', textAlign: 'right' }}>
            Doğru Çekim:
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              letterSpacing: '3px',
              fontSize: '1.2rem',
              fontWeight: 700
            }}
          >
            {targetSpans}
          </span>
        </div>
      </div>
    );
  };

  const currentCard = quizCards[currentIndex];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        height: '100%',
        alignItems: 'center'
      }}
    >
      {/* 1. Setup screen */}
      {!quizActive && !quizFinished && (
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 className="page-title">Hızlı Quiz Arenası</h1>
            <p className="page-subtitle">Seçtiğiniz destelerle yazım ve artikel bilginizi ölçün.</p>
          </div>

          <div
            className="glass-card"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <div className="form-group">
              <label className="form-label">Deste Seçimi</label>
              <select
                className="form-select"
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
              >
                <option value="all">
                  Bütün Desteler ({getQuizCardsCount('all', quizType)} kelime)
                </option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({getQuizCardsCount(d.id, quizType)} kelime)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Test Türü</label>
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}
              >
                <button
                  type="button"
                  className={`btn ${quizType === 'spelling' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setQuizType('spelling')}
                >
                  Yazım Denetimi
                </button>
                <button
                  type="button"
                  className={`btn ${quizType === 'articles' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setQuizType('articles')}
                >
                  Artikel (der/die/das)
                </button>
                <button
                  type="button"
                  className={`btn ${quizType === 'mixed' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setQuizType('mixed')}
                >
                  Karma Test
                </button>
              </div>
            </div>

            {getQuizCardsCount(selectedDeckId, quizType) > 0 ? (
              <button
                className="btn btn-primary"
                style={{ padding: '1rem', gap: '0.5rem' }}
                onClick={startQuiz}
              >
                <Play size={18} /> Quizi Başlat (10 Soru)
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Bu deste ve test türünde soru bulunamadı. Lütfen kelime türlerini (örneğin isimler)
                veya desteyi değiştirin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Active Quiz Screen */}
      {quizActive && currentCard && (
        <div style={{ maxWidth: '600px', width: '100%' }}>
          {/* Header Stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}
          >
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Soru: {currentIndex + 1} / {quizCards.length}
            </span>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: timeLeft <= 5 ? 'var(--danger)' : 'var(--warning)',
                fontWeight: 700
              }}
            >
              <Timer size={16} className={timeLeft <= 5 ? 'pulse' : ''} />
              <span>{timeLeft} sn</span>
            </div>
          </div>

          {/* Quiz Play Card */}
          <div
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem',
              padding: '2.5rem',
              minHeight: '340px',
              justifyContent: 'space-between'
            }}
          >
            {/* Question Definition */}
            <div style={{ textAlign: 'center' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.5px'
                }}
              >
                Kelimenin Türkçe Anlamı
              </span>
              <h2
                style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}
              >
                {currentCard.turkish}
              </h2>
              {currentCard.type === 'noun' && quizType !== 'articles' && (
                <p
                  style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}
                >
                  (İsim - Lütfen artikeli {quizType === 'mixed' ? 'dahil ederek' : 'olmadan'} yazın)
                </p>
              )}
            </div>

            {/* Answer Input Block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Articles Input */}
              {quizType === 'articles' && (
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}
                >
                  {['der', 'die', 'das'].map((art) => (
                    <button
                      key={art}
                      type="button"
                      className="btn"
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background:
                          selectedArticle === art
                            ? `var(--${art}-color)`
                            : 'rgba(255,255,255,0.03)',
                        color: selectedArticle === art ? '#000' : `var(--${art}-color)`,
                        borderColor: `var(--${art}-color)`,
                        borderWidth: '1.5px',
                        opacity: checked && selectedArticle !== art ? 0.4 : 1
                      }}
                      onClick={() => !checked && setSelectedArticle(art)}
                      disabled={checked}
                    >
                      {art}
                    </button>
                  ))}
                </div>
              )}

              {/* Mixed Mode Noun Article Chooser */}
              {quizType === 'mixed' && currentCard.type === 'noun' && !checked && (
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'center',
                    marginBottom: '0.25rem'
                  }}
                >
                  {['der', 'die', 'das'].map((art) => (
                    <button
                      key={art}
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.4rem 1rem',
                        fontSize: '0.85rem',
                        background:
                          selectedArticle === art ? `var(--${art}-color)` : 'rgba(9, 11, 17, 0.6)',
                        color: selectedArticle === art ? '#000' : `var(--${art}-color)`,
                        borderColor: `var(--${art}-color)`
                      }}
                      onClick={() => setSelectedArticle(art)}
                    >
                      {art}
                    </button>
                  ))}
                </div>
              )}

              {/* Text input for Spelling and Mixed */}
              {quizType !== 'articles' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {checked && currentCard.type === 'noun' && quizType === 'mixed' && (
                    <span
                      className={`badge-gender badge-${currentCard.article || 'der'}`}
                      style={{
                        display: 'inline-flex',
                        alignSelf: 'center',
                        fontSize: '1rem',
                        padding: '0.6rem 1rem'
                      }}
                    >
                      {currentCard.article}
                    </span>
                  )}
                  <input
                    className="form-input"
                    style={{
                      flexGrow: 1,
                      textAlign: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      letterSpacing: '0.5px'
                    }}
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Almanca kelimeyi buraya yazın..."
                    disabled={checked}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && userAnswer.trim()) {
                        if (checked) {
                          handleNext();
                        } else {
                          handleVerify();
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Verification Result Feedback */}
            {checked && (
              <div
                className="glass-card"
                style={{
                  background: isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                  borderColor: isCorrect ? 'var(--success)' : 'var(--danger)',
                  padding: '1.25rem',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: isCorrect ? 'var(--success)' : 'var(--danger)'
                  }}
                >
                  {isCorrect ? (
                    <>
                      <Check size={20} /> Doğru!
                    </>
                  ) : (
                    <>
                      <X size={20} /> Hatalı!
                    </>
                  )}
                </div>

                {!isCorrect && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Doğru Cevap:
                    </div>
                    {quizType === 'articles' ? (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '1.5rem',
                          fontWeight: 800,
                          marginTop: '0.25rem'
                        }}
                      >
                        <span
                          style={{
                            color: `var(--${currentCard.article || 'der'}-color)`,
                            textTransform: 'uppercase'
                          }}
                        >
                          {currentCard.article}
                        </span>
                        <span style={{ color: '#fff' }}>{currentCard.german}</span>
                      </div>
                    ) : (
                      <div>
                        {renderDiff(
                          currentCard.type === 'noun' && quizType === 'mixed'
                            ? `${selectedArticle || ''} ${userAnswer}`.trim()
                            : userAnswer,
                          currentCard.type === 'noun' && quizType === 'mixed'
                            ? `${currentCard.article || ''} ${currentCard.german}`
                            : currentCard.german
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div>
              {!checked ? (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.9rem' }}
                  onClick={() => handleVerify()}
                  disabled={quizType === 'articles' ? !selectedArticle : !userAnswer.trim()}
                >
                  Kontrol Et
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    gap: '0.5rem',
                    background: 'var(--success)'
                  }}
                  onClick={handleNext}
                >
                  Sıradaki Kelime <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Quiz Finished / Scorecard Screen */}
      {quizFinished && (
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <div
            className="glass-card"
            style={{
              textAlign: 'center',
              padding: '3rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  background: 'rgba(124, 58, 237, 0.15)',
                  color: 'var(--accent-color)',
                  padding: '1.25rem',
                  borderRadius: '50%'
                }}
              >
                <Award size={48} />
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>Quiz Tamamlandı!</h2>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  marginTop: '0.25rem'
                }}
              >
                Performans istatistikleriniz aşağıda listelenmiştir.
              </p>
            </div>

            {/* Score Stats Ring or Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '1rem',
                background: 'rgba(9, 11, 17, 0.4)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1.5rem 1rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Doğru</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
                  {stats.correct}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Yanlış / Boş</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)' }}>
                  {stats.incorrect}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Başarı</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
                  {Math.round((stats.correct / (stats.correct + stats.incorrect || 1)) * 100)}%
                </div>
              </div>
            </div>

            {/* Incorrect answers review */}
            {stats.incorrect > 0 && (
              <div style={{ textAlign: 'left', marginTop: '1rem' }}>
                <h4
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                    fontWeight: 700
                  }}
                >
                  Hatalı Yapılan Kelimeler:
                </h4>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    maxHeight: '150px',
                    overflowY: 'auto'
                  }}
                >
                  {stats.history
                    .filter((h) => !h.isCorrect)
                    .map((h, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: '0.85rem',
                          background: 'rgba(239, 68, 68, 0.05)',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <span>
                          <strong style={{ color: '#fff' }}>{h.card.german}</strong> (
                          {h.card.turkish})
                        </span>
                        <span style={{ color: 'var(--danger)' }}>
                          Cevabınız: {h.answer || '(Süre bitti)'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flexGrow: 1 }}
                onClick={() => setQuizFinished(false)}
              >
                Arenaya Dön
              </button>
              <button
                className="btn btn-primary"
                style={{ flexGrow: 1, gap: '0.4rem' }}
                onClick={startQuiz}
              >
                <RotateCcw size={16} /> Yeniden Dene
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
