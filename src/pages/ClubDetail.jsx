// src/pages/ClubDetail.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function ClubDetail() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [club, setClub] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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

      const { data: clubData } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single()
      setClub(clubData)

      const { data: participantsData } = await supabase
        .from('participants')
        .select(`
          *,
          achievements:achievements(count),
          registrations:registrations(status)
        `)
        .eq('club_id', id)
        .order('full_name')

      const participantsWithRating = (participantsData || []).map(p => {
        const achievementCount = p.achievements?.[0]?.count || 0
        const eventCount = p.registrations?.filter(r => r.status === 'attended').length || 0
        const rating = achievementCount * 10 + eventCount * 5
        return { ...p, rating, achievementCount, eventCount }
      })

      participantsWithRating.sort((a, b) => b.rating - a.rating)
      setParticipants(participantsWithRating)

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

  if (!club) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>❌ КЮД не найден</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <button className="btn btn-outline" onClick={() => navigate('/clubs')} style={{ marginBottom: '20px' }}>
          ← Назад к списку
        </button>

        <div className="hero" style={{ marginBottom: '24px' }}>
          <h1>🏫 {club.name}</h1>
          {club.description && <p>{club.description}</p>}
          <p style={{ marginTop: '8px', fontSize: '14px', opacity: 0.8 }}>
            👥 Участников: {participants.length}
          </p>
        </div>

        <div className="card" style={{ padding: '0', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gray-border)', background: 'var(--gray-light)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>ФИО</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Класс</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>🏆 Достижений</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>📅 Событий</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>⭐ Рейтинг</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    В этом КЮДе пока нет участников
                  </td>
                </tr>
              ) : (
                participants.map((p, index) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--mid-blue)' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{p.full_name}</td>
                    <td style={{ padding: '12px 16px' }}>{p.class_name || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{p.achievementCount || 0}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{p.eventCount || 0}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        background: p.rating >= 50 ? '#C6F6D5' : p.rating >= 20 ? '#FEFCBF' : '#FED7D7',
                        color: p.rating >= 50 ? '#276749' : p.rating >= 20 ? '#975A16' : '#9B2C2C',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        {p.rating}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => navigate(`/participant/${p.id}`)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        👁️ Профиль
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}