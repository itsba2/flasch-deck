import {
  BookOpen,
  Calendar,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Flame,
  Trophy,
  Brain,
  Activity,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Deck, StudyHistoryItem, QuizHistoryItem } from '../global';

interface DashboardProps {
  decks: Deck[];
  studyHistory?: StudyHistoryItem[];
  quizHistory?: QuizHistoryItem[];
  onNavigate: (route: string) => void;
  theme?: 'light' | 'dark';
}

export default function Dashboard({
  decks,
  studyHistory = [],
  quizHistory = [],
  onNavigate,
  theme = 'light'
}: DashboardProps) {
  // Calculate statistics
  const totalDecks = decks.length;
  let totalCards = 0;
  let dueCardsCount = 0;
  let masteredCount = 0;
  let learningCount = 0;
  let newCount = 0;

  const now = new Date();

  decks.forEach((deck) => {
    totalCards += deck.cards.length;
    deck.cards.forEach((card) => {
      const isDue = new Date(card.nextReviewDate || 0) <= now;
      if (isDue) {
        dueCardsCount++;
      }

      const rep = card.repetition || 0;
      const interval = card.interval || 0;

      if (rep === 0) {
        newCount++;
      } else if (interval >= 21 || rep >= 5) {
        masteredCount++;
      } else {
        learningCount++;
      }
    });
  });

  // 1. Streak Calculation
  const getStreak = () => {
    if (!studyHistory || studyHistory.length === 0) return 0;
    const studiedDates = new Set(studyHistory.map((h) => h.date));

    let streak = 0;
    const checkDate = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // If they haven't studied today, check if they studied yesterday. If not studied yesterday either, streak is broken (0).
    if (!studiedDates.has(formatDate(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1);
      if (!studiedDates.has(formatDate(checkDate))) {
        return 0;
      }
    }

    while (studiedDates.has(formatDate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  };
  const currentStreak = getStreak();

  // 2. Average Easiness Factor (Memory Strength / Retention Strength)
  let sumEFactor = 0;
  decks.forEach((d) =>
    d.cards.forEach((c) => {
      sumEFactor += c.efactor || 2.5;
    })
  );
  const avgEFactor = totalCards ? (sumEFactor / totalCards).toFixed(2) : '2.50';

  // 3. Quiz stats
  const totalQuizzes = quizHistory.length;
  let sumAccuracy = 0;
  quizHistory.forEach((q) => {
    sumAccuracy += (q.correct / q.total) * 100;
  });
  const avgQuizAccuracy = totalQuizzes ? Math.round(sumAccuracy / totalQuizzes) : null;

  // 4. Upcoming Workload
  const oneDay = 24 * 60 * 60 * 1000;
  let dueTomorrow = 0;
  let dueIn3Days = 0;
  let dueIn7Days = 0;

  decks.forEach((deck) => {
    deck.cards.forEach((card) => {
      const reviewDate = new Date(card.nextReviewDate || 0);
      const diffTime = reviewDate.getTime() - now.getTime();

      if (diffTime > 0) {
        if (diffTime <= oneDay) {
          dueTomorrow++;
        }
        if (diffTime <= 3 * oneDay) {
          dueIn3Days++;
        }
        if (diffTime <= 7 * oneDay) {
          dueIn7Days++;
        }
      }
    });
  });

  // 5. Heatmap Calculation (Last 14 days activity)
  const getLast14Days = () => {
    const dates = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const getDayActivity = (dateStr: string) => {
    const studyDay = studyHistory.find((h) => h.date === dateStr);
    const quizCount = quizHistory.filter((q) => q.date.split('T')[0] === dateStr).length;
    const reviewed = studyDay ? studyDay.reviewed : 0;
    return {
      reviewed,
      quizzes: quizCount,
      total: reviewed + quizCount
    };
  };

  const last14Days = getLast14Days();

  // Get color for activity intensity
  const getActivityColor = (totalActivity: number) => {
    if (totalActivity === 0) {
      return theme === 'light' ? '#cbd5e1' : '#171e30';
    }
    if (totalActivity <= 3) return 'rgba(124, 58, 237, 0.25)'; // Light violet
    if (totalActivity <= 8) return 'rgba(124, 58, 237, 0.55)'; // Medium violet
    return 'var(--accent-color)'; // Strong violet
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1 className="page-title">Kontrol Paneli</h1>
          <p className="page-subtitle">
            Almanca kelime dağarcığınızı güçlendirmeye bugün de devam edin.
          </p>
        </div>

        {/* Streak Flame Counter */}
        <div
          className="glass-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.5rem 1rem',
            background: 'rgba(245, 158, 11, 0.08)',
            borderColor: currentStreak > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)'
          }}
        >
          <Flame
            size={20}
            style={{ color: currentStreak > 0 ? 'var(--warning)' : 'var(--text-muted)' }}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {currentStreak > 0 ? `${currentStreak} Günlük Seri` : 'Seri Bulunmuyor'}
          </span>
        </div>
      </div>

      {/* Main Stats Grid Row 1 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Decks Count */}
        <div
          className="glass-card"
          style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}
        >
          <div
            style={{
              background: 'rgba(124, 58, 237, 0.15)',
              color: 'var(--accent-color)',
              padding: '0.75rem',
              borderRadius: '12px'
            }}
          >
            <BookOpen size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Toplam Deste</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalDecks}</div>
          </div>
        </div>

        {/* Cards Count */}
        <div
          className="glass-card"
          style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}
        >
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--success)',
              padding: '0.75rem',
              borderRadius: '12px'
            }}
          >
            <GraduationCap size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Toplam Kelime</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalCards}</div>
          </div>
        </div>

        {/* Due Cards */}
        <div
          className="glass-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            borderLeft:
              dueCardsCount > 0 ? '4px solid var(--warning)' : '1px solid var(--border-color)'
          }}
        >
          <div
            style={{
              background:
                dueCardsCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: dueCardsCount > 0 ? 'var(--warning)' : 'var(--text-muted)',
              padding: '0.75rem',
              borderRadius: '12px'
            }}
          >
            <Calendar size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Bugün Gözden Geçirilecek
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: dueCardsCount > 0 ? 'var(--warning)' : 'inherit'
              }}
            >
              {dueCardsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Due Alert & CTA */}
      {dueCardsCount > 0 ? (
        <div
          className="glass-card"
          style={{
            background:
              theme === 'light'
                ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.02) 100%)'
                : 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(9, 11, 17, 0.6) 100%)',
            borderColor: 'var(--accent-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            padding: '2rem'
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <AlertCircle size={36} style={{ color: 'var(--accent-color)' }} />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Gözden Geçirme Zamanı!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Hafızanızda kalıcı olması için bugün tekrarlamanız gereken{' '}
                <strong>{dueCardsCount}</strong> kelime var.
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('study')}>
            Çalışmaya Başla
          </button>
        </div>
      ) : (
        <div
          className="glass-card"
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            background: 'rgba(16, 185, 129, 0.03)'
          }}
        >
          <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Harika! Bugün için çalışılacak kart kalmadı. Yeni kartlar ekleyebilir veya Quiz
            Arenası'nı deneyebilirsiniz!
          </div>
        </div>
      )}

      {/* Activity Heatmap Section (Last 14 Days) */}
      <div
        className="glass-card"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Son 14 Günlük Aktivite Haritası
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Heatmap Squares Grid */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'space-between',
              background: 'var(--bg-transparent)',
              padding: '1.25rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              overflowX: 'auto'
            }}
          >
            {last14Days.map((dateStr) => {
              const dayActivity = getDayActivity(dateStr);
              const activityColor = getActivityColor(dayActivity.total);

              // Format date cleanly for visual tooltip (e.g. 13 Tem)
              const dateObj = new Date(dateStr);
              const formattedDay = dateObj.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short'
              });

              return (
                <div
                  key={dateStr}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.4rem',
                    flexGrow: 1,
                    minWidth: '35px'
                  }}
                >
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {formattedDay}
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      background: activityColor,
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    title={`${formattedDay}: ${dayActivity.reviewed} kart çalışıldı, ${dayActivity.quizzes} quiz çözüldü`}
                  />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: dayActivity.total > 0 ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}
                  >
                    {dayActivity.total}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              justifyContent: 'flex-end',
              paddingRight: '0.5rem'
            }}
          >
            <span>Aktivite Düzeyi:</span>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  background: theme === 'light' ? '#cbd5e1' : '#171e30',
                  borderRadius: '3px'
                }}
              />
              <span>Yok</span>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  background: 'rgba(124, 58, 237, 0.25)',
                  borderRadius: '3px'
                }}
              />
              <span>Düşük</span>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  background: 'rgba(124, 58, 237, 0.55)',
                  borderRadius: '3px'
                }}
              />
              <span>Orta</span>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  background: 'var(--accent-color)',
                  borderRadius: '3px'
                }}
              />
              <span>Yüksek</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Insights & Next Review Distribution Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Learning Insights Block */}
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Brain size={18} style={{ color: 'var(--accent-color)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Öğrenme Analizleri
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Memory Strength */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-transparent)',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Hafıza Gücü
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Ortalama Kolaylık Çarpanı (EF)
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: parseFloat(avgEFactor) >= 2.5 ? 'var(--success)' : 'var(--warning)'
                  }}
                >
                  {avgEFactor}
                </span>
              </div>
            </div>

            {/* Quiz Accuracy */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-transparent)',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Ortalama Quiz Başarısı
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Çözülen {totalQuizzes} quiz ortalaması
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color:
                      avgQuizAccuracy !== null && avgQuizAccuracy >= 80
                        ? 'var(--success)'
                        : avgQuizAccuracy !== null && avgQuizAccuracy >= 50
                          ? 'var(--warning)'
                          : 'var(--text-muted)'
                  }}
                >
                  {avgQuizAccuracy !== null ? `%${avgQuizAccuracy}` : 'Test yok'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Workload Block */}
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Gelecek Ders Yükü
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                borderBottom: '1px solid var(--border-trans)',
                paddingBottom: '0.4rem'
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Yarın (24 Saat içinde):</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dueTomorrow} kelime</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                borderBottom: '1px solid var(--border-trans)',
                paddingBottom: '0.4rem'
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>3 Gün içinde:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dueIn3Days} kelime</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                paddingBottom: '0.2rem'
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>7 Gün içinde:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dueIn7Days} kelime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Learning Phase & Word Type Distribution */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Learning Status */}
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Öğrenme Durumu</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem'
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>Öğrenilen Kelimeler</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{learningCount}</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--border-trans)',
                  borderRadius: '3px'
                }}
              >
                <div
                  style={{
                    width: `${totalCards ? (learningCount / totalCards) * 100 : 0}%`,
                    height: '100%',
                    background: 'var(--accent-color)',
                    borderRadius: '3px'
                  }}
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem'
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>
                  Ustalaşılan Kelimeler (Uzun Vade)
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{masteredCount}</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--border-trans)',
                  borderRadius: '3px'
                }}
              >
                <div
                  style={{
                    width: `${totalCards ? (masteredCount / totalCards) * 100 : 0}%`,
                    height: '100%',
                    background: 'var(--success)',
                    borderRadius: '3px'
                  }}
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem'
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>
                  Henüz Gözden Geçirilmemiş Kelimeler
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{newCount}</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--border-trans)',
                  borderRadius: '3px'
                }}
              >
                <div
                  style={{
                    width: `${totalCards ? (newCount / totalCards) * 100 : 0}%`,
                    height: '100%',
                    background: 'var(--text-muted)',
                    borderRadius: '3px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Word Types Distribution */}
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Kelime Türü Dağılımı
          </h3>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignContent: 'center',
              height: '100%'
            }}
          >
            {(() => {
              const types = { noun: 0, verb: 0, adjective: 0, other: 0 };
              decks.forEach((d) =>
                d.cards.forEach((c) => {
                  types[c.type || 'other'] = (types[c.type || 'other'] || 0) + 1;
                })
              );

              const colors = {
                noun: 'var(--der-color)',
                verb: 'var(--accent-color)',
                adjective: 'var(--warning)',
                other: 'var(--text-muted)'
              };

              const labels = {
                noun: 'İsim (Nomen)',
                verb: 'Fiil (Verb)',
                adjective: 'Sıfat (Adjektiv)',
                other: 'Diğer (Edat/Zarf)'
              };

              return (Object.keys(types) as Array<keyof typeof types>).map((type) => (
                <div
                  key={type}
                  style={{
                    flex: '1 1 40%',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-transparent)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: colors[type]
                      }}
                    />
                    {labels[type]}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {types[type]}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Row 5: Recent Quizzes taken */}
      {quizHistory && quizHistory.length > 0 && (
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={18} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Son Çözülen Quizler
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.85rem'
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem' }}>Tarih</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Deste</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Quiz Türü</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Süre</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Başarı</th>
                </tr>
              </thead>
              <tbody>
                {quizHistory
                  .slice(-3)
                  .reverse()
                  .map((q, idx) => {
                    const qDate = new Date(q.date).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const accuracy = Math.round((q.correct / q.total) * 100);
                    const typeLabel =
                      q.type === 'spelling'
                        ? 'Yazım Denetimi'
                        : q.type === 'articles'
                          ? 'Artikel Testi'
                          : 'Karma Test';

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-trans)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {qDate}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {q.deckName}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {typeLabel}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: 'var(--text-secondary)',
                            borderBottom: 'none'
                          }}
                        >
                          <Clock size={12} /> {q.timeSpent} sn
                        </td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'right',
                            fontWeight: 700,
                            color:
                              accuracy >= 80
                                ? 'var(--success)'
                                : accuracy >= 50
                                  ? 'var(--warning)'
                                  : 'var(--danger)'
                          }}
                        >
                          %{accuracy} ({q.correct}/{q.total})
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
