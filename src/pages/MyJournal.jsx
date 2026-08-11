// src/pages/MyJournal.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function MyJournal() {
  const [profile, setProfile] = useState(null)
  const [assignments, setAssignments] = useState([])
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

      // Загружаем мероприятия, где тьютор закреплён
      const { data: assignmentsData } = await supabase
        .from('event_assignments')
        .select(`
          *,
          events:event_id (id, title, event_date, description, location),
          staff:staff_id (full_name, role)
        `)
        .eq('staff_id', profile?.id)
        .in('status', ['accepted', 'pending'])
        .order('assigned_at', { ascending: false })

      setAssignments(assignmentsData || [])
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
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
          📋 Мой журнал
        </h1>
        <p style={{ color: '#667085', fontSize: '14px', marginBottom: '20px' }}>
          Ваши мероприятия для оценки участников
        </p>

        {assignments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '18px', color: '#667085' }}>
              У вас пока нет мероприятий для оценки
            </p>
            <p style={{ color: '#98A2B3', fontSize: '14px' }}>
              Когда вас назначат на мероприятие, оно появится здесь
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {assignments.map((a) => (
              <div
                key={a.id}
                className="card"
                style={{
                  padding: '20px 24px',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${a.is_lead_tutor ? '#C9A227' : '#174A7E'}`,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.10)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                onClick={() => navigate(`/tutor-journal/${a.event_id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px', color: '#0B1F3A' }}>
                      {a.events?.title || 'Мероприятие'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                      📅 {a.events?.event_date ? new Date(a.events.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                      {a.events?.location && ` • 📍 ${a.events.location}`}
                    </div>
                    <div style={{ fontSize: '13px', color: '#667085', marginTop: '2px' }}>
                      🎯 Роль: <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: '#EAF2FA',
                        color: '#174A7E'
                      }}>
                        {a.role}
                      </span>
                      {a.is_lead_tutor && (
                        <span style={{
                          marginLeft: '8px',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: '#FBF4DC',
                          color: '#8A6A00'
                        }}>
                          ⭐ Старший тьютор
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      padding: '2px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: a.is_lead_tutor ? '#FBF4DC' : '#EAF2FA',
                      color: a.is_lead_tutor ? '#8A6A00' : '#174A7E'
                    }}>
                      {a.is_lead_tutor ? '⭐ Оценивать' : '👁️ Просмотр'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}