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
  const [canViewParticipants, setCanViewParticipants] = useState(false)
  const [president, setPresident] = useState(null)
  const [showPresidentForm, setShowPresidentForm] = useState(false)
  const [showEditClubForm, setShowEditClubForm] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [clubForm, setClubForm] = useState({
    name: '',
    description: '',
    city: '',
    school: '',
    contact_email: '',
    contact_phone: '',
    leader_name: ''
  })
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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const role = profileData?.role

      // Проверяем права доступа
      if (role === 'club_coordinator') {
        const { data: coordData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profileData.id)
          .eq('club_id', id)
          .single()
        
        if (coordData) {
          setIsCoordinator(true)
          setCanViewParticipants(true)
        } else {
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
      } else if (role === 'admin' || role === 'movement_coordinator') {
        setIsAdminOrMovementCoordinator(true)
        setCanViewParticipants(true)
      } else if (role === 'tutor') {
        setCanViewParticipants(true)
      } else if (role === 'participant' || role === 'parent') {
        setCanViewParticipants(false)
      }

      // Загружаем информацию о клубе
      const { data: clubData } = await supabase
        .from('clubs')
        .select(`
          *,
          president:president_id (id, full_name, avatar_url, school, class_name)
        `)
        .eq('id', id)
        .single()
      
      if (!clubData) {
        setLoading(false)
        return
      }
      setClub(clubData)
      setPresident(clubData.president)
      
      // Заполняем форму данными клуба
      setClubForm({
        name: clubData.name || '',
        description: clubData.description || '',
        city: clubData.city || '',
        school: clubData.school || '',
        contact_email: clubData.contact_email || '',
        contact_phone: clubData.contact_phone || '',
        leader_name: clubData.leader_name || ''
      })

      // Загружаем участников
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

  // ============================================================
  // СОХРАНЕНИЕ ИНФОРМАЦИИ О КЛУБЕ
  // ============================================================
  const handleSaveClub = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('clubs')
        .update({
          name: clubForm.name,
          description: clubForm.description,
          city: clubForm.city,
          school: clubForm.school,
          contact_email: clubForm.contact_email,
          contact_phone: clubForm.contact_phone,
          leader_name: clubForm.leader_name
        })
        .eq('id', id)

      if (error) throw error

      setMessage('✅ Информация о клубе обновлена!')
      setMessageType('success')
      setShowEditClubForm(false)
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setLoading(false)
  }

  // ============================================================
  // НАЗНАЧЕНИЕ ПРЕЗИДЕНТА
  // ============================================================
  const handleAssignPresident = async (participantId) => {
    const participant = participants.find(p => p.id === participantId)
    if (!participant) return

    if (!confirm(`Назначить ${participant.full_name} президентом КЮДа?`)) return

    try {
      const { error } = await supabase
        .from('clubs')
        .update({ president_id: participantId })
        .eq('id', id)

      if (error) throw error

      setMessage(`✅ ${participant.full_name} назначен президентом!`)
      setMessageType('success')
      setShowPresidentForm(false)
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  // ============================================================
  // УДАЛЕНИЕ ПРЕЗИДЕНТА
  // ============================================================
  const handleRemovePresident = async () => {
    if (!confirm(`Снять ${president?.full_name} с должности президента?`)) return

    try {
      const { error } = await supabase
        .from('clubs')
        .update({ president_id: null })
        .eq('id', id)

      if (error) throw error

      setMessage('✅ Президент снят с должности')
      setMessageType('success')
      setShowPresidentForm(false)
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const canManageClub = isCoordinator || isAdminOrMovementCoordinator
  const canManagePresident = isCoordinator || isAdminOrMovementCoordinator

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

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}

        {/* ===== ИНФОРМАЦИЯ О КЛУБЕ ===== */}
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
              {club.city && (
                <p style={{ color: '#667085', fontSize: '14px', marginTop: '4px' }}>📍 {club.city}</p>
              )}
              <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
                {canViewParticipants && (
                  <span style={{ fontSize: '14px', color: '#667085' }}>
                    👥 Участников: <strong>{participants.length}</strong>
                  </span>
                )}
                {president && (
                  <span style={{ 
                    fontSize: '14px', 
                    color: '#0B1F3A',
                    background: '#FBF4DC',
                    padding: '4px 16px',
                    borderRadius: '20px',
                    fontWeight: '600'
                  }}>
                    👑 Президент: {president.full_name}
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
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {canManageClub && (
                <button
                  style={{
                    padding: '10px 24px',
                    background: '#0B1F3A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#174A7E'}
                  onMouseLeave={(e) => e.target.style.background = '#0B1F3A'}
                  onClick={() => setShowEditClubForm(!showEditClubForm)}
                >
                  {showEditClubForm ? '✖ Закрыть' : '✏️ Редактировать клуб'}
                </button>
              )}
              {canManagePresident && (
                <button
                  style={{
                    padding: '10px 24px',
                    background: '#C9A227',
                    color: '#0B1F3A',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#B8921F'}
                  onMouseLeave={(e) => e.target.style.background = '#C9A227'}
                  onClick={() => setShowPresidentForm(!showPresidentForm)}
                >
                  {showPresidentForm ? '✖ Закрыть' : '👑 Назначить президента'}
                </button>
              )}
            </div>
          </div>

          {/* ===== ФОРМА РЕДАКТИРОВАНИЯ КЛУБА ===== */}
          {showEditClubForm && canManageClub && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E7EF'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
                ✏️ Редактировать информацию о КЮДе
              </h4>
              <form onSubmit={handleSaveClub}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Название КЮДа *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={clubForm.name}
                      onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Город</label>
                    <input
                      type="text"
                      className="form-input"
                      value={clubForm.city}
                      onChange={(e) => setClubForm({ ...clubForm, city: e.target.value })}
                      placeholder="Москва"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Школа/Организация</label>
                    <input
                      type="text"
                      className="form-input"
                      value={clubForm.school}
                      onChange={(e) => setClubForm({ ...clubForm, school: e.target.value })}
                      placeholder="Гимназия №4"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Руководитель</label>
                    <input
                      type="text"
                      className="form-input"
                      value={clubForm.leader_name}
                      onChange={(e) => setClubForm({ ...clubForm, leader_name: e.target.value })}
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Контактный email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={clubForm.contact_email}
                      onChange={(e) => setClubForm({ ...clubForm, contact_email: e.target.value })}
                      placeholder="club@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Контактный телефон</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={clubForm.contact_phone}
                      onChange={(e) => setClubForm({ ...clubForm, contact_phone: e.target.value })}
                      placeholder="+7 (XXX) XXX-XX-XX"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Описание КЮДа</label>
                  <textarea
                    className="form-input"
                    rows="4"
                    value={clubForm.description}
                    onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
                    placeholder="Подробное описание клуба..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-success" disabled={loading} style={{
                    padding: '10px 24px',
                    background: '#16845B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {loading ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEditClubForm(false)}
                    style={{
                      padding: '10px 24px',
                      background: 'transparent',
                      color: '#0B1F3A',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    ❌ Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===== ФОРМА НАЗНАЧЕНИЯ ПРЕЗИДЕНТА ===== */}
          {showPresidentForm && canManagePresident && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E7EF'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A' }}>
                  👑 Назначить президента КЮДа
                </h4>
                {president && (
                  <button
                    style={{
                      padding: '6px 16px',
                      background: '#FCEBEC',
                      color: '#B3262E',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                    onClick={handleRemovePresident}
                  >
                    🗑️ Снять президента
                  </button>
                )}
              </div>

              {president && (
                <div style={{
                  padding: '12px 16px',
                  background: '#FBF4DC',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '20px' }}>👑</span>
                  <div>
                    <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                      Текущий президент: {president.full_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>
                      {president.school || ''} {president.class_name ? `• ${president.class_name}` : ''}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '8px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {participants
                  .filter(p => p.id !== president?.id)
                  .map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '12px 16px',
                        background: 'white',
                        borderRadius: '10px',
                        border: '1px solid #E2E7EF',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#C9A227'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(201, 162, 39, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E2E7EF'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                          {p.full_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#667085' }}>
                          {p.class_name || ''} {p.school ? `• ${p.school}` : ''}
                        </div>
                      </div>
                      <button
                        style={{
                          padding: '6px 16px',
                          background: '#0B1F3A',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#174A7E'}
                        onMouseLeave={(e) => e.target.style.background = '#0B1F3A'}
                        onClick={() => handleAssignPresident(p.id)}
                      >
                        👑 Назначить
                      </button>
                    </div>
                  ))}
                {participants.filter(p => p.id !== president?.id).length === 0 && (
                  <div style={{ 
                    padding: '30px', 
                    textAlign: 'center', 
                    color: '#667085',
                    gridColumn: '1 / -1'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>👀</div>
                    <p>Нет доступных участников для назначения</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== СПИСОК УЧАСТНИКОВ ===== */}
        {canViewParticipants && (
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
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>⭐ Баллы</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>Рейтинг</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>Статус</th>
                  {isCoordinator && (
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>Действия</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={isCoordinator ? 8 : 7} style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>👀</div>
                      В этом КЮДе пока нет участников
                    </td>
                  </tr>
                ) : (
                  participants.map((p, index) => (
                    <tr key={p.id} style={{ 
                      borderBottom: '1px solid #F4F6F9', 
                      transition: 'background 0.15s',
                      background: p.id === president?.id ? '#FBF4DC' : 'white'
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = p.id === president?.id ? '#FBF4DC' : '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = p.id === president?.id ? '#FBF4DC' : 'white'}
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
                          {p.id === president?.id && (
                            <span style={{
                              fontSize: '10px',
                              background: '#C9A227',
                              color: '#0B1F3A',
                              padding: '2px 10px',
                              borderRadius: '12px',
                              fontWeight: '700'
                            }}>
                              👑 Президент
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#667085' }}>{p.class_name || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#667085' }}>
                        {p.achievementCount || 0}
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
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: p.status === 'active' ? '#E8F5EF' : '#FCEBEC',
                          color: p.status === 'active' ? '#16845B' : '#B3262E'
                        }}>
                          {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                        </span>
                      </td>
                      {isCoordinator && (
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
                            {p.id !== president?.id && (
                              <button
                                style={{
                                  padding: '4px 12px',
                                  background: '#FBF4DC',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: '#8A6A00',
                                  fontWeight: '600',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#FCE8B0'}
                                onMouseLeave={(e) => e.target.style.background = '#FBF4DC'}
                                onClick={() => handleAssignPresident(p.id)}
                              >
                                👑
                              </button>
                            )}
                            {p.id === president?.id && (
                              <button
                                style={{
                                  padding: '4px 12px',
                                  background: '#FCEBEC',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: '#B3262E',
                                  fontWeight: '600',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#FCEBEC'}
                                onMouseLeave={(e) => e.target.style.background = '#FCEBEC'}
                                onClick={handleRemovePresident}
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
        )}
      </div>
    </div>
  )
}