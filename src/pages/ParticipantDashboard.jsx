// src/pages/ParticipantDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function ParticipantDashboard() {
  const [profile, setProfile] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [statistics, setStatistics] = useState({
    total_events: 0,
    attended_events: 0,
    achievements_count: 0,
    level: 1,
    next_level: 2,
    progress: 0
  })
  const [recentEvents, setRecentEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [diaryEntries, setDiaryEntries] = useState([])
  const [showDiaryForm, setShowDiaryForm] = useState(false)
  const [diaryForm, setDiaryForm] = useState({
    title: '',
    content: '',
    mood: 'good',
    event_id: ''
  })
  const [message, setMessage] = useState('')
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
      }

      // Загружаем данные участника
      const { data: participantData } = await supabase
        .from('participants')
        .select('*')
        .eq('profile_id', profile?.id)
        .single()

      if (participantData) {
        setParticipant(participantData)
        await loadStatistics(participantData.id)
        await loadRecentEvents(participantData.id)
        await loadDiary(participantData.id)
      }

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadStatistics = async (participantId) => {
    // Подсчёт мероприятий
    const { data: registrations } = await supabase
      .from('registrations')
      .select('*')
      .eq('participant_id', participantId)

    const attended = registrations?.filter(r => r.status === 'attended') || []
    const total = registrations?.length || 0

    // Подсчёт достижений
    const { count: achievementsCount } = await supabase
      .from('achievements')
      .select('*', { count: 'exact', head: true })
      .eq('participant_id', participantId)

    // Расчёт уровня (каждые 5 мероприятий = новый уровень)
    const level = Math.floor(total / 5) + 1
    const nextLevel = level + 1
    const progress = ((total % 5) / 5) * 100

    setStatistics({
      total_events: total,
      attended_events: attended.length,
      achievements_count: achievementsCount || 0,
      level,
      next_level: nextLevel,
      progress
    })
  }

  const loadRecentEvents = async (participantId) => {
    const { data } = await supabase
      .from('registrations')
      .select(`
        *,
        events:event_id (id, title, event_date, location)
      `)
      .eq('participant_id', participantId)
      .order('registered_at', { ascending: false })
      .limit(5)

    setRecentEvents(data || [])
  }

  const loadDiary = async (participantId) => {
    const { data } = await supabase
      .from('participant_diary')
      .select('*')
      .eq('participant_id', participantId)
      .order('date', { ascending: false })
      .limit(10)

    setDiaryEntries(data || [])
  }

  const handleAddDiary = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('participant_diary')
        .insert([{
          participant_id: participant.id,
          title: diaryForm.title,
          content: diaryForm.content,
          mood: diaryForm.mood,
          event_id: diaryForm.event_id || null,
          date: new Date().toISOString().split('T')[0]
        }])

      if (error) throw error

      setMessage('✅ Запись добавлена!')
      setDiaryForm({ title: '', content: '', mood: 'good', event_id: '' })
      setShowDiaryForm(false)
      loadDiary(participant.id)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const getLevelName = (level) => {
    const names = {
      1: 'Начинающий дипломат',
      2: 'Юный дипломат',
      3: 'Дипломат',
      4: 'Опытный дипломат',
      5: 'Главный дипломат',
      6: 'Посол',
      7: 'Легенда'
    }
    return names[level] || 'Дипломат'
  }

  const getMoodEmoji = (mood) => {
    const map = {
      'great': '😄',
      'good': '😊',
      'ok': '😐',
      'bad': '😟'
    }
    return map[mood] || '😊'
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
        {/* ВЕРХНЯЯ ЧАСТЬ С ПРОФИЛЕМ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              {profile?.full_name}
            </h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              {participant?.school || 'Школа не указана'} • {participant?.class_name || 'Класс не указан'}
            </p>
            <div style={{ marginTop: '8px' }}>
              <span style={{
                padding: '4px 16px',
                background: '#EAF2FA',
                color: '#174A7E',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                🏅 {getLevelName(statistics.level)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/profile')}
            >
              ✏️ Редактировать профиль
            </button>
          </div>
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

        {/* СТАТИСТИКА В ЦИФРАХ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              {statistics.total_events}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Всего мероприятий</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#16845B' }}>
              {statistics.attended_events}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Посещено</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#C9A227' }}>
              {statistics.achievements_count}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Достижений</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px', borderTop: '3px solid #C9A227' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              {statistics.level}
            </div>
            <div style={{ fontSize: '13px', color: '#667085' }}>Уровень</div>
            <div style={{
              width: '100%',
              height: '4px',
              background: '#F4F6F9',
              borderRadius: '2px',
              marginTop: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${statistics.progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #C9A227, #E8D9A8)',
                borderRadius: '2px',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
              До {statistics.next_level} уровня: {Math.round((5 - statistics.total_events % 5) % 5)} мероприятий
            </div>
          </div>
        </div>

        {/* ТРИ КОЛОНКИ: Мероприятия, Дневник, Достижения */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {/* Мои мероприятия */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📅 Мои мероприятия
            </h3>
            {recentEvents.length === 0 ? (
              <p style={{ color: '#667085', fontSize: '14px' }}>Вы ещё не записаны на мероприятия</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentEvents.map((r) => (
                  <div key={r.id} style={{
                    padding: '12px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: r.status === 'attended' ? '3px solid #16845B' : '3px solid #C9A227'
                  }}>
                    <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                      {r.events?.title || 'Мероприятие'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      {r.events?.event_date ? new Date(r.events.event_date).toLocaleDateString('ru-RU') : ''}
                      {r.events?.location && ` • ${r.events.location}`}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        background: r.status === 'attended' ? '#E8F5EF' : '#FBF4DC',
                        color: r.status === 'attended' ? '#16845B' : '#8A6A00'
                      }}>
                        {r.status === 'attended' ? '✅ Участвовал' : '📝 Записан'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px', padding: '8px' }}
              onClick={() => navigate('/events')}
            >
              Все мероприятия →
            </button>
          </div>

          {/* Дневник участника */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                📝 Мой дневник
              </h3>
              <button
                className="btn btn-primary"
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => setShowDiaryForm(!showDiaryForm)}
              >
                {showDiaryForm ? '✖' : '➕'}
              </button>
            </div>

            {showDiaryForm && (
              <form onSubmit={handleAddDiary} style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Заголовок"
                  value={diaryForm.title}
                  onChange={(e) => setDiaryForm({ ...diaryForm, title: e.target.value })}
                  style={{ marginBottom: '8px' }}
                  required
                />
                <textarea
                  className="form-input"
                  placeholder="Что произошло?"
                  rows="2"
                  value={diaryForm.content}
                  onChange={(e) => setDiaryForm({ ...diaryForm, content: e.target.value })}
                  style={{ marginBottom: '8px', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select
                    className="form-select"
                    value={diaryForm.mood}
                    onChange={(e) => setDiaryForm({ ...diaryForm, mood: e.target.value })}
                    style={{ flex: 1 }}
                  >
                    <option value="great">😄 Отлично</option>
                    <option value="good">😊 Хорошо</option>
                    <option value="ok">😐 Нормально</option>
                    <option value="bad">😟 Плохо</option>
                  </select>
                  <button type="submit" className="btn btn-success" disabled={loading}>
                    {loading ? '⏳' : '✅'}
                  </button>
                </div>
              </form>
            )}

            {diaryEntries.length === 0 ? (
              <p style={{ color: '#667085', fontSize: '14px' }}>Записей пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {diaryEntries.map((d) => (
                  <div key={d.id} style={{
                    padding: '10px 12px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: '3px solid #C9A227'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '500', color: '#0B1F3A' }}>{d.title}</span>
                      <span>{getMoodEmoji(d.mood)}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>{d.content}</div>
                    <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                      📅 {new Date(d.date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Достижения */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🏆 Мои достижения
            </h3>
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '8px' }}>
              🏅
            </div>
            <p style={{ textAlign: 'center', fontSize: '14px', color: '#667085' }}>
              У вас {statistics.achievements_count} достижений
            </p>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px', padding: '8px' }}
              onClick={() => navigate('/achievements')}
            >
              Все достижения →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}