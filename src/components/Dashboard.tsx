import { useState, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Flame,
  Trophy,
  Brain,
  TrendingUp,
  Clock,
  Activity,
  Sparkles,
  Zap
} from 'lucide-react';
import { Card as CardType, Deck, StudyHistoryItem, QuizHistoryItem } from '../global';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface DashboardProps {
  decks: Deck[];
  studyHistory?: StudyHistoryItem[];
  quizHistory?: QuizHistoryItem[];
  onNavigate: (route: string) => void;
  theme?: 'light' | 'dark';
  onUpdateCard: (deckId: string, updatedCard: CardType) => void;
}

export default function Dashboard({
  decks,
  studyHistory = [],
  quizHistory = [],
  onNavigate,
  theme = 'light',
  onUpdateCard
}: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [modalCards, setModalCards] = useState<(CardType & { deckId: string; deckName: string })[]>([]);

  const isDark = theme === 'dark';

  // Basic stats
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

  // Streak calculation
  const getStreak = () => {
    if (!studyHistory || studyHistory.length === 0) return 0;
    const studiedDates = new Set(studyHistory.map((h) => h.date));

    let streak = 0;
    const checkDate = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

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



  // Upcoming workload
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

  // Local Smart Insights
  // 1. Estimated Forgetting Curve (Memory Retention Rate)
  const memoryRetention = useMemo(() => {
    if (totalCards === 0) return 100;
    // Overdue cards pull down retention. Max drop is weighted at 30% of memory index.
    const overdueRatio = dueCardsCount / totalCards;
    return Math.max(70, Math.round(100 - overdueRatio * 30));
  }, [totalCards, dueCardsCount]);

  // 2. Peak Study Hour Analysis
  const peakHourInfo = useMemo(() => {
    if (!quizHistory || quizHistory.length === 0) return { hour: null, accuracy: null };
    const hourCounts = Array(24).fill(0);
    const hourSuccess = Array(24).fill(0);
    quizHistory.forEach((q) => {
      if (!q.date) return;
      const hour = new Date(q.date).getHours();
      hourCounts[hour]++;
      hourSuccess[hour] += (q.correct / q.total) * 100;
    });

    let bestHour = null;
    let maxAcc = -1;
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > 0) {
        const avg = hourSuccess[h] / hourCounts[h];
        if (avg > maxAcc) {
          maxAcc = avg;
          bestHour = h;
        }
      }
    }
    return { hour: bestHour, accuracy: Math.round(maxAcc) };
  }, [quizHistory]);

  // 3. Leitner Box Overload Bottleneck Alert
  const bottleneckInfo = useMemo(() => {
    let box1Count = 0; // learning or repetition <= 1
    let total = 0;
    decks.forEach((d) => {
      d.cards.forEach((c) => {
        total++;
        if (c.repetition <= 1) box1Count++;
      });
    });
    const ratio = total > 0 ? box1Count / total : 0;
    const isOverloaded = ratio > 0.6 && total > 5;
    return {
      ratio: Math.round(ratio * 100),
      isOverloaded,
      message: isOverloaded
        ? '1. Kutu (Yeni/Öğrenilen) aşırı dolmuş! Yeni kart eklemeyi durdurup tekrarlara odaklanın.'
        : 'Kutular arası kart dağılımınız dengeli. Öğrenme hızınız iyi gidiyor.'
    };
  }, [decks]);

  // 4. Estimated Mastery Date
  const estimatedMastery = useMemo(() => {
    if (!studyHistory || studyHistory.length === 0) return null;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentHistory = studyHistory.filter((h) => new Date(h.date) >= sevenDaysAgo);
    const totalReviewedRecent = recentHistory.reduce((sum, h) => sum + h.reviewed, 0);
    const daysStudied = new Set(recentHistory.map((h) => h.date)).size || 1;
    const avgPerDay = totalReviewedRecent / daysStudied;

    const unmasteredCount = newCount + learningCount;
    if (avgPerDay > 0.5 && unmasteredCount > 0) {
      const daysNeeded = Math.ceil(unmasteredCount / avgPerDay);
      return { days: daysNeeded, avgPerDay: avgPerDay.toFixed(1) };
    }
    return null;
  }, [studyHistory, newCount, learningCount]);

  // 5. Toughest Words
  const toughestCards = useMemo(() => {
    const list: (CardType & { deckId: string; deckName: string })[] = [];
    decks.forEach((deck) => {
      deck.cards.forEach((card) => {
        if (card.repetition > 0) {
          list.push({ ...card, deckId: deck.id, deckName: deck.name });
        }
      });
    });
    // Sort ascending by efactor
    list.sort((a, b) => (a.efactor || 2.5) - (b.efactor || 2.5));
    return list.slice(0, 5);
  }, [decks]);

  const startToughestStudy = () => {
    if (toughestCards.length === 0) return;
    setModalCards(JSON.parse(JSON.stringify(toughestCards)));
    setActiveCardIndex(0);
    setIsFlipped(false);
    setIsModalOpen(true);
  };

  const handleModalGrade = (grade: number) => {
    const card = modalCards[activeCardIndex];
    let { interval = 0, repetition = 0, efactor = 2.5 } = card;

    efactor = efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    if (grade < 3) {
      repetition = 0;
      interval = 1;
    } else {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.ceil(interval * efactor);
      }
      repetition = repetition + 1;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    const updatedCard = {
      ...card,
      interval,
      repetition,
      efactor,
      nextReviewDate: nextReviewDate.toISOString()
    };

    onUpdateCard(card.deckId, updatedCard);

    const updatedModalCards = [...modalCards];
    updatedModalCards[activeCardIndex] = updatedCard;
    setModalCards(updatedModalCards);

    setIsFlipped(false);
    if (activeCardIndex + 1 < modalCards.length) {
      setActiveCardIndex(activeCardIndex + 1);
    } else {
      setActiveCardIndex(modalCards.length); // Triggers completion screen
    }
  };

  // Line Chart Config
  const last7DaysLabels = useMemo(() => {
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push({
        fullDate: d.toISOString().split('T')[0],
        shortLabel: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
      });
    }
    return labels;
  }, []);

  const lineChartData = useMemo(() => {
    const reviewsData = last7DaysLabels.map((lbl) => {
      const dayData = studyHistory.find((h) => h.date === lbl.fullDate);
      return dayData ? dayData.reviewed : 0;
    });

    const quizzesData = last7DaysLabels.map((lbl) => {
      return quizHistory.filter((q) => q.date.split('T')[0] === lbl.fullDate).length;
    });

    const hasData = reviewsData.some((r) => r > 0) || quizzesData.some((q) => q > 0);
    // Visual guidance fallback
    const finalReviews = hasData ? reviewsData : [4, 2, 7, 5, 8, 12, 6];
    const finalQuizzes = hasData ? quizzesData : [1, 0, 2, 1, 1, 2, 1];

    return {
      labels: last7DaysLabels.map((l) => l.shortLabel),
      datasets: [
        {
          label: 'Kart Çalışması (Adet)',
          data: finalReviews,
          borderColor: '#7c3aed',
          backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.05)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#7c3aed',
          pointBorderColor: isDark ? '#151b2e' : '#fff',
          pointHoverRadius: 6,
          borderWidth: 3
        },
        {
          label: 'Tamamlanan Quiz (Adet)',
          data: finalQuizzes,
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: isDark ? '#151b2e' : '#fff',
          pointHoverRadius: 6,
          borderWidth: 3
        }
      ],
      isPlaceholder: !hasData
    };
  }, [studyHistory, quizHistory, last7DaysLabels, isDark]);

  const lineChartOptions = useMemo(() => {
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.08)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: textColor,
            font: { family: 'Outfit', size: 11, weight: 'bold' as const }
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e263f' : '#ffffff',
          titleColor: isDark ? '#f1f5f9' : '#0f172a',
          bodyColor: isDark ? '#94a3b8' : '#475569',
          borderColor: isDark ? '#3d4e80' : '#cbd5e1',
          borderWidth: 1,
          padding: 8,
          titleFont: { family: 'Outfit', weight: 'bold' as const },
          bodyFont: { family: 'Outfit' }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Outfit', size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, precision: 0, font: { family: 'Outfit', size: 10 } },
          min: 0
        }
      }
    };
  }, [isDark]);

  // Doughnut Chart Config
  const doughnutChartData = useMemo(() => {
    const hasCards = newCount + learningCount + masteredCount > 0;
    const dataValues = hasCards
      ? [newCount, learningCount, masteredCount]
      : [3, 8, 12]; // Fallback mock

    return {
      labels: ['Yeni Kelimeler', 'Öğrenilenler', 'Ustalaşılanlar'],
      datasets: [
        {
          data: dataValues,
          backgroundColor: ['#64748b', '#7c3aed', '#10b981'],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#151b2e' : '#fff',
          hoverOffset: 4
        }
      ],
      isPlaceholder: !hasCards
    };
  }, [newCount, learningCount, masteredCount, isDark]);

  const doughnutChartOptions = useMemo(() => {
    const textColor = isDark ? '#94a3b8' : '#475569';

    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: textColor,
            boxWidth: 12,
            font: { family: 'Outfit', size: 10 }
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e263f' : '#ffffff',
          bodyColor: isDark ? '#f1f5f9' : '#0f172a',
          borderColor: isDark ? '#3d4e80' : '#cbd5e1',
          borderWidth: 1,
          bodyFont: { family: 'Outfit', size: 11 }
        }
      }
    };
  }, [isDark]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
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
            borderColor: currentStreak > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)',
            boxShadow: 'none'
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

      {/* Main KPI Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Decks Count */}
        <div
          className="glass-card clickable-card"
          onClick={() => onNavigate('decks')}
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
            <BookOpen className="icon-lg" />
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
            <GraduationCap className="icon-lg" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Toplam Kelime</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalCards}</div>
          </div>
        </div>

        {/* Due Cards */}
        <div
          className="glass-card clickable-card"
          onClick={() => onNavigate('study')}
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
            <Calendar className="icon-lg" />
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

      {/* Due Alert & CTA Banner */}
      {dueCardsCount > 0 ? (
        <div
          className="glass-card"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(9, 11, 17, 0.6) 100%)'
              : 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.02) 100%)',
            borderColor: 'var(--accent-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            padding: '1.5rem 2rem'
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <AlertCircle className="icon-xl" style={{ color: 'var(--accent-color)' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Tekrarlama Zamanı!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Hafızanızda kalıcı olması için bugün tekrarlamanız gereken{' '}
                <strong>{dueCardsCount}</strong> kelime bulunuyor.
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

      {/* Interactive Charts Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Daily Study Timeline Area Chart */}
        <div
          className="glass-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'relative',
            minHeight: '320px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--accent-color)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Çalışma ve Quiz Geçmişi</h3>
            </div>
            {lineChartData.isPlaceholder && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--border-color)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                Örnek Grafik
              </span>
            )}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {lineChartData.isPlaceholder && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.05)',
                  zIndex: 2,
                  backdropFilter: 'blur(1px)',
                  borderRadius: '8px'
                }}
              >
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    maxWidth: '20rem'
                  }}
                >
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Grafiği oluşturmak için henüz yeterli çalışma geçmişiniz yok. Çalışma yaptıkça
                    burası otomatik dolacaktır.
                  </p>
                </div>
              </div>
            )}
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Leitner Box Doughnut Chart */}
        <div
          className="glass-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'relative',
            minHeight: '320px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Brain size={18} style={{ color: 'var(--success)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Öğrenme Durumları</h3>
            </div>
            {doughnutChartData.isPlaceholder && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--border-color)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                Örnek Grafik
              </span>
            )}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {doughnutChartData.isPlaceholder && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.05)',
                  zIndex: 2,
                  backdropFilter: 'blur(1px)',
                  borderRadius: '8px'
                }}
              >
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    maxWidth: '13rem'
                  }}
                >
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Henüz kartınız bulunmuyor.
                  </p>
                </div>
              </div>
            )}
            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
          </div>
        </div>
      </div>

      {/* Smart Insights & Toughest Words Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* local smart insights */}
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Akıllı Yerel Analizler</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Retention curve */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '60px', flexShrink: 0, position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '4px solid var(--border-trans)'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `4px solid ${memoryRetention >= 90 ? 'var(--success)' : memoryRetention >= 80 ? 'var(--accent-color)' : 'var(--warning)'}`,
                    clipPath: `polygon(50% 50%, 50% 0%, ${memoryRetention >= 75 ? '100% 0%, 100% 100%, 0% 100%, 0% 0%' : memoryRetention >= 50 ? '100% 0%, 100% 100%, 50% 100%' : '100% 0%, 100% 50%'})`,
                    transform: 'rotate(-45deg)'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.95rem',
                    fontWeight: 800
                  }}
                >
                  %{memoryRetention}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                  Hafıza Kalıcılık Seviyesi
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  SM-2 tekrarlama planlarına uyum oranınız. Tekrarları ertelememek bu puanı korur.
                </p>
              </div>
            </div>

            {/* Peak hour */}
            <div
              style={{
                background: 'var(--bg-trans-light)',
                border: '1px solid var(--border-trans)',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <Clock size={20} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>En Yüksek Başarı Saati</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {peakHourInfo.hour !== null
                    ? `En yüksek quiz doğruluğuna saat ${peakHourInfo.hour}:00 - ${peakHourInfo.hour + 1}:00 arasında ulaştınız (%${peakHourInfo.accuracy} başarı).`
                    : 'Henüz yeterli quiz kaydı bulunmuyor.'}
                </p>
              </div>
            </div>

            {/* Leitner Box overload warning */}
            <div
              style={{
                background: bottleneckInfo.isOverloaded
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'var(--bg-trans-light)',
                border: bottleneckInfo.isOverloaded
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid var(--border-trans)',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <Zap
                size={20}
                style={{
                  color: bottleneckInfo.isOverloaded ? 'var(--danger)' : 'var(--success)',
                  flexShrink: 0
                }}
              />
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Kelime Öğrenme Denge Analizi
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {bottleneckInfo.message} (1. Kutu Oranı: %{bottleneckInfo.ratio})
                </p>
              </div>
            </div>

            {/* Estimated mastery date */}
            <div
              style={{
                background: 'var(--bg-trans-light)',
                border: '1px solid var(--border-trans)',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <TrendingUp size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Öngörülen Desteyi Tamamlama</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {estimatedMastery
                    ? `Mevcut hızınızla (${estimatedMastery.avgPerDay} kelime/gün), sıfırdan tüm kelimeleri öğrenmeniz yaklaşık ${estimatedMastery.days} gün sürecektir.`
                    : 'Çalışma hızınızı hesaplamak için daha fazla gün çalışmanız gerekir.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Toughest words helper list */}
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} style={{ color: 'var(--warning)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>En Çok Zorlanılan Kelimeler</h3>
            </div>
            {toughestCards.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={startToughestStudy}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                Hemen Çalış
              </button>
            )}
          </div>

          {toughestCards.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              {toughestCards.map((card) => {
                const colors = {
                  der: 'var(--der-color)',
                  die: 'var(--die-color)',
                  das: 'var(--das-color)'
                };

                return (
                  <div
                    key={card.id}
                    style={{
                      background: 'var(--bg-trans-light)',
                      border: '1px solid var(--border-trans)',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        {card.article && (
                          <span
                            style={{
                              color: colors[card.article] || 'inherit',
                              fontSize: '0.75rem',
                              textTransform: 'lowercase',
                              fontWeight: 800
                            }}
                          >
                            {card.article}
                          </span>
                        )}
                        <span style={{ color: 'var(--text-primary)' }}>{card.german}</span>
                        {card.plural && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            (pl. {card.plural})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {card.turkish}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--danger)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}
                      >
                        Kolaylık: {card.efactor?.toFixed(1) || '2.5'}
                      </span>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {card.deckName}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                border: '1px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}
            >
              <Brain className="icon-xl" style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem' }}>
                En çok zorlanılan kelimeleri analiz edebilmek için öncelikle deste kartlarınızı
                çalışıp puanlamanız gerekmektedir.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Quizzes Taken */}
      {quizHistory && quizHistory.length > 0 && (
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={18} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Son Çözülen Quizler</h3>
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
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                          }}
                        >
                          {q.deckName}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {typeLabel}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={12} /> {q.timeSpent} sn
                          </div>
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

      {/* Toughest Words Quick Study Modal */}
      {isModalOpen && modalCards.length > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 11, 17, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '37rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              borderRadius: '20px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
            }}
          >
            {activeCardIndex < modalCards.length ? (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Zor Kelime Tekrarı
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                    {activeCardIndex + 1} / {modalCards.length}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: '4px',
                    background: 'var(--border-trans)',
                    borderRadius: '2px',
                    width: '100%'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--accent-color)',
                      borderRadius: '2px',
                      width: `${((activeCardIndex + 1) / modalCards.length) * 100}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                {/* Study Card Container */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  style={{
                    height: '240px',
                    background: isFlipped ? 'var(--card-back-bg)' : 'var(--card-front-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }}
                >
                  {!isFlipped ? (
                    // Front side
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                      {/* Word Type Tag */}
                      <span
                        style={{
                          fontSize: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          letterSpacing: '0.5px'
                        }}
                      >
                        {modalCards[activeCardIndex].type === 'noun'
                          ? 'İsim (Nomen)'
                          : modalCards[activeCardIndex].type === 'verb'
                            ? 'Fiil (Verb)'
                            : modalCards[activeCardIndex].type === 'adjective'
                              ? 'Sıfat (Adjektiv)'
                              : 'Diğer (Zarf/Edat)'}
                      </span>

                      {/* German Word */}
                      <div
                        style={{
                          fontSize: '2rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color:
                            modalCards[activeCardIndex].article === 'der'
                              ? 'var(--der-color)'
                              : modalCards[activeCardIndex].article === 'die'
                                ? 'var(--die-color)'
                                : modalCards[activeCardIndex].article === 'das'
                                  ? 'var(--das-color)'
                                  : 'var(--text-primary)'
                        }}
                      >
                        {modalCards[activeCardIndex].article && (
                          <span style={{ fontSize: '1.25rem', opacity: 0.8, fontWeight: 500 }}>
                            {modalCards[activeCardIndex].article}
                          </span>
                        )}
                        {modalCards[activeCardIndex].german}
                      </div>

                      {/* Plural info */}
                      {modalCards[activeCardIndex].plural && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          die {modalCards[activeCardIndex].plural}
                        </div>
                      )}

                      {/* Verb conjugations */}
                      {modalCards[activeCardIndex].conjugation && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {modalCards[activeCardIndex].conjugation?.praesens} |{' '}
                          {modalCards[activeCardIndex].conjugation?.praeteritum} |{' '}
                          {modalCards[activeCardIndex].conjugation?.perfekt}
                        </div>
                      )}

                      {/* Adjective comparisons */}
                      {modalCards[activeCardIndex].comparison && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {modalCards[activeCardIndex].comparison?.comparative} |{' '}
                          {modalCards[activeCardIndex].comparison?.superlative}
                        </div>
                      )}

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
                        Çevirmek için tıklayın
                      </span>
                    </div>
                  ) : (
                    // Back side
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                      {/* Turkish translation */}
                      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
                        {modalCards[activeCardIndex].turkish}
                      </div>

                      {/* Example sentences */}
                      {modalCards[activeCardIndex].exampleGerman && (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            "{modalCards[activeCardIndex].exampleGerman}"
                          </div>
                          {modalCards[activeCardIndex].exampleTurkish && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              ({modalCards[activeCardIndex].exampleTurkish})
                            </div>
                          )}
                        </div>
                      )}

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
                        Oylamak için butonları kullanın
                      </span>
                    </div>
                  )}
                </div>

                {/* Rating grading controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {isFlipped ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                      <button
                        className="btn"
                        onClick={() => handleModalGrade(1)}
                        style={{
                          background: 'rgba(244, 63, 94, 0.12)',
                          color: 'var(--sr-again)',
                          border: '1px solid rgba(244, 63, 94, 0.3)',
                          padding: '0.6rem 0.2rem',
                          fontSize: '0.8rem',
                          borderRadius: '8px'
                        }}
                      >
                        Tekrar
                      </button>
                      <button
                        className="btn"
                        onClick={() => handleModalGrade(2.5)}
                        style={{
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: 'var(--sr-hard)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '0.6rem 0.2rem',
                          fontSize: '0.8rem',
                          borderRadius: '8px'
                        }}
                      >
                        Zor
                      </button>
                      <button
                        className="btn"
                        onClick={() => handleModalGrade(4)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: 'var(--sr-good)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '0.6rem 0.2rem',
                          fontSize: '0.8rem',
                          borderRadius: '8px'
                        }}
                      >
                        İyi
                      </button>
                      <button
                        className="btn"
                        onClick={() => handleModalGrade(5)}
                        style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: 'var(--sr-easy)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '0.6rem 0.2rem',
                          fontSize: '0.8rem',
                          borderRadius: '8px'
                        }}
                      >
                        Kolay
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => setIsFlipped(true)}
                      style={{ width: '100%' }}
                    >
                      Kartı Döndür
                    </button>
                  )}

                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                    style={{ width: '100%' }}
                  >
                    Vazgeç
                  </button>
                </div>
              </>
            ) : (
              // Completed screen
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--success)',
                    padding: '1rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Trophy className="icon-xxl" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Tebrikler!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  En çok zorlandığınız kelimeleri başarıyla tekrarladınız. Hafızanız şimdi daha taze ve güçlü!
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsModalOpen(false)}
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
