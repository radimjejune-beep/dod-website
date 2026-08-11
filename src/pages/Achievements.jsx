// src/pages/Achievements.jsx
import '../styles.css'
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Achievements() {
  const [profile, setProfile] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [allParticipants, setAllParticipants] = useState([])
  const [filteredParticipants, setFilteredParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedParticipant, setSelectedParticipant] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: ''
  })
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Закрываем dropdown при клике вне компонента
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

      await loadParticipants()
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

  const loadAchievements = async () => {
    let query = supabase
      .from('achievements')
      .select(`
        *,
        participants:participant_id (full_name, club_id, clubs:club_id (name))
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

    const { data, error } = await query
    if (!error) {
      setAchievements(data || [])
    } else {
      console.error('Ошибка загрузки достижений:', error)
    }
  }

  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)

    if (query.length === 0) {
      setFilteredParticipants([])
      setShowDropdown(false)
      setSelectedParticipant(null)
      return
    }

    const filtered = allParticipants.filter(p =>
      p.full_name.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredParticipants(filtered)
    setShowDropdown(filtered.length > 0)
  }

  const handleSelectParticipant = (participant) => {
    setSelectedParticipant(participant)
    setSearchQuery(participant.full_name)
    setShowDropdown(false)
  }

  const handleAddAchievement = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      if (!selectedParticipant) {
        setMessage('❌ Пожалуйста, выберите участника')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('achievements')
        .insert([{
          participant_id: selectedParticipant.id,
          title: form.title,
          description: form.description,
          achievement_date: form.date || new Date().toISOString().split('T')[0],
          added_by: profile.id
        }])

      if (error) throw error

      setMessage('✅ Достижение добавлено!')
      setForm({ title: '', description: '', date: '' })
      setSearchQuery('')
      setSelectedParticipant(null)
      setFilteredParticipants([])
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

  const canAdd = profile?.role === 'admin' || 
                 profile?.role === 'movement_coordinator' || 
                 profile?.role === 'club_coordinator' ||
                 profile?.role === 'tutor'

  const canDelete = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

  const pageStyle = {
    background: '#F4F6F9',
    minHeight: '100vh',
    paddingBottom: '40px'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
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
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>🏆 Достижения и награды</h1>
            <p style={{ color: '#667085' }}>
              {profile?.role === 'participant' && 'Ваши успехи и награды'}
              {profile?.role === 'parent' && 'Достижения вашего ребенка'}
              {profile?.role === 'club_coordinator' && 'Достижения участников вашего клуба'}
              {profile?.role === 'tutor' && 'Достижения участников движения'}
              {(profile?.role === 'admin' || profile?.role === 'movement_coordinator') && 'Все достижения участников'}
            </p>
          </div>
          {canAdd && (
            <button
              style={{
                padding: '10px 24px',
                background: '#0B1F3A',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              onClick={() => {
                setShowForm(!showForm)
                if (!showForm) {
                  setTimeout(() => inputRef.current?.focus(), 100)
                }
              }}
            >
              {showForm ? '✖ Закрыть' : '➕ Добавить достижение'}
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'center',
            background: message.includes('✅') ? '#E8F5EF' : '#FCEBEC',
            color: message.includes('✅') ? '#16845B' : '#B3262E'
          }}>
            {message}
          </div>
        )}

        {showForm && canAdd && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '30px',
            boxShadow: '0 8px 30px rgba(11, 31, 58, 0.06)',
            border: '1px solid #E2E7EF'
          }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
              📝 Добавить достижение
            </h3>
            <form onSubmit={handleAddAchievement}>
              {/* ПОИСК УЧАСТНИКА С АВТОДОПОЛНЕНИЕМ */}
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Участник
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '14px',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'white'
                    }}
                    placeholder="Начните вводить фамилию участника..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => {
                      if (searchQuery.length > 0) {
                        const filtered = allParticipants.filter(p =>
                          p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        setFilteredParticipants(filtered)
                        setShowDropdown(filtered.length > 0)
                      }
                    }}
                  />
                  
                  {/* ВЫПАДАЮЩИЙ СПИСОК */}
                  {showDropdown && filteredParticipants.length > 0 && (
                    <div
                      ref={dropdownRef}
                      style={{
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
                      }}
                    >
                      {filteredParticipants.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #F4F6F9',
                            transition: 'background 0.15s ease',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          onClick={() => handleSelectParticipant(p)}
                        >
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                              {p.full_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#667085' }}>
                              {p.clubs?.name || 'Без клуба'} • {p.class_name || 'Класс не указан'}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '12px',
                            color: '#174A7E',
                            fontWeight: '500'
                          }}>
                            Выбрать →
                          </span>
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
                    <span style={{ color: '#667085', fontWeight: '400' }}>
                      ({selectedParticipant.clubs?.name || 'Без клуба'})
                    </span>
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
                        setSearchQuery('')
                        setFilteredParticipants([])
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Название достижения
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Победитель олимпиады"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Описание
                </label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="3"
                  placeholder="Подробное описание достижения"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Дата
                </label>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '10px 28px',
                    background: '#16845B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  disabled={loading || !selectedParticipant}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) e.target.style.background = '#126D4A'
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) e.target.style.background = '#16845B'
                  }}
                >
                  {loading ? '⏳ Сохранение...' : '✅ Добавить'}
                </button>
                <button
                  type="button"
                  style={{
                    padding: '10px 28px',
                    background: 'transparent',
                    color: '#0B1F3A',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setShowForm(false)
                    setSearchQuery('')
                    setSelectedParticipant(null)
                    setFilteredParticipants([])
                  }}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* СПИСОК ДОСТИЖЕНИЙ */}
        {achievements.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(11, 31, 58, 0.06)',
            border: '1px solid #E2E7EF'
          }}>
            <p style={{ fontSize: '18px', color: '#667085' }}>🏆 Достижений пока нет</p>
            {canAdd && <p style={{ color: '#98A2B3' }}>Добавьте первое достижение!</p>}
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
                recipientName = a.recipient_club?.name || 'КЮД'
                recipientIcon = '🏫'
                recipientType = 'КЮД'
              } else if (a.profile_id) {
                recipientName = a.recipient_tutor?.full_name || 'Тьютор'
                recipientIcon = '📚'
                recipientType = 'Тьютор'
              }

              return (
                <div key={a.id} style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  boxShadow: '0 8px 30px rgba(11, 31, 58, 0.06)',
                  border: '1px solid #E2E7EF',
                  borderLeft: a.club_id || a.profile_id ? '4px solid #C9A227' : '4px solid #0B1F3A',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '24px' }}>🏅</span>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#0B1F3A' }}>{a.title}</h3>
                      {a.club_id || a.profile_id ? (
                        <span style={{
                          fontSize: '10px',
                          background: '#FBF4DC',
                          color: '#8A6A00',
                          padding: '2px 12px',
                          borderRadius: '20px',
                          fontWeight: '600'
                        }}>
                          🏆 НАГРАДА
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '10px',
                          background: '#EAF2FA',
                          color: '#174A7E',
                          padding: '2px 12px',
                          borderRadius: '20px',
                          fontWeight: '600'
                        }}>
                          ДОСТИЖЕНИЕ
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p style={{ color: '#667085', marginTop: '4px', fontSize: '14px' }}>
                        {a.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#667085' }}>
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
                        background: '#FCEBEC',
                        color: '#B3262E',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#FCEBEC'}
                      onMouseLeave={(e) => e.target.style.background = '#FCEBEC'}
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