// src/pages/DashboardAnalytics.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function DashboardAnalytics() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalClubs: 0,
    totalEvents: 0,
    totalNews: 0,
    newParticipantsThisMonth: 0,
    topClubs: [],
    monthlyActivity: [],
    recentEvents: []
  })
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Загружаем профиль
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }

      // 1. Общая статистика
      await loadStats()

      // 2. Топ-5 КЮДов
      await loadTopClubs()

      // 3. Активность по месяцам
      await loadMonthlyActivity()

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadStats = async () => {
    // Всего участников
    const { count: participantsCount } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })

    // Всего КЮДов
    const { count: clubsCount } = await supabase
      .from('clubs')
      .select('*', { count: 'exact', head: true })

    // Всего мероприятий
    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })

    // Всего новостей
    const { count: newsCount } = await supabase
      .from('news')
      .select('*', { count: 'exact', head: true })

    // Новые участники за этот месяц
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: newParticipants } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    setStats(prev => ({
      ...prev,
      totalParticipants: participantsCount || 0,
      totalClubs: clubsCount || 0,
      totalEvents: eventsCount || 0,
      totalNews: newsCount || 0,
      newParticipantsThisMonth: newParticipants || 0
    }))
  }

  const loadTopClubs = async () => {
    const { data, error } = await supabase
      .from('clubs')
      .select(`
        id,
        name,
        participants:participants(count)
      `)
      .order('name')

    if (!error && data) {
      // Рассчитываем рейтинг для каждого клуба
      const clubsWithRating = await Promise.all(data.map(async (club) => {
        // Считаем количество мероприятий, проведённых клубом
        const { count: eventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', club.id)

        // Считаем количество участников клуба
        const participantsCount = club.participants?.[0]?.count || 0

        // Рейтинг: участники * 5 + мероприятия * 10
        const rating = participantsCount * 5 + (eventsCount || 0) * 10

        return {
          ...club,
          participantsCount,
          eventsCount: eventsCount || 0,
          rating
        }
      }))

      // Сортируем по рейтингу и берём топ-5
      const top5 = clubsWithRating
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)

      setStats(prev => ({ ...prev, topClubs: top5 }))
    }
  }

  const loadMonthlyActivity = async () => {
    const months = []
    const labels = []
    
    // Последние 6 месяцев
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthName = date.toLocaleString('ru-RU', { month: 'long' })
      labels.push(monthName)
      
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)
      
      const { count } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .gte('registered_at', startOfMonth.toISOString())
        .lt('registered_at', endOfMonth.toISOString())
      
      months.push(count || 0)
    }

    setStats(prev => ({ ...prev, monthlyActivity: months, monthlyLabels: labels }))
  }

  const canView = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

  if (!canView) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>⛔ Доступ запрещён</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Только администратор или координатор движения
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  // Находим максимальное значение для графиков
  const maxMonthly = Math.max(...stats.monthlyActivity, 1)

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1>📊 Аналитика движения</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Статистика и показатели ДОД «Дипломаты будущего»
            </p>
          </div>
          <button 
            className="btn btn-outline"
            onClick={() => window.location.reload()}
          >
            🔄 Обновить
          </button>
        </div>

        {/* ===== СТАТИСТИКА В ЦИФРАХ ===== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '30px'
        }}>
          <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '4px' }}>👥</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--mid-blue)' }}>
              {stats.totalParticipants}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Всего участников</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '4px' }}>🏫</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--mid-blue)' }}>
              {stats.totalClubs}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>КЮДов</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '4px' }}>📅</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--mid-blue)' }}>
              {stats.totalEvents}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Мероприятий</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '4px' }}>📰</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--mid-blue)' }}>
              {stats.totalNews}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Новостей</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '20px', borderTop: '4px solid var(--gold)' }}>
            <div style={{ fontSize: '32px', marginBottom: '4px' }}>⭐</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--gold)' }}>
              {stats.newParticipantsThisMonth}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Новых за месяц</div>
          </div>
        </div>

        {/* ===== ТОП-5 КЮДОВ ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>
          <div className="card card-gold-border">
            <h3 style={{ marginBottom: '16px' }}>🏆 Топ-5 КЮДов</h3>
            {stats.topClubs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Нет данных</p>
            ) : (
              <div>
                {stats.topClubs.map((club, index) => (
                  <div key={club.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: index < stats.topClubs.length - 1 ? '1px solid var(--gray-border)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontWeight: 'bold',
                        fontSize: '18px',
                        color: index === 0 ? 'var(--gold)' : index === 1 ? '#A0A0A0' : index === 2 ? '#CD7F32' : 'var(--text-secondary)'
                      }}>
                        #{index + 1}
                      </span>
                      <span style={{ fontWeight: '500' }}>{club.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        👥 {club.participantsCount}
                      </span>
                      <span style={{
                        background: 'var(--mid-blue)',
                        color: 'white',
                        padding: '2px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        {club.rating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===== АКТИВНОСТЬ ПО МЕСЯЦАМ (ГРАФИК) ===== */}
          <div className="card card-blue-border">
            <h3 style={{ marginBottom: '16px' }}>📈 Активность по месяцам</h3>
            {stats.monthlyActivity.length === 0 || stats.monthlyActivity.every(v => v === 0) ? (
              <p style={{ color: 'var(--text-secondary)' }}>Нет данных</p>
            ) : (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  height: '120px',
                  paddingBottom: '4px',
                  gap: '4px'
                }}>
                  {stats.monthlyActivity.map((count, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      height: '100%'
                    }}>
                      <div style={{
                        width: '100%',
                        height: `${(count / maxMonthly) * 100}%`,
                        minHeight: count > 0 ? '4px' : '0',
                        background: 'var(--mid-blue)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.5s ease'
                      }} />
                      <div style={{
                        fontSize: '10px',
                        color: 'var(--text-secondary)',
                        marginTop: '4px',
                        textAlign: 'center',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {stats.monthlyLabels?.[index]?.slice(0, 3) || ''}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  <span>Мероприятий: {stats.monthlyActivity.reduce((a, b) => a + b, 0)}</span>
                  <span>Среднее: {Math.round(stats.monthlyActivity.reduce((a, b) => a + b, 0) / stats.monthlyActivity.length)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== БЫСТРЫЕ ДЕЙСТВИЯ ===== */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>🚀 Быстрые действия</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/clubs')}>
              🏫 Управлять КЮДами
            </button>
            <button className="btn btn-success" onClick={() => navigate('/participants')}>
              👥 Добавить участника
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/events')}>
              📅 Создать мероприятие
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/settings')}>
              ⚙️ Настройки
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}