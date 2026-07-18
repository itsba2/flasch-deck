import {
  Card,
  Form,
  Input,
  Switch,
  Segmented,
  Row,
  Col,
  Checkbox,
  Space,
  Button,
  Progress
} from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import { Deck } from '../../global';

interface DeckFormModalProps {
  selectedDeck: Deck | null;
  deckName: string;
  setDeckName: (name: string) => void;
  deckDesc: string;
  setDeckDesc: (desc: string) => void;
  isAiDeck: boolean;
  setIsAiDeck: (isAi: boolean) => void;
  aiCardCount: number;
  setAiCardCount: (count: number) => void;
  aiWordTypes: {
    noun: boolean;
    verb: boolean;
    adjective: boolean;
    other: boolean;
  };
  setAiWordTypes: (types: {
    noun: boolean;
    verb: boolean;
    adjective: boolean;
    other: boolean;
  }) => void;
  isGeneratingDeck: boolean;
  generationProgress: number;
  generationError: string;
  setGenerationError: (err: string) => void;
  onSaveDeckSubmit: () => void;
  onCancel: () => void;
}

export default function DeckFormModal({
  selectedDeck,
  deckName,
  setDeckName,
  deckDesc,
  setDeckDesc,
  isAiDeck,
  setIsAiDeck,
  aiCardCount,
  setAiCardCount,
  aiWordTypes,
  setAiWordTypes,
  isGeneratingDeck,
  generationProgress,
  generationError,
  setGenerationError,
  onSaveDeckSubmit,
  onCancel
}: DeckFormModalProps) {
  return (
    <Card
      style={{ maxWidth: '43rem', margin: '0 auto 1.5rem auto', width: '100%' }}
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
          <Form layout="vertical" onFinish={onSaveDeckSubmit}>
            <Form.Item
              label={<span style={{ color: 'var(--text-secondary)' }}>Deste Adı</span>}
              required
            >
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
                    <Form.Item
                      label={
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Oluşturulacak Kart Sayısı
                        </span>
                      }
                    >
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

                    <Form.Item
                      label={<span style={{ color: 'var(--text-secondary)' }}>Kelime Türleri</span>}
                    >
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

            <Form.Item
              style={{ display: 'flex', justifyContent: 'flex-end', margin: '1.5rem 0 0 0' }}
            >
              <Space>
                <Button type="default" onClick={onCancel}>
                  {selectedDeck ? 'Kapat' : 'Vazgeç'}
                </Button>
                <Button type="primary" htmlType="submit">
                  {selectedDeck ? 'Değişiklikleri Kaydet' : 'Kaydet'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </>
      )}
    </Card>
  );
}
