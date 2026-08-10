// src/pages/Achievements.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Achievements() {
  const [profile, setProfile] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [allParticipants, setAllParticipants] = useState([])
  const [clubs, setClubs] = useState([])
  const [tutors, setTutors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    recipient_type: 'participant',
    recipient_id: '',
    title: '',
    description: '',
    date: ''
  })
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
        console.log('Профиль загружен:', data)
      }

      await loadParticipants()
      await loadClubs()
      await loadTutors()
      await loadAchievements()

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadParticipants = async () => {
    let query = supabase
      .from('participants')
      .select(`
        *,
        clubs:club_id (name)
      `)
      .order('full_name')

    if (profile?.role === 'club_coordinator') {
      const { data: coordinatorData } = await supabase
        .from('club_coordinators')
        .select('club_id')
        .eq('profile_id', profile.id)
        .single()

      if (coordinatorData) {
        query = query.eq('club_id', coordinatorData.club_id)
      }
    }

    const { data, error } = await query
    if (!error) {
      setAllParticipants(data || [])
    }
  }

  const loadClubs = async () => {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .order('name')
    if (!error) {
      setClubs(data || [])
    }
  }

  const loadTutors = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'tutor')
      .order('full_name')
    if (!error) {
      setTutors(data || [])
    }
  }

  const loadAchievements = async () => {
    let query = supabase
      .from('achievements')
      .select(`
        *,
        participants:participant_id (full_name)
      `)
      .order('created_at', { ascending: false })

    const role = profile?.role

    if (role === 'participant') {
      const { data: participantData } = await supabase
        .from('participants')
        .select('id')
        .eq('profile_id', profile.id)
        .single()

      if (participantData) {
        query = query.eq('participant_id', participantData.id)
      } else {
        query = query.eq('participant_id', '00000000-0000-0000-0000-000000000000')
      }
    } else if (role === 'parent') {
      const { data: childrenData } = await supabase
        .from('parent_children')
        .select('participant_id')
        .eq('parent_id', profile.id)

      if (childrenData && childrenData.length > 0) {
        const childIds = childrenData.map(c => c.participant_id)
        query = query.in('participant_id', childIds)
      } else {
        query = query.eq('participant_id', '00000000-0000-0000-0000-000000000000')
      }
    } else if (role === 'club_coordinator') {
      const { data: coordinatorData } = await supabase
        .from('club_coordinators')
        .select('club_id')
        .eq('profile_id', profile.id)
        .single()

      if (coordinatorData) {
        const { data: clubParticipants } = await supabase
          .from('participants')
          .select('id')
          .eq('club_id', coordinatorData.club_id)

        if (clubParticipants && clubParticipants.length > 0) {
          const ids = clubParticipants.map(p => p.id)
          query = query.in('participant_id', ids)
        } else {
          query = query.eq('participant_id', '00000000-0000-0000-0000-000000000000')
        }
      }
    }
    // Админ, координатор движения, тьютор — видят все

    const { data, error } = await query
    if (!error) {
      console.log('Достижения загружены:', data)
      setAchievements(data || [])
    } else {
      console.error('Ошибка загрузки достижений:', error)
    }
  }

  const handleAddAchievement = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const achievementData = {
        title: form.title,
        description: form.description,
        achievement_date: form.date || new Date().toISOString().split('T')[0],
        added_by: profile.id
      }

      if (form.recipient_type === 'participant') {
        achievementData.participant_id = form.recipient_id
      } else if (form.recipient_type === 'club') {
        achievementData.club_id = form.recipient_id
        achievementData.is_club_award = true
      } else if (form.recipient_type === 'tutor') {
        achievementData.profile_id = form.recipient_id
        achievementData.is_tutor_award = true
      }

      const { error } = await supabase
        .from('achievements')
        .insert([achievementData])

      if (error) throw error

      setMessage('✅ Достижение добавлено!')
      setForm({
        recipient_type: 'participant',
        recipient_id: '',
        title: '',
        description: '',
        date: ''
      })
      setShowForm(false)
      loadAchievements()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить достижение?')) return

    const { error } = await supabase
      .from('achievements')
      .delete()
      .eq('id', id)

    if (!error) {
      loadAchievements()
    }
  }

  const canAddParticipantAchievement = profile?.role === 'admin' || 
                                        profile?.role === 'movement_coordinator' || 
                                        profile?.role === 'club_coordinator' ||
                                        profile?.role === 'tutor'

  const canAddClubOrTutorAward = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

  const canDelete = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

  const pageStyle = {
    background: '#F5F7FA',
    minHeight: '100vh',
    paddingBottom: '40px'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F5F7FA' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <Navigation profile={profile} />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B2B4A' }}>🏆 Достижения и награды</h1>
            <p style={{ color: '#4A5568' }}>
              {profile?.role === 'participant' && 'Ваши успехи и награды'}
              {profile?.role === 'parent' && 'Достижения вашего ребенка'}
              {profile?.role === 'club_coordinator' && 'Достижения участников вашего клуба'}
              {profile?.role === 'tutor' && 'Достижения участников движения'}
              {(profile?.role === 'admin' || profile?.role === 'movement_coordinator') && 'Все достижения и награды'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {canAddParticipantAchievement && (
              <button
                style={{
                  padding: '10px 24px',
                  background: '#0B2B4A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '30px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setForm({ ...form, recipient_type: 'participant' })
                  setShowForm(!showForm)
                }}
              >
                {showForm && form.recipient_type === 'participant' ? '✖ Закрыть' : '➕ Добавить достижение'}
              </button>
            )}
            {canAddClubOrTutorAward && (
              <button
                style={{
                  padding: '10px 24px',
                  background: '#C9A845',
                  color: 'white',
                  border: 'none',
                  borderRadius: '30px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setForm({ ...form, recipient_type: 'club' })
                  setShowForm(!showForm)
                }}
              >
                {showForm && form.recipient_type !== 'participant' ? '✖ Закрыть' : '🏅 Наградить КЮД/Тьютора'}
              </button>
            )}
          </div>
        </div>

        {message && (
          <div style={{
            padding: '14px',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
            background: message.includes('✅') ? '#C6F6D5' : '#FED7D7',
            color: message.includes('✅') ? '#276749' : '#9B2C2C'
          }}>
            {message}
          </div>
        )}

        {showForm && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '30px',
            boxShadow: '0 4px 20px rgba(11, 43, 74, 0.10)',
            border: '1px solid #E2E8F0'
          }}>
            <h3 style={{ marginBottom: '16px' }}>
              {form.recipient_type === 'participant' && '📝 Добавить достижение участнику'}
              {form.recipient_type === 'club' && '🏅 Наградить КЮД'}
              {form.recipient_type === 'tutor' && '🏅 Наградить Тьютора'}
            </h3>
            <form onSubmit={handleAddAchievement}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>
                  {form.recipient_type === 'participant' ? 'Участник' : 
                   form.recipient_type === 'club' ? 'КЮД' : 'Тьютор'}
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '2px solid #E2E8F0',
                    borderRadius: '12px',
                    background: 'white'
                  }}
                  value={form.recipient_id}
                  onChange={(e) => setForm({ ...form, recipient_id: e.target.value })}
                  required
                >
                  <option value="">Выберите...</option>
                  {form.recipient_type === 'participant' && allParticipants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} {p.clubs?.name ? `(${p.clubs.name})` : ''}
                    </option>
                  ))}
                  {form.recipient_type === 'club' && clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏫 {c.name}
                    </option>
                  ))}
                  {form.recipient_type === 'tutor' && tutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      📚 {t.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>Название</label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '2px solid #E2E8F0',
                    borderRadius: '12px'
                  }}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder={form.recipient_type === 'participant' ? 'Победитель олимпиады' : 'Лучший КЮД года'}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>Описание</label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '2px solid #E2E8F0',
                    borderRadius: '12px',
                    resize: 'vertical'
                  }}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="3"
                  placeholder="Подробное описание достижения или награды"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>Дата</label>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '2px solid #E2E8F0',
                    borderRadius: '12px'
                  }}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '12px 28px',
                    background: form.recipient_type === 'participant' ? '#38a169' : '#C9A845',
                    color: 'white',
                    border: 'none',
                    borderRadius: '30px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  disabled={loading}
                >
                  {loading ? '⏳ Сохранение...' : '✅ Сохранить'}
                </button>
                <button
                  type="button"
                  style={{
                    padding: '12px 28px',
                    background: 'transparent',
                    color: '#0B2B4A',
                    border: '2px solid #0B2B4A',
                    borderRadius: '30px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowForm(false)}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {achievements.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(11, 43, 74, 0.10)',
            border: '1px solid #E2E8F0'
          }}>
            <p style={{ fontSize: '18px' }}>🏆 Достижений пока нет</p>
            {(canAddParticipantAchievement || canAddClubOrTutorAward) && (
              <p style={{ color: '#4A5568' }}>Добавьте первое достижение или награду!</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {achievements.map((a) => {
              let recipientName = ''
              let recipientIcon = '👤'
              let recipientType = 'Участник'

              if (a.participant_id) {
                recipientName = a.participants?.full_name || 'Участник'
                recipientIcon = '👤'
                recipientType = 'Участник'
              } else if (a.club_id) {
                recipientName = 'КЮД'
                recipientIcon = '🏫'
                recipientType = 'КЮД'
              } else if (a.profile_id) {
                recipientName = 'Тьютор'
                recipientIcon = '📚'
                recipientType = 'Тьютор'
              }

              return (
                <div key={a.id} style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  boxShadow: '0 4px 20px rgba(11, 43, 74, 0.10)',
                  border: '1px solid #E2E8F0',
                  borderLeft: a.club_id || a.profile_id ? '4px solid #C9A845' : '4px solid #0B2B4A',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '24px' }}>🏅</span>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>{a.title}</h3>
                      {a.club_id || a.profile_id ? (
                        <span style={{
                          fontSize: '11px',
                          background: '#C9A845',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontWeight: '600'
                        }}>
                          🏆 НАГРАДА
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '11px',
                          background: '#0B2B4A',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontWeight: '600'
                        }}>
                          ДОСТИЖЕНИЕ
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p style={{ color: '#4A5568', marginTop: '4px', fontSize: '14px' }}>
                        {a.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#4A5568' }}>
                      <span>{recipientIcon} {recipientName} ({recipientType})</span>
                      {a.achievement_date && (
                        <span>📅 {new Date(a.achievement_date).toLocaleDateString('ru-RU')}</span>
                      )}
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      style={{
                        padding: '4px 12px',
                        background: '#D4202B',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleDelete(a.id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}