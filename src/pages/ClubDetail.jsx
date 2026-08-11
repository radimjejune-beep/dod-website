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
  const [isCoordinator, setIsCoordinator] = useState(false)
  const [isAdminOrMovementCoordinator, setIsAdminOrMovementCoordinator] = useState(false)
  const [isTutor, setIsTutor] = useState(false)
  const [canViewParticipants, setCanViewParticipants] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Загружаем профиль пользователя
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const role = profileData?.role

      // ============================================
      // ПРОВЕРКА ПРАВ ДОСТУПА
      // ============================================
      // Координатор КЮДа - только свой клуб
      if (role === 'club_coordinator') {
        const { data: coordData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profileData.id)
          .eq('club_id', id)
          .single()
        
        if (!coordData) {
          setLoading(false)
          return (
            <div className="fade-in">
              <Navigation profile={profileData} />
              <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
                <h1>⛔ Доступ запрещён</h1>
                <p style={{ color: '#667085' }}>Вы можете просматривать только свой клуб</p>
                <button className="btn btn-primary" onClick={() => navigate('/clubs')} style={{ marginTop: '20px' }}>
                  Вернуться к списку
                </button>
              </div>
            </div>
          )
        }
        setIsCoordinator(true)
        setCanViewParticipants(true)
      } 
      // Админ и Координатор движения - видят всё
      else if (role === 'admin' || role === 'movement_coordinator') {
        setIsAdminOrMovementCoordinator(true)
        setCanViewParticipants(true)
      } 
      // Тьютор - видят всё (просмотр)
      else if (role === 'tutor') {
        setIsTutor(true)
        setCanViewParticipants(true)
      }
      // Участник и Родитель - НЕ видят участников
      else if (role === 'participant' || role === 'parent') {
        setCanViewParticipants(false)
      }

      // Загружаем информацию о клубе (всегда)
      const { data: clubData } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single()
      
      if (!clubData) {
        setLoading(false)
        return
      }
      setClub(clubData)

      // Загружаем участников ТОЛЬКО если есть права
      if (canViewParticipants) {
        const { data: participantsData, error } = await supabase
          .from('club_participants')
          .select(`
            profile_id,
            status,
            joined_at,
            profiles:profile_id (
              id,
              full_name,
              email,
              phone,
              birth_date,
              school,
              class_name,
              interests,
              bio,
              position,
              status,
              avatar_url,
              points
            )
          `)
          .eq('club_id', id)
          .eq('status', 'active')

        if (!error && participantsData) {
          const participantsWithStats = await Promise.all(
            (participantsData || []).map(async (item) => {
              const p = item.profiles
              if (!p) return null

              const { count: achievementsCount } = await supabase
                .from('user_achievements')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', p.id)

              const { count: eventsCount } = await supabase
                .from('event_participants')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', p.id)
                .eq('status', 'confirmed')

              const points = p.points || 0
              const rating = (achievementsCount || 0) * 10 + (eventsCount || 0) * 5 + points

              return {
                ...p,
                achievementCount: achievementsCount || 0,
                eventCount: eventsCount || 0,
                points,
                rating,
                joined_at: item.joined_at
              }
            })
          )

          const validParticipants = participantsWithStats
            .filter(p => p !== null)
            .sort((a, b) => b.rating - a.rating)

          setParticipants(validParticipants)
        }
      }

    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
    }
    setLoading(false)
  }

  // Функция для удаления участника из клуба (только для координатора и админа)
  const handleRemoveParticipant = async (profileId) => {
    if (!confirm('Удалить участника из клуба?')) return

    try {
      const { error } = await supabase
        .from('club_participants')
        .delete()
        .eq('club_id', id)
        .eq('profile_id', profileId)

      if (error) throw error
      setParticipants(participants.filter(p => p.id !== profileId))
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
  }

  const canEdit = isCoordinator || isAdminOrMovementCoordinator

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!club) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ color: '#0B1F3A' }}>КЮД не найден</h1>
          <button className="btn btn-primary" onClick={() => navigate('/clubs')} style={{ marginTop: '20px' }}>
            ← Назад к списку
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px', maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <button 
          className="btn btn-outline" 
          onClick={() => navigate('/clubs')} 
          style={{ 
            marginBottom: '20px',
            padding: '8px 20px',
            background: 'transparent',
            border: '1.5px solid #D5DCE7',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#0B1F3A',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#F4F6F9'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          ← Назад к списку
        </button>

        {/* Информация о клубе */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '24px',
          border: '1px solid #E2E7EF',
          boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A', margin: 0 }}>
                🏫 {club.name}
              </h1>
              {club.description && (
                <p style={{ color: '#667085', marginTop: '8px', fontSize: '15px' }}>{club.description}</p>
              )}
              <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
                {canViewParticipants && (
                  <span style={{ fontSize: '14px', color: '#667085' }}>
                    👥 Участников: <strong>{participants.length}</strong>
                  </span>
                )}
                {isCoordinator && (
                  <span style={{
                    padding: '4px 16px',
                    borderRadius: '20px',
                    background: '#FBF4DC',
                    color: '#8A6A00',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    ⭐ Вы координатор
                  </span>
                )}
                {isAdminOrMovementCoordinator && (
                  <span style={{
                    padding: '4px 16px',
                    borderRadius: '20px',
                    background: '#EAF2FA',
                    color: '#174A7E',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    🔧 Администратор
                  </span>
                )}
                {isTutor && (
                  <span style={{
                    padding: '4px 16px',
                    borderRadius: '20px',
                    background: '#EAF2FA',
                    color: '#174A7E',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    📚 Тьютор
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================
            СПИСОК УЧАСТНИКОВ (только для тех, у кого есть права)
            ============================================ */}
        {canViewParticipants ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            overflow: 'auto',
            border: '1px solid #E2E7EF',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#F4F6F9', borderBottom: '2px solid #E2E7EF' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>#</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>ФИО</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Класс</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>🏆 Достижений</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>📅 Событий</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>⭐ Баллы</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>Рейтинг</th>
                  {canEdit && (
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>Действия</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>👀</div>
                      В этом КЮДе пока нет участников
                    </td>
                  </tr>
                ) : (
                  participants.map((p, index) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F4F6F9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#174A7E' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0B1F3A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: p.avatar_url ? 'none' : 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            flexShrink: 0,
                            overflow: 'hidden'
                          }}>
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              p.full_name?.charAt(0) || '?'
                            )}
                          </div>
                          {p.full_name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#667085' }}>{p.class_name || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#667085' }}>
                        {p.achievementCount || 0}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#667085' }}>
                        {p.eventCount || 0}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#667085' }}>
                        {p.points || 0}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          background: p.rating >= 50 ? '#E8F5EF' : p.rating >= 20 ? '#FBF4DC' : '#FCEBEC',
                          color: p.rating >= 50 ? '#16845B' : p.rating >= 20 ? '#8A6A00' : '#B3262E',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {p.rating}
                        </span>
                      </td>
                      {canEdit && (
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              style={{
                                padding: '4px 12px',
                                background: '#F4F6F9',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#E2E7EF'}
                              onMouseLeave={(e) => e.target.style.background = '#F4F6F9'}
                              onClick={() => navigate(`/participant/${p.id}`)}
                            >
                              👁️ Профиль
                            </button>
                            {canEdit && (
                              <button
                                style={{
                                  padding: '4px 12px',
                                  background: '#FCEBEC',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: '#B3262E',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#FCEBEC'}
                                onMouseLeave={(e) => e.target.style.background = '#FCEBEC'}
                                onClick={() => handleRemoveParticipant(p.id)}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          // ============================================
          // ДЛЯ УЧАСТНИКОВ И РОДИТЕЛЕЙ - НЕ ПОКАЗЫВАЕМ УЧАСТНИКОВ
          // ============================================
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            border: '1px solid #E2E7EF',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h3 style={{ fontSize: '20px', color: '#0B1F3A', marginBottom: '8px' }}>
              Информация о КЮДе
            </h3>
            <p style={{ color: '#667085', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              Здесь вы можете посмотреть информацию о клубе.
              Список участников доступен только координаторам и администраторам.
            </p>
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: '#F4F6F9',
              borderRadius: '10px',
              display: 'inline-block'
            }}>
              <span style={{ fontSize: '14px', color: '#667085' }}>
                📋 Всего участников: <strong>{participants.length}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}