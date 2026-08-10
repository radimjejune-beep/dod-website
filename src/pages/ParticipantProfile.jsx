// src/pages/ParticipantProfile.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function ParticipantProfile() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

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

      const { data: participantData, error: pError } = await supabase
        .from('participants')
        .select(`
          *,
          clubs:club_id (name)
        `)
        .eq('id', id)
        .single()

      if (pError) throw pError
      setParticipant(participantData)

      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .eq('participant_id', id)
        .order('date', { ascending: false })

      setAchievements(achievementsData || [])

      const { data: activitiesData } = await supabase
        .from('registrations')
        .select(`
          *,
          events:event_id (title, event_date, type)
        `)
        .eq('participant_id', id)
        .order('registered_at', { ascending: false })

      setActivities(activitiesData || [])

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

  if (!participant) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>❌ Участник не найден</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1>👤 {participant.full_name}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {participant.clubs?.name || 'Без клуба'} • {participant.class_name || 'Класс не указан'}
            </p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>📋 Основная информация</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div><strong>ФИО:</strong> {participant.full_name}</div>
            <div><strong>Дата рождения:</strong> {participant.birth_date || '—'}</div>
            <div><strong>Школа:</strong> {participant.school || '—'}</div>
            <div><strong>Класс:</strong> {participant.class_name || '—'}</div>
            <div><strong>Клуб:</strong> {participant.clubs?.name || '—'}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>🏆 Достижения</h3>
          {achievements.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Достижений пока нет</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {achievements.map((a) => (
                <li key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-border)' }}>
                  <strong>{a.title}</strong>
                  {a.description && <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>— {a.description}</span>}
                  {a.date && <span style={{ color: 'var(--text-secondary)', fontSize: '12px', float: 'right' }}>📅 {new Date(a.date).toLocaleDateString('ru-RU')}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3>📅 Активность</h3>
          {activities.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Участий в мероприятиях пока нет</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {activities.map((a) => (
                <li key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-border)' }}>
                  <strong>{a.events?.title || 'Мероприятие'}</strong>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                    {a.events?.event_date ? new Date(a.events.event_date).toLocaleDateString('ru-RU') : ''}
                  </span>
                  <span style={{ 
                    marginLeft: '12px',
                    padding: '2px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    background: a.status === 'attended' ? '#C6F6D5' : a.status === 'cancelled' ? '#FED7D7' : '#FEFCBF',
                    color: a.status === 'attended' ? '#276749' : a.status === 'cancelled' ? '#9B2C2C' : '#975A16'
                  }}>
                    {a.status === 'attended' ? '✅ Участвовал' : a.status === 'cancelled' ? '❌ Отменено' : '📝 Записан'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}