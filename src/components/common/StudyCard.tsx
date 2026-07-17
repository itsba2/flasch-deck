import React, { useState } from 'react';
import { Volume2, Sparkles, RotateCw } from 'lucide-react';
import { Button, Tag, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { explainGrammar } from '../../services/ai';
import { Card as CardType } from '../../global';
import GenderBadge from './GenderBadge';
import styles from './StudyCard.module.css';

const { Title, Text } = Typography;

interface StudyCardProps {
  card: CardType;
  isFlipped: boolean;
  onFlip: () => void;
  cardVisible?: boolean;
  apiKey: string;
}

export default function StudyCard({
  card,
  isFlipped,
  onFlip,
  cardVisible = true,
  apiKey
}: StudyCardProps) {
  const [aiExplanation, setAiExplanation] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation(); // Avoid flipping the card
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';

      // Find high quality German voice if possible
      const voices = window.speechSynthesis.getVoices();
      const deVoice = voices.find((v) => v.lang.startsWith('de'));
      if (deVoice) utterance.voice = deVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleGetAiExplanation = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't flip
    if (isAiLoading) return;
    setIsAiLoading(true);
    setAiExplanation('');
    try {
      const explanation = await explainGrammar(card, apiKey);
      setAiExplanation(explanation);
    } catch {
      setAiExplanation('Dilbilgisi açıklaması yüklenirken hata oluştu.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getBorderClass = () => {
    if (card.type !== 'noun' || !card.article) return '';
    if (card.article === 'der') return styles.derBorder;
    if (card.article === 'die') return styles.dieBorder;
    if (card.article === 'das') return styles.dasBorder;
    return '';
  };

  return (
    <div
      className={`${styles.studyCardOuter} ${isFlipped ? styles.flipped : ''} ${
        !cardVisible ? styles.hiddenCard : ''
      }`}
      onClick={onFlip}
    >
      <div className={styles.studyCardInner}>
        {/* Front Face */}
        <div className={`${styles.cardFace} ${styles.cardFront} ${getBorderClass()}`}>
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Tag color="purple">
              {card.type === 'noun'
                ? 'İsim (Nomen)'
                : card.type === 'verb'
                  ? 'Fiil (Verb)'
                  : card.type === 'adjective'
                    ? 'Sıfat (Adjektiv)'
                    : 'Diğer'}
            </Tag>
            <Button
              type="default"
              shape="circle"
              icon={<Volume2 size={16} />}
              onClick={(e) => handleSpeak(e, card.german)}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              alignItems: 'center'
            }}
          >
            {card.type === 'noun' && card.article && (
              <GenderBadge
                article={card.article}
                style={{ fontSize: '1rem', padding: '0.4rem 1rem' }}
              />
            )}
            <Title
              level={2}
              style={{
                fontSize: '3rem',
                margin: 0,
                color: 'var(--text-primary)',
                letterSpacing: '-0.5px'
              }}
            >
              {card.german}
            </Title>
            {card.type === 'noun' && card.plural && (
              <Text type="secondary" style={{ fontSize: '1.15rem' }}>
                (pl. <span style={{ fontWeight: 600 }}>{card.plural}</span>)
              </Text>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              alignItems: 'center'
            }}
          >
            <RotateCw size={14} className={styles.pulse} /> Çevirmek için kartın üzerine tıklayın
          </div>
        </div>

        {/* Back Face */}
        <div
          className={`${styles.cardFace} ${styles.cardBack} ${getBorderClass()}`}
          style={{ overflowY: 'auto' }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Tag color="cyan">Türkçe Karşılığı</Tag>
            <Button
              type="default"
              shape="circle"
              icon={<Volume2 size={16} />}
              onClick={(e) => handleSpeak(e, card.german)}
            />
          </div>

          {/* Core Translations & Grammar Specific Details */}
          <div style={{ margin: '1rem 0', width: '100%' }}>
            <h3
              style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                color: 'var(--success)',
                marginBottom: '0.5rem'
              }}
            >
              {card.turkish}
            </h3>

            {/* Verb conjugations block */}
            {card.type === 'verb' && card.conjugation && (
              <div
                style={{
                  background: 'var(--bg-trans-light)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  marginBottom: '1rem'
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    Präsens (er/sie/es)
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {card.conjugation.praesens || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Präteritum</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {card.conjugation.praeteritum || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Perfekt</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {card.conjugation.perfekt || '-'}
                  </div>
                </div>
              </div>
            )}

            {/* Adjective comparison block */}
            {card.type === 'adjective' && card.comparison && (
              <div
                style={{
                  background: 'var(--bg-trans-light)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  marginBottom: '1rem'
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Komparativ</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {card.comparison.comparative || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Superlativ</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {card.comparison.superlative || '-'}
                  </div>
                </div>
              </div>
            )}

            {/* Example sentences */}
            {card.exampleGerman && (
              <div
                style={{
                  textAlign: 'left',
                  borderTop: '1px solid var(--border-trans)',
                  paddingTop: '0.75rem',
                  fontSize: '0.9rem'
                }}
              >
                <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', margin: 0 }}>
                  "{card.exampleGerman}"
                </p>
                {card.exampleTurkish && (
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      marginTop: '0.25rem',
                      marginBottom: 0
                    }}
                  >
                    ({card.exampleTurkish})
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Gemini AI explanation trigger */}
          <div style={{ width: '100%' }}>
            {aiExplanation ? (
              <div
                style={{
                  background: 'rgba(124, 58, 237, 0.08)',
                  border: '1px solid rgba(124, 58, 237, 0.25)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.8rem',
                  lineHeight: '1.4',
                  color: 'var(--text-primary)',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--accent-hover)',
                    fontWeight: 700,
                    marginBottom: '0.35rem'
                  }}
                >
                  <Sparkles size={12} /> Dilbilgisi Karşılaştırması (Yapay Zeka)
                </div>
                {aiExplanation}
              </div>
            ) : (
              <Button
                type="default"
                style={{
                  fontSize: '0.75rem',
                  margin: '0 auto',
                  height: 'auto',
                  padding: '0.4rem 0.75rem'
                }}
                icon={
                  isAiLoading ? (
                    <LoadingOutlined />
                  ) : (
                    <Sparkles size={12} style={{ color: 'var(--accent-color)' }} />
                  )
                }
                onClick={handleGetAiExplanation}
                disabled={isAiLoading}
              >
                {isAiLoading
                  ? 'Açıklama Yükleniyor...'
                  : 'AI Gramer Açıklaması (Almanca vs Türkçe)'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
