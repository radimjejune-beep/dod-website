// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadUserData()
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
    setLoading(false)
  }

  const getRoleEmoji = (role) => {
    const map = {
      'participant': '👤',
      'parent': '👨‍👩‍👦',
      'club_coordinator': '🏫',
      'tutor': '📚',
      'movement_coordinator': '⭐',
      'admin': '🔧'
    }
    return map[role] || '👤'
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

  // Определяем, какие кнопки показывать в зависимости от роли
  const getButtons = () => {
    const role = profile?.role
    const baseButtons = []

    // Мероприятия — видят все
    baseButtons.push({
      id: 'events',
      label: '📅 Мероприятия',
      description: 'Календарь и запись на события',
      path: '/events',
      color: '#0B2B4A',
      icon: '📅'
    })

    // КЮДы — все кроме участника и родителя
    if (role !== 'participant' && role !== 'parent') {
      baseButtons.push({
        id: 'clubs',
        label: role === 'club_coordinator' ? '🏫 Мой КЮД' : '🏫 КЮДы',
        description: role === 'club_coordinator' ? 'Управление вашим клубом' : 'Клубы юных дипломатов',
        path: '/clubs',
        color: '#1A5A8B',
        icon: '🏫'
      })
    }

    // Участники — для координаторов, тьюторов, админов
    if (role === 'admin' || role === 'movement_coordinator' || role === 'club_coordinator' || role === 'tutor') {
      baseButtons.push({
        id: 'participants',
        label: '👥 Участники',
        description: role === 'club_coordinator' ? 'Участники вашего клуба' : 'Все участники движения',
        path: '/participants',
        color: '#D4202B',
        icon: '👥'
      })
    }

    // Достижения — все кроме родителя
    if (role !== 'parent') {
      baseButtons.push({
        id: 'achievements',
        label: role === 'participant' ? '🏆 Мои достижения' : '🏆 Достижения',
        description: role === 'participant' ? 'Ваши успехи и награды' : 'Достижения участников',
        path: '/achievements',
        color: '#C9A845',
        icon: '🏆'
      })
    }

    // Аналитика — только админ и координатор движения
    if (role === 'admin' || role === 'movement_coordinator') {
      baseButtons.push({
        id: 'analytics',
        label: '📊 Аналитика',
        description: 'Статистика и показатели движения',
        path: '/analytics',
        color: '#6B46C1',
        icon: '📊'
      })
    }

    // Настройки — только админ и координатор движения
    if (role === 'admin' || role === 'movement_coordinator') {
      baseButtons.push({
        id: 'settings',
        label: '⚙️ Настройки сайта',
        description: 'Управление контентом и настройками',
        path: '/settings',
        color: '#4A5568',
        icon: '⚙️'
      })
    }

    return baseButtons
  }

  const buttons = getButtons()

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container">
        {/* ГЕРОЙ-БАННЕР */}
        <div className="hero">
          <h1>Добро пожаловать, <span className="hero-gold">{profile?.full_name}!</span></h1>
          <p>
            {getRoleEmoji(profile?.role)} {getRoleLabel(profile?.role)} • Система управления ДОД «Дипломаты будущего»
          </p>
        </div>

        {/* БОЛЬШИЕ КЛИКАБЕЛЬНЫЕ КНОПКИ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {buttons.map((btn) => (
            <div
              key={btn.id}
              onClick={() => navigate(btn.path)}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '28px 24px',
                boxShadow: '0 4px 20px rgba(11, 43, 74, 0.08)',
                border: '1px solid #E2E8F0',
                borderTop: `4px solid ${btn.color}`,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(11, 43, 74, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(11, 43, 74, 0.08)'
              }}
            >
              <div style={{
                fontSize: '36px',
                marginBottom: '8px',
                width: '56px',
                height: '56px',
                background: `${btn.color}15`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {btn.icon}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0B2B4A', marginBottom: '4px' }}>
                {btn.label}
              </h3>
              <p style={{ color: '#4A5568', fontSize: '14px', marginBottom: '12px' }}>
                {btn.description}
              </p>
              <div style={{
                marginTop: 'auto',
                fontSize: '13px',
                fontWeight: '600',
                color: btn.color,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                Перейти →
              </div>
            </div>
          ))}
        </div>

        {/* БЫСТРЫЕ СТАТИСТИКИ (опционально) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginTop: '10px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#0B2B4A' }}>
              {profile?.role || '—'}
            </div>
            <div style={{ fontSize: '12px', color: '#4A5568' }}>Ваша роль</div>
          </div>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#0B2B4A' }}>
              {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '12px', color: '#4A5568' }}>Текущий месяц</div>
          </div>
        </div>
      </div>
    </div>
  )
}