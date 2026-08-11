// src/pages/EventParticipants.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function EventParticipants() {
  const { eventId } = useParams()
  const [profile, setProfile] = useState(null)
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [eventId])

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

      // Загружаем информацию о мероприятии
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      setEvent(eventData)

      // Загружаем участников мероприятия
      const { data: participantsData } = await supabase
        .from('registrations')
        .select(`
          *,
          participants:participant_id (
            id,
            full_name,
            school,
            class_name,
            birth_date,
            clubs:club_id (name)
          )
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false })

      setParticipants(participantsData || [])

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const handleExportCSV = () => {
    const headers = ['ФИО', 'Школа', 'Класс', 'Клуб', 'Статус', 'Дата регистрации']
    const rows = participants.map(r => [
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
    link.download = `участники_${event?.title}_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
        <button
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
          style={{ marginBottom: '20px' }}
        >
          ← Назад
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
              📋 {event?.title || 'Мероприятие'}
            </h1>
            <p style={{ color: '#667085' }}>
              Участники мероприятия — {participants.length} человек
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {event?.form_url && (
              <a
                href={event.form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                📝 Форма
              </a>
            )}
            <button
              className="btn btn-success"
              onClick={handleExportCSV}
            >
              📊 Скачать Excel
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '0', overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>№</th>
                <th>ФИО</th>
                <th>Школа</th>
                <th>Класс</th>
                <th>Клуб</th>
                <th>Статус</th>
                <th>Дата регистрации</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#667085' }}>
                    Участников пока нет
                  </td>
                </tr>
              ) : (
                participants.map((r, index) => (
                  <tr key={r.id}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: '500' }}>{r.participants?.full_name || '—'}</td>
                    <td>{r.participants?.school || '—'}</td>
                    <td>{r.participants?.class_name || '—'}</td>
                    <td>{r.participants?.clubs?.name || '—'}</td>
                    <td>
                      <span style={{
                        padding: '2px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: r.status === 'attended' ? '#E8F5EF' : r.status === 'cancelled' ? '#FCEBEC' : '#FBF4DC',
                        color: r.status === 'attended' ? '#16845B' : r.status === 'cancelled' ? '#B3262E' : '#8A6A00'
                      }}>
                        {r.status === 'attended' ? '✅ Участвовал' : r.status === 'cancelled' ? '❌ Отменено' : '📝 Записан'}
                      </span>
                    </td>
                    <td>{new Date(r.registered_at).toLocaleDateString('ru-RU')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}