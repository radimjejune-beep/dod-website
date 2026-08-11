// src/pages/TutorDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function TutorDashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    assignments: 0,
    reviews: 0,
    events: 0,
    pending_invitations: 0
  })
  const [recentAssignments, setRecentAssignments] = useState([])
  const [pendingInvitations, setPendingInvitations] = useState([])
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
      await loadRecentAssignments()
      await loadPendingInvitations()

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadStats = async () => {
    // Назначения (принятые)
    const { count: assignmentsCount } = await supabase
      .from('event_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', profile?.id)
      .eq('status', 'accepted')

    // Приглашения в ожидании
    const { count: pendingCount } = await supabase
      .from('event_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', profile?.id)
      .eq('status', 'pending')

    // Оценки (review)
    const { count: reviewsCount } = await supabase
      .from('participation_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('reviewer_id', profile?.id)

    // Мероприятия (уникальные)
    const { data: assignmentsData } = await supabase
      .from('event_assignments')
      .select('event_id')
      .eq('staff_id', profile?.id)
      .eq('status', 'accepted')

    const uniqueEvents = new Set(assignmentsData?.map(a => a.event_id) || [])
    const eventsCount = uniqueEvents.size

    setStats({
      assignments: assignmentsCount || 0,
      reviews: reviewsCount || 0,
      events: eventsCount || 0,
      pending_invitations: pendingCount || 0
    })
  }

  const loadRecentAssignments = async () => {
    const { data } = await supabase
      .from('event_assignments')
      .select(`
        *,
        events:event_id (id, title, event_date, location),
        assigned_by_profile:assigned_by (full_name)
      `)
      .eq('staff_id', profile?.id)
      .eq('status', 'accepted')
      .order('assigned_at', { ascending: false })
      .limit(5)

    setRecentAssignments(data || [])
  }

  const loadPendingInvitations = async () => {
    const { data } = await supabase
      .from('event_assignments')
      .select(`
        *,
        events:event_id (id, title, event_date, location),
        assigned_by_profile:assigned_by (full_name)
      `)
      .eq('staff_id', profile?.id)
      .eq('status', 'pending')
      .order('assigned_at', { ascending: false })
      .limit(5)

    setPendingInvitations(data || [])
  }

  const handleRespondInvitation = async (assignmentId, status) => {
    setLoading(true)

    try {
      const { error } = await supabase
        .from('event_assignments')
        .update({
          status: status,
          responded_at: new Date().toISOString()
        })
        .eq('id', assignmentId)

      if (error) throw error

      // Перезагружаем данные
      await loadStats()
      await loadRecentAssignments()
      await loadPendingInvitations()
    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
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
              📚 Мой кабинет тьютора
            </h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              {profile?.full_name} • Тьютор движения «Дипломаты будущего»
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/my-journal')}
            >
              📋 Мой журнал
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/staff-calendar')}
            >
              📅 Календарь
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
              {stats.events}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Мероприятий</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#174A7E' }}>
              {stats.assignments}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Назначений</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#C9A227' }}>
              {stats.reviews}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Оценок</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px', borderTop: '3px solid #C9A227' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: stats.pending_invitations > 0 ? '#C9A227' : '#667085' }}>
              {stats.pending_invitations}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Приглашений</div>
            {stats.pending_invitations > 0 && (
              <div style={{ fontSize: '11px', color: '#C9A227' }}>
                ⏳ Ожидают ответа
              </div>
            )}
          </div>
        </div>

        {/* ДВЕ КОЛОНКИ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {/* ОЖИДАЮЩИЕ ПРИГЛАШЕНИЯ */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📨 Ожидающие приглашения
            </h3>
            {pendingInvitations.length === 0 ? (
              <p style={{ color: '#667085', fontSize: '14px' }}>Нет ожидающих приглашений</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingInvitations.map((inv) => (
                  <div key={inv.id} style={{
                    padding: '12px',
                    background: '#FBF4DC',
                    borderRadius: '8px',
                    borderLeft: '3px solid #C9A227'
                  }}>
                    <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                      {inv.events?.title || 'Мероприятие'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      📅 {inv.events?.event_date ? new Date(inv.events.event_date).toLocaleDateString('ru-RU') : ''}
                      {inv.events?.location && ` • 📍 ${inv.events.location}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      👤 Пригласил: {inv.assigned_by_profile?.full_name || 'Неизвестно'}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-success"
                        style={{ padding: '4px 16px', fontSize: '12px' }}
                        onClick={() => handleRespondInvitation(inv.id, 'accepted')}
                        disabled={loading}
                      >
                        ✅ Принять
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 16px', fontSize: '12px' }}
                        onClick={() => handleRespondInvitation(inv.id, 'declined')}
                        disabled={loading}
                      >
                        ❌ Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pendingInvitations.length > 0 && (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '12px', padding: '8px' }}
                onClick={() => navigate('/staff')}
              >
                Все приглашения →
              </button>
            )}
          </div>

          {/* ПОСЛЕДНИЕ НАЗНАЧЕНИЯ */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📋 Мои мероприятия
            </h3>
            {recentAssignments.length === 0 ? (
              <p style={{ color: '#667085', fontSize: '14px' }}>У вас пока нет назначений</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentAssignments.map((assignment) => (
                  <div key={assignment.id} style={{
                    padding: '12px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: '3px solid #174A7E'
                  }}>
                    <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                      {assignment.events?.title || 'Мероприятие'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      📅 {assignment.events?.event_date ? new Date(assignment.events.event_date).toLocaleDateString('ru-RU') : ''}
                      {assignment.events?.location && ` • 📍 ${assignment.events.location}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      🎯 {assignment.role || 'Роль не указана'}
                      {assignment.is_lead_tutor && (
                        <span style={{
                          marginLeft: '6px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: '#FBF4DC',
                          color: '#8A6A00'
                        }}>
                          ⭐ Старший
                        </span>
                      )}
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '8px', padding: '4px', fontSize: '12px' }}
                      onClick={() => navigate(`/tutor-journal/${assignment.event_id}`)}
                    >
                      📝 Перейти к журналу
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px', padding: '8px' }}
              onClick={() => navigate('/my-journal')}
            >
              Все мероприятия →
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
              onClick={() => navigate('/my-journal')}
            >
              📋 Мой журнал
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/staff-calendar')}
            >
              📅 Календарь
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/staff')}
            >
              📨 Приглашения
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/participants')}
            >
              👥 Участники
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}