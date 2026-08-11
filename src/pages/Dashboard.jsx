// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
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

      const { data: newsData, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      if (!error) {
        setNews(newsData || [])
      }
    } catch (err) {
      console.error('Ошибка загрузки:', err)
    }
    setLoading(false)
  }

  const getRoleLabel = (role) => {
    const map = {
      'participant': 'Участник',
      'parent': 'Родитель',
      'club_coordinator': 'Координатор КЮДа',
      'tutor': 'Тьютор',
      'movement_coordinator': 'Координатор движения',
      'admin': 'Администратор'
    }
    return map[role] || role
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  const quickActions = []

  if (profile?.role === 'admin' || profile?.role === 'movement_coordinator' || profile?.role === 'club_coordinator') {
    quickActions.push({ id: 'events', label: 'Мероприятия', icon: '📅', path: '/events', color: 'var(--color-blue)' })
    quickActions.push({ id: 'clubs', label: 'КЮДы', icon: '🏛️', path: '/clubs', color: 'var(--color-navy)' })
    quickActions.push({ id: 'participants', label: 'Участники', icon: '👤', path: '/participants', color: 'var(--color-blue)' })
    quickActions.push({ id: 'achievements', label: 'Достижения', icon: '🏆', path: '/achievements', color: 'var(--color-gold)' })
    if (profile?.role === 'admin' || profile?.role === 'movement_coordinator') {
      quickActions.push({ id: 'analytics', label: 'Аналитика', icon: '📊', path: '/analytics', color: 'var(--color-blue)' })
      quickActions.push({ id: 'settings', label: 'Настройки', icon: '⚙️', path: '/settings', color: 'var(--color-text-tertiary)' })
    }
  } else if (profile?.role === 'participant' || profile?.role === 'parent') {
    quickActions.push({ id: 'events', label: 'Мероприятия', icon: '📅', path: '/events', color: 'var(--color-blue)' })
    quickActions.push({ id: 'achievements', label: 'Достижения', icon: '🏆', path: '/achievements', color: 'var(--color-gold)' })
  } else if (profile?.role === 'tutor') {
    quickActions.push({ id: 'events', label: 'Мероприятия', icon: '📅', path: '/events', color: 'var(--color-blue)' })
    quickActions.push({ id: 'clubs', label: 'КЮДы', icon: '🏛️', path: '/clubs', color: 'var(--color-navy)' })
    quickActions.push({ id: 'participants', label: 'Участники', icon: '👤', path: '/participants', color: 'var(--color-blue)' })
    quickActions.push({ id: 'achievements', label: 'Достижения', icon: '🏆', path: '/achievements', color: 'var(--color-gold)' })
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container">
        <div className="hero">
          <h1>
            Добро пожаловать,{' '}
            <span className="hero-gold">{profile?.full_name}!</span>
          </h1>
          <p>{getRoleLabel(profile?.role)} • Система управления ДОД «Дипломаты будущего»</p>
        </div>

        <div className="grid-3" style={{ marginBottom: '32px' }}>
          {quickActions.map((action) => (
            <div
              key={action.id}
              className="card"
              style={{
                cursor: 'pointer',
                borderTop: `3px solid ${action.color}`,
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={() => navigate(action.path)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{action.icon}</div>
              <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--color-navy)', marginBottom: '2px' }}>
                {action.label}
              </h3>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: '14px', flex: 1 }}>
                Перейти в раздел
              </p>
              <div style={{
                marginTop: '12px',
                fontSize: '13px',
                color: action.color,
                fontWeight: '500'
              }}>
                Перейти →
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '8px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--color-navy)' }}>
                Новости движения
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>
                Главные события и новости ДОД «Дипломаты будущего»
              </p>
            </div>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '6px 16px' }}
              onClick={() => navigate('/')}
            >
              Все новости →
            </button>
          </div>

          {news.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
              <p style={{ color: 'var(--color-text-tertiary)' }}>Новостей пока нет</p>
            </div>
          ) : (
            <div className="grid-news">
              {news.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="news-card"
                  onClick={() => navigate('/')}
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="news-card-image"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  )}
                  <div className="news-card-body">
                    <h4 className="news-card-title">{item.title}</h4>
                    <p className="news-card-excerpt">
                      {item.content && item.content.length > 100
                        ? item.content.slice(0, 100) + '...'
                        : item.content}
                    </p>
                    <div className="news-card-date">
                      📅 {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          marginTop: '32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px'
        }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-navy)' }}>
              {profile?.role || '—'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>Ваша роль</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-navy)' }}>
              {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>Текущий месяц</div>
          </div>
        </div>
      </div>
    </div>
  )
}