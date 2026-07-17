import { useState } from 'react';
import { Key, Save, AlertTriangle, ShieldCheck, Database, FileJson, Palette } from 'lucide-react';
import { Card, Form, Input, Button, Space, Typography, Modal, message, Segmented } from 'antd';
import { AppConfig } from '../global';

const { Title, Text } = Typography;

interface SettingsProps {
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => Promise<void>;
  onResetApp: () => Promise<void>;
}

export default function Settings({ config, onSaveConfig, onResetApp }: SettingsProps) {
  const [keyInput, setKeyInput] = useState(config.apiKey || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveConfig({ ...config, apiKey: keyInput.trim() });
      message.success('API anahtarı başarıyla kaydedildi!');
    } catch {
      message.error('Kaydetme hatası!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = async (val: 'light' | 'dark') => {
    try {
      await onSaveConfig({ ...config, theme: val });
      message.success('Tema güncellendi!');
    } catch {
      message.error('Tema güncellenirken hata oluştu.');
    }
  };

  const handleFontSizeChange = async (val: 'small' | 'medium' | 'large') => {
    try {
      await onSaveConfig({ ...config, fontSize: val });
      message.success('Yazı boyutu güncellendi!');
    } catch {
      message.error('Yazı boyutu güncellenirken hata oluştu.');
    }
  };

  const handleReset = () => {
    Modal.confirm({
      title: 'Uygulama Verilerini Sıfırla',
      content: 'DİKKAT! Tüm destelerinizi ve kartlarınızı silerek uygulamayı sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.',
      okText: 'Evet, Sıfırla',
      okType: 'danger',
      cancelText: 'Vazgeç',
      onOk: async () => {
        try {
          await onResetApp();
          message.success('Uygulama başarıyla sıfırlandı ve varsayılan Almanca A1 destesi yüklendi.');
        } catch {
          message.error('Sıfırlama sırasında hata oluştu.');
        }
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '700px', width: '100%' }}>
      <div>
        <Title level={2} style={{ margin: 0 }}>Ayarlar</Title>
        <Text type="secondary">
          Uygulama tercihlerini ve yerel veri yapılandırmasını yönetin.
        </Text>
      </div>

      {/* 1. Appearance Config */}
      <Card
        title={
          <Space>
            <Palette size={22} style={{ color: 'var(--accent-color)' }} />
            <span style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>
              Görünüm Ayarları
            </span>
          </Space>
        }
        bordered={true}
      >
        <Space direction="vertical" size="middle" style={{ display: 'flex', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Text type="secondary" style={{ fontWeight: 500 }}>Tema Tercihi</Text>
            <Segmented
              options={[
                { label: 'Pozitif Enerji (Açık)', value: 'light' },
                { label: 'Modern Slate (Koyu)', value: 'dark' }
              ]}
              value={config.theme || 'light'}
              onChange={(val) => handleThemeChange(val as 'light' | 'dark')}
              block
              size="large"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Text type="secondary" style={{ fontWeight: 500 }}>Yazı Boyutu</Text>
            <Segmented
              options={[
                { label: '14px (Küçük)', value: 'small' },
                { label: '18px (Orta)', value: 'medium' },
                { label: '22px (Büyük)', value: 'large' }
              ]}
              value={config.fontSize || 'small'}
              onChange={(val) => handleFontSizeChange(val as 'small' | 'medium' | 'large')}
              block
              size="large"
            />
          </div>
        </Space>
      </Card>

      {/* 2. Gemini API Config */}
      <Card
        title={
          <Space>
            <Key size={22} style={{ color: 'var(--accent-color)' }} />
            <span style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>
              Gemini Yapay Zeka Entegrasyonu
            </span>
          </Space>
        }
        bordered={true}
      >
        <Space direction="vertical" size="middle" style={{ display: 'flex', width: '100%' }}>
          <Text type="secondary" style={{ fontSize: '0.85rem', lineHeight: '1.4', display: 'block' }}>
            Uygulamada kelime kartı eklerken <strong>"Yapay Zeka ile Doldur"</strong> butonunu
            kullanmak ve Almanca vs Türkçe dilbilgisi karşılaştırma açıklamaları almak için bir Google
            Gemini API anahtarı ekleyebilirsiniz. API anahtarınız{' '}
            <strong>tamamen yerel olarak</strong> bilgisayarınızda saklanır ve doğrudan Google
            sunucularına gönderilir.
          </Text>

          <Form layout="vertical" onFinish={handleSave}>
            <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>Gemini API Anahtarı (API Key)</span>} required>
              <Input.Password
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ margin: 0, textAlign: 'right' }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<Save size={16} />}
                loading={isSaving}
                size="large"
              >
                Anahtarı Kaydet
              </Button>
            </Form.Item>
          </Form>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              alignItems: 'center',
              borderTop: '1px solid var(--border-trans)',
              paddingTop: '0.75rem',
              marginTop: '0.5rem'
            }}
          >
            <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
            <Text type="secondary" style={{ fontSize: '0.75rem' }}>
              Verileriniz güvende: Yerel sandbox dışına hiçbir veriniz sızdırılmaz.
            </Text>
          </div>
        </Space>
      </Card>

      {/* 3. Local Storage Info */}
      <Card
        title={
          <Space>
            <Database size={22} style={{ color: 'var(--success)' }} />
            <span style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>
              Yerel Depolama ve Veri Bilgisi
            </span>
          </Space>
        }
        bordered={true}
      >
        <Space direction="vertical" size="middle" style={{ display: 'flex', width: '100%' }}>
          <Text type="secondary" style={{ fontSize: '0.85rem', display: 'block' }}>
            Tüm desteleriniz ve ilerleme verileriniz (aralıklı tekrar süreleri) bilgisayarınızda
            yerel <strong>JSON</strong> dosyaları olarak saklanır.
          </Text>

          <div
            style={{
              background: 'var(--bg-transparent)',
              border: '1px solid var(--border-color)',
              padding: '1rem',
              borderRadius: '10px',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-primary)'
            }}
          >
            <FileJson size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
            <span>[Uygulama Veri Dizini]/decks/*.json</span>
          </div>

          <Text type="secondary" style={{ fontSize: '0.8rem' }}>
            Desteler sekmesini kullanarak destelerinizi <code>.json</code> olarak dışarı aktarabilir
            (yedeklemek için) veya başka bir bilgisayardan desteleri içe aktarabilirsiniz.
          </Text>
        </Space>
      </Card>

      {/* 4. Dangerous Settings / Reset */}
      <Card
        title={
          <Space>
            <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
            <span style={{ color: 'var(--danger)', fontSize: '1.1rem', fontWeight: 700 }}>
              Tehlikeli Bölge
            </span>
          </Space>
        }
        style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
        bordered={true}
      >
        <Space direction="vertical" size="middle" style={{ display: 'flex', width: '100%' }}>
          <Text type="secondary" style={{ fontSize: '0.85rem', display: 'block' }}>
            Uygulamayı ilk yükleme durumuna döndürür. Tüm oluşturduğunuz kelime kartları, eklediğiniz
            desteler ve geçmiş öğrenme verileriniz kalıcı olarak <strong>silinir</strong>.
          </Text>

          <Button type="primary" danger size="large" onClick={handleReset}>
            Uygulama Verilerini Sıfırla
          </Button>
        </Space>
      </Card>
    </div>
  );
}
