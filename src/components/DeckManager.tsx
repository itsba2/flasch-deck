import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { autofillCard, generateDeckCardsChunk } from '../services/ai';
import { Card as CardType, Deck } from '../global';

import DeckList from './deck/DeckList';
import DeckFormModal from './deck/DeckFormModal';
import CardTable from './deck/CardTable';
import CardFormDrawer from './deck/CardFormDrawer';
import CardPreviewDrawer from './deck/CardPreviewDrawer';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* 1. Deck View List */}
      {!selectedDeck && (
        <>
          <DeckList
            decks={decks}
            onSelectDeck={(deck) => {
              setSelectedDeck(deck);
              setSearchTerm('');
              setSelectedCardForPreview(null);
            }}
            onImportDeck={onImportDeck}
            onAddDeckClick={() => {
              setSelectedDeck(null);
              setDeckName('');
              setDeckDesc('');
              setIsAiDeck(false);
              setGenerationProgress(0);
              setGenerationError('');
              setIsGeneratingDeck(false);
              setShowDeckForm(true);
            }}
            onExportDeck={onExportDeck}
            onEditDeckClick={(deck) => {
              setSelectedDeck(deck);
              setDeckName(deck.name);
              setDeckDesc(deck.description || '');
              setShowDeckForm(true);
              setSelectedCardForPreview(null);
            }}
          />

          {showDeckForm && (
            <DeckFormModal
              selectedDeck={selectedDeck}
              deckName={deckName}
              setDeckName={setDeckName}
              deckDesc={deckDesc}
              setDeckDesc={setDeckDesc}
              isAiDeck={isAiDeck}
              setIsAiDeck={setIsAiDeck}
              aiCardCount={aiCardCount}
              setAiCardCount={setAiCardCount}
              aiWordTypes={aiWordTypes}
              setAiWordTypes={setAiWordTypes}
              isGeneratingDeck={isGeneratingDeck}
              generationProgress={generationProgress}
              generationError={generationError}
              setGenerationError={setGenerationError}
              onSaveDeckSubmit={handleSaveDeckSubmit}
              onCancel={() => setShowDeckForm(false)}
            />
          )}
        </>
      )}

      {/* 2. Individual Deck Detail View (Managing Cards) */}
      {selectedDeck && !showCardForm && (
        <>
          <CardTable
            selectedDeck={selectedDeck}
            onGoBack={() => {
              setSelectedDeck(null);
              setSelectedCardForPreview(null);
            }}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onEditDeck={() => setShowDeckForm(true)}
            onDeleteDeck={() => {
              Modal.confirm({
                title: 'Desteyi Sil',
                content:
                  'Bu desteyi ve içindeki TÜM kartları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
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
            onAddCard={openAddCard}
            filteredCards={filteredCards}
            onEditCard={openEditCard}
            onDeleteCard={handleDeleteCard}
            selectedCardForPreview={selectedCardForPreview}
            onSelectCardForPreview={setSelectedCardForPreview}
          />

          {showDeckForm && (
            <DeckFormModal
              selectedDeck={selectedDeck}
              deckName={deckName}
              setDeckName={setDeckName}
              deckDesc={deckDesc}
              setDeckDesc={setDeckDesc}
              isAiDeck={isAiDeck}
              setIsAiDeck={setIsAiDeck}
              aiCardCount={aiCardCount}
              setAiCardCount={setAiCardCount}
              aiWordTypes={aiWordTypes}
              setAiWordTypes={setAiWordTypes}
              isGeneratingDeck={isGeneratingDeck}
              generationProgress={generationProgress}
              generationError={generationError}
              setGenerationError={setGenerationError}
              onSaveDeckSubmit={handleSaveDeckSubmit}
              onCancel={() => setShowDeckForm(false)}
            />
          )}
        </>
      )}

      {/* 3. Card Creation / Editing Form Screen */}
      {selectedDeck && showCardForm && (
        <CardFormDrawer
          editingCardId={editingCardId}
          cardType={cardType}
          setCardType={setCardType}
          german={german}
          setGerman={setGerman}
          turkish={turkish}
          setTurkish={setTurkish}
          article={article}
          setArticle={setArticle}
          plural={plural}
          setPlural={setPlural}
          praesens={praesens}
          setPraesens={setPraesens}
          praeteritum={praeteritum}
          setPraeteritum={setPraeteritum}
          perfektAux={perfektAux}
          setPerfektAux={setPerfektAux}
          perfektParticiple={perfektParticiple}
          setPerfektParticiple={setPerfektParticiple}
          comparative={comparative}
          setComparative={setComparative}
          superlative={superlative}
          setSuperlative={setSuperlative}
          exampleGerman={exampleGerman}
          setExampleGerman={setExampleGerman}
          exampleTurkish={exampleTurkish}
          setExampleTurkish={setExampleTurkish}
          isAiLoading={isAiLoading}
          aiError={aiError}
          setAiError={setAiError}
          handleAiAutofill={handleAiAutofill}
          handleSaveCardSubmit={handleSaveCardSubmit}
          onCancel={() => setShowCardForm(false)}
        />
      )}

      {/* 4. Side Drawer for Card Preview */}
      <CardPreviewDrawer
        selectedCardForPreview={selectedCardForPreview}
        onClose={() => setSelectedCardForPreview(null)}
        onEditClick={() => {
          if (selectedCardForPreview) {
            openEditCard(selectedCardForPreview);
            setSelectedCardForPreview(null);
          }
        }}
      />
    </div>
  );
}
