import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Check, X, Timer } from 'lucide-react';
import {
  Select,
  Segmented,
  Button,
  Card,
  Typography,
  Space,
  Input,
  Row,
  Col,
  Statistic,
  Result
} from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Card as CardType, Deck, QuizHistoryItem } from '../global';
import GenderBadge from './common/GenderBadge';

const { Title, Text } = Typography;

interface QuizModeProps {
  decks: Deck[];
  onLogQuizSession?: (session: QuizHistoryItem) => void;
}

interface QuizHistoryDetail {
  card: CardType;
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
  const [quizCards, setQuizCards] = useState<CardType[]>([]);
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
    let cards: CardType[] = [];
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
    let cards: CardType[] = [];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          background: 'var(--bg-transparent)',
          padding: '0.85rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
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
        alignItems: 'center',
        width: '100%'
      }}
    >
      {/* 1. Setup screen */}
      {!quizActive && !quizFinished && (
        <div style={{ maxWidth: '43rem', width: '100%' }}>
          <div style={{ marginBottom: '2rem' }}>
            <Title level={2}>Hızlı Quiz</Title>
            <Text type="secondary">Seçtiğiniz destelerle yazım ve artikel bilginizi ölçün.</Text>
          </div>

          <Card bordered={true}>
            <Space direction="vertical" size="large" style={{ display: 'flex', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Text type="secondary" style={{ fontWeight: 500 }}>
                  Deste Seçimi
                </Text>
                <Select
                  value={selectedDeckId}
                  onChange={(val) => setSelectedDeckId(val)}
                  style={{ width: '100%' }}
                  size="large"
                >
                  <Select.Option value="all">
                    Bütün Desteler ({getQuizCardsCount('all', quizType)} kelime)
                  </Select.Option>
                  {decks.map((d) => (
                    <Select.Option key={d.id} value={d.id}>
                      {d.name} ({getQuizCardsCount(d.id, quizType)} kelime)
                    </Select.Option>
                  ))}
                </Select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Text type="secondary" style={{ fontWeight: 500 }}>
                  Test Türü
                </Text>
                <Segmented
                  options={[
                    { label: 'Yazım Denetimi', value: 'spelling' },
                    { label: 'Artikel (der/die/das)', value: 'articles' },
                    { label: 'Karma Test', value: 'mixed' }
                  ]}
                  value={quizType}
                  onChange={(val) => setQuizType(val as any)}
                  block
                  size="large"
                />
              </div>

              {getQuizCardsCount(selectedDeckId, quizType) > 0 ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<Play size={18} />}
                  onClick={startQuiz}
                  style={{ width: '100%' }}
                >
                  Quizi Başlat (10 Soru)
                </Button>
              ) : (
                <div
                  style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}
                >
                  Bu deste ve test türünde soru bulunamadı. Lütfen kelime türlerini (örneğin
                  isimler) veya desteyi değiştirin.
                </div>
              )}
            </Space>
          </Card>
        </div>
      )}

      {/* 2. Active Quiz Screen */}
      {quizActive && currentCard && (
        <div style={{ maxWidth: '43rem', width: '100%' }}>
          {/* Header Stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}
          >
            <Text style={{ fontWeight: 600 }} type="secondary">
              Soru: {currentIndex + 1} / {quizCards.length}
            </Text>

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
          <Card
            bordered={true}
            styles={{
              body: {
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                padding: '2.5rem',
                minHeight: '340px',
                justifyContent: 'space-between'
              }
            }}
          >
            {/* Question Definition */}
            <div style={{ textAlign: 'center' }}>
              <Title
                level={2}
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  margin: '0.5rem 0 0 0'
                }}
              >
                {quizType === 'articles' ? currentCard.german : currentCard.turkish}
              </Title>
              {currentCard.type === 'noun' && quizType !== 'articles' && (
                <Text
                  type="secondary"
                  style={{ fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}
                >
                  (İsim - Lütfen artikeli {quizType === 'mixed' ? 'dahil ederek' : 'olmadan'} yazın)
                </Text>
              )}
              {quizType === 'articles' && (
                <Text
                  type="secondary"
                  style={{ fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}
                >
                  {currentCard.turkish}
                </Text>
              )}
            </div>

            {/* Answer Input Block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Articles Input */}
              {quizType === 'articles' && (
                <Segmented
                  options={[
                    { label: 'DER', value: 'der' },
                    { label: 'DİE', value: 'die' },
                    { label: 'DAS', value: 'das' }
                  ]}
                  value={selectedArticle}
                  onChange={(val) => !checked && setSelectedArticle(val as string)}
                  disabled={checked}
                  block
                  size="large"
                />
              )}

              {/* Mixed Mode Noun Article Chooser */}
              {quizType === 'mixed' && currentCard.type === 'noun' && !checked && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    alignItems: 'center',
                    marginBottom: '0.25rem'
                  }}
                >
                  <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                    Artikel Seçin:
                  </Text>
                  <Segmented
                    options={[
                      { label: 'DER', value: 'der' },
                      { label: 'DİE', value: 'die' },
                      { label: 'DAS', value: 'das' }
                    ]}
                    value={selectedArticle}
                    onChange={(val) => setSelectedArticle(val as string)}
                  />
                </div>
              )}

              {/* Text input for Spelling and Mixed */}
              {quizType !== 'articles' && (
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  {checked &&
                    currentCard.type === 'noun' &&
                    quizType === 'mixed' &&
                    currentCard.article && (
                      <GenderBadge
                        article={currentCard.article}
                        style={{
                          display: 'inline-flex',
                          alignSelf: 'center',
                          fontSize: '1rem',
                          padding: '0.6rem 1rem'
                        }}
                      />
                    )}
                  <Input
                    size="large"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={checked}
                    autoFocus
                    style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (checked) {
                          handleNext();
                        } else if (userAnswer.trim()) {
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
              <Card
                bordered={true}
                style={{
                  background: isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                  borderColor: isCorrect ? 'var(--success)' : 'var(--danger)',
                  padding: '1rem',
                  textAlign: 'center'
                }}
              >
                <Space
                  size="small"
                  style={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: isCorrect ? 'var(--success)' : 'var(--danger)'
                  }}
                >
                  {isCorrect ? <Check size={20} /> : <X size={20} />}
                  <span>{isCorrect ? 'Doğru!' : 'Hatalı!'}</span>
                </Space>

                {!isCorrect && (
                  <div style={{ marginTop: '0.5rem' }}>
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
                        <span style={{ color: 'var(--text-primary)' }}>{currentCard.german}</span>
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
              </Card>
            )}

            {/* Bottom Actions */}
            <div>
              {!checked ? (
                <Button
                  type="primary"
                  size="large"
                  onClick={() => handleVerify()}
                  disabled={quizType === 'articles' ? !selectedArticle : !userAnswer.trim()}
                  block
                >
                  Kontrol Et
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowRightOutlined />}
                  style={{ background: 'var(--success)' }}
                  onClick={handleNext}
                  block
                >
                  Sıradaki Kelime
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 3. Quiz Finished / Scorecard Screen */}
      {quizFinished && (
        <div style={{ maxWidth: '43rem', width: '100%' }}>
          <Card bordered={true}>
            <Result
              status="success"
              title={
                <span style={{ color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 800 }}>
                  Quiz Tamamlandı!
                </span>
              }
              subTitle={
                <Text type="secondary">Performans istatistikleriniz aşağıda listelenmiştir.</Text>
              }
              extra={[
                <Row
                  gutter={[16, 16]}
                  key="stats"
                  style={{
                    background: 'var(--bg-transparent)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '1.5rem 1rem',
                    width: '100%',
                    maxWidth: '35.5rem',
                    margin: '0 auto 1.5rem auto'
                  }}
                >
                  <Col span={8}>
                    <Statistic
                      title={<span style={{ color: 'var(--text-secondary)' }}>Doğru</span>}
                      value={stats.correct}
                      valueStyle={{ color: 'var(--success)', fontWeight: 800 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<span style={{ color: 'var(--text-secondary)' }}>Yanlış / Boş</span>}
                      value={stats.incorrect}
                      valueStyle={{ color: 'var(--danger)', fontWeight: 800 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<span style={{ color: 'var(--text-secondary)' }}>Başarı</span>}
                      value={`${Math.round((stats.correct / (stats.correct + stats.incorrect || 1)) * 100)}%`}
                      valueStyle={{ color: 'var(--text-primary)', fontWeight: 800 }}
                    />
                  </Col>
                </Row>,

                /* Incorrect answers review */
                stats.incorrect > 0 && (
                  <div
                    style={{
                      textAlign: 'left',
                      marginTop: '1rem',
                      width: '100%',
                      maxWidth: '35.5rem',
                      margin: '0 auto 1.5rem auto'
                    }}
                    key="errors"
                  >
                    <Text
                      strong
                      type="secondary"
                      style={{ display: 'block', marginBottom: '0.5rem' }}
                    >
                      Hatalı Yapılan Kelimeler:
                    </Text>
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
                              padding: '0.5rem 1rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(239, 68, 68, 0.15)',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}
                          >
                            <Text>
                              <strong style={{ color: 'var(--text-primary)' }}>
                                {h.card.german}
                              </strong>{' '}
                              ({h.card.turkish})
                            </Text>
                            <Text type="danger">Cevabınız: {h.answer || '(Süre bitti)'}</Text>
                          </div>
                        ))}
                    </div>
                  </div>
                ),

                <Space key="buttons" size="middle" style={{ marginTop: '1rem' }}>
                  <Button size="large" onClick={() => setQuizFinished(false)}>
                    Arenaya Dön
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<RotateCcw size={16} />}
                    onClick={startQuiz}
                  >
                    Yeniden Dene
                  </Button>
                </Space>
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
