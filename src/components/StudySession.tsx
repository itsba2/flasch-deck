import { useState } from 'react';
import { Select, Button, Card, Typography, Space, Row, Col, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Card as CardType, Deck } from '../global';
import StudyCard from './common/StudyCard';

const { Title, Text } = Typography;

interface StudySessionProps {
  decks: Deck[];
  onUpdateCard: (deckId: string, updatedCard: CardType) => void;
  onNavigate: (route: string) => void;
  apiKey: string;
  onLogStudySession?: (stats: { reviewed: number; grades: number[] }) => void;
}

interface DueCard extends CardType {
  deckId: string;
}

export default function StudySession({
  decks,
  onUpdateCard,
  onNavigate: _onNavigate,
  apiKey,
  onLogStudySession
}: StudySessionProps) {
  const [selectedDeckId, setSelectedDeckId] = useState('all');
  const [dueCards, setDueCards] = useState<DueCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [cardVisible, setCardVisible] = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [gradesList, setGradesList] = useState<number[]>([]);

  // Filter and load due cards
  const startSession = () => {
    const now = new Date();
    const cardsToReview: DueCard[] = [];
    setReviewedCount(0);
    setGradesList([]);

    if (selectedDeckId === 'all') {
      decks.forEach((deck) => {
        deck.cards.forEach((card) => {
          if (new Date(card.nextReviewDate || 0) <= now) {
            cardsToReview.push({ ...card, deckId: deck.id });
          }
        });
      });
    } else {
      const deck = decks.find((d) => d.id === selectedDeckId);
      if (deck) {
        deck.cards.forEach((card) => {
          if (new Date(card.nextReviewDate || 0) <= now) {
            cardsToReview.push({ ...card, deckId: deck.id });
          }
        });
      }
    }

    // Shuffle the cards to make learning dynamic
    cardsToReview.sort(() => Math.random() - 0.5);

    setDueCards(cardsToReview);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionActive(true);
  };

  // Spaced Repetition Grading (SM-2 implementation)
  const handleGrade = (grade: number) => {
    const card = dueCards[currentIndex];
    let { interval = 0, repetition = 0, efactor = 2.5 } = card;

    // Calculate E-factor adjustments
    // SM-2: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    efactor = efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    if (grade < 3) {
      // Again or Hard incorrect: reset repetition
      repetition = 0;
      interval = 1;
    } else {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.ceil(interval * efactor);
      }
      repetition = repetition + 1;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    const updatedCard = {
      ...card,
      interval,
      repetition,
      efactor,
      nextReviewDate: nextReviewDate.toISOString()
    };

    // Update parent state
    onUpdateCard(card.deckId, updatedCard);

    // Track reviewed cards and grades
    const nextReviewedCount = reviewedCount + 1;
    const nextGradesList = [...gradesList, grade];
    setReviewedCount(nextReviewedCount);
    setGradesList(nextGradesList);

    // Hide the card first
    setCardVisible(false);

    setTimeout(() => {
      if (currentIndex + 1 < dueCards.length) {
        // Swap card data, reset flip and helper text while invisible
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);

        // Wait a tiny bit for render batching, then reveal the new card
        setTimeout(() => {
          setCardVisible(true);
        }, 50);
      } else {
        // Session finished
        if (onLogStudySession) {
          onLogStudySession({
            reviewed: nextReviewedCount,
            grades: nextGradesList
          });
        }
        setSessionActive(false);
        setDueCards([]);
        setCardVisible(true); // reset visibility state
      }
    }, 250); // Matches the 0.25s fade transition time exactly
  };

  // Total due counts for selection lists
  const getDueCount = (deckId: string) => {
    const now = new Date();
    if (deckId === 'all') {
      let total = 0;
      decks.forEach((d) =>
        d.cards.forEach((c) => {
          if (new Date(c.nextReviewDate || 0) <= now) total++;
        })
      );
      return total;
    } else {
      const deck = decks.find((d) => d.id === deckId);
      if (!deck) return 0;
      return deck.cards.filter((c) => new Date(c.nextReviewDate || 0) <= now).length;
    }
  };

  const currentCard = dueCards[currentIndex];

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
      {/* 1. Deck Selector */}
      {!sessionActive && (
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <div style={{ marginBottom: '2rem' }}>
            <Title level={2}>Kart Çalışması (SM-2)</Title>
            <Text type="secondary">
              Aralıklı Tekrar Algoritması (Spaced Repetition) ile ezberleme seansı başlatın.
            </Text>
          </div>

          <Card bordered={true}>
            <Space direction="vertical" size="large" style={{ display: 'flex', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Text type="secondary" style={{ fontWeight: 500 }}>
                  Çalışılacak Deste Seçin
                </Text>
                <Select
                  value={selectedDeckId}
                  onChange={(val) => setSelectedDeckId(val)}
                  style={{ width: '100%' }}
                  size="large"
                >
                  <Select.Option value="all">
                    Bütün Desteler ({getDueCount('all')} kelime hazır)
                  </Select.Option>
                  {decks.map((d) => (
                    <Select.Option key={d.id} value={d.id}>
                      {d.name} ({getDueCount(d.id)} kelime hazır)
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {getDueCount(selectedDeckId) > 0 ? (
                <Button
                  type="primary"
                  size="large"
                  onClick={startSession}
                  style={{ width: '100%' }}
                >
                  Çalışmayı Başlat ({getDueCount(selectedDeckId)} Kelime)
                </Button>
              ) : (
                <Result
                  status="success"
                  title={
                    <span style={{ color: 'var(--text-primary)' }}>Çalışılacak Kart Yok!</span>
                  }
                  subTitle={
                    <Space direction="vertical" style={{ display: 'flex' }}>
                      <Text type="secondary">
                        Seçtiğiniz destede bugün gözden geçirilmesi gereken hiçbir kelime kalmadı.
                      </Text>
                      <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                        Yeni kelimeler ekleyebilir veya diğer destelerinize göz atabilirsiniz.
                      </Text>
                    </Space>
                  }
                />
              )}
            </Space>
          </Card>
        </div>
      )}

      {/* 2. Review Session Card Flip UI */}
      {sessionActive && currentCard && (
        <div style={{ maxWidth: '650px', width: '100%' }}>
          {/* Active Session Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}
          >
            <Button
              type="default"
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                if (reviewedCount > 0 && onLogStudySession) {
                  onLogStudySession({
                    reviewed: reviewedCount,
                    grades: gradesList
                  });
                }
                setSessionActive(false);
                setDueCards([]);
              }}
            >
              Seansı Bitir
            </Button>
            <Text style={{ fontWeight: 600 }} type="secondary">
              Kart: {currentIndex + 1} / {dueCards.length}
            </Text>
          </div>

          <StudyCard
            key={currentCard.id}
            card={currentCard}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
            cardVisible={cardVisible}
            apiKey={apiKey}
          />

          {/* SM-2 Spaced Repetition Buttons */}
          {isFlipped && (
            <Row gutter={[8, 8]} style={{ marginTop: '1rem', width: '100%' }}>
              <Col span={6}>
                <Button
                  style={{
                    background: 'rgba(244, 63, 94, 0.15)',
                    color: 'var(--sr-again)',
                    borderColor: 'rgba(244, 63, 94, 0.3)',
                    height: 'auto',
                    padding: '0.6rem 0.25rem'
                  }}
                  onClick={() => handleGrade(1)}
                  block
                >
                  <Space direction="vertical" size={2}>
                    <strong style={{ fontSize: '0.85rem' }}>Tekrar</strong>
                    <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Yinele</span>
                  </Space>
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--sr-hard)',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    height: 'auto',
                    padding: '0.6rem 0.25rem'
                  }}
                  onClick={() => handleGrade(2.5)}
                  block
                >
                  <Space direction="vertical" size={2}>
                    <strong style={{ fontSize: '0.85rem' }}>Zor</strong>
                    <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Hatırla</span>
                  </Space>
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: 'var(--sr-good)',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    height: 'auto',
                    padding: '0.6rem 0.25rem'
                  }}
                  onClick={() => handleGrade(4)}
                  block
                >
                  <Space direction="vertical" size={2}>
                    <strong style={{ fontSize: '0.85rem' }}>İyi</strong>
                    <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Biliyorum</span>
                  </Space>
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--sr-easy)',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    height: 'auto',
                    padding: '0.6rem 0.25rem'
                  }}
                  onClick={() => handleGrade(5)}
                  block
                >
                  <Space direction="vertical" size={2}>
                    <strong style={{ fontSize: '0.85rem' }}>Kolay</strong>
                    <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Çok Kolay</span>
                  </Space>
                </Button>
              </Col>
            </Row>
          )}
        </div>
      )}
    </div>
  );
}
