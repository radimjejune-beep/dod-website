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
      { path: '/', label: 'Главная', roles: ['all'] },
      { path: '/profile', label: 'Профиль', roles: ['all'] },
    ]

    const roleItems = {
      // ============================================
      // УЧАСТНИК (ребенок) - НЕТ КЮДов в меню
      // ============================================
      'participant': [
        { path: '/events', label: 'Мероприятия', roles: ['participant'] },
        { path: '/my-achievements', label: 'Мои достижения', roles: ['participant'] },
      ],

      // ============================================
      // РОДИТЕЛЬ - НЕТ КЮДов в меню
      // ============================================
      'parent': [
        { path: '/events', label: 'Мероприятия', roles: ['parent'] },
        { path: '/my-achievements', label: 'Достижения ребенка', roles: ['parent'] },
      ],

      // ============================================
      // КООРДИНАТОР КЮДА - только свой клуб
      // ============================================
      'club_coordinator': [
        { path: '/clubs', label: 'Мой КЮД', roles: ['club_coordinator'] },
        { path: '/events', label: 'Мероприятия', roles: ['club_coordinator'] },
        { path: '/participants', label: 'Участники', roles: ['club_coordinator'] },
        { path: '/achievements', label: 'Достижения клуба', roles: ['club_coordinator'] },
        { path: '/reports', label: 'Отчёты', roles: ['club_coordinator'] },
        { path: '/club-analytics', label: 'Аналитика клуба', roles: ['club_coordinator'] },
        { path: '/staff', label: 'Сотрудники', roles: ['club_coordinator'] },
        { path: '/staff-calendar', label: 'Календарь', roles: ['club_coordinator'] },
      ],

      // ============================================
      // ТЬЮТОР - видит всё
      // ============================================
      'tutor': [
        { path: '/clubs', label: 'КЮДы', roles: ['tutor'] },
        { path: '/events', label: 'Мероприятия', roles: ['tutor'] },
        { path: '/participants', label: 'Участники', roles: ['tutor'] },
        { path: '/achievements', label: 'Достижения', roles: ['tutor'] },
        { path: '/staff-calendar', label: 'Мой календарь', roles: ['tutor'] },
        { path: '/staff', label: 'Приглашения', roles: ['tutor'] },
        { path: '/my-journal', label: 'Мой журнал', roles: ['tutor'] },
      ],

      // ============================================
      // КООРДИНАТОР ДВИЖЕНИЯ - видит всё
      // ============================================
      'movement_coordinator': [
        { path: '/dashboard', label: 'Дашборд', roles: ['movement_coordinator'] },
        { path: '/clubs', label: 'КЮДы', roles: ['movement_coordinator'] },
        { path: '/events', label: 'Мероприятия', roles: ['movement_coordinator'] },
        { path: '/participants', label: 'Участники', roles: ['movement_coordinator'] },
        { path: '/achievements', label: 'Достижения', roles: ['movement_coordinator'] },
        { path: '/reports', label: 'Отчёты', roles: ['movement_coordinator'] },
        { path: '/analytics', label: 'Аналитика', roles: ['movement_coordinator'] },
        { path: '/settings', label: 'Настройки', roles: ['movement_coordinator'] },
        { path: '/admin/invite', label: 'Пригласить', roles: ['movement_coordinator'] },
        { path: '/staff', label: 'Сотрудники', roles: ['movement_coordinator'] },
        { path: '/staff-calendar', label: 'Календарь', roles: ['movement_coordinator'] },
        { path: '/club-analytics', label: 'Аналитика клубов', roles: ['movement_coordinator'] },
      ],

      // ============================================
      // АДМИН - видит всё
      // ============================================
      'admin': [
        { path: '/dashboard', label: 'Дашборд', roles: ['admin'] },
        { path: '/clubs', label: 'КЮДы', roles: ['admin'] },
        { path: '/events', label: 'Мероприятия', roles: ['admin'] },
        { path: '/participants', label: 'Участники', roles: ['admin'] },
        { path: '/achievements', label: 'Достижения', roles: ['admin'] },
        { path: '/reports', label: 'Отчёты', roles: ['admin'] },
        { path: '/analytics', label: 'Аналитика', roles: ['admin'] },
        { path: '/settings', label: 'Настройки', roles: ['admin'] },
        { path: '/admin/invite', label: 'Пригласить', roles: ['admin'] },
        { path: '/staff', label: 'Сотрудники', roles: ['admin'] },
        { path: '/staff-calendar', label: 'Календарь', roles: ['admin'] },
        { path: '/club-analytics', label: 'Аналитика клубов', roles: ['admin'] },
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
    window.location.href = '/'
  }

  return (
    <nav style={{
      background: '#FFFFFF',
      borderBottom: '1px solid #E2E7EF',
      padding: '6px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 99,
      boxShadow: '0 2px 8px rgba(11, 31, 58, 0.04)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '4px',
        minHeight: '48px'
      }}>
        {/* ЛОГОТИП - ведет на главную */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          padding: '4px 8px',
          borderRadius: '6px',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <img 
            src={logo} 
            alt="Логотип ДОД Дипломаты будущего"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #C9A227'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#0B1F3A',
              letterSpacing: '0.3px'
            }}>
              Дипломаты будущего
            </span>
            <span style={{
              fontSize: '8px',
              fontWeight: '500',
              color: '#C9A227',
              letterSpacing: '0.5px',
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
          flex: 1,
          justifyContent: 'center'
        }}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive(item.path) ? '600' : '400',
                color: isActive(item.path) ? '#0B1F3A' : '#667085',
                background: isActive(item.path) ? '#F4F6F9' : 'transparent',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                letterSpacing: '0.2px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.target.style.background = '#F4F6F9'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.target.style.background = 'transparent'
                }
              }}
            >
              {item.label}
              {isActive(item.path) && (
                <span style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '16px',
                  height: '2px',
                  background: '#C9A227',
                  borderRadius: '2px'
                }} />
              )}
            </Link>
          ))}
        </div>

        {/* ВЫХОД */}
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: '#667085',
            fontSize: '13px',
            fontWeight: '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            letterSpacing: '0.2px'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#FCEBEC'
            e.target.style.color = '#B3262E'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent'
            e.target.style.color = '#667085'
          }}
        >
          Выйти
        </button>
      </div>
    </nav>
  )
}