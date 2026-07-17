import { Drawer, Tooltip, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { Card as CardType } from '../../global';
import GenderBadge from '../common/GenderBadge';
import styles from './CardPreviewDrawer.module.css';

interface CardPreviewDrawerProps {
  selectedCardForPreview: CardType | null;
  onClose: () => void;
  onEditClick: () => void;
}

export default function CardPreviewDrawer({
  selectedCardForPreview,
  onClose,
  onEditClick
}: CardPreviewDrawerProps) {
  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: 'var(--text-primary)' }}>Kart Detayları</span>
          {selectedCardForPreview && (
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: '0.7rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                fontWeight: 600,
                textTransform: 'uppercase'
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
      onClose={onClose}
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
              onClick={onEditClick}
            />
          </Tooltip>
        )
      }
    >
      {selectedCardForPreview && (
        <>
          <div className={styles.drawerSection}>
            <span className={styles.drawerSectionTitle}>Almanca</span>
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
                <GenderBadge article={selectedCardForPreview.article} />
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
            <div className={styles.drawerSection}>
              <span className={styles.drawerSectionTitle}>Fiil Çekimleri (Conjugation)</span>
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
            <div className={styles.drawerSection}>
              <span className={styles.drawerSectionTitle}>
                Sıfat Derecelendirmeleri (Comparison)
              </span>
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

          <div className={styles.drawerSection}>
            <span className={styles.drawerSectionTitle}>Türkçe Anlamı</span>
            <span
              className={styles.drawerSectionContent}
              style={{ fontSize: '1.15rem', color: 'var(--accent-hover)', fontWeight: 600 }}
            >
              {selectedCardForPreview.turkish}
            </span>
          </div>

          {(selectedCardForPreview.exampleGerman || selectedCardForPreview.exampleTurkish) && (
            <div className={styles.drawerSection}>
              <span className={styles.drawerSectionTitle}>Örnek Cümle</span>
              {selectedCardForPreview.exampleGerman && (
                <p
                  style={{
                    fontStyle: 'italic',
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem'
                  }}
                >
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

          <div className={styles.drawerSection}>
            <span className={styles.drawerSectionTitle}>Tekrar Durumu (Spaced Repetition)</span>
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
  );
}
