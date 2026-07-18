import { Row, Col, Card, Button, Tooltip, Space } from 'antd';
import { PlusOutlined, ImportOutlined, ExportOutlined, EditOutlined } from '@ant-design/icons';
import { Deck } from '../../global';

interface DeckListProps {
  decks: Deck[];
  onSelectDeck: (deck: Deck) => void;
  onImportDeck: () => void;
  onAddDeckClick: () => void;
  onExportDeck: (deck: Deck) => void;
  onEditDeckClick: (deck: Deck) => void;
}

export default function DeckList({
  decks,
  onSelectDeck,
  onImportDeck,
  onAddDeckClick,
  onExportDeck,
  onEditDeckClick
}: DeckListProps) {
  return (
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
          <Button type="primary" icon={<PlusOutlined />} onClick={onAddDeckClick}>
            Yeni Deste
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]} style={{ marginTop: '1rem' }}>
        {decks.map((deck) => (
          <Col xs={24} sm={12} md={8} key={deck.id}>
            <Card
              hoverable
              onClick={() => onSelectDeck(deck)}
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
                      icon={<ExportOutlined />}
                      onClick={() => onExportDeck(deck)}
                    />
                  </Tooltip>
                  <Tooltip title="Deste Bilgilerini Düzenle">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => onEditDeckClick(deck)}
                    />
                  </Tooltip>
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
