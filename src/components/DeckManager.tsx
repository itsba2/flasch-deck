import React, { useState, useEffect } from 'react';
import { Table, Drawer, Button, Tooltip, Progress, Checkbox, Switch, message } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  ExportOutlined,
  ImportOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import { autofillCard, generateDeckCardsChunk } from '../services/ai';
import { Card, Deck } from '../global';

interface DeckManagerProps {
  decks: Deck[];
  onSaveDeck: (deck: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  onImportDeck: () => void;
  onExportDeck: (deck: Deck) => void;
  apiKey: string;
}

export default function DeckManager({
  decks,
  onSaveDeck,
  onDeleteDeck,
  onImportDeck,
  onExportDeck,
  apiKey
}: DeckManagerProps) {
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [showDeckForm, setShowDeckForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);

  // Deck form state
  const [deckName, setDeckName] = useState('');
  const [deckDesc, setDeckDesc] = useState('');

  // Card form state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardType, setCardType] = useState<'noun' | 'verb' | 'adjective' | 'other'>('noun');
  const [german, setGerman] = useState('');
  const [turkish, setTurkish] = useState('');
  const [article, setArticle] = useState<'der' | 'die' | 'das'>('der');
  const [plural, setPlural] = useState('');
  const [praesens, setPraesens] = useState('');
  const [praeteritum, setPraeteritum] = useState('');
  const [perfektAux, setPerfektAux] = useState<'hat' | 'ist'>('hat');
  const [perfektParticiple, setPerfektParticiple] = useState('');
  const [comparative, setComparative] = useState('');
  const [superlative, setSuperlative] = useState('');
  const [exampleGerman, setExampleGerman] = useState('');
  const [exampleTurkish, setExampleTurkish] = useState('');

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // AI Deck Generation state
  const [isAiDeck, setIsAiDeck] = useState(false);
  const [aiCardCount, setAiCardCount] = useState<number>(15);
  const [aiWordTypes, setAiWordTypes] = useState<{
    noun: boolean;
    verb: boolean;
    adjective: boolean;
    other: boolean;
  }>({
    noun: true,
    verb: true,
    adjective: true,
    other: true
  });
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState('');

  const [selectedCardForPreview, setSelectedCardForPreview] = useState<Card | null>(null);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCardForPreview(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle deck creation/edit
  const handleSaveDeckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckName.trim()) return;

    if (isAiDeck && !selectedDeck) {
      const selectedTypes = Object.keys(aiWordTypes).filter(
        (type) => aiWordTypes[type as keyof typeof aiWordTypes]
      );
      if (selectedTypes.length === 0) {
        setGenerationError('Lütfen en az bir kelime türü seçin.');
        return;
      }
      if (!apiKey) {
        setGenerationError('Lütfen önce Ayarlar sekmesinden Gemini API anahtarı ekleyin.');
        return;
      }

      setIsGeneratingDeck(true);
      setGenerationProgress(0);
      setGenerationError('');

      const totalCards = aiCardCount;
      const chunkSize = 5;
      const totalChunks = Math.ceil(totalCards / chunkSize);
      let generatedCards: Card[] = [];
      let excludedWords: string[] = [];
      let occurredError = false;

      for (let i = 0; i < totalChunks; i++) {
        const countForThisChunk = Math.min(chunkSize, totalCards - generatedCards.length);
        if (countForThisChunk <= 0) break;

        try {
          const chunkCards = await generateDeckCardsChunk(
            deckName,
            deckDesc,
            selectedTypes,
            countForThisChunk,
            excludedWords,
            apiKey
          );

          if (Array.isArray(chunkCards)) {
            const formattedChunk: Card[] = chunkCards.map((card: any, index: number) => {
              const cardId = `card-${Date.now()}-${i}-${index}`;
              if (card.german) {
                excludedWords.push(card.german);
              }

              const formatted: Card = {
                id: cardId,
                type: card.type || 'other',
                german: card.german || '',
                turkish: card.turkish || '',
                exampleGerman: card.exampleGerman || '',
                exampleTurkish: card.exampleTurkish || '',
                interval: 0,
                repetition: 0,
                efactor: 2.5,
                nextReviewDate: new Date().toISOString()
              };

              if (card.type === 'noun') {
                formatted.article = card.article || 'der';
                formatted.plural = card.plural || '';
              } else if (card.type === 'verb') {
                formatted.conjugation = {
                  praesens: card.conjugation?.praesens || '',
                  praeteritum: card.conjugation?.praeteritum || '',
                  perfekt: card.conjugation?.perfekt || ''
                };
              } else if (card.type === 'adjective') {
                formatted.comparison = {
                  comparative: card.comparison?.comparative || '',
                  superlative: card.comparison?.superlative || ''
                };
              }

              return formatted;
            });

            generatedCards = [...generatedCards, ...formattedChunk];
          }
        } catch (error) {
          console.error(`Chunk ${i + 1} generation failed:`, error);
          occurredError = true;
          break;
        }

        setGenerationProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      setIsGeneratingDeck(false);

      if (generatedCards.length === 0) {
        setGenerationError(
          'Yapay zeka ile kart oluşturulamadı. Lütfen API anahtarınızı veya internet bağlantınızı kontrol edin.'
        );
        return;
      }

      const newDeck: Deck = {
        id: 'deck-' + Date.now(),
        name: deckName,
        description: deckDesc,
        cards: generatedCards
      };

      onSaveDeck(newDeck);

      if (occurredError) {
        message.warning(
          `Deste kısmen oluşturuldu. Bazı teknik/limit hataları nedeniyle sadece ${generatedCards.length} kelime oluşturulabildi.`
        );
      } else {
        message.success(
          `"${deckName}" destesi ${generatedCards.length} kelime kartı ile yapay zeka tarafından başarıyla oluşturuldu!`
        );
      }

      setShowDeckForm(false);
      setDeckName('');
      setDeckDesc('');
      setIsAiDeck(false);
    } else {
      const newDeck: Deck = {
        id: selectedDeck ? selectedDeck.id : 'deck-' + Date.now(),
        name: deckName,
        description: deckDesc,
        cards: selectedDeck ? selectedDeck.cards : []
      };

      onSaveDeck(newDeck);
      setShowDeckForm(false);
      setDeckName('');
      setDeckDesc('');
      if (selectedDeck) {
        setSelectedDeck(newDeck);
      }
    }
  };

  // Trigger AI Autofill
  const handleAiAutofill = async () => {
    if (!german.trim()) {
      setAiError('Lütfen önce Almanca kelimeyi yazın.');
      return;
    }
    if (!apiKey) {
      setAiError('Lütfen önce Ayarlar sekmesinden Gemini API anahtarı ekleyin.');
      return;
    }

    setIsAiLoading(true);
    setAiError('');
    try {
      const data = await autofillCard(german.trim(), cardType, apiKey);
      if (data.turkish) setTurkish(data.turkish);
      if (data.exampleGerman) setExampleGerman(data.exampleGerman);
      if (data.exampleTurkish) setExampleTurkish(data.exampleTurkish);

      if (cardType === 'noun') {
        if (data.article) setArticle(data.article.toLowerCase() as 'der' | 'die' | 'das');
        if (data.plural) setPlural(data.plural);
      } else if (cardType === 'verb') {
        if (data.praesens) setPraesens(data.praesens);
        if (data.praeteritum) setPraeteritum(data.praeteritum);
        if (data.perfekt) {
          const perf = data.perfekt.trim();
          if (perf.startsWith('ist ')) {
            setPerfektAux('ist');
            setPerfektParticiple(perf.substring(4));
          } else if (perf.startsWith('hat ')) {
            setPerfektAux('hat');
            setPerfektParticiple(perf.substring(4));
          } else {
            setPerfektAux('hat');
            setPerfektParticiple(perf);
          }
        }
      } else if (cardType === 'adjective') {
        if (data.comparative) setComparative(data.comparative);
        if (data.superlative) setSuperlative(data.superlative);
      }
    } catch (error) {
      console.error(error);
      setAiError('Otomatik doldurma başarısız oldu. API anahtarınızı veya kelimeyi kontrol edin.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Open card form for adding
  const openAddCard = () => {
    setEditingCardId(null);
    setCardType('noun');
    setGerman('');
    setTurkish('');
    setArticle('der');
    setPlural('');
    setPraesens('');
    setPraeteritum('');
    setPerfektAux('hat');
    setPerfektParticiple('');
    setComparative('');
    setSuperlative('');
    setExampleGerman('');
    setExampleTurkish('');
    setAiError('');
    setShowCardForm(true);
  };

  // Open card form for editing
  const openEditCard = (card: Card) => {
    setEditingCardId(card.id);
    setCardType(card.type || 'noun');
    setGerman(card.german || '');
    setTurkish(card.turkish || '');
    setArticle((card.article || 'der') as 'der' | 'die' | 'das');
    setPlural(card.plural || '');

    if (card.conjugation) {
      setPraesens(card.conjugation.praesens || '');
      setPraeteritum(card.conjugation.praeteritum || '');
      const perf = card.conjugation.perfekt || '';
      if (perf.startsWith('ist ')) {
        setPerfektAux('ist');
        setPerfektParticiple(perf.substring(4));
      } else if (perf.startsWith('hat ')) {
        setPerfektAux('hat');
        setPerfektParticiple(perf.substring(4));
      } else {
        setPerfektAux('hat');
        setPerfektParticiple(perf);
      }
    } else {
      setPraesens('');
      setPraeteritum('');
      setPerfektAux('hat');
      setPerfektParticiple('');
    }

    if (card.comparison) {
      setComparative(card.comparison.comparative || '');
      setSuperlative(card.comparison.superlative || '');
    } else {
      setComparative('');
      setSuperlative('');
    }

    setExampleGerman(card.exampleGerman || '');
    setExampleTurkish(card.exampleTurkish || '');
    setAiError('');
    setShowCardForm(true);
  };

  // Save Card Submit
  const handleSaveCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!german.trim() || !turkish.trim()) return;
    if (!selectedDeck) return;

    const newCard: Card = {
      id: editingCardId || 'card-' + Date.now(),
      type: cardType,
      german: german.trim(),
      turkish: turkish.trim(),
      exampleGerman: exampleGerman.trim(),
      exampleTurkish: exampleTurkish.trim(),
      // Spaced repetition fields (preserve if editing)
      interval: editingCardId
        ? selectedDeck.cards.find((c) => c.id === editingCardId)?.interval || 0
        : 0,
      repetition: editingCardId
        ? selectedDeck.cards.find((c) => c.id === editingCardId)?.repetition || 0
        : 0,
      efactor: editingCardId
        ? selectedDeck.cards.find((c) => c.id === editingCardId)?.efactor || 2.5
        : 2.5,
      nextReviewDate: editingCardId
        ? selectedDeck.cards.find((c) => c.id === editingCardId)?.nextReviewDate ||
          new Date().toISOString()
        : new Date().toISOString()
    };

    if (cardType === 'noun') {
      newCard.article = article;
      newCard.plural = plural.trim();
    } else if (cardType === 'verb') {
      const fullPerf = perfektParticiple.trim() ? `${perfektAux} ${perfektParticiple.trim()}` : '';
      newCard.conjugation = {
        praesens: praesens.trim(),
        praeteritum: praeteritum.trim(),
        perfekt: fullPerf
      };
    } else if (cardType === 'adjective') {
      newCard.comparison = {
        comparative: comparative.trim(),
        superlative: superlative.trim()
      };
    }

    let updatedCards: Card[] = [];
    if (editingCardId) {
      updatedCards = selectedDeck.cards.map((c) => (c.id === editingCardId ? newCard : c));
    } else {
      updatedCards = [...selectedDeck.cards, newCard];
    }

    const updatedDeck: Deck = {
      ...selectedDeck,
      cards: updatedCards
    };

    onSaveDeck(updatedDeck);
    setSelectedDeck(updatedDeck);
    setShowCardForm(false);
    if (selectedCardForPreview?.id === newCard.id) {
      setSelectedCardForPreview(newCard);
    }
  };

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    if (!confirm('Bu kelime kartını silmek istediğinize emin misiniz?')) return;
    if (!selectedDeck) return;

    const updatedDeck: Deck = {
      ...selectedDeck,
      cards: selectedDeck.cards.filter((c) => c.id !== cardId)
    };

    onSaveDeck(updatedDeck);
    setSelectedDeck(updatedDeck);
    if (selectedCardForPreview?.id === cardId) {
      setSelectedCardForPreview(null);
    }
  };

  // Filtered cards based on search
  const filteredCards = selectedDeck
    ? selectedDeck.cards.filter(
        (c) =>
          c.german.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.turkish.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Ant Design Table Columns definition
  const columns = [
    {
      title: 'Almanca / Kelime',
      dataIndex: 'german',
      key: 'german',
      render: (_text: string, record: Card) => (
        <span>
          {record.type === 'noun' && record.article && (
            <span
              className={`badge-gender badge-${record.article}`}
              style={{ marginRight: '0.5rem' }}
            >
              {record.article}
            </span>
          )}
          <strong>{record.german}</strong>
          {record.type === 'noun' && record.plural && (
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                marginLeft: '0.5rem'
              }}
            >
              (pl. {record.plural})
            </span>
          )}
        </span>
      )
    },
    {
      title: 'Tür',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        if (type === 'noun') return 'İsim';
        if (type === 'verb') return 'Fiil';
        if (type === 'adjective') return 'Sıfat';
        return 'Diğer';
      }
    },
    {
      title: 'Türkçe Anlamı',
      dataIndex: 'turkish',
      key: 'turkish'
    },
    {
      title: 'Sonraki Tekrar',
      dataIndex: 'nextReviewDate',
      key: 'nextReviewDate',
      render: (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR')
    },
    {
      title: 'İşlemler',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: Card) => (
        <div style={{ display: 'inline-flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Kelimeyi Düzenle">
            <Button
              size="small"
              icon={<EditOutlined style={{ fontSize: '12px' }} />}
              onClick={() => openEditCard(record)}
            />
          </Tooltip>
          <Tooltip title="Kelimeyi Sil">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
              onClick={() => handleDeleteCard(record.id)}
            />
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* 1. Deck View List */}
      {!selectedDeck && (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Destelerim</h1>
              <p className="page-subtitle">
                Kelime kartı gruplarınızı yönetin ve yenilerini oluşturun.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button type="default" icon={<ImportOutlined />} onClick={onImportDeck}>
                İçe Aktar
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setSelectedDeck(null);
                  setDeckName('');
                  setDeckDesc('');
                  setIsAiDeck(false);
                  setGenerationProgress(0);
                  setGenerationError('');
                  setIsGeneratingDeck(false);
                  setShowDeckForm(true);
                }}
              >
                Yeni Deste
              </Button>
            </div>
          </div>

          {showDeckForm && (
            <div
              className="glass-card"
              style={{ maxWidth: '600px', margin: '0 auto 1.5rem auto', width: '100%' }}
            >
              {isGeneratingDeck ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <LoadingOutlined
                    style={{ fontSize: 36, color: 'var(--accent-color)', marginBottom: '1rem' }}
                    spin
                  />
                  <h3 style={{ marginBottom: '0.5rem', fontWeight: 700, color: '#fff' }}>
                    Yapay Zeka Desteyi Oluşturuyor
                  </h3>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '1.5rem'
                    }}
                  >
                    Almanca kelime kartları oluşturuluyor, lütfen bekleyin...
                  </p>

                  <Progress percent={generationProgress} strokeColor="var(--accent-color)" />
                </div>
              ) : (
                <>
                  <h3 style={{ marginBottom: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    {selectedDeck ? 'Deste Düzenle' : 'Yeni Deste Oluştur'}
                  </h3>
                  <form onSubmit={handleSaveDeckSubmit}>
                    <div className="form-group">
                      <label className="form-label">Deste Adı</label>
                      <input
                        className="form-input"
                        type="text"
                        value={deckName}
                        onChange={(e) => setDeckName(e.target.value)}
                        placeholder="Örn: Almanca A1 İsimler"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Açıklama</label>
                      <textarea
                        className="form-textarea"
                        value={deckDesc}
                        onChange={(e) => setDeckDesc(e.target.value)}
                        placeholder="Deste hakkında kısa bir bilgi..."
                        rows={3}
                      />
                    </div>

                    {!selectedDeck && (
                      <div
                        style={{
                          marginTop: '1.25rem',
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '1.25rem'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1rem'
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.95rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              color: '#fff'
                            }}
                          >
                            <Sparkles size={16} style={{ color: 'var(--accent-color)' }} />
                            Yapay Zeka ile Kelime Kartları Oluştur
                          </span>
                          <Switch
                            checked={isAiDeck}
                            onChange={(checked) => {
                              setIsAiDeck(checked);
                              setGenerationError('');
                            }}
                          />
                        </div>

                        {isAiDeck && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1.5rem',
                              background: 'rgba(255, 255, 255, 0.01)',
                              padding: '1.25rem',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            {/* Card Count selection */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Oluşturulacak Kart Sayısı</label>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(3, 1fr)',
                                  gap: '0.5rem'
                                }}
                              >
                                {[5, 15, 25].map((count) => (
                                  <Button
                                    key={count}
                                    type={aiCardCount === count ? 'primary' : 'default'}
                                    onClick={() => setAiCardCount(count)}
                                  >
                                    {count} Kart
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Word types checkboxes */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Kelime Türleri</label>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(2, 1fr)',
                                  gap: '0.75rem'
                                }}
                              >
                                <Checkbox
                                  checked={aiWordTypes.noun}
                                  onChange={(e) =>
                                    setAiWordTypes({ ...aiWordTypes, noun: e.target.checked })
                                  }
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  İsim (Nomen)
                                </Checkbox>
                                <Checkbox
                                  checked={aiWordTypes.verb}
                                  onChange={(e) =>
                                    setAiWordTypes({ ...aiWordTypes, verb: e.target.checked })
                                  }
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  Fiil (Verb)
                                </Checkbox>
                                <Checkbox
                                  checked={aiWordTypes.adjective}
                                  onChange={(e) =>
                                    setAiWordTypes({ ...aiWordTypes, adjective: e.target.checked })
                                  }
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  Sıfat (Adjektiv)
                                </Checkbox>
                                <Checkbox
                                  checked={aiWordTypes.other}
                                  onChange={(e) =>
                                    setAiWordTypes({ ...aiWordTypes, other: e.target.checked })
                                  }
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  Diğer
                                </Checkbox>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {generationError && (
                      <div
                        style={{
                          color: 'var(--danger)',
                          fontSize: '0.85rem',
                          marginTop: '1rem',
                          fontWeight: 550
                        }}
                      >
                        {generationError}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'flex-end',
                        marginTop: '1.5rem'
                      }}
                    >
                      <Button type="default" onClick={() => setShowDeckForm(false)}>
                        Vazgeç
                      </Button>
                      <Button type="primary" htmlType="submit">
                        Kaydet
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginTop: '1rem'
            }}
          >
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="glass-card clickable-card"
                onClick={() => {
                  setSelectedDeck(deck);
                  setSearchTerm('');
                  setSelectedCardForPreview(null);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  minHeight: '180px'
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      color: '#fff'
                    }}
                  >
                    {deck.name}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {deck.description || 'Açıklama girilmemiş.'}
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1rem'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {deck.cards.length} kart
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Tooltip title="Dışa Aktar">
                      <Button
                        size="small"
                        icon={<ExportOutlined style={{ fontSize: '12px' }} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportDeck(deck);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Deste Bilgilerini Düzenle">
                      <Button
                        size="small"
                        icon={<EditOutlined style={{ fontSize: '12px' }} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDeck(deck);
                          setDeckName(deck.name);
                          setDeckDesc(deck.description || '');
                          setShowDeckForm(true);
                          setSelectedCardForPreview(null);
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 2. Individual Deck Detail View (Managing Cards) */}
      {selectedDeck && !showCardForm && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button
              type="default"
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                setSelectedDeck(null);
                setSelectedCardForPreview(null);
              }}
            />
            <div>
              <h1 className="page-title">{selectedDeck.name}</h1>
              <p className="page-subtitle">{selectedDeck.description || 'Açıklama girilmemiş.'}</p>
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center'
            }}
          >
            <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
              <input
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                type="text"
                placeholder="Almanca veya Türkçe ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchOutlined
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Tooltip title="Deste Bilgilerini Düzenle">
                <Button icon={<EditOutlined />} onClick={() => setShowDeckForm(true)} />
              </Tooltip>
              <Tooltip title="Desteyi Sil">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    if (
                      confirm(
                        'Bu desteyi ve içindeki TÜM kartları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
                      )
                    ) {
                      onDeleteDeck(selectedDeck.id);
                      setSelectedDeck(null);
                      setSelectedCardForPreview(null);
                    }
                  }}
                />
              </Tooltip>
              <Tooltip title="Kelime Ekle">
                <Button type="primary" icon={<PlusOutlined />} onClick={openAddCard} />
              </Tooltip>
            </div>
          </div>

          {showDeckForm && (
            <div
              className="glass-card"
              style={{ maxWidth: '600px', margin: '0 auto 1rem auto', width: '100%' }}
            >
              <h3 style={{ marginBottom: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Deste Bilgilerini Güncelle
              </h3>
              <form onSubmit={handleSaveDeckSubmit}>
                <div className="form-group">
                  <label className="form-label">Deste Adı</label>
                  <input
                    className="form-input"
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Açıklama</label>
                  <textarea
                    className="form-textarea"
                    value={deckDesc}
                    onChange={(e) => setDeckDesc(e.target.value)}
                    rows={3}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end',
                    marginTop: '1.5rem'
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowDeckForm(false)}
                  >
                    Kapat
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Ant Design Word List Table */}
          <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
            <Table
              dataSource={filteredCards}
              columns={columns}
              rowKey="id"
              pagination={false}
              className="dark-antd-table"
              rowClassName={(record) =>
                record.id === selectedCardForPreview?.id
                  ? 'clickable-row active-row'
                  : 'clickable-row'
              }
              onRow={(record) => ({
                onClick: () => setSelectedCardForPreview(record)
              })}
            />
          </div>
        </>
      )}

      {/* 3. Card Creation / Editing Form Screen */}
      {selectedDeck && showCardForm && (
        <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}
          >
            <Button
              type="default"
              icon={<ArrowLeftOutlined />}
              onClick={() => setShowCardForm(false)}
            />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              {editingCardId ? 'Kelimeyi Düzenle' : 'Yeni Kelime Kartı Ekle'}
            </h2>
          </div>

          <div className="glass-card">
            <form
              onSubmit={handleSaveCardSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className="form-group">
                <label className="form-label">Kelime Türü</label>
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}
                >
                  {(['noun', 'verb', 'adjective', 'other'] as const).map((type) => (
                    <Button
                      key={type}
                      type={cardType === type ? 'primary' : 'default'}
                      onClick={() => {
                        setCardType(type);
                        setAiError('');
                      }}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {type === 'noun' && 'İsim (Nomen)'}
                      {type === 'verb' && 'Fiil (Verb)'}
                      {type === 'adjective' && 'Sıfat (Adjektiv)'}
                      {type === 'other' && 'Diğer'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* German Word input + AI Autofill */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Almanca Kelime / İfade</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    className="form-input"
                    style={{ flexGrow: 1 }}
                    type="text"
                    value={german}
                    onChange={(e) => setGerman(e.target.value)}
                    placeholder="Örn: Hund, gehen, schön"
                    required
                  />
                  <Button
                    type="default"
                    icon={
                      isAiLoading ? (
                        <LoadingOutlined />
                      ) : (
                        <Sparkles size={16} style={{ color: 'var(--accent-color)' }} />
                      )
                    }
                    style={{
                      background: 'rgba(124, 58, 237, 0.1)',
                      borderColor: 'rgba(124, 58, 237, 0.3)'
                    }}
                    onClick={handleAiAutofill}
                    disabled={isAiLoading}
                  >
                    {isAiLoading ? 'Dolduruluyor...' : 'Yapay Zeka ile Doldur'}
                  </Button>
                </div>
                {aiError && (
                  <span
                    style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}
                  >
                    {aiError}
                  </span>
                )}
              </div>

              {/* Dynamic Word Type Fields */}
              {cardType === 'noun' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Artikel</label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem'
                      }}
                    >
                      {(['der', 'die', 'das'] as const).map((art) => (
                        <button
                          key={art}
                          type="button"
                          className="btn"
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background:
                              article === art ? `var(--${art}-color)` : 'rgba(255,255,255,0.03)',
                            color: article === art ? '#000' : `var(--${art}-color)`,
                            borderColor: `var(--${art}-color)`,
                            borderWidth: '1.5px',
                            padding: '0.5rem'
                          }}
                          onClick={() => setArticle(art)}
                        >
                          {art}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Çoğul Hali (Plural)</label>
                    <input
                      className="form-input"
                      type="text"
                      value={plural}
                      onChange={(e) => setPlural(e.target.value)}
                      placeholder="Örn: Hunde"
                    />
                  </div>
                </div>
              )}

              {cardType === 'verb' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '0.75rem'
                    }}
                  >
                    <div className="form-group">
                      <label className="form-label">Präsens (3. Tekil)</label>
                      <input
                        className="form-input"
                        type="text"
                        value={praesens}
                        onChange={(e) => setPraesens(e.target.value)}
                        placeholder="Örn: geht"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Präteritum (3. Tekil)</label>
                      <input
                        className="form-input"
                        type="text"
                        value={praeteritum}
                        onChange={(e) => setPraeteritum(e.target.value)}
                        placeholder="Örn: ging"
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '0.25rem' }}>
                    <label className="form-label">Perfekt</label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.2rem',
                          background: 'rgba(9, 11, 17, 0.4)',
                          borderRadius: '10px',
                          padding: '0.25rem',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {(['hat', 'ist'] as const).map((aux) => (
                          <button
                            key={aux}
                            type="button"
                            className="btn"
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              background:
                                perfektAux === aux ? 'var(--accent-color)' : 'transparent',
                              color: '#fff',
                              borderRadius: '7px',
                              border: 'none'
                            }}
                            onClick={() => setPerfektAux(aux)}
                          >
                            {aux}
                          </button>
                        ))}
                      </div>
                      <input
                        className="form-input"
                        type="text"
                        value={perfektParticiple}
                        onChange={(e) => setPerfektParticiple(e.target.value)}
                        placeholder="Örn: gegangen"
                        style={{ flexGrow: 1 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {cardType === 'adjective' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Komparativ (Karşılaştırma)</label>
                    <input
                      className="form-input"
                      type="text"
                      value={comparative}
                      onChange={(e) => setComparative(e.target.value)}
                      placeholder="Örn: schöner"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Superlativ (En Üstünlük)</label>
                    <input
                      className="form-input"
                      type="text"
                      value={superlative}
                      onChange={(e) => setSuperlative(e.target.value)}
                      placeholder="Örn: am schönsten"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Türkçe Karşılığı</label>
                <input
                  className="form-input"
                  type="text"
                  value={turkish}
                  onChange={(e) => setTurkish(e.target.value)}
                  placeholder="Örn: köpek, gitmek, güzel"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Almanca Örnek Cümle</label>
                <input
                  className="form-input"
                  type="text"
                  value={exampleGerman}
                  onChange={(e) => setExampleGerman(e.target.value)}
                  placeholder="Almanca örnek cümle..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Örnek Cümlenin Türkçe Çevirisi</label>
                <input
                  className="form-input"
                  type="text"
                  value={exampleTurkish}
                  onChange={(e) => setExampleTurkish(e.target.value)}
                  placeholder="Türkçe çeviri..."
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '1.5rem'
                }}
              >
                <Button type="default" onClick={() => setShowCardForm(false)}>
                  İptal
                </Button>
                <Button type="primary" htmlType="submit">
                  Kartı Kaydet
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Side Drawer for Card Preview */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: '#fff' }}>Kart Detayları</span>
            {selectedCardForPreview && (
              <span
                className="badge-gender"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.7rem'
                }}
              >
                {selectedCardForPreview.type === 'noun' && 'İsim'}
                {selectedCardForPreview.type === 'verb' && 'Fiil'}
                {selectedCardForPreview.type === 'adjective' && 'Sıfat'}
                {selectedCardForPreview.type === 'other' && 'Diğer'}
              </span>
            )}
          </div>
        }
        placement="right"
        width={460}
        onClose={() => setSelectedCardForPreview(null)}
        open={!!selectedCardForPreview}
        styles={{
          body: {
            padding: '1.5rem',
            background: 'var(--bg-sidebar)',
            color: 'var(--text-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            overflowY: 'auto'
          },
          header: {
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-color)'
          }
        }}
        extra={
          selectedCardForPreview && (
            <Tooltip title="Kelimeyi Düzenle">
              <Button
                type="text"
                icon={<EditOutlined style={{ color: 'var(--text-secondary)' }} />}
                onClick={() => {
                  if (selectedCardForPreview) {
                    openEditCard(selectedCardForPreview);
                    setSelectedCardForPreview(null);
                  }
                }}
              />
            </Tooltip>
          )
        }
      >
        {selectedCardForPreview && (
          <>
            <div className="drawer-section">
              <span className="drawer-section-title">Almanca</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '1.4rem',
                  fontWeight: 700
                }}
              >
                {selectedCardForPreview.type === 'noun' && selectedCardForPreview.article && (
                  <span className={`badge-gender badge-${selectedCardForPreview.article}`}>
                    {selectedCardForPreview.article}
                  </span>
                )}
                <span style={{ color: '#fff' }}>{selectedCardForPreview.german}</span>
                {selectedCardForPreview.type === 'noun' && selectedCardForPreview.plural && (
                  <span
                    style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 400 }}
                  >
                    (pl. {selectedCardForPreview.plural})
                  </span>
                )}
              </div>
            </div>

            {selectedCardForPreview.type === 'verb' && selectedCardForPreview.conjugation && (
              <div className="drawer-section">
                <span className="drawer-section-title">Fiil Çekimleri (Conjugation)</span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.9rem'
                  }}
                >
                  {selectedCardForPreview.conjugation.praesens && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Präsens (3. pers.):</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {selectedCardForPreview.conjugation.praesens}
                      </strong>
                    </div>
                  )}
                  {selectedCardForPreview.conjugation.praeteritum && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Präteritum (3. pers.):</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {selectedCardForPreview.conjugation.praeteritum}
                      </strong>
                    </div>
                  )}
                  {selectedCardForPreview.conjugation.perfekt && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Perfekt:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {selectedCardForPreview.conjugation.perfekt}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedCardForPreview.type === 'adjective' && selectedCardForPreview.comparison && (
              <div className="drawer-section">
                <span className="drawer-section-title">Sıfat Derecelendirmeleri (Comparison)</span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.9rem'
                  }}
                >
                  {selectedCardForPreview.comparison.comparative && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Komparativ:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {selectedCardForPreview.comparison.comparative}
                      </strong>
                    </div>
                  )}
                  {selectedCardForPreview.comparison.superlative && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Superlativ:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {selectedCardForPreview.comparison.superlative}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="drawer-section">
              <span className="drawer-section-title">Türkçe Anlamı</span>
              <span
                className="drawer-section-content"
                style={{ fontSize: '1.15rem', color: 'var(--accent-hover)', fontWeight: 600 }}
              >
                {selectedCardForPreview.turkish}
              </span>
            </div>

            {(selectedCardForPreview.exampleGerman || selectedCardForPreview.exampleTurkish) && (
              <div className="drawer-section">
                <span className="drawer-section-title">Örnek Cümle</span>
                {selectedCardForPreview.exampleGerman && (
                  <p style={{ fontStyle: 'italic', color: '#fff', marginBottom: '0.25rem' }}>
                    "{selectedCardForPreview.exampleGerman}"
                  </p>
                )}
                {selectedCardForPreview.exampleTurkish && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {selectedCardForPreview.exampleTurkish}
                  </p>
                )}
              </div>
            )}

            <div className="drawer-section">
              <span className="drawer-section-title">Tekrar Durumu (Spaced Repetition)</span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}
              >
                <div>
                  <span>Sonraki Tekrar:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {new Date(selectedCardForPreview.nextReviewDate).toLocaleDateString('tr-TR')}
                  </strong>
                </div>
                <div>
                  <span>Tekrar Sayısı (Repetition):</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedCardForPreview.repetition || 0}
                  </strong>
                </div>
                <div>
                  <span>E-Faktör (Kolaylık):</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedCardForPreview.efactor || 2.5}
                  </strong>
                </div>
              </div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
