import { useState, useEffect } from 'react';
import {
  Table,
  Drawer,
  Button,
  Tooltip,
  Progress,
  Checkbox,
  Switch,
  message,
  Form,
  Input,
  Segmented,
  Row,
  Col,
  Space,
  Card,
  Modal
} from 'antd';
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
import { Card as CardType, Deck } from '../global';

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

  const [selectedCardForPreview, setSelectedCardForPreview] = useState<CardType | null>(null);

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
  const handleSaveDeckSubmit = async () => {
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
      let generatedCards: CardType[] = [];
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
            const formattedChunk: CardType[] = chunkCards.map((card: any, index: number) => {
              const cardId = `card-${Date.now()}-${i}-${index}`;
              if (card.german) {
                excludedWords.push(card.german);
              }

              const formatted: CardType = {
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
      message.success('Deste bilgileri başarıyla kaydedildi.');
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
      message.success('Kart bilgileri yapay zeka ile dolduruldu!');
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
  const openEditCard = (card: CardType) => {
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
  const handleSaveCardSubmit = () => {
    if (!german.trim() || !turkish.trim()) return;
    if (!selectedDeck) return;

    const newCard: CardType = {
      id: editingCardId || 'card-' + Date.now(),
      type: cardType,
      german: german.trim(),
      turkish: turkish.trim(),
      exampleGerman: exampleGerman.trim(),
      exampleTurkish: exampleTurkish.trim(),
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

    let updatedCards: CardType[] = [];
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
    message.success('Kelime kartı başarıyla kaydedildi.');
  };

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    Modal.confirm({
      title: 'Kartı Sil',
      content: 'Bu kelime kartını silmek istediğinize emin misiniz?',
      okText: 'Evet, Sil',
      okType: 'danger',
      cancelText: 'Vazgeç',
      onOk: () => {
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
        message.success('Kelime kartı başarıyla silindi.');
      }
    });
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
      render: (_text: string, record: CardType) => (
        <span>
          {record.type === 'noun' && record.article && (
            <span
              className={`badge-gender badge-${record.article}`}
              style={{ marginRight: '0.5rem' }}
            >
              {record.article}
            </span>
          )}
          <strong style={{ color: 'var(--text-primary)' }}>{record.german}</strong>
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
      key: 'turkish',
      render: (text: string) => <span style={{ color: 'var(--text-primary)' }}>{text}</span>
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
      render: (_: any, record: CardType) => (
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
            <Space>
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
            </Space>
          </div>

          {showDeckForm && (
            <Card
              style={{ maxWidth: '600px', margin: '0 auto 1.5rem auto', width: '100%' }}
              bordered={true}
            >
              {isGeneratingDeck ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <LoadingOutlined
                    style={{ fontSize: 36, color: 'var(--accent-color)', marginBottom: '1rem' }}
                    spin
                  />
                  <h3 style={{ marginBottom: '0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
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
                  <h3 style={{ marginBottom: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedDeck ? 'Deste Düzenle' : 'Yeni Deste Oluştur'}
                  </h3>
                  <Form layout="vertical" onFinish={handleSaveDeckSubmit}>
                    <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Deste Adı</span>} required>
                      <Input
                        value={deckName}
                        onChange={(e) => setDeckName(e.target.value)}
                        placeholder="Örn: Almanca A1 İsimler"
                      />
                    </Form.Item>

                    <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Açıklama</span>}>
                      <Input.TextArea
                        value={deckDesc}
                        onChange={(e) => setDeckDesc(e.target.value)}
                        placeholder="Deste hakkında kısa bir bilgi..."
                        rows={3}
                      />
                    </Form.Item>

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
                              color: 'var(--text-primary)'
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
                              gap: '1rem',
                              background: 'var(--bg-trans-light)',
                              padding: '1.25rem',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Oluşturulacak Kart Sayısı</span>}>
                              <Segmented
                                options={[
                                  { label: '5 Kart', value: 5 },
                                  { label: '15 Kart', value: 15 },
                                  { label: '25 Kart', value: 25 }
                                ]}
                                value={aiCardCount}
                                onChange={(val) => setAiCardCount(val as number)}
                                block
                              />
                            </Form.Item>

                            <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Kelime Türleri</span>}>
                              <Row gutter={[12, 12]}>
                                <Col span={12}>
                                  <Checkbox
                                    checked={aiWordTypes.noun}
                                    onChange={(e) =>
                                      setAiWordTypes({ ...aiWordTypes, noun: e.target.checked })
                                    }
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    İsim (Nomen)
                                  </Checkbox>
                                </Col>
                                <Col span={12}>
                                  <Checkbox
                                    checked={aiWordTypes.verb}
                                    onChange={(e) =>
                                      setAiWordTypes({ ...aiWordTypes, verb: e.target.checked })
                                    }
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    Fiil (Verb)
                                  </Checkbox>
                                </Col>
                                <Col span={12}>
                                  <Checkbox
                                    checked={aiWordTypes.adjective}
                                    onChange={(e) =>
                                      setAiWordTypes({ ...aiWordTypes, adjective: e.target.checked })
                                    }
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    Sıfat (Adjektiv)
                                  </Checkbox>
                                </Col>
                                <Col span={12}>
                                  <Checkbox
                                    checked={aiWordTypes.other}
                                    onChange={(e) =>
                                      setAiWordTypes({ ...aiWordTypes, other: e.target.checked })
                                    }
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    Diğer
                                  </Checkbox>
                                </Col>
                              </Row>
                            </Form.Item>
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

                    <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', margin: '1.5rem 0 0 0' }}>
                      <Space>
                        <Button type="default" onClick={() => setShowDeckForm(false)}>
                          Vazgeç
                        </Button>
                        <Button type="primary" htmlType="submit">
                          Kaydet
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </>
              )}
            </Card>
          )}

          <Row gutter={[24, 24]} style={{ marginTop: '1rem' }}>
            {decks.map((deck) => (
              <Col xs={24} sm={12} md={8} key={deck.id}>
                <Card
                  hoverable
                  onClick={() => {
                    setSelectedDeck(deck);
                    setSearchTerm('');
                    setSelectedCardForPreview(null);
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    height: '100%',
                    minHeight: '180px'
                  }}
                  styles={{
                    body: {
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                      gap: '1rem',
                      padding: '1.5rem'
                    }
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        marginBottom: '0.5rem',
                        color: 'var(--text-primary)',
                        margin: '0 0 0.5rem 0'
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
                        WebkitBoxOrient: 'vertical',
                        margin: 0
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
                    <Space onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Dışa Aktar">
                        <Button
                          size="small"
                          icon={<ExportOutlined style={{ fontSize: '12px' }} />}
                          onClick={() => onExportDeck(deck)}
                        />
                      </Tooltip>
                      <Tooltip title="Deste Bilgilerini Düzenle">
                        <Button
                          size="small"
                          icon={<EditOutlined style={{ fontSize: '12px' }} />}
                          onClick={() => {
                            setSelectedDeck(deck);
                            setDeckName(deck.name);
                            setDeckDesc(deck.description || '');
                            setShowDeckForm(true);
                            setSelectedCardForPreview(null);
                          }}
                        />
                      </Tooltip>
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
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
            <Input
              style={{ maxWidth: '400px', flexGrow: 1 }}
              prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
              placeholder="Almanca veya Türkçe ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="large"
            />

            <Space>
              <Tooltip title="Deste Bilgilerini Düzenle">
                <Button icon={<EditOutlined />} onClick={() => setShowDeckForm(true)} />
              </Tooltip>
              <Tooltip title="Desteyi Sil">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Desteyi Sil',
                      content: 'Bu desteyi ve içindeki TÜM kartları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
                      okText: 'Evet, Sil',
                      okType: 'danger',
                      cancelText: 'Vazgeç',
                      onOk: () => {
                        onDeleteDeck(selectedDeck.id);
                        setSelectedDeck(null);
                        setSelectedCardForPreview(null);
                        message.success('Deste başarıyla silindi.');
                      }
                    });
                  }}
                />
              </Tooltip>
              <Tooltip title="Kelime Ekle">
                <Button type="primary" icon={<PlusOutlined />} onClick={openAddCard} />
              </Tooltip>
            </Space>
          </div>

          {showDeckForm && (
            <Card
              style={{ maxWidth: '600px', margin: '0 auto 1rem auto', width: '100%' }}
              bordered={true}
            >
              <h3 style={{ marginBottom: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Deste Bilgilerini Güncelle
              </h3>
              <Form layout="vertical" onFinish={handleSaveDeckSubmit}>
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Deste Adı</span>} required>
                  <Input
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                  />
                </Form.Item>
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Açıklama</span>}>
                  <Input.TextArea
                    value={deckDesc}
                    onChange={(e) => setDeckDesc(e.target.value)}
                    rows={3}
                  />
                </Form.Item>
                <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', margin: '1.5rem 0 0 0' }}>
                  <Space>
                    <Button type="default" onClick={() => setShowDeckForm(false)}>
                      Kapat
                    </Button>
                    <Button type="primary" htmlType="submit">
                      Değişiklikleri Kaydet
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {editingCardId ? 'Kelimeyi Düzenle' : 'Yeni Kelime Kartı Ekle'}
            </h2>
          </div>

          <Card bordered={true}>
            <Form layout="vertical" onFinish={handleSaveCardSubmit}>
              <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Kelime Türü</span>}>
                <Segmented
                  options={[
                    { label: 'İsim (Nomen)', value: 'noun' },
                    { label: 'Fiil (Verb)', value: 'verb' },
                    { label: 'Sıfat (Adjektiv)', value: 'adjective' },
                    { label: 'Diğer', value: 'other' }
                  ]}
                  value={cardType}
                  onChange={(val) => {
                    setCardType(val as any);
                    setAiError('');
                  }}
                  block
                />
              </Form.Item>

              {/* German Word input + AI Autofill */}
              <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Almanca Kelime / İfade</span>} required>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={german}
                    onChange={(e) => setGerman(e.target.value)}
                    placeholder="Örn: Hund, gehen, schön"
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
                </Space.Compact>
                {aiError && (
                  <span
                    style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}
                  >
                    {aiError}
                  </span>
                )}
              </Form.Item>

              {/* Dynamic Word Type Fields */}
              {cardType === 'noun' && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Artikel</span>}>
                      <Segmented
                        options={[
                          { label: 'DER', value: 'der' },
                          { label: 'DİE', value: 'die' },
                          { label: 'DAS', value: 'das' }
                        ]}
                        value={article}
                        onChange={(val) => setArticle(val as any)}
                        block
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Çoğul Hali (Plural)</span>}>
                      <Input
                        value={plural}
                        onChange={(e) => setPlural(e.target.value)}
                        placeholder="Örn: Hunde"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {cardType === 'verb' && (
                <Space direction="vertical" style={{ display: 'flex', width: '100%' }} size="middle">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Präsens (3. Tekil)</span>}>
                        <Input
                          value={praesens}
                          onChange={(e) => setPraesens(e.target.value)}
                          placeholder="Örn: geht"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Präteritum (3. Tekil)</span>}>
                        <Input
                          value={praeteritum}
                          onChange={(e) => setPraeteritum(e.target.value)}
                          placeholder="Örn: ging"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Perfekt</span>}>
                    <Space.Compact style={{ width: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.2rem',
                          background: 'var(--bg-transparent)',
                          borderRadius: '10px 0 0 10px',
                          padding: '0.25rem',
                          border: '1px solid var(--border-color)',
                          borderRight: 'none'
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
                              color: perfektAux === aux ? '#fff' : 'var(--text-primary)',
                              borderRadius: '7px',
                              border: 'none'
                            }}
                            onClick={() => setPerfektAux(aux)}
                          >
                            {aux}
                          </button>
                        ))}
                      </div>
                      <Input
                        value={perfektParticiple}
                        onChange={(e) => setPerfektParticiple(e.target.value)}
                        placeholder="Örn: gegangen"
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                      />
                    </Space.Compact>
                  </Form.Item>
                </Space>
              )}

              {cardType === 'adjective' && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Komparativ (Karşılaştırma)</span>}>
                      <Input
                        value={comparative}
                        onChange={(e) => setComparative(e.target.value)}
                        placeholder="Örn: schöner"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Superlativ (En Üstünlük)</span>}>
                      <Input
                        value={superlative}
                        onChange={(e) => setSuperlative(e.target.value)}
                        placeholder="Örn: am schönsten"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Türkçe Karşılığı</span>} required>
                <Input
                  value={turkish}
                  onChange={(e) => setTurkish(e.target.value)}
                  placeholder="Örn: köpek, gitmek, güzel"
                />
              </Form.Item>

              <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Almanca Örnek Cümle</span>}>
                <Input
                  value={exampleGerman}
                  onChange={(e) => setExampleGerman(e.target.value)}
                  placeholder="Almanca örnek cümle..."
                />
              </Form.Item>

              <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Örnek Cümlenin Türkçe Çevirisi</span>}>
                <Input
                  value={exampleTurkish}
                  onChange={(e) => setExampleTurkish(e.target.value)}
                  placeholder="Türkçe çeviri..."
                />
              </Form.Item>

              <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', margin: '1.5rem 0 0 0' }}>
                <Space>
                  <Button type="default" onClick={() => setShowCardForm(false)}>
                    İptal
                  </Button>
                  <Button type="primary" htmlType="submit">
                    Kartı Kaydet
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </div>
      )}

      {/* 4. Side Drawer for Card Preview */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'var(--text-primary)' }}>Kart Detayları</span>
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
                <span style={{ color: 'var(--text-primary)' }}>{selectedCardForPreview.german}</span>
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
                  <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
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
