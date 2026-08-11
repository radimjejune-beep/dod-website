// src/pages/Calendar.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

export default function CalendarPage() {
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showModal, setShowModal] = useState(false)

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
    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const handleDateClick = (date) => {
    setSelectedDate(date)
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
                background: e.type === 'internal' ? '#1A3A6B' : 
                           e.type === 'outgoing' ? '#C9A845' : '#D4202B',
                display: 'inline-block'
              }} />
            ))}
            {dayEvents.length > 3 && (
              <span style={{ fontSize: '8px', color: '#5A6A7A' }}>
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

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const start = new Date(event.event_date)
      const end = event.end_date ? new Date(event.end_date) : start
      return date >= start && date <= end
    })
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
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0A1628' }}>📅 Календарь мероприятий</h1>
            <p style={{ color: '#5A6A7A', fontSize: '14px' }}>
              Наглядный календарь событий ДОД «Дипломаты будущего»
            </p>
          </div>
          <button 
            className="btn btn-outline" 
            onClick={() => window.location.href = '/events'}
          >
            📋 Список
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #E2E6EA',
          boxShadow: '0 2px 12px rgba(10, 22, 40, 0.04)'
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
                background: #F0F2F5 !important;
              }
              .react-calendar__tile--active {
                background: #1A3A6B !important;
                color: white !important;
              }
              .react-calendar__tile--now {
                background: #E8EDF3 !important;
              }
              .react-calendar__month-view__weekdays {
                font-size: 11px !important;
                font-weight: 600 !important;
                color: #5A6A7A !important;
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
                color: #0A1628 !important;
                padding: 8px 16px !important;
                border-radius: 8px !important;
                transition: all 0.2s ease !important;
              }
              .react-calendar__navigation button:hover {
                background: #F0F2F5 !important;
              }
              .event-day {
                background: #F0F7FF !important;
                font-weight: 600 !important;
              }
              .event-day:hover {
                background: #E2E8F0 !important;
              }
              .react-calendar__month-view__days__day--weekend {
                color: #D4202B !important;
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

        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0A1628' }}>
              📋 {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <span style={{ fontSize: '13px', color: '#8A9AAA' }}>
              {getEventsForDate(selectedDate).length} мероприятий
            </span>
          </div>

          {getEventsForDate(selectedDate).length === 0 ? (
            <div style={{
              background: '#F8FAFC',
              borderRadius: '10px',
              padding: '30px',
              textAlign: 'center',
              border: '1px dashed #E2E6EA'
            }}>
              <p style={{ color: '#8A9AAA', fontSize: '14px' }}>На этот день мероприятий нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getEventsForDate(selectedDate).map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: '16px 20px',
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    borderLeft: `4px solid ${
                      event.type === 'internal' ? '#1A3A6B' : 
                      event.type === 'outgoing' ? '#C9A845' : '#D4202B'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F0F2F5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}
                  onClick={() => {
                    setSelectedEvent(event)
                    setShowModal(true)
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: '#0A1628' }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#5A6A7A', marginTop: '2px' }}>
                        {event.location || 'Место не указано'}
                        {event.start_time && ` • ⏰ ${event.start_time}`}
                        {event.clubs?.name && ` • 🏫 ${event.clubs.name}`}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      padding: '2px 12px',
                      borderRadius: '20px',
                      background: event.type === 'internal' ? '#E8EDF3' : 
                                 event.type === 'outgoing' ? '#F5F0E0' : '#FDE8E8',
                      color: event.type === 'internal' ? '#1A3A6B' : 
                             event.type === 'outgoing' ? '#C9A845' : '#D4202B'
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

      {/* МОДАЛЬНОЕ ОКНО */}
      {showModal && selectedEvent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 22, 40, 0.5)',
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
                color: '#8A9AAA',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0A1628'}
              onMouseLeave={(e) => e.target.style.color = '#8A9AAA'}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '28px' }}>
                {selectedEvent.type === 'internal' ? '📌' : 
                 selectedEvent.type === 'outgoing' ? '🌍' : '🏛️'}
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0A1628' }}>
                {selectedEvent.title}
              </h2>
            </div>

            {selectedEvent.clubs?.name && (
              <p style={{ fontSize: '14px', color: '#5A6A7A', marginBottom: '4px' }}>
                🏫 {selectedEvent.clubs.name}
              </p>
            )}

            <p style={{ fontSize: '14px', color: '#5A6A7A', marginBottom: '4px' }}>
              📅 {new Date(selectedEvent.event_date).toLocaleDateString('ru-RU')}
              {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date && (
                <> — {new Date(selectedEvent.end_date).toLocaleDateString('ru-RU')}</>
              )}
            </p>

            {selectedEvent.start_time && (
              <p style={{ fontSize: '14px', color: '#5A6A7A', marginBottom: '4px' }}>
                ⏰ {selectedEvent.start_time}
                {selectedEvent.end_time && <> — {selectedEvent.end_time}</>}
              </p>
            )}

            {selectedEvent.location && (
              <p style={{ fontSize: '14px', color: '#5A6A7A', marginBottom: '4px' }}>
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
              background: selectedEvent.type === 'internal' ? '#E8EDF3' : 
                         selectedEvent.type === 'outgoing' ? '#F5F0E0' : '#FDE8E8',
              color: selectedEvent.type === 'internal' ? '#1A3A6B' : 
                     selectedEvent.type === 'outgoing' ? '#C9A845' : '#D4202B'
            }}>
              {selectedEvent.type === 'internal' ? 'Внутреннее' : 
               selectedEvent.type === 'outgoing' ? 'Выездное' : 'Форум'}
            </div>

            {selectedEvent.description && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E6EA' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0A1628', marginBottom: '4px' }}>
                  Описание
                </h4>
                <p style={{ fontSize: '14px', color: '#5A6A7A', lineHeight: '1.6' }}>
                  {selectedEvent.description}
                </p>
              </div>
            )}

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E6EA' }}>
              <p style={{ fontSize: '13px', color: '#8A9AAA' }}>
                👥 Лимит мест: {selectedEvent.capacity || 'Не ограничен'}
              </p>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '16px' }}
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