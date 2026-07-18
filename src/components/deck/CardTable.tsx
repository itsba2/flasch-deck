import { Table, Input, Space, Tooltip, Button } from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { Card as CardType, Deck } from '../../global';
import GenderBadge from '../common/GenderBadge';

interface CardTableProps {
  selectedDeck: Deck;
  onGoBack: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onEditDeck: () => void;
  onDeleteDeck: () => void;
  onAddCard: () => void;
  filteredCards: CardType[];
  onEditCard: (card: CardType) => void;
  onDeleteCard: (cardId: string) => void;
  selectedCardForPreview: CardType | null;
  onSelectCardForPreview: (card: CardType) => void;
}

export default function CardTable({
  selectedDeck,
  onGoBack,
  searchTerm,
  setSearchTerm,
  onEditDeck,
  onDeleteDeck,
  onAddCard,
  filteredCards,
  onEditCard,
  onDeleteCard,
  selectedCardForPreview,
  onSelectCardForPreview
}: CardTableProps) {
  const columns = [
    {
      title: 'Almanca / Kelime',
      dataIndex: 'german',
      key: 'german',
      render: (_text: string, record: CardType) => (
        <span>
          {record.type === 'noun' && record.article && (
            <GenderBadge article={record.article} style={{ marginRight: '0.5rem' }} />
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
              icon={<EditOutlined />}
              onClick={() => onEditCard(record)}
            />
          </Tooltip>
          <Tooltip title="Kelimeyi Sil">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDeleteCard(record.id)}
            />
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Button type="default" icon={<ArrowLeftOutlined />} onClick={onGoBack} />
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
          style={{ maxWidth: '28.5rem', flexGrow: 1 }}
          prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
          placeholder="Almanca veya Türkçe ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="large"
        />

        <Space>
          <Tooltip title="Deste Bilgilerini Düzenle">
            <Button icon={<EditOutlined />} onClick={onEditDeck} />
          </Tooltip>
          <Tooltip title="Desteyi Sil">
            <Button danger icon={<DeleteOutlined />} onClick={onDeleteDeck} />
          </Tooltip>
          <Tooltip title="Kelime Ekle">
            <Button type="primary" icon={<PlusOutlined />} onClick={onAddCard} />
          </Tooltip>
        </Space>
      </div>

      <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
        <Table
          dataSource={filteredCards}
          columns={columns}
          rowKey="id"
          pagination={false}
          className="dark-antd-table"
          rowClassName={(record) =>
            record.id === selectedCardForPreview?.id ? 'clickable-row active-row' : 'clickable-row'
          }
          onRow={(record) => ({
            onClick: () => onSelectCardForPreview(record)
          })}
        />
      </div>
    </>
  );
}
