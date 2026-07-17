import React, { useState } from 'react';
import { Key, Save, AlertTriangle, ShieldCheck, Database, FileJson } from 'lucide-react';
import { AppConfig } from '../global';

interface SettingsProps {
  apiKey: string;
  onSaveConfig: (config: AppConfig) => Promise<void>;
  onResetApp: () => Promise<void>;
}

export default function Settings({ apiKey, onSaveConfig, onResetApp }: SettingsProps) {
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [saveStatus, setSaveStatus] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('kaydediliyor...');
    try {
      await onSaveConfig({ apiKey: keyInput.trim() });
      setSaveStatus('API anahtarı başarıyla kaydedildi!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch {
      setSaveStatus('Kaydetme hatası!');
    }
  };

  const handleReset = async () => {
    if (
      confirm(
        'DİKKAT! Tüm destelerinizi ve kartlarınızı silerek uygulamayı sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.'
      )
    ) {
      await onResetApp();
      alert('Uygulama başarıyla sıfırlandı ve varsayılan Almanca A1 destesi yüklendi.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '700px' }}>
      <div>
        <h1 className="page-title">Ayarlar</h1>
        <p className="page-subtitle">
          Uygulama tercihlerini ve yerel veri yapılandırmasını yönetin.
        </p>
      </div>

      {/* 1. Gemini API Config */}
      <div
        className="glass-card"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Key size={22} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
            Gemini Yapay Zeka Entegrasyonu
          </h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Uygulamada kelime kartı eklerken <strong>"Yapay Zeka ile Doldur"</strong> butonunu
          kullanmak ve Almanca vs Türkçe dilbilgisi karşılaştırma açıklamaları almak için bir Google
          Gemini API anahtarı ekleyebilirsiniz. API anahtarınız{' '}
          <strong>tamamen yerel olarak</strong> bilgisayarınızda saklanır ve doğrudan Google
          sunucularına gönderilir.
        </p>

        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Gemini API Anahtarı (API Key)</label>
            <input
              className="form-input"
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              required
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                color: saveStatus.includes('hata') ? 'var(--danger)' : 'var(--success)',
                fontWeight: 550
              }}
            >
              {saveStatus}
            </span>
            <button type="submit" className="btn btn-primary" style={{ gap: '0.5rem' }}>
              <Save size={16} /> Anahtarı Kaydet
            </button>
          </div>
        </form>

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '0.75rem',
            marginTop: '0.5rem'
          }}
        >
          <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
          Verileriniz güvende: Yerel sandbox dışına hiçbir veriniz sızdırılmaz.
        </div>
      </div>

      {/* 2. Local Storage Info */}
      <div
        className="glass-card"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Database size={22} style={{ color: 'var(--success)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
            Yerel Depolama ve Veri Bilgisi
          </h3>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}
        >
          <p>
            Tüm desteleriniz ve ilerleme verileriniz (aralıklı tekrar süreleri) bilgisayarınızda
            yerel <strong>JSON</strong> dosyaları olarak saklanır.
          </p>
          <div
            style={{
              background: 'rgba(9, 11, 17, 0.4)',
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
            <FileJson size={16} style={{ color: 'var(--accent-color)' }} />
            <span>[Uygulama Veri Dizini]/decks/*.json</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Desteler sekmesini kullanarak destelerinizi <code>.json</code> olarak dışarı aktarabilir
            (yedeklemek için) veya başka bir bilgisayardan desteleri içe aktarabilirsiniz.
          </p>
        </div>
      </div>

      {/* 3. Dangerous Settings / Reset */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          borderColor: 'rgba(239, 68, 68, 0.3)'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--danger)' }}>
            Tehlikeli Bölge
          </h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Uygulamayı ilk yükleme durumuna döndürür. Tüm oluşturduğunuz kelime kartları, eklediğiniz
          desteler ve geçmiş öğrenme verileriniz kalıcı olarak <strong>silinir</strong>.
        </p>

        <div>
          <button className="btn btn-danger" onClick={handleReset}>
            Uygulama Verilerini Sıfırla
          </button>
        </div>
      </div>
    </div>
  );
}
