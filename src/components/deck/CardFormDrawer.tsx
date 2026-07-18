import { Card, Form, Segmented, Space, Input, Row, Col, Button } from 'antd';
import { ArrowLeftOutlined, LoadingOutlined } from '@ant-design/icons';
import { Sparkles } from 'lucide-react';

interface CardFormDrawerProps {
  editingCardId: string | null;
  cardType: 'noun' | 'verb' | 'adjective' | 'other';
  setCardType: (type: 'noun' | 'verb' | 'adjective' | 'other') => void;
  german: string;
  setGerman: (val: string) => void;
  turkish: string;
  setTurkish: (val: string) => void;
  article: 'der' | 'die' | 'das';
  setArticle: (val: 'der' | 'die' | 'das') => void;
  plural: string;
  setPlural: (val: string) => void;
  praesens: string;
  setPraesens: (val: string) => void;
  praeteritum: string;
  setPraeteritum: (val: string) => void;
  perfektAux: 'hat' | 'ist';
  setPerfektAux: (val: 'hat' | 'ist') => void;
  perfektParticiple: string;
  setPerfektParticiple: (val: string) => void;
  comparative: string;
  setComparative: (val: string) => void;
  superlative: string;
  setSuperlative: (val: string) => void;
  exampleGerman: string;
  setExampleGerman: (val: string) => void;
  exampleTurkish: string;
  setExampleTurkish: (val: string) => void;
  isAiLoading: boolean;
  aiError: string;
  setAiError: (err: string) => void;
  handleAiAutofill: () => void;
  handleSaveCardSubmit: () => void;
  onCancel: () => void;
}

export default function CardFormDrawer({
  editingCardId,
  cardType,
  setCardType,
  german,
  setGerman,
  turkish,
  setTurkish,
  article,
  setArticle,
  plural,
  setPlural,
  praesens,
  setPraesens,
  praeteritum,
  setPraeteritum,
  perfektAux,
  setPerfektAux,
  perfektParticiple,
  setPerfektParticiple,
  comparative,
  setComparative,
  superlative,
  setSuperlative,
  exampleGerman,
  setExampleGerman,
  exampleTurkish,
  setExampleTurkish,
  isAiLoading,
  aiError,
  setAiError,
  handleAiAutofill,
  handleSaveCardSubmit,
  onCancel
}: CardFormDrawerProps) {
  return (
    <div style={{ maxWidth: '50rem', margin: '0 auto', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}
      >
        <Button type="default" icon={<ArrowLeftOutlined />} onClick={onCancel} />
        <h2
          style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}
        >
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
          <Form.Item
            label={<span style={{ color: 'var(--text-secondary)' }}>Almanca Kelime / İfade</span>}
            required
          >
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
              <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
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
                <Form.Item
                  label={
                    <span style={{ color: 'var(--text-secondary)' }}>Çoğul Hali (Plural)</span>
                  }
                >
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
                  <Form.Item
                    label={
                      <span style={{ color: 'var(--text-secondary)' }}>Präsens (3. Tekil)</span>
                    }
                  >
                    <Input
                      value={praesens}
                      onChange={(e) => setPraesens(e.target.value)}
                      placeholder="Örn: geht"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <span style={{ color: 'var(--text-secondary)' }}>Präteritum (3. Tekil)</span>
                    }
                  >
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
                          background: perfektAux === aux ? 'var(--accent-color)' : 'transparent',
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
                <Form.Item
                  label={
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Komparativ (Karşılaştırma)
                    </span>
                  }
                >
                  <Input
                    value={comparative}
                    onChange={(e) => setComparative(e.target.value)}
                    placeholder="Örn: schöner"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={
                    <span style={{ color: 'var(--text-secondary)' }}>Superlativ (En Üstünlük)</span>
                  }
                >
                  <Input
                    value={superlative}
                    onChange={(e) => setSuperlative(e.target.value)}
                    placeholder="Örn: am schönsten"
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            label={<span style={{ color: 'var(--text-secondary)' }}>Türkçe Karşılığı</span>}
            required
          >
            <Input
              value={turkish}
              onChange={(e) => setTurkish(e.target.value)}
              placeholder="Örn: köpek, gitmek, güzel"
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: 'var(--text-secondary)' }}>Almanca Örnek Cümle</span>}
          >
            <Input
              value={exampleGerman}
              onChange={(e) => setExampleGerman(e.target.value)}
              placeholder="Almanca örnek cümle..."
            />
          </Form.Item>

          <Form.Item
            label={
              <span style={{ color: 'var(--text-secondary)' }}>Örnek Cümlenin Türkçe Çevirisi</span>
            }
          >
            <Input
              value={exampleTurkish}
              onChange={(e) => setExampleTurkish(e.target.value)}
              placeholder="Türkçe çeviri..."
            />
          </Form.Item>

          <Form.Item
            style={{ display: 'flex', justifyContent: 'flex-end', margin: '1.5rem 0 0 0' }}
          >
            <Space>
              <Button type="default" onClick={onCancel}>
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
  );
}
