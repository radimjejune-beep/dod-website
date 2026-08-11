// src/pages/ParentDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function ParentDashboard() {
  const [profile, setProfile] = useState(null)
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showEvents, setShowEvents] = useState(false)
  const [availableEvents, setAvailableEvents] = useState([])
  const [childStatistics, setChildStatistics] = useState({})
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

      // Загружаем детей родителя
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('profile_id', profile?.id)
        .single()

      if (parentData) {
        const { data: childrenData } = await supabase
          .from('parent_children')
          .select(`
            participant_id,
            participants:participant_id (
              id,
              full_name,
              birth_date,
              school,
              class_name,
              club_id,
              clubs:club_id (name),
              interests,
              hobbies,
              average_grade,
              status
            )
          `)
          .eq('parent_id', parentData.id)

        const childrenList = childrenData?.map(c => c.participants) || []
        setChildren(childrenList)

        if (childrenList.length > 0) {
          setSelectedChild(childrenList[0])
          await loadChildStatistics(childrenList[0].id)
          await loadAvailableEvents()
        }
      }

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadChildStatistics = async (childId) => {
    // Подсчёт мероприятий
    const { data: registrations } = await supabase
      .from('registrations')
      .select('*')
      .eq('participant_id', childId)

    const attended = registrations?.filter(r => r.status === 'attended') || []
    const total = registrations?.length || 0

    // Подсчёт достижений
    const { count: achievementsCount } = await supabase
      .from('achievements')
      .select('*', { count: 'exact', head: true })
      .eq('participant_id', childId)

    // Расчёт уровня
    const level = Math.floor(total / 5) + 1
    const progress = ((total % 5) / 5) * 100

    setChildStatistics({
      total_events: total,
      attended_events: attended.length,
      achievements_count: achievementsCount || 0,
      level,
      progress
    })
  }

  const loadAvailableEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(10)

    setAvailableEvents(data || [])
  }

  const handleRegisterChild = async (childId, eventId) => {
    setMessage('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('registrations')
        .insert([{
          participant_id: childId,
          event_id: eventId,
          registered_by: profile.id,
          registration_method: 'parent',
          status: 'registered'
        }])

      if (error) throw error

      setMessage('✅ Ребёнок записан на мероприятие!')
      await loadChildStatistics(childId)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const handleChildSelect = (child) => {
    setSelectedChild(child)
    loadChildStatistics(child.id)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
            👨‍👩‍👦 Родительский кабинет
          </h1>
          <p style={{ color: '#667085', marginBottom: '20px' }}>
            У вас пока нет привязанных детей
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/child-binding')}
          >
            🔗 Привязать ребёнка
          </button>
        </div>
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
              👨‍👩‍👦 Родительский кабинет
            </h1>
            <p style={{ color: '#667085', marginBottom: '20px' }}>
              Управление профилями детей
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/child-binding')}
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            🔗 Привязать ребёнка
          </button>
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

        {/* ВЫБОР РЕБЁНКА */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '24px'
        }}>
          {children.map((child) => (
            <button
              key={child.id}
              className={selectedChild?.id === child.id ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => handleChildSelect(child)}
              style={{ padding: '8px 20px' }}
            >
              {child.full_name}
              {child.class_name && ` (${child.class_name})`}
            </button>
          ))}
        </div>

        {selectedChild && (
          <>
            {/* ПРОФИЛЬ РЕБЁНКА */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A' }}>
                    {selectedChild.full_name}
                  </h2>
                  <p style={{ color: '#667085' }}>
                    {selectedChild.school || 'Школа не указана'} • {selectedChild.class_name || 'Класс не указан'}
                    {selectedChild.clubs?.name && ` • 🏫 ${selectedChild.clubs.name}`}
                  </p>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{
                      padding: '2px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: selectedChild.status === 'active' ? '#E8F5EF' : '#FCEBEC',
                      color: selectedChild.status === 'active' ? '#16845B' : '#B3262E'
                    }}>
                      {selectedChild.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                    </span>
                    {selectedChild.average_grade && (
                      <span style={{
                        marginLeft: '8px',
                        padding: '2px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: '#FBF4DC',
                        color: '#8A6A00'
                      }}>
                        ⭐ {selectedChild.average_grade}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 16px', fontSize: '12px' }}
                    onClick={() => navigate(`/participant/${selectedChild.id}`)}
                  >
                    👁️ Полный профиль
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 16px', fontSize: '12px' }}
                    onClick={() => setShowEvents(!showEvents)}
                  >
                    {showEvents ? '✖ Закрыть' : '📅 Записать на мероприятие'}
                  </button>
                </div>
              </div>
            </div>

            {/* СТАТИСТИКА РЕБЁНКА */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
                  {childStatistics.total_events || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#667085' }}>Мероприятий</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#16845B' }}>
                  {childStatistics.attended_events || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#667085' }}>Посещено</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#C9A227' }}>
                  {childStatistics.achievements_count || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#667085' }}>Достижений</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '12px', borderTop: '3px solid #C9A227' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
                  {childStatistics.level || 1}
                </div>
                <div style={{ fontSize: '12px', color: '#667085' }}>Уровень</div>
              </div>
            </div>

            {/* ИНТЕРЕСЫ И УВЛЕЧЕНИЯ */}
            {(selectedChild.interests || selectedChild.hobbies) && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                  🌟 Интересы и увлечения
                </h3>
                {selectedChild.interests && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Интересы:</strong> {selectedChild.interests}
                  </div>
                )}
                {selectedChild.hobbies && (
                  <div>
                    <strong>Увлечения:</strong> {selectedChild.hobbies}
                  </div>
                )}
              </div>
            )}

            {/* ЗАПИСЬ НА МЕРОПРИЯТИЯ */}
            {showEvents && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
                  📅 Доступные мероприятия
                </h3>
                {availableEvents.length === 0 ? (
                  <p style={{ color: '#667085' }}>Нет доступных мероприятий</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {availableEvents.map((event) => (
                      <div
                        key={event.id}
                        style={{
                          padding: '12px 16px',
                          background: '#F8FAFC',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{event.title}</div>
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
                            {event.location && ` • 📍 ${event.location}`}
                          </div>
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleRegisterChild(selectedChild.id, event.id)}
                          disabled={loading}
                        >
                          Записать
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
                ⚡ Быстрые действия
              </h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => navigate(`/participant/${selectedChild.id}`)}
                >
                  👁️ Профиль ребёнка
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => navigate('/achievements')}
                >
                  🏆 Достижения
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => navigate('/child-binding')}
                >
                  🔗 Привязать ещё ребёнка
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}