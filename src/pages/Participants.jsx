// src/pages/Participants.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Participants() {
  const [profile, setProfile] = useState(null)
  const [participants, setParticipants] = useState([])
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClub, setSelectedClub] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    id: null,
    full_name: '',
    email: '',
    birth_date: '',
    phone: '',
    school: '',
    class_name: '',
    club_id: '',
    interests: '',
    bio: '',
    position: '',
    status: 'active',
    role: 'participant'
  })
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

      // Загружаем все клубы для фильтра
      const { data: clubsData } = await supabase
        .from('clubs')
        .select('*')
        .order('name')
      setClubs(clubsData || [])

      await loadParticipants(profileData)

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadParticipants = async (profileData) => {
    let query = supabase
      .from('profiles')
      .select(`
        *,
        club_participants!inner (
          club_id,
          clubs:club_id (
            id,
            name
          )
        )
      `)
      .eq('role', 'participant')
      .order('full_name')

    const role = profileData?.role || profile?.role

    // ============================================
    // ПРАВИЛА ДОСТУПА:
    // - club_coordinator → только участники своего клуба
    // - movement_coordinator → все участники (с фильтром по клубам)
    // - admin → все участники (с фильтром по клубам)
    // - tutor → все участники (с фильтром по клубам)
    // ============================================
    if (role === 'club_coordinator') {
      const { data: coordinatorData } = await supabase
        .from('club_coordinators')
        .select('club_id')
        .eq('profile_id', profileData?.id || profile?.id)
        .single()

      if (coordinatorData) {
        query = query.eq('club_participants.club_id', coordinatorData.club_id)
        query = query.eq('club_participants.status', 'active')
      }
    }

    const { data, error } = await query
    if (!error) {
      setParticipants(data || [])
    } else {
      console.error('Ошибка загрузки участников:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const profileData = {
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || '',
        birth_date: form.birth_date || null,
        school: form.school || '',
        class_name: form.class_name || '',
        interests: form.interests || '',
        bio: form.bio || '',
        position: form.position || '',
        role: form.role || 'participant',
        status: form.status || 'active'
      }

      let userId = form.id

      if (form.id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', form.id)
        if (updateError) throw updateError
      } else {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', form.email)
          .maybeSingle()

        if (existingUser) {
          throw new Error('Пользователь с таким email уже существует')
        }

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single()

        if (insertError) throw insertError
        userId = newProfile.id
      }

      if (form.club_id && userId) {
        const { data: existingRelation } = await supabase
          .from('club_participants')
          .select('id')
          .eq('profile_id', userId)
          .eq('club_id', form.club_id)
          .maybeSingle()

        if (!existingRelation) {
          const { error: relationError } = await supabase
            .from('club_participants')
            .insert([{
              profile_id: userId,
              club_id: form.club_id,
              status: 'active'
            }])

          if (relationError) throw relationError
        }
      }

      setMessage(form.id ? '✅ Участник обновлён!' : '✅ Участник добавлен!')
      resetForm()
      loadParticipants(profile)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({
      id: null,
      full_name: '',
      email: '',
      birth_date: '',
      phone: '',
      school: '',
      class_name: '',
      club_id: '',
      interests: '',
      bio: '',
      position: '',
      status: 'active',
      role: 'participant'
    })
    setShowForm(false)
  }

  const handleEdit = (participant) => {
    setForm({
      id: participant.id,
      full_name: participant.full_name || '',
      email: participant.email || '',
      birth_date: participant.birth_date || '',
      phone: participant.phone || '',
      school: participant.school || '',
      class_name: participant.class_name || '',
      club_id: participant.club_participants?.[0]?.club_id || '',
      interests: participant.interests || '',
      bio: participant.bio || '',
      position: participant.position || '',
      status: participant.status || 'active',
      role: participant.role || 'participant'
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить участника? Это действие нельзя отменить.')) return

    setLoading(true)
    try {
      await supabase
        .from('club_participants')
        .delete()
        .eq('profile_id', id)

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (error) throw error

      setMessage('✅ Участник удалён')
      loadParticipants(profile)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const getFilteredParticipants = () => {
    let filtered = participants

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.school?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedClub) {
      filtered = filtered.filter(p =>
        p.club_participants?.some(cp => cp.club_id === selectedClub)
      )
    }

    return filtered
  }

  const filtered = getFilteredParticipants()

  const groupedByClub = () => {
    const groups = {}
    filtered.forEach(p => {
      const clubName = p.club_participants?.[0]?.clubs?.name || 'Без клуба'
      if (!groups[clubName]) groups[clubName] = []
      groups[clubName].push(p)
    })
    return groups
  }

  const grouped = groupedByClub()

  const role = profile?.role
  const canManage = role === 'admin' || 
                    role === 'movement_coordinator' || 
                    role === 'club_coordinator'

  const canDelete = role === 'admin' || role === 'movement_coordinator'
  
  // Показываем фильтр по клубам для: admin, movement_coordinator, tutor
  const showClubFilter = role === 'admin' || 
                         role === 'movement_coordinator' || 
                         role === 'tutor'

  if (!canManage) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛔</div>
          <h1 style={{ color: '#0B1F3A' }}>Доступ запрещён</h1>
          <p style={{ color: '#667085' }}>Только координаторы и администраторы</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/dashboard')}
            style={{ marginTop: '20px' }}
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px', maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 40px' }}>
        {/* Заголовок */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              👥 Участники
            </h1>
            <p style={{ color: '#667085', fontSize: '15px' }}>
              {role === 'club_coordinator' 
                ? `Участники вашего клуба (${filtered.length})` 
                : `Все участники движения (${filtered.length})`}
              {selectedClub && clubs.find(c => c.id === selectedClub) && 
                ` • Клуб: ${clubs.find(c => c.id === selectedClub)?.name}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {showClubFilter && (
              <button
                className="btn btn-secondary"
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #D5DCE7',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                onMouseEnter={(e) => e.target.style.background = '#F4F6F9'}
                onMouseLeave={(e) => e.target.style.background = 'white'}
              >
                {viewMode === 'table' ? '📇 Карточки' : '📋 Таблица'}
              </button>
            )}
            <button 
              className="btn btn-primary" 
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: '8px 20px',
                background: '#0B1F3A',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#174A7E'}
              onMouseLeave={(e) => e.target.style.background = '#0B1F3A'}
            >
              {showForm ? '✖ Закрыть' : '➕ Добавить'}
            </button>
          </div>
        </div>

        {/* Сообщение */}
        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            background: message.includes('✅') ? '#E8F5EF' : '#FCEBEC',
            color: message.includes('✅') ? '#16845B' : '#B3262E',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}

        {/* Форма добавления */}
        {showForm && (
          <div className="card" style={{ 
            background: 'white',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
            border: '1px solid #E2E7EF',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0B1F3A', marginBottom: '20px' }}>
              {form.id ? '✏️ Редактировать участника' : '📝 Добавить участника'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '16px' 
              }}>
                <div className="form-group">
                  <label className="form-label">ФИО *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="ivan@example.com"
                    disabled={!!form.id}
                  />
                  {form.id && (
                    <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                      Email нельзя изменить
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Телефон</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Дата рождения</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Школа</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                    placeholder="Школа №1"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Класс</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.class_name}
                    onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                    placeholder="8А"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Должность/Позиция</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    placeholder="Капитан команды"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Статус</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">🟢 Активен</option>
                    <option value="inactive">🔴 Неактивен</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Интересы</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.interests}
                  onChange={(e) => setForm({ ...form, interests: e.target.value })}
                  placeholder="Дипломатия, история, иностранные языки"
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">О себе</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Расскажите о себе..."
                />
              </div>

              {(role === 'admin' || role === 'movement_coordinator') && clubs.length > 0 && (
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Клуб</label>
                  <select
                    className="form-select"
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  >
                    <option value="">Без клуба</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {role === 'club_coordinator' && clubs.length > 0 && (
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Клуб</label>
                  <input
                    type="text"
                    className="form-input"
                    value={clubs[0]?.name || 'Ваш клуб'}
                    disabled
                    style={{ background: '#F4F6F9', cursor: 'not-allowed' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  type="submit" 
                  className="btn btn-success" 
                  disabled={loading}
                  style={{
                    padding: '10px 28px',
                    background: '#16845B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#126D4A'}
                  onMouseLeave={(e) => e.target.style.background = '#16845B'}
                >
                  {loading ? '⏳ Сохранение...' : form.id ? '💾 Обновить' : '✅ Добавить'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={resetForm}
                  style={{
                    padding: '10px 28px',
                    background: 'transparent',
                    color: '#0B1F3A',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#F4F6F9'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
            ФИЛЬТРЫ И ПОИСК
            ============================================================ */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              className="form-input"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Поиск по ФИО, email, школе..."
            />
          </div>

          {/* ============================================================
              ФИЛЬТР ПО КЛУБАМ (для админа, координатора движения, тьютора)
              ============================================================ */}
          {showClubFilter && (
            <div style={{ minWidth: '200px' }}>
              <select
                className="form-select"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white',
                  transition: 'all 0.2s'
                }}
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
              >
                <option value="">Все КЮДы</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ============================================================
              ДЛЯ КООРДИНАТОРА КЮДА - показываем название его клуба
              ============================================================ */}
          {role === 'club_coordinator' && clubs.length > 0 && (
            <div style={{ 
              padding: '8px 16px',
              background: 'var(--color-gold-bg)',
              borderRadius: '8px',
              border: '1px solid var(--color-gold)',
              fontSize: '14px',
              color: '#8A6A00',
              fontWeight: '500'
            }}>
              🏫 {clubs.find(c => c.id === participants[0]?.club_participants?.[0]?.club_id)?.name || 'Ваш клуб'}
            </div>
          )}

          <div style={{ 
            fontSize: '14px', 
            color: '#667085',
            padding: '6px 16px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #E2E7EF'
          }}>
            Найдено: <strong>{filtered.length}</strong> участников
          </div>
        </div>

        {/* ============================================================
            ТАБЛИЧНЫЙ ВИД
            ============================================================ */}
        {viewMode === 'table' && (
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
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>ФИО</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Класс</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Школа</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Клуб</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Статус</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>👀</div>
                      Участников не найдено
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F4F6F9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
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
                      <td style={{ padding: '12px 16px', color: '#667085' }}>{p.school || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#667085' }}>
                        {p.club_participants?.[0]?.clubs?.name || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: p.status === 'active' ? '#E8F5EF' : '#FCEBEC',
                          color: p.status === 'active' ? '#16845B' : '#B3262E'
                        }}>
                          {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                        </span>
                      </td>
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
                            👁️
                          </button>
                          {canManage && (
                            <button
                              style={{
                                padding: '4px 12px',
                                background: '#EAF2FA',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: '#174A7E',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#D5E4F0'}
                              onMouseLeave={(e) => e.target.style.background = '#EAF2FA'}
                              onClick={() => handleEdit(p)}
                            >
                              ✏️
                            </button>
                          )}
                          {canDelete && (
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
                              onClick={() => handleDelete(p.id)}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ============================================================
            КАРТОЧНЫЙ ВИД (только для admin, movement_coordinator, tutor)
            ============================================================ */}
        {viewMode === 'cards' && showClubFilter && (
          <div>
            {Object.keys(grouped).length === 0 ? (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                border: '1px solid #E2E7EF'
              }}>
                <p style={{ color: '#667085' }}>Участников не найдено</p>
              </div>
            ) : (
              Object.keys(grouped).map((clubName) => (
                <div key={clubName} style={{ marginBottom: '32px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#0B1F3A',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '2px solid #C9A227',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    🏫 {clubName}
                    <span style={{ fontSize: '13px', color: '#667085', fontWeight: '400' }}>
                      {grouped[clubName].length} участников
                    </span>
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '16px'
                  }}>
                    {grouped[clubName].map((p) => (
                      <div
                        key={p.id}
                        className="card"
                        style={{
                          cursor: 'pointer',
                          padding: '16px',
                          transition: 'all 0.2s ease',
                          background: 'white',
                          borderRadius: '12px',
                          border: '1px solid #E2E7EF'
                        }}
                        onClick={() => navigate(`/participant/${p.id}`)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: p.avatar_url ? 'none' : 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '18px',
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
                          <div>
                            <div style={{ fontWeight: '600', color: '#0B1F3A' }}>{p.full_name}</div>
                            <div style={{ fontSize: '13px', color: '#667085' }}>
                              {p.class_name || 'Класс не указан'}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginTop: '8px'
                        }}>
                          <span style={{
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: p.status === 'active' ? '#E8F5EF' : '#FCEBEC',
                            color: p.status === 'active' ? '#16845B' : '#B3262E'
                          }}>
                            {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                          </span>
                          {p.school && (
                            <span style={{
                              padding: '2px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              background: '#F4F6F9',
                              color: '#667085'
                            }}>
                              🏫 {p.school}
                            </span>
                          )}
                        </div>

                        {p.interests && (
                          <div style={{
                            fontSize: '12px',
                            color: '#667085',
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid #F4F6F9'
                          }}>
                            🌟 {p.interests}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}