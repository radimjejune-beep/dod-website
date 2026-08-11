// src/pages/MovementCoordinatorDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function MovementCoordinatorDashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total_tutors: 0,
    total_events: 0,
    total_reviews: 0,
    pending_requests: 0,
    active_tutors: 0
  })
  const [tutors, setTutors] = useState([])
  const [recentReviews, setRecentReviews] = useState([])
  const [selectedTutor, setSelectedTutor] = useState(null)
  const [showTutorReviews, setShowTutorReviews] = useState(false)
  const [tutorReviews, setTutorReviews] = useState([])
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

      await loadStats()
      await loadTutors()
      await loadRecentReviews()

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadStats = async () => {
    // Все тьюторы
    const { count: tutorsCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'tutor')

    // Активные тьюторы (у которых есть назначения)
    const { data: activeTutors } = await supabase
      .from('event_assignments')
      .select('staff_id')
      .eq('status', 'accepted')

    const uniqueTutors = new Set(activeTutors?.map(a => a.staff_id) || [])

    // Все мероприятия
    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })

    // Все оценки
    const { count: reviewsCount } = await supabase
      .from('participation_reviews')
      .select('*', { count: 'exact', head: true })

    // Ожидающие запросы на тьюторов
    const { count: pendingRequests } = await supabase
      .from('tutor_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    setStats({
      total_tutors: tutorsCount || 0,
      total_events: eventsCount || 0,
      total_reviews: reviewsCount || 0,
      pending_requests: pendingRequests || 0,
      active_tutors: uniqueTutors.size || 0
    })
  }

  const loadTutors = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        *,
        event_assignments:event_assignments!staff_id (status, event_id)
      `)
      .eq('role', 'tutor')
      .order('full_name')

    if (data) {
      const tutorsWithStats = await Promise.all(data.map(async (tutor) => {
        const { count: assignmentsCount } = await supabase
          .from('event_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('staff_id', tutor.id)
          .eq('status', 'accepted')

        const { count: reviewsCount } = await supabase
          .from('participation_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('reviewer_id', tutor.id)

        return {
          ...tutor,
          assignments: assignmentsCount || 0,
          reviews: reviewsCount || 0
        }
      }))

      setTutors(tutorsWithStats)
    }
  }

  const loadRecentReviews = async () => {
    const { data } = await supabase
      .from('participation_reviews')
      .select(`
        *,
        participants:participant_id (full_name, school, class_name),
        events:event_id (title),
        reviewers:reviewer_id (full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    setRecentReviews(data || [])
  }

  const loadTutorReviews = async (tutorId) => {
    const { data } = await supabase
      .from('participation_reviews')
      .select(`
        *,
        participants:participant_id (full_name, school, class_name, clubs:club_id (name)),
        events:event_id (title, event_date)
      `)
      .eq('reviewer_id', tutorId)
      .order('created_at', { ascending: false })

    setTutorReviews(data || [])
    setShowTutorReviews(true)
  }

  const getRatingColor = (value) => {
    const goodValues = ['active', 'excellent', 'high', 'reliable', 'confident']
    const midValues = ['moderate', 'good', 'average', 'developing']
    if (goodValues.includes(value)) return '#16845B'
    if (midValues.includes(value)) return '#C9A227'
    return '#B3262E'
  }

  const getRatingLabel = (field, value) => {
    const labels = {
      engagement: { active: '🌟 Активно', moderate: '📊 Умеренно', passive: '😐 Пассивно' },
      teamwork: { excellent: '⭐ Отлично', good: '👍 Хорошо', developing: '📈 Развивается' },
      communication: { confident: '🗣️ Уверенная', developing: '📈 Развивается', needs_support: '🤝 Требует поддержки' },
      initiative: { high: '🚀 Высокая', average: '📊 Средняя', low: '📉 Низкая' },
      responsibility: { reliable: '✅ Надёжный', average: '📊 Средний', needs_attention: '⚠️ Требует внимания' }
    }
    return labels[field]?.[value] || value
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (profile?.role !== 'movement_coordinator' && profile?.role !== 'admin') {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>⛔ Доступ запрещён</h1>
          <p style={{ color: '#667085' }}>Только координатор движения или администратор</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
          📊 Дашборд координатора движения
        </h1>
        <p style={{ color: '#667085', marginBottom: '24px' }}>
          Управление тьюторами и контроль качества
        </p>

        {/* СТАТИСТИКА */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              {stats.total_tutors}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Тьюторов</div>
            <div style={{ fontSize: '11px', color: '#16845B' }}>
              🟢 {stats.active_tutors} активных
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#174A7E' }}>
              {stats.total_reviews}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Оценок</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#C9A227' }}>
              {stats.total_events}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Мероприятий</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px', borderTop: stats.pending_requests > 0 ? '3px solid #C9A227' : '3px solid transparent' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: stats.pending_requests > 0 ? '#C9A227' : '#667085' }}>
              {stats.pending_requests}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Запросов</div>
            {stats.pending_requests > 0 && (
              <button
                className="btn btn-primary"
                style={{ padding: '4px 12px', fontSize: '11px', marginTop: '4px' }}
                onClick={() => navigate('/tutor-requests')}
              >
                📋 Рассмотреть
              </button>
            )}
          </div>
        </div>

        {/* ТЬЮТОРЫ */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            👥 Тьюторы
          </h3>
          {tutors.length === 0 ? (
            <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>Тьюторов пока нет</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tutors.map((tutor) => (
                <div
                  key={tutor.id}
                  style={{
                    padding: '14px 18px',
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E7EF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                      {tutor.full_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>
                      📅 {tutor.assignments} назначений • 🏆 {tutor.reviews} оценок
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => {
                        setSelectedTutor(tutor)
                        loadTutorReviews(tutor.id)
                      }}
                    >
                      📋 Журнал
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => navigate('/staff')}
                    >
                      ⚙️ Управление
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ПОСЛЕДНИЕ ОЦЕНКИ */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            📝 Последние оценки тьюторов
          </h3>
          {recentReviews.length === 0 ? (
            <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>Оценок пока нет</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    padding: '12px 16px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: '4px solid #174A7E'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px' }}>
                    <div>
                      <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                        {review.participants?.full_name || 'Участник'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#667085' }}>
                        {review.events?.title || 'Мероприятие'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', color: '#667085' }}>
                        👤 {review.reviewers?.full_name || 'Тьютор'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                        📅 {new Date(review.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {review.engagement && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        background: getRatingColor(review.engagement) === '#16845B' ? '#E8F5EF' : 
                                   getRatingColor(review.engagement) === '#C9A227' ? '#FBF4DC' : '#FCEBEC',
                        color: getRatingColor(review.engagement)
                      }}>
                        {getRatingLabel('engagement', review.engagement)}
                      </span>
                    )}
                    {review.teamwork && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        background: getRatingColor(review.teamwork) === '#16845B' ? '#E8F5EF' : 
                                   getRatingColor(review.teamwork) === '#C9A227' ? '#FBF4DC' : '#FCEBEC',
                        color: getRatingColor(review.teamwork)
                      }}>
                        {getRatingLabel('teamwork', review.teamwork)}
                      </span>
                    )}
                    {review.initiative && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        background: getRatingColor(review.initiative) === '#16845B' ? '#E8F5EF' : 
                                   getRatingColor(review.initiative) === '#C9A227' ? '#FBF4DC' : '#FCEBEC',
                        color: getRatingColor(review.initiative)
                      }}>
                        {getRatingLabel('initiative', review.initiative)}
                      </span>
                    )}
                    {review.comment && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        background: '#EAF2FA',
                        color: '#174A7E'
                      }}>
                        💬 {review.comment}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО — ЖУРНАЛ ТЬЮТОРА */}
      {showTutorReviews && selectedTutor && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(11, 31, 58, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowTutorReviews(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '700px',
              width: '100%',
              padding: '32px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTutorReviews(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#98A2B3',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              📋 Журнал тьютора
            </h2>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              {selectedTutor.full_name} — {tutorReviews.length} оценок
            </p>

            {tutorReviews.length === 0 ? (
              <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>
                У этого тьютора пока нет оценок
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tutorReviews.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      padding: '12px 16px',
                      background: '#F8FAFC',
                      borderRadius: '8px',
                      borderLeft: '4px solid #C9A227'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                          {review.participants?.full_name || 'Участник'}
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '12px',
                            color: '#667085'
                          }}>
                            ({review.participants?.clubs?.name || 'Без клуба'})
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#667085' }}>
                          {review.events?.title || 'Мероприятие'}
                          {review.events?.event_date && ` • ${new Date(review.events.event_date).toLocaleDateString('ru-RU')}`}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                        📅 {new Date(review.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {review.engagement && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          background: review.engagement === 'active' ? '#E8F5EF' : 
                                     review.engagement === 'moderate' ? '#FBF4DC' : '#FCEBEC',
                          color: review.engagement === 'active' ? '#16845B' : 
                                 review.engagement === 'moderate' ? '#8A6A00' : '#B3262E'
                        }}>
                          {getRatingLabel('engagement', review.engagement)}
                        </span>
                      )}
                      {review.teamwork && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          background: review.teamwork === 'excellent' ? '#E8F5EF' : 
                                     review.teamwork === 'good' ? '#FBF4DC' : '#FCEBEC',
                          color: review.teamwork === 'excellent' ? '#16845B' : 
                                 review.teamwork === 'good' ? '#8A6A00' : '#B3262E'
                        }}>
                          {getRatingLabel('teamwork', review.teamwork)}
                        </span>
                      )}
                      {review.initiative && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          background: review.initiative === 'high' ? '#E8F5EF' : 
                                     review.initiative === 'average' ? '#FBF4DC' : '#FCEBEC',
                          color: review.initiative === 'high' ? '#16845B' : 
                                 review.initiative === 'average' ? '#8A6A00' : '#B3262E'
                        }}>
                          {getRatingLabel('initiative', review.initiative)}
                        </span>
                      )}
                      {review.communication && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          background: review.communication === 'confident' ? '#E8F5EF' : 
                                     review.communication === 'developing' ? '#FBF4DC' : '#FCEBEC',
                          color: review.communication === 'confident' ? '#16845B' : 
                                 review.communication === 'developing' ? '#8A6A00' : '#B3262E'
                        }}>
                          {getRatingLabel('communication', review.communication)}
                        </span>
                      )}
                      {review.responsibility && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          background: review.responsibility === 'reliable' ? '#E8F5EF' : 
                                     review.responsibility === 'average' ? '#FBF4DC' : '#FCEBEC',
                          color: review.responsibility === 'reliable' ? '#16845B' : 
                                 review.responsibility === 'average' ? '#8A6A00' : '#B3262E'
                        }}>
                          {getRatingLabel('responsibility', review.responsibility)}
                        </span>
                      )}
                      {review.comment && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          background: '#EAF2FA',
                          color: '#174A7E'
                        }}>
                          💬 {review.comment}
                        </span>
                      )}
                    </div>
                    {review.strengths && (
                      <div style={{ fontSize: '12px', color: '#16845B', marginTop: '4px' }}>
                        ✅ Сильные стороны: {review.strengths}
                      </div>
                    )}
                    {review.areas_for_growth && (
                      <div style={{ fontSize: '12px', color: '#B3262E', marginTop: '2px' }}>
                        📈 Зоны роста: {review.areas_for_growth}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => setShowTutorReviews(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}