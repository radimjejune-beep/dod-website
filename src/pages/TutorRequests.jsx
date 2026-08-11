// src/pages/TutorRequests.jsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function TutorRequests() {
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [events, setEvents] = useState([])
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [coordinatorClubId, setCoordinatorClubId] = useState(null)
  
  // Для автодополнения мероприятия
  const [eventSearch, setEventSearch] = useState('')
  const [eventResults, setEventResults] = useState([])
  const [showEventDropdown, setShowEventDropdown] = useState(false)
  const eventInputRef = useRef(null)
  const [isNewEvent, setIsNewEvent] = useState(false)
  
  const [form, setForm] = useState({
    event_id: '',
    event_title: '',
    event_date: '',
    tutor_name: '',
    tutor_email: '',
    tutor_phone: '',
    role: '',
    responsibilities: [],
    notes: '',
    start_date: '',
    end_date: ''
  })
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (eventSearch.length > 1 && !isNewEvent) {
      const filtered = events.filter(e =>
        e.title.toLowerCase().includes(eventSearch.toLowerCase())
      )
      setEventResults(filtered)
      setShowEventDropdown(filtered.length > 0)
    } else {
      setEventResults([])
      setShowEventDropdown(false)
    }
  }, [eventSearch, events, isNewEvent])

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

        if (data?.role === 'club_coordinator') {
          const { data: coordinatorData } = await supabase
            .from('club_coordinators')
            .select('club_id')
            .eq('profile_id', data.id)
            .single()
          
          if (coordinatorData) {
            setCoordinatorClubId(coordinatorData.club_id)
          }
        }
      }

      const { data: clubsData } = await supabase
        .from('clubs')
        .select('*')
        .order('name')
      setClubs(clubsData || [])

      let eventsQuery = supabase
        .from('events')
        .select('id, title, event_date, club_id')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(20)

      if (profile?.role === 'club_coordinator' && coordinatorClubId) {
        eventsQuery = eventsQuery.eq('club_id', coordinatorClubId)
      }

      const { data: eventsData } = await eventsQuery
      setEvents(eventsData || [])

      let requestsQuery = supabase
        .from('tutor_requests')
        .select(`
          *,
          clubs:club_id (name),
          events:event_id (title, event_date),
          requested_by_profile:requested_by (full_name),
          reviewed_by_profile:reviewed_by (full_name)
        `)
        .order('created_at', { ascending: false })

      if (profile?.role === 'club_coordinator' && coordinatorClubId) {
        requestsQuery = requestsQuery.eq('club_id', coordinatorClubId)
      }

      const { data: requestsData } = await requestsQuery
      setRequests(requestsData || [])

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const handleSelectEvent = (event) => {
    setForm({ ...form, event_id: event.id, event_title: event.title, event_date: event.event_date })
    setEventSearch(event.title)
    setShowEventDropdown(false)
    setIsNewEvent(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      let eventId = form.event_id

      // Если выбрано новое мероприятие — создаём его
      if (!eventId && form.event_title && isNewEvent) {
        const { data: newEvent, error: eventError } = await supabase
          .from('events')
          .insert([{
            title: form.event_title,
            event_date: form.event_date || new Date().toISOString().split('T')[0],
            type: 'internal',
            club_id: coordinatorClubId,
            capacity: 20,
            organizer_profile_id: profile.id
          }])
          .select()
          .single()

        if (eventError) throw eventError
        eventId = newEvent.id
      }

      if (!eventId) {
        setMessage('❌ Пожалуйста, выберите или создайте мероприятие')
        setMessageType('error')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('tutor_requests')
        .insert([{
          club_id: coordinatorClubId,
          requested_by: profile.id,
          event_id: eventId,
          tutor_name: form.tutor_name,
          tutor_email: form.tutor_email,
          tutor_phone: form.tutor_phone || null,
          role: form.role,
          responsibilities: form.responsibilities || [],
          notes: form.notes || '',
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          status: 'pending'
        }])

      if (error) throw error

      setMessage('✅ Запрос отправлен координатору движения!')
      setMessageType('success')
      setForm({
        event_id: '',
        event_title: '',
        event_date: '',
        tutor_name: '',
        tutor_email: '',
        tutor_phone: '',
        role: '',
        responsibilities: [],
        notes: '',
        start_date: '',
        end_date: ''
      })
      setEventSearch('')
      setIsNewEvent(false)
      setShowForm(false)
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setLoading(false)
  }

  const handleReview = async (id, status, comment = '') => {
    if (!confirm(`Подтвердить ${status === 'approved' ? 'одобрение' : 'отклонение'} запроса?`)) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('tutor_requests')
        .update({
          status: status,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          comment: comment || null
        })
        .eq('id', id)

      if (error) throw error

      if (status === 'approved') {
        const request = requests.find(r => r.id === id)
        if (request) {
          await supabase
            .from('event_assignments')
            .insert([{
              event_id: request.event_id,
              staff_id: null,
              role: request.role,
              responsibilities: request.responsibilities || [],
              notes: request.notes || '',
              start_date: request.start_date || null,
              end_date: request.end_date || null,
              assigned_by: profile.id,
              invited_by: profile.id,
              status: 'pending',
              is_lead_tutor: false,
              tutor_email: request.tutor_email,
              tutor_name: request.tutor_name
            }])
        }
      }

      setMessage(status === 'approved' ? '✅ Запрос одобрен!' : '❌ Запрос отклонён')
      setMessageType(status === 'approved' ? 'success' : 'error')
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setLoading(false)
  }

  const canCreate = profile?.role === 'club_coordinator'
  const canReview = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { color: '#C9A227', bg: '#FBF4DC', label: '⏳ На рассмотрении' },
      'approved': { color: '#16845B', bg: '#E8F5EF', label: '✅ Одобрено' },
      'rejected': { color: '#B3262E', bg: '#FCEBEC', label: '❌ Отклонено' },
      'sent': { color: '#174A7E', bg: '#EAF2FA', label: '📤 Отправлено' }
    }
    return badges[status] || badges['pending']
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
              🤝 Запросы на тьюторов
            </h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              {canCreate 
                ? 'Отправьте запрос координатору движения на приглашение тьютора' 
                : canReview 
                  ? 'Управление запросами от координаторов КЮДов' 
                  : 'Просмотр запросов'}
            </p>
          </div>
          {canCreate && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowForm(!showForm)
                if (!showForm) {
                  setTimeout(() => eventInputRef.current?.focus(), 100)
                }
              }}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать запрос'}
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '16px',
            textAlign: 'center',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {showForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              📝 Запрос на приглашение тьютора
            </h3>
            <p style={{ fontSize: '13px', color: '#667085', marginBottom: '16px' }}>
              Заполните форму, и координатор движения рассмотрит ваш запрос
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* ПОЛЕ МЕРОПРИЯТИЯ С АВТОДОПОЛНЕНИЕМ */}
                <div className="form-group" style={{ position: 'relative', gridColumn: '1 / -1' }}>
                  <label className="form-label">Мероприятие</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: '1px solid #D5DCE7',
                        background: !isNewEvent ? '#0B1F3A' : 'transparent',
                        color: !isNewEvent ? 'white' : '#667085',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onClick={() => {
                        setIsNewEvent(false)
                        setForm({ ...form, event_id: '', event_title: '', event_date: '' })
                        setEventSearch('')
                      }}
                    >
                      Из списка
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: '1px solid #D5DCE7',
                        background: isNewEvent ? '#0B1F3A' : 'transparent',
                        color: isNewEvent ? 'white' : '#667085',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onClick={() => {
                        setIsNewEvent(true)
                        setForm({ ...form, event_id: '', event_title: '', event_date: '' })
                        setEventSearch('')
                      }}
                    >
                      Создать новое
                    </button>
                  </div>

                  {!isNewEvent ? (
                    <>
                      <input
                        ref={eventInputRef}
                        type="text"
                        className="form-input"
                        value={eventSearch}
                        onChange={(e) => {
                          setEventSearch(e.target.value)
                          setForm({ ...form, event_title: e.target.value, event_id: '' })
                          setIsNewEvent(false)
                        }}
                        onFocus={() => {
                          if (eventSearch.length > 1) {
                            const filtered = events.filter(e =>
                              e.title.toLowerCase().includes(eventSearch.toLowerCase())
                            )
                            setEventResults(filtered)
                            setShowEventDropdown(filtered.length > 0)
                          }
                        }}
                        placeholder="Начните вводить название мероприятия..."
                        required
                      />
                      {showEventDropdown && eventResults.length > 0 && (
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
                          {eventResults.map((e) => (
                            <div
                              key={e.id}
                              style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #F4F6F9',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                              onClick={() => handleSelectEvent(e)}
                            >
                              <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                                {e.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#667085' }}>
                                📅 {new Date(e.event_date).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {form.event_id && (
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
                          ✅ Выбрано: <strong>{form.event_title}</strong>
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
                              setForm({ ...form, event_id: '', event_title: '', event_date: '' })
                              setEventSearch('')
                              setEventResults([])
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <input
                        type="text"
                        className="form-input"
                        style={{ marginBottom: '8px' }}
                        value={form.event_title}
                        onChange={(e) => setForm({ ...form, event_title: e.target.value })}
                        required
                        placeholder="Название мероприятия"
                      />
                      <input
                        type="date"
                        className="form-input"
                        value={form.event_date}
                        onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Роль на мероприятии</label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    required
                  >
                    <option value="">Выберите роль</option>
                    <option value="Организатор">📋 Организатор</option>
                    <option value="Медиа">📸 Медиа</option>
                    <option value="Образовательная работа">📚 Образовательная работа</option>
                    <option value="Сопровождение">🤝 Сопровождение</option>
                    <option value="Координатор">⭐ Координатор</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ФИО тьютора</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.tutor_name}
                    onChange={(e) => setForm({ ...form, tutor_name: e.target.value })}
                    required
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email тьютора</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.tutor_email}
                    onChange={(e) => setForm({ ...form, tutor_email: e.target.value })}
                    required
                    placeholder="tutor@mail.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Телефон тьютора</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={form.tutor_phone}
                    onChange={(e) => setForm({ ...form, tutor_phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Даты проведения</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="date"
                      className="form-input"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      placeholder="Начало"
                    />
                    <input
                      type="date"
                      className="form-input"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      placeholder="Окончание"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Обязанности</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.responsibilities.join(', ')}
                    onChange={(e) => setForm({
                      ...form,
                      responsibilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Фото, видео, логистика, координация"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Примечание</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Дополнительная информация для координатора движения"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? '⏳ Отправка...' : '📤 Отправить запрос'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false)
                    setIsNewEvent(false)
                    setEventSearch('')
                    setForm({
                      event_id: '',
                      event_title: '',
                      event_date: '',
                      tutor_name: '',
                      tutor_email: '',
                      tutor_phone: '',
                      role: '',
                      responsibilities: [],
                      notes: '',
                      start_date: '',
                      end_date: ''
                    })
                  }}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            📋 Все запросы
          </h3>
          {requests.length === 0 ? (
            <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>
              {canCreate ? 'У вас пока нет запросов' : 'Запросов пока нет'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {requests.map((req) => {
                const status = getStatusBadge(req.status)
                return (
                  <div
                    key={req.id}
                    style={{
                      padding: '16px 20px',
                      background: '#F8FAFC',
                      borderRadius: '10px',
                      borderLeft: `4px solid ${status.color}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                          {req.events?.title || 'Мероприятие'}
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: status.bg,
                            color: status.color
                          }}>
                            {status.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                          🏫 {req.clubs?.name || 'Клуб не указан'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#667085' }}>
                          👤 {req.tutor_name} ({req.tutor_email})
                        </div>
                        <div style={{ fontSize: '13px', color: '#667085' }}>
                          🎯 {req.role}
                        </div>
                        {req.notes && (
                          <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                            📝 {req.notes}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                          📅 {new Date(req.created_at).toLocaleDateString('ru-RU')}
                          {req.requested_by_profile?.full_name && ` • От: ${req.requested_by_profile.full_name}`}
                        </div>
                        {req.comment && (
                          <div style={{
                            marginTop: '4px',
                            padding: '6px 12px',
                            background: '#F4F6F9',
                            borderRadius: '6px',
                            fontSize: '13px',
                            color: '#0B1F3A'
                          }}>
                            💬 {req.comment}
                          </div>
                        )}
                      </div>
                      {canReview && req.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button
                            className="btn btn-success"
                            style={{ padding: '6px 16px', fontSize: '12px' }}
                            onClick={() => {
                              const comment = prompt('Введите комментарий (необязательно):')
                              handleReview(req.id, 'approved', comment || '')
                            }}
                          >
                            ✅ Одобрить
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 16px', fontSize: '12px' }}
                            onClick={() => {
                              const comment = prompt('Укажите причину отклонения:')
                              if (comment) {
                                handleReview(req.id, 'rejected', comment)
                              }
                            }}
                          >
                            ❌ Отклонить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}