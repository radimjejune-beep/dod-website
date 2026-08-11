// src/pages/ManageAchievements.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function ManageAchievements() {
  const [profile, setProfile] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [showForm, setShowForm] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState(null)
  const [editingAchievement, setEditingAchievement] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    achievement_date: '',
    is_club_award: false,
    is_tutor_award: false,
    participant_id: ''
  })
  const [participantSearch, setParticipantSearch] = useState('')
  const [participantResults, setParticipantResults] = useState([])
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Проверка прав: только координаторы и админы
      const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator']
      if (!allowedRoles.includes(profileData?.role)) {
        navigate('/dashboard')
        return
      }

      // Загружаем участников
      let participantsQuery = supabase
        .from('profiles')
        .select('id, full_name, school, class_name')
        .eq('role', 'participant')
        .order('full_name')

      // Для координатора КЮДа — только участники его клуба
      if (profileData?.role === 'club_coordinator') {
        const { data: coordData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profileData.id)
          .single()

        if (coordData) {
          const { data: clubParticipants } = await supabase
            .from('club_participants')
            .select('profile_id')
            .eq('club_id', coordData.club_id)
            .eq('status', 'active')

          if (clubParticipants && clubParticipants.length > 0) {
            const ids = clubParticipants.map(p => p.profile_id)
            participantsQuery = participantsQuery.in('id', ids)
          }
        }
      }

      const { data: participantsData } = await participantsQuery
      setParticipants(participantsData || [])

      // Загружаем достижения
      let achievementsQuery = supabase
        .from('achievements')
        .select(`
          *,
          profiles:participant_id (id, full_name, school, class_name)
        `)
        .order('achievement_date', { ascending: false })

      if (profileData?.role === 'club_coordinator') {
        const { data: coordData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profileData.id)
          .single()

        if (coordData) {
          const { data: clubParticipants } = await supabase
            .from('club_participants')
            .select('profile_id')
            .eq('club_id', coordData.club_id)
            .eq('status', 'active')

          if (clubParticipants && clubParticipants.length > 0) {
            const ids = clubParticipants.map(p => p.profile_id)
            achievementsQuery = achievementsQuery.in('participant_id', ids)
          }
        }
      }

      const { data: achievementsData } = await achievementsQuery
      setAchievements(achievementsData || [])

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const handleSearchParticipants = (query) => {
    setParticipantSearch(query)
    if (query.length > 1) {
      const filtered = participants.filter(p =>
        p.full_name.toLowerCase().includes(query.toLowerCase())
      )
      setParticipantResults(filtered)
      setShowParticipantDropdown(filtered.length > 0)
    } else {
      setParticipantResults([])
      setShowParticipantDropdown(false)
    }
  }

  const handleSelectParticipant = (participant) => {
    setSelectedParticipant(participant)
    setForm({ ...form, participant_id: participant.id })
    setParticipantSearch(participant.full_name)
    setShowParticipantDropdown(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      if (!form.participant_id) {
        setMessage('❌ Выберите участника')
        setMessageType('error')
        setLoading(false)
        return
      }

      const data = {
        participant_id: form.participant_id,
        title: form.title,
        description: form.description || '',
        achievement_date: form.achievement_date || new Date().toISOString().split('T')[0],
        added_by: profile.id,
        is_club_award: form.is_club_award || false,
        is_tutor_award: form.is_tutor_award || false
      }

      let error
      if (editingAchievement) {
        const { error: updateError } = await supabase
          .from('achievements')
          .update(data)
          .eq('id', editingAchievement.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('achievements')
          .insert([data])
        error = insertError
      }

      if (error) throw error

      setMessage(editingAchievement ? '✅ Достижение обновлено!' : '✅ Достижение добавлено!')
      setMessageType('success')
      resetForm()
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить это достижение?')) return

    try {
      const { error } = await supabase
        .from('achievements')
        .delete()
        .eq('id', id)

      if (error) throw error

      setMessage('✅ Достижение удалено')
      setMessageType('success')
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      achievement_date: '',
      is_club_award: false,
      is_tutor_award: false,
      participant_id: ''
    })
    setSelectedParticipant(null)
    setParticipantSearch('')
    setEditingAchievement(null)
    setShowForm(false)
  }

  const handleEdit = (achievement) => {
    setEditingAchievement(achievement)
    setForm({
      title: achievement.title || '',
      description: achievement.description || '',
      achievement_date: achievement.achievement_date || '',
      is_club_award: achievement.is_club_award || false,
      is_tutor_award: achievement.is_tutor_award || false,
      participant_id: achievement.participant_id || ''
    })
    setSelectedParticipant(achievement.profiles)
    setParticipantSearch(achievement.profiles?.full_name || '')
    setShowForm(true)
  }

  const isAdmin = profile?.role === 'admin'
  const isMovementCoordinator = profile?.role === 'movement_coordinator'
  const isClubCoordinator = profile?.role === 'club_coordinator'
  const canDelete = isAdmin || isMovementCoordinator

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              🏆 Управление достижениями
            </h1>
            <p style={{ color: '#667085', fontSize: '16px' }}>
              {isClubCoordinator ? 'Участники вашего КЮДа' : 'Все участники'}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '10px 24px',
              background: '#0B1F3A',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {showForm ? '✖ Закрыть' : '➕ Добавить достижение'}
          </button>
        </div>

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

        {/* ФОРМА ДОБАВЛЕНИЯ */}
        {showForm && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E7EF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              {editingAchievement ? '✏️ Редактировать достижение' : '📝 Добавить достижение'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Участник *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={participantSearch}
                    onChange={(e) => handleSearchParticipants(e.target.value)}
                    placeholder="Начните вводить ФИО участника..."
                    required
                  />
                  {showParticipantDropdown && participantResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #E2E7EF',
                      borderRadius: '10px',
                      boxShadow: '0 8px 30px rgba(11, 31, 58, 0.12)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 100
                    }}>
                      {participantResults.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #F4F6F9',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          onClick={() => handleSelectParticipant(p)}
                        >
                          <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                            {p.full_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedParticipant && (
                  <div style={{
                    marginTop: '6px',
                    padding: '6px 12px',
                    background: '#E8F5EF',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#16845B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    ✅ Выбран: <strong>{selectedParticipant.full_name}</strong>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#B3262E',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginLeft: 'auto'
                      }}
                      onClick={() => {
                        setSelectedParticipant(null)
                        setParticipantSearch('')
                        setForm({ ...form, participant_id: '' })
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Название достижения *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Победитель олимпиады"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Подробное описание достижения..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Дата</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.achievement_date}
                  onChange={(e) => setForm({ ...form, achievement_date: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_club_award}
                    onChange={(e) => setForm({ ...form, is_club_award: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#0B1F3A' }}>🏫 Клубная награда</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_tutor_award}
                    onChange={(e) => setForm({ ...form, is_tutor_award: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#0B1F3A' }}>📚 Награда тьютора</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
                  {loading ? '⏳ Сохранение...' : editingAchievement ? '💾 Обновить' : '✅ Добавить'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
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

        {/* СПИСОК ДОСТИЖЕНИЙ */}
        <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', border: '1px solid #E2E7EF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              Все достижения
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {achievements.length} достижений
            </span>
          </div>

          {achievements.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#F4F6F9', borderRadius: '10px' }}>
              <p style={{ color: '#667085', fontSize: '16px' }}>Достижений пока нет</p>
              <p style={{ fontSize: '13px', color: '#98A2B3', marginTop: '4px' }}>
                Добавьте первое достижение
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {achievements.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: '14px 18px',
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    borderLeft: a.is_club_award ? '4px solid #C9A227' : 
                               a.is_tutor_award ? '4px solid #174A7E' : '4px solid #0B1F3A',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '24px' }}>
                        {a.is_club_award ? '🏫' : a.is_tutor_award ? '📚' : '🏅'}
                      </span>
                      <span style={{ fontWeight: '600', color: '#0B1F3A' }}>{a.title}</span>
                      {a.is_club_award && (
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          background: '#FBF4DC',
                          color: '#8A6A00'
                        }}>
                          Клубная
                        </span>
                      )}
                      {a.is_tutor_award && (
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          background: '#EAF2FA',
                          color: '#174A7E'
                        }}>
                          Тьюторская
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                      👤 {a.profiles?.full_name || 'Участник'}
                      {a.profiles?.school && ` • ${a.profiles.school}`}
                    </div>
                    {a.description && (
                      <div style={{ fontSize: '13px', color: '#98A2B3', marginTop: '2px' }}>
                        {a.description}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                      📅 {new Date(a.achievement_date || a.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => handleEdit(a)}
                    >
                      ✏️
                    </button>
                    {canDelete && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleDelete(a.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}