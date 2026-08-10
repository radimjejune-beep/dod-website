// src/pages/Events.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Events() {
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '', description: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadUserData()
    loadEvents()
  }, [])

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
  }

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })

    if (!error) {
      setEvents(data || [])
    }
    setLoading(false)
  }

  const handleAddEvent = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('events')
      .insert([{
        title: newEvent.title,
        event_date: newEvent.date,
        location: newEvent.location,
        description: newEvent.description,
        type: 'internal',
        club_id: null,
        organizer_profile_id: profile.id,
        capacity: 20
      }])

    if (error) {
      setMessage('❌ Ошибка: ' + error.message)
    } else {
      setMessage('✅ Мероприятие создано!')
      setNewEvent({ title: '', date: '', location: '', description: '' })
      setShowForm(false)
      loadEvents()
      setTimeout(() => setMessage(''), 3000)
    }
    setLoading(false)
  }

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Удалить мероприятие?')) return

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (!error) {
      loadEvents()
    }
  }

  if (loading && !events.length) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1>📅 Мероприятия</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Календарь событий ДОД «Дипломаты будущего»</p>
          </div>
          {isAdmin && (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать'}
            </button>
          )}
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

        {/* Форма создания мероприятия */}
        {showForm && (
          <div className="card" style={{ marginBottom: '30px', padding: '24px' }}>
            <h3>📝 Новое мероприятие</h3>
            <form onSubmit={handleAddEvent}>
              <div className="form-group">
                <label className="form-label">Название</label>
                <input
                  type="text"
                  className="form-input"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  required
                  placeholder="Введите название"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Дата</label>
                <input
                  type="date"
                  className="form-input"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Место</label>
                <input
                  type="text"
                  className="form-input"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Введите место проведения"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea
                  className="form-input"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Описание мероприятия"
                  rows="3"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button type="submit" className="btn btn-gold" disabled={loading}>
                {loading ? '⏳ Создание...' : '✅ Создать мероприятие'}
              </button>
            </form>
          </div>
        )}

        {/* Список мероприятий */}
        {events.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '18px' }}>📭 Мероприятий пока нет</p>
            {isAdmin && <p style={{ color: 'var(--text-secondary)' }}>Нажмите «Создать», чтобы добавить первое мероприятие</p>}
          </div>
        ) : (
          <div className="grid-3">
            {events.map((event) => (
              <div key={event.id} className="card card-gold-border">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3>{event.title}</h3>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#D4202B',
                        fontSize: '18px',
                        cursor: 'pointer'
                      }}
                      title="Удалить"
                    >
                      ✖
                    </button>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
                </p>
                {event.location && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    📍 {event.location}
                  </p>
                )}
                {event.description && (
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>{event.description}</p>
                )}
                <button 
                  className="btn btn-outline" 
                  style={{ marginTop: '12px', width: '100%' }}
                >
                  ✏️ Записаться
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}