// src/pages/Events.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

export default function Events() {
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('calendar') // 'calendar' | 'list'
  const [form, setForm] = useState({
    id: null,
    title: '',
    description: '',
    location: '',
    event_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    type: 'internal',
    capacity: 20,
    club_id: '',
    form_url: ''
  })
  const [clubs, setClubs] = useState([])

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
      }

      const { data: clubsData } = await supabase
        .from('clubs')
        .select('*')
        .order('name')
      setClubs(clubsData || [])

      await loadEvents()
    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        clubs:club_id (name)
      `)
      .order('event_date', { ascending: true })

    if (!error) {
      setEvents(data || [])
    }
  }

  const handleDateClick = (date) => {
    setSelectedDate(date)
    const dayEvents = events.filter(event => {
      const start = new Date(event.event_date)
      const end = event.end_date ? new Date(event.end_date) : start
      return date >= start && date <= end
    })
    if (dayEvents.length > 0) {
      setSelectedEvent(dayEvents[0])
      setShowModal(true)
    }
  }

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayEvents = events.filter(event => {
        const start = new Date(event.event_date)
        const end = event.end_date ? new Date(event.end_date) : start
        return date >= start && date <= end
      })
      if (dayEvents.length > 0) {
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2px',
            marginTop: '2px'
          }}>
            {dayEvents.slice(0, 3).map((e, i) => (
              <div key={i} style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: e.type === 'internal' ? '#174A7E' : 
                           e.type === 'outgoing' ? '#C9A227' : '#B3262E',
                display: 'inline-block'
              }} />
            ))}
            {dayEvents.length > 3 && (
              <span style={{ fontSize: '8px', color: '#667085' }}>
                +{dayEvents.length - 3}
              </span>
            )}
          </div>
        )
      }
    }
    return null
  }

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dayEvents = events.filter(event => {
        const start = new Date(event.event_date)
        const end = event.end_date ? new Date(event.end_date) : start
        return date >= start && date <= end
      })
      if (dayEvents.length > 0) {
        return 'event-day'
      }
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const eventData = {
        title: form.title,
        description: form.description,
        location: form.location,
        event_date: form.event_date,
        end_date: form.end_date || form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        type: form.type,
        capacity: parseInt(form.capacity),
        club_id: form.club_id || null,
        organizer_profile_id: profile.id,
        form_url: form.form_url || null
      }

      let error
      if (form.id) {
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', form.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('events')
          .insert([eventData])
        error = insertError
      }

      if (error) throw error

      setMessage(form.id ? '✅ Мероприятие обновлено!' : '✅ Мероприятие создано!')
      setForm({
        id: null,
        title: '',
        description: '',
        location: '',
        event_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        type: 'internal',
        capacity: 20,
        club_id: '',
        form_url: ''
      })
      setShowForm(false)
      loadEvents()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить мероприятие?')) return

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (!error) {
      loadEvents()
      setShowModal(false)
    }
  }

  const handleExportData = async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          participant_id,
          status,
          registered_at,
          participants:participant_id (
            full_name,
            school,
            class_name,
            birth_date,
            clubs:club_id (name)
          )
        `)
        .eq('event_id', eventId)

      if (error) throw error

      if (!data || data.length === 0) {
        alert('Нет данных для экспорта')
        return
      }

      const headers = ['ФИО', 'Школа', 'Класс', 'Клуб', 'Статус', 'Дата регистрации']
      const rows = data.map(r => [
        r.participants?.full_name || '—',
        r.participants?.school || '—',
        r.participants?.class_name || '—',
        r.participants?.clubs?.name || '—',
        r.status === 'attended' ? 'Участвовал' : r.status === 'cancelled' ? 'Отменено' : 'Записан',
        new Date(r.registered_at).toLocaleDateString('ru-RU')
      ])

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      const eventTitle = events.find(e => e.id === eventId)?.title || 'мероприятие'
      link.download = `участники_${eventTitle}_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      alert('Ошибка при экспорте: ' + err.message)
    }
  }

  const canCreate = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const start = new Date(event.event_date)
      const end = event.end_date ? new Date(event.end_date) : start
      return date >= start && date <= end
    })
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>📅 Мероприятия</h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              Календарь и список событий ДОД «Дипломаты будущего»
            </p>
          </div>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => {
              setForm({
                id: null,
                title: '',
                description: '',
                location: '',
                event_date: '',
                end_date: '',
                start_time: '',
                end_time: '',
                type: 'internal',
                capacity: 20,
                club_id: '',
                form_url: ''
              })
              setShowForm(!showForm)
            }}>
              {showForm ? '✖ Закрыть' : '➕ Создать'}
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '16px',
            textAlign: 'center',
            background: message.includes('✅') ? '#E8F5EF' : '#FCEBEC',
            color: message.includes('✅') ? '#16845B' : '#B3262E',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {showForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              {form.id ? '✏️ Редактировать мероприятие' : '📝 Создать мероприятие'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Название</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Введите название"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea
                  className="form-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="3"
                  placeholder="Описание мероприятия"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Место</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Адрес или место проведения"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Дата начала</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Дата окончания</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Время начала</label>
                  <input
                    type="time"
                    className="form-input"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Время окончания</label>
                  <input
                    type="time"
                    className="form-input"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Тип</label>
                  <select
                    className="form-select"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="internal">Внутреннее</option>
                    <option value="outgoing">Выездное</option>
                    <option value="global_forum">Глобальный форум</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Лимит мест</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    min="1"
                  />
                </div>
                <div className="form-group">
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
              </div>

              <div className="form-group">
                <label className="form-label">Ссылка на форму сбора данных</label>
                <input
                  type="url"
                  className="form-input"
                  value={form.form_url}
                  onChange={(e) => setForm({ ...form, form_url: e.target.value })}
                  placeholder="https://docs.google.com/forms/..."
                />
                <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                  Укажите ссылку на Google Форму или Яндекс Форму для сбора данных участников
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? '⏳ Создание...' : form.id ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ВКЛАДКИ */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid #E2E7EF',
          paddingBottom: '4px'
        }}>
          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              padding: '10px 24px',
              border: 'none',
              background: activeTab === 'calendar' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'calendar' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'calendar' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            📅 Календарь
          </button>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '10px 24px',
              border: 'none',
              background: activeTab === 'list' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'list' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'list' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            📋 Список
          </button>
        </div>

        {/* ===== ВКЛАДКА: КАЛЕНДАРЬ ===== */}
        {activeTab === 'calendar' && (
          <div>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #E2E7EF',
              boxShadow: '0 8px 30px rgba(11, 31, 58, 0.06)'
            }}>
              <style>
                {`
                  .react-calendar {
                    border: none !important;
                    width: 100% !important;
                    font-family: 'Inter', sans-serif !important;
                  }
                  .react-calendar__tile {
                    padding: 12px 4px !important;
                    height: 65px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    border-radius: 8px !important;
                    transition: all 0.2s ease !important;
                    font-size: 14px !important;
                  }
                  .react-calendar__tile:hover {
                    background: #F4F6F9 !important;
                  }
                  .react-calendar__tile--active {
                    background: #0B1F3A !important;
                    color: white !important;
                  }
                  .react-calendar__tile--now {
                    background: #E8EDF3 !important;
                  }
                  .react-calendar__month-view__weekdays {
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    color: #667085 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                  }
                  .react-calendar__month-view__weekdays__weekday {
                    padding: 8px 0 !important;
                  }
                  .react-calendar__month-view__weekdays abbr {
                    text-decoration: none !important;
                  }
                  .react-calendar__navigation {
                    margin-bottom: 12px !important;
                  }
                  .react-calendar__navigation button {
                    font-size: 16px !important;
                    font-weight: 600 !important;
                    color: #0B1F3A !important;
                    padding: 8px 16px !important;
                    border-radius: 8px !important;
                    transition: all 0.2s ease !important;
                  }
                  .react-calendar__navigation button:hover {
                    background: #F4F6F9 !important;
                  }
                  .event-day {
                    background: #F0F7FF !important;
                    font-weight: 600 !important;
                  }
                  .event-day:hover {
                    background: #E2E8F0 !important;
                  }
                  .react-calendar__month-view__days__day--weekend {
                    color: #B3262E !important;
                  }
                `}
              </style>

              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileContent={tileContent}
                tileClassName={tileClassName}
                onClickDay={handleDateClick}
              />
            </div>

            {/* Мероприятия на выбранный день */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                  📋 {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <span style={{ fontSize: '13px', color: '#667085' }}>
                  {getEventsForDate(selectedDate).length} мероприятий
                </span>
              </div>

              {getEventsForDate(selectedDate).length === 0 ? (
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '30px',
                  textAlign: 'center',
                  border: '1px dashed #E2E7EF'
                }}>
                  <p style={{ color: '#667085', fontSize: '14px' }}>На этот день мероприятий нет</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {getEventsForDate(selectedDate).map((event) => (
                    <div
                      key={event.id}
                      className="card"
                      style={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${
                          event.type === 'internal' ? '#174A7E' : 
                          event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                        }`
                      }}
                      onClick={() => {
                        setSelectedEvent(event)
                        setShowModal(true)
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A' }}>
                            {event.title}
                          </h4>
                          <p style={{ fontSize: '13px', color: '#667085' }}>
                            📍 {event.location || 'Место не указано'}
                          </p>
                          <p style={{ fontSize: '12px', color: '#98A2B3' }}>
                            {event.clubs?.name ? `🏫 ${event.clubs.name}` : ''}
                            {event.start_time && ` • ⏰ ${event.start_time}`}
                          </p>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          padding: '2px 12px',
                          borderRadius: '20px',
                          background: event.type === 'internal' ? '#EAF2FA' : 
                                     event.type === 'outgoing' ? '#FBF4DC' : '#FCEBEC',
                          color: event.type === 'internal' ? '#174A7E' : 
                                 event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                        }}>
                          {event.type === 'internal' ? 'Внутреннее' : 
                           event.type === 'outgoing' ? 'Выездное' : 'Форум'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== ВКЛАДКА: СПИСОК ===== */}
        {activeTab === 'list' && (
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                Все мероприятия
              </h3>
              <span style={{ fontSize: '13px', color: '#667085' }}>
                Всего: {events.length}
              </span>
            </div>

            {events.length === 0 ? (
              <div style={{
                background: '#F8FAFC',
                borderRadius: '10px',
                padding: '30px',
                textAlign: 'center',
                border: '1px dashed #E2E7EF'
              }}>
                <p style={{ color: '#667085', fontSize: '14px' }}>Мероприятий пока нет</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="card"
                    style={{
                      padding: '16px 20px',
                      cursor: 'pointer',
                      borderLeft: `4px solid ${
                        event.type === 'internal' ? '#174A7E' : 
                        event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                      }`
                    }}
                    onClick={() => {
                      setSelectedEvent(event)
                      setShowModal(true)
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A' }}>
                          {event.title}
                        </h4>
                        <p style={{ fontSize: '13px', color: '#667085' }}>
                          📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
                          {event.end_date && event.end_date !== event.event_date && (
                            <> — {new Date(event.end_date).toLocaleDateString('ru-RU')}</>
                          )}
                          {event.start_time && ` ⏰ ${event.start_time}`}
                        </p>
                        <p style={{ fontSize: '13px', color: '#667085' }}>
                          📍 {event.location || 'Место не указано'}
                          {event.clubs?.name && ` • 🏫 ${event.clubs.name}`}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '2px 12px',
                        borderRadius: '20px',
                        background: event.type === 'internal' ? '#EAF2FA' : 
                                   event.type === 'outgoing' ? '#FBF4DC' : '#FCEBEC',
                        color: event.type === 'internal' ? '#174A7E' : 
                               event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                      }}>
                        {event.type === 'internal' ? 'Внутреннее' : 
                         event.type === 'outgoing' ? 'Выездное' : 'Форум'}
                      </span>
                    </div>
                    {event.description && (
                      <div style={{ fontSize: '13px', color: '#667085', marginTop: '6px' }}>
                        {event.description.length > 120 ? event.description.slice(0, 120) + '...' : event.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО */}
      {showModal && selectedEvent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(11, 31, 58, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '32px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#98A2B3',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '28px' }}>
                {selectedEvent.type === 'internal' ? '📌' : 
                 selectedEvent.type === 'outgoing' ? '🌍' : '🏛️'}
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A' }}>
                {selectedEvent.title}
              </h2>
            </div>

            {selectedEvent.clubs?.name && (
              <p style={{ fontSize: '14px', color: '#667085', marginBottom: '4px' }}>
                🏫 {selectedEvent.clubs.name}
              </p>
            )}

            <p style={{ fontSize: '14px', color: '#667085', marginBottom: '4px' }}>
              📅 {new Date(selectedEvent.event_date).toLocaleDateString('ru-RU')}
              {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date && (
                <> — {new Date(selectedEvent.end_date).toLocaleDateString('ru-RU')}</>
              )}
            </p>

            {selectedEvent.start_time && (
              <p style={{ fontSize: '14px', color: '#667085', marginBottom: '4px' }}>
                ⏰ {selectedEvent.start_time}
                {selectedEvent.end_time && <> — {selectedEvent.end_time}</>}
              </p>
            )}

            {selectedEvent.location && (
              <p style={{ fontSize: '14px', color: '#667085', marginBottom: '4px' }}>
                📍 {selectedEvent.location}
              </p>
            )}

            <div style={{
              marginTop: '8px',
              display: 'inline-block',
              padding: '2px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              background: selectedEvent.type === 'internal' ? '#EAF2FA' : 
                         selectedEvent.type === 'outgoing' ? '#FBF4DC' : '#FCEBEC',
              color: selectedEvent.type === 'internal' ? '#174A7E' : 
                     selectedEvent.type === 'outgoing' ? '#C9A227' : '#B3262E'
            }}>
              {selectedEvent.type === 'internal' ? 'Внутреннее' : 
               selectedEvent.type === 'outgoing' ? 'Выездное' : 'Глобальный форум'}
            </div>

            {selectedEvent.description && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E7EF' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '4px' }}>
                  Описание
                </h4>
                <p style={{ fontSize: '14px', color: '#667085', lineHeight: '1.6' }}>
                  {selectedEvent.description}
                </p>
              </div>
            )}

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E7EF' }}>
              <p style={{ fontSize: '13px', color: '#98A2B3' }}>
                👥 Лимит мест: {selectedEvent.capacity || 'Не ограничен'}
              </p>
            </div>

            {/* ССЫЛКА НА ФОРМУ */}
            {selectedEvent.form_url && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E7EF' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                  📝 Форма регистрации
                </h4>
                <a
                  href={selectedEvent.form_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  Перейти к форме
                </a>
                <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '8px' }}>
                  Для участия в мероприятии заполните форму
                </div>
              </div>
            )}

            {canCreate && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => handleExportData(selectedEvent.id)}
                >
                  📊 Скачать данные
                </button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => handleDelete(selectedEvent.id)}
                >
                  🗑️ Удалить
                </button>
              </div>
            )}

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => setShowModal(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}