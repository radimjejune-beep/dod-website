// src/pages/ClubCoordinatorDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function ClubCoordinatorDashboard() {
  const [profile, setProfile] = useState(null)
  const [club, setClub] = useState(null)
  const [stats, setStats] = useState({
    participants: 0,
    events: 0,
    reports: 0,
    achievements: 0,
    active_participants: 0
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [topParticipants, setTopParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }

      // Находим клуб координатора
      const { data: coordinatorData } = await supabase
        .from('club_coordinators')
        .select('club_id, clubs:club_id (*)')
        .eq('profile_id', profile?.id)
        .single()

      if (coordinatorData) {
        setClub(coordinatorData.clubs)
        await loadStats(coordinatorData.club_id)
        await loadRecentActivities(coordinatorData.club_id)
        await loadTopParticipants(coordinatorData.club_id)
      }

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadStats = async (clubId) => {
    // Участники клуба
    const { count: participantsCount } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)

    // Активные участники
    const { count: activeCount } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('status', 'active')

    // Мероприятия клуба
    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)

    // Отчёты клуба
    const { count: reportsCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)

    // Достижения участников клуба
    const { count: achievementsCount } = await supabase
      .from('achievements')
      .select('*, participants!inner(*)', { count: 'exact', head: true })
      .eq('participants.club_id', clubId)

    setStats({
      participants: participantsCount || 0,
      events: eventsCount || 0,
      reports: reportsCount || 0,
      achievements: achievementsCount || 0,
      active_participants: activeCount || 0
    })
  }

  const loadRecentActivities = async (clubId) => {
    const { data } = await supabase
      .from('events')
      .select(`
        *,
        registrations:registrations(count)
      `)
      .eq('club_id', clubId)
      .order('event_date', { ascending: false })
      .limit(5)

    setRecentActivities(data || [])
  }

  const loadTopParticipants = async (clubId) => {
    const { data } = await supabase
      .from('participants')
      .select(`
        *,
        registrations:registrations(count),
        achievements:achievements(count)
      `)
      .eq('club_id', clubId)
      .order('full_name')

    if (data) {
      // Рассчитываем рейтинг
      const ranked = data.map(p => ({
        ...p,
        rating: (p.registrations?.[0]?.count || 0) * 2 + (p.achievements?.[0]?.count || 0) * 5
      }))
      ranked.sort((a, b) => b.rating - a.rating)
      setTopParticipants(ranked.slice(0, 5))
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!club) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
            ⛔ Клуб не найден
          </h1>
          <p style={{ color: '#667085' }}>
            Вы не привязаны ни к одному КЮДу. Обратитесь к администратору.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        {/* ВЕРХНЯЯ ЧАСТЬ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              🏫 {club.name}
            </h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              {club.description || 'Клуб юных дипломатов'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/club-analytics')}
            >
              📊 Аналитика
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/reports')}
            >
              📝 Отчёт
            </button>
          </div>
        </div>

        {/* СТАТИСТИКА */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              {stats.participants}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Участников</div>
            <div style={{ fontSize: '11px', color: '#16845B' }}>
              🟢 {stats.active_participants} активных
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#174A7E' }}>
              {stats.events}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Мероприятий</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#C9A227' }}>
              {stats.achievements}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Достижений</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#6B46C1' }}>
              {stats.reports}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Отчётов</div>
          </div>
        </div>

        {/* ДВЕ КОЛОНКИ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {/* ПОСЛЕДНИЕ МЕРОПРИЯТИЯ */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📅 Последние мероприятия
            </h3>
            {recentActivities.length === 0 ? (
              <p style={{ color: '#667085', fontSize: '14px' }}>Мероприятий пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActivities.map((event) => (
                  <div key={event.id} style={{
                    padding: '12px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: '3px solid #174A7E'
                  }}>
                    <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                      {event.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
                      {event.location && ` • 📍 ${event.location}`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#98A2B3' }}>
                      👥 {event.registrations?.[0]?.count || 0} участников
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px', padding: '8px' }}
              onClick={() => navigate('/events')}
            >
              Все мероприятия →
            </button>
          </div>

          {/* ТОП УЧАСТНИКОВ */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🏆 Топ участников
            </h3>
            {topParticipants.length === 0 ? (
              <p style={{ color: '#667085', fontSize: '14px' }}>Участников пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topParticipants.map((p, index) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '10px 14px',
                      background: index === 0 ? '#FBF4DC' : '#F8FAFC',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: index === 0 ? '3px solid #C9A227' : '3px solid transparent'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                        {index === 0 && '🥇 '}
                        {index === 1 && '🥈 '}
                        {index === 2 && '🥉 '}
                        {p.full_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#667085' }}>
                        {p.class_name || 'Класс не указан'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#C9A227' }}>
                        {p.rating}
                      </div>
                      <div style={{ fontSize: '10px', color: '#98A2B3' }}>баллов</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px', padding: '8px' }}
              onClick={() => navigate('/participants')}
            >
              Все участники →
            </button>
          </div>
        </div>

        {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
        <div className="card" style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
            ⚡ Быстрые действия
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/participants')}
            >
              👥 Добавить участника
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/events')}
            >
              📅 Создать мероприятие
            </button>
            <button
              className="btn btn-gold"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/reports')}
            >
              📝 Создать отчёт
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/staff')}
            >
              👨‍🏫 Назначить тьютора
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}