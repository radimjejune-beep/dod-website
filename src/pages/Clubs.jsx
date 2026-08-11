// src/pages/Clubs.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Clubs() {
  const [profile, setProfile] = useState(null)
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [participantsCount, setParticipantsCount] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      let clubsData = []

      if (profileData.role === 'club_coordinator') {
        // Координатор КЮДа - только свой клуб
        const { data: coordData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profileData.id)

        if (coordData && coordData.length > 0) {
          const clubIds = coordData.map(c => c.club_id)
          const { data: clubsResult } = await supabase
            .from('clubs')
            .select('*')
            .in('id', clubIds)
            .order('name')
          clubsData = clubsResult || []
        }
      } else {
        // Все остальные роли - видят все клубы
        const { data: allClubs } = await supabase
          .from('clubs')
          .select('*')
          .order('name')
        clubsData = allClubs || []
      }

      setClubs(clubsData)

      // Считаем количество участников
      const counts = {}
      for (const club of clubsData) {
        const { count } = await supabase
          .from('club_participants')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', club.id)
          .eq('status', 'active')
        counts[club.id] = count || 0
      }
      setParticipantsCount(counts)

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ color: '#667085', marginTop: '16px' }}>Загрузка...</p>
        </div>
      </div>
    )
  }

  const isCoordinator = profile?.role === 'club_coordinator'

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px', maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
          {isCoordinator ? '🏫 Мой КЮД' : '🏫 Клубы юных дипломатов'}
        </h1>
        <p style={{ color: '#667085', marginBottom: '24px', fontSize: '16px' }}>
          {isCoordinator 
            ? 'Клуб, в котором вы являетесь координатором' 
            : 'Все клубы юных дипломатов движения'}
        </p>

        {clubs.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px 40px',
            textAlign: 'center',
            border: '1px solid #E2E7EF',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏫</div>
            <h3 style={{ fontSize: '20px', color: '#0B1F3A', marginBottom: '8px' }}>
              {isCoordinator ? 'Клуб не найден' : 'КЮДов пока нет'}
            </h3>
            {isCoordinator ? (
              <p style={{ color: '#667085', fontSize: '16px' }}>
                Вы не привязаны ни к одному клубу. 
                Обратитесь к администратору для назначения.
              </p>
            ) : (
              <p style={{ color: '#667085', fontSize: '16px' }}>
                Клубы будут добавлены администратором
              </p>
            )}
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '20px' 
          }}>
            {clubs.map((club) => (
              <div 
                key={club.id} 
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  border: isCoordinator ? '2px solid #C9A227' : '1px solid #E2E7EF',
                  boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => navigate(`/club/${club.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(11, 31, 58, 0.06)'
                }}
              >
                {isCoordinator && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#C9A227',
                    color: '#0B1F3A',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    boxShadow: '0 2px 8px rgba(201, 162, 39, 0.3)'
                  }}>
                    ⭐ Ваш КЮД
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    🏛️
                  </div>
                  <div>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: '#0B1F3A', 
                      margin: 0 
                    }}>
                      {club.name}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#667085' }}>
                      👥 {participantsCount[club.id] || 0} участников
                    </div>
                  </div>
                </div>

                {club.description && (
                  <p style={{ 
                    color: '#667085', 
                    fontSize: '14px', 
                    margin: '8px 0 16px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {club.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: '1px solid #F4F6F9'
                }}>
                  <span style={{ fontSize: '13px', color: '#98A2B3' }}>
                    {club.created_at && `Создан: ${new Date(club.created_at).toLocaleDateString('ru-RU')}`}
                  </span>
                  <span style={{
                    color: '#C9A227',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    Подробнее →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}