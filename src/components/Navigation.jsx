// src/components/Navigation.jsx
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/Image.png'

export default function Navigation({ profile }) {
  const location = useLocation()
  
  const isActive = (path) => {
    return location.pathname === path
  }

  const role = profile?.role || 'participant'

  const getMenuItems = () => {
    const baseItems = [
      { path: '/dashboard', label: '🏠 Главная', roles: ['all'] },
      { path: '/profile', label: '👤 Профиль', roles: ['all'] },
    ]

    const roleItems = {
      'participant': [
        { path: '/events', label: '📅 Мероприятия', roles: ['participant'] },
        { path: '/achievements', label: '🏆 Мои достижения', roles: ['participant'] },
      ],
      'parent': [
        { path: '/events', label: '📅 Мероприятия', roles: ['parent'] },
        { path: '/achievements', label: '🏆 Достижения ребёнка', roles: ['parent'] },
      ],
      'club_coordinator': [
        { path: '/events', label: '📅 Мероприятия', roles: ['club_coordinator'] },
        { path: '/clubs', label: '🏫 Мой КЮД', roles: ['club_coordinator'] },
        { path: '/participants', label: '👥 Участники', roles: ['club_coordinator'] },
        { path: '/achievements', label: '🏆 Достижения', roles: ['club_coordinator'] },
        { path: '/reports', label: '📊 Отчёты', roles: ['club_coordinator'] },
      ],
      'tutor': [
        { path: '/events', label: '📅 Мероприятия', roles: ['tutor'] },
        { path: '/clubs', label: '🏫 КЮДы', roles: ['tutor'] },
        { path: '/participants', label: '👥 Участники', roles: ['tutor'] },
        { path: '/achievements', label: '🏆 Достижения', roles: ['tutor'] },
      ],
      'movement_coordinator': [
        { path: '/events', label: '📅 Мероприятия', roles: ['movement_coordinator'] },
        { path: '/clubs', label: '🏫 КЮДы', roles: ['movement_coordinator'] },
        { path: '/participants', label: '👥 Участники', roles: ['movement_coordinator'] },
        { path: '/achievements', label: '🏆 Достижения', roles: ['movement_coordinator'] },
        { path: '/analytics', label: '📊 Аналитика', roles: ['movement_coordinator'] },
        { path: '/settings', label: '⚙️ Настройки', roles: ['movement_coordinator'] },
      ],
      'admin': [
        { path: '/events', label: '📅 Мероприятия', roles: ['admin'] },
        { path: '/clubs', label: '🏫 КЮДы', roles: ['admin'] },
        { path: '/participants', label: '👥 Участники', roles: ['admin'] },
        { path: '/achievements', label: '🏆 Достижения', roles: ['admin'] },
        { path: '/analytics', label: '📊 Аналитика', roles: ['admin'] },
        { path: '/settings', label: '⚙️ Настройки', roles: ['admin'] },
      ],
    }

    let allItems = [...baseItems]
    if (roleItems[role]) {
      allItems = [...allItems, ...roleItems[role]]
    }

    return allItems.filter(item => 
      item.roles.includes('all') || item.roles.includes(role)
    )
  }

  const menuItems = getMenuItems()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <nav style={{
      background: 'white',
      borderBottom: '2px solid #E2E8F0',
      padding: '8px 20px',
      position: 'sticky',
      top: '0',
      zIndex: '99',
      boxShadow: '0 2px 8px rgba(11, 43, 74, 0.06)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '6px',
        minHeight: '48px'
      }}>
        {/* ЛОГОТИП С КАРТИНКОЙ */}
        <Link to="/dashboard" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          padding: '4px 12px 4px 8px',
          borderRadius: '10px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#E8EDF3'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
        >
          <img 
            src={logo} 
            alt="Логотип ДОД Дипломаты будущего"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #C9A845'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#0B2B4A',
              letterSpacing: '0.3px'
            }}>
              Дипломаты будущего
            </span>
            <span style={{
              fontSize: '9px',
              fontWeight: '500',
              color: '#C9A845',
              letterSpacing: '0.8px',
              textTransform: 'uppercase'
            }}>
              Ассоциация российских дипломатов
            </span>
          </div>
        </Link>

        {/* ПУНКТЫ МЕНЮ */}
        <div style={{
          display: 'flex',
          gap: '2px',
          alignItems: 'center',
          flexWrap: 'wrap',
          flex: '1',
          justifyContent: 'center'
        }}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive(item.path) ? '600' : '500',
                color: isActive(item.path) ? '#0B2B4A' : '#4A5568',
                background: isActive(item.path) ? '#E8EDF3' : 'transparent',
                transition: 'all 0.2s ease',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.target.style.background = '#F5F7FA'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.target.style.background = 'transparent'
                }
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* ВЫХОД */}
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: '#4A5568',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#FED7D7'
            e.target.style.color = '#D4202B'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent'
            e.target.style.color = '#4A5568'
          }}
        >
          🚪 Выйти
        </button>
      </div>
    </nav>
  )
}