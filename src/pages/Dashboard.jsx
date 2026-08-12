// src/pages/Dashboard.jsx (добавьте приветствие для президента и вице-президента)
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    events: 0,
    clubs: 0,
    participants: 0,
    achievements: 0
  })

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
        await fetchStats(data?.role)
      }
    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const fetchStats = async (role) => {
    try {
      if (role === 'president' || role === 'vice_president' || role === 'admin' || role === 'movement_coordinator') {
        const { count: eventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
        
        const { count: clubsCount } = await supabase
          .from('clubs')
          .select('*', { count: 'exact', head: true })

        const { count: participantsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'participant')

        setStats({
          events: eventsCount || 0,
          clubs: clubsCount || 0,
          participants: participantsCount || 0,
          achievements: 0
        })
      }
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err)
    }
  }

  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Администратор',
      participant: 'Участник',
      parent: 'Родитель',
      club_coordinator: 'Координатор КЮДа',
      movement_coordinator: 'Координатор движения',
      tutor: 'Тьютор',
      president: '👑 Президент ДОД',
      vice_president: '⭐ Вице-президент ДОД'
    }
    return roles[role] || role
  }

  const getGreeting = (role) => {
    if (role === 'president') {
      return '👑 Президент ДОД «Дипломаты будущего»'
    }
    if (role === 'vice_president') {
      return '⭐ Вице-президент ДОД «Дипломаты будущего»'
    }
    return 'Добро пожаловать'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px', maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 40px' }}>
        {/* HERO для президента и вице-президента */}
        {profile?.role === 'president' && (
          <div style={{
            background: 'linear-gradient(135deg, #0B1F3A 0%, #C9A227 100%)',
            borderRadius: '16px',
            padding: '40px',
            color: 'white',
            marginBottom: '30px',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.1)'
          }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
              👑 Президент ДОД «Дипломаты будущего»
            </h1>
            <p style={{ fontSize: '18px', color: '#E8D9A8', marginBottom: '4px' }}>
              Валерий Евгеньевич Егошкин
            </p>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>
              Чрезвычайный и Полномочный Посол
            </p>
          </div>
        )}

        {profile?.role === 'vice_president' && (
          <div style={{
            background: 'linear-gradient(135deg, #0B1F3A 0%, #174A7E 100%)',
            borderRadius: '16px',
            padding: '40px',
            color: 'white',
            marginBottom: '30px',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.1)'
          }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
              ⭐ Вице-президент ДОД «Дипломаты будущего»
            </h1>
            <p style={{ fontSize: '18px', color: '#EAF2FA', marginBottom: '4px' }}>
              Борис Иванович Медведев
            </p>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>
              Чрезвычайный и Полномочный Посланник
            </p>
          </div>
        )}

        {/* Обычное приветствие для других ролей */}
        {profile?.role !== 'president' && profile?.role !== 'vice_president' && (
          <div style={{
            background: 'linear-gradient(135deg, #0B1F3A 0%, #174A7E 100%)',
            borderRadius: '16px',
            padding: '30px',
            color: 'white',
            marginBottom: '30px'
          }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {getGreeting(profile?.role)}, {profile?.full_name || 'Пользователь'}!
            </h1>
            <p style={{ opacity: 0.7 }}>{getRoleLabel(profile?.role)}</p>
          </div>
        )}

        {/* СТАТИСТИКА */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #E2E7EF'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>
              {stats.clubs}
            </div>
            <div style={{ fontSize: '14px', color: '#667085' }}>КЮДов</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #E2E7EF'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>
              {stats.participants}
            </div>
            <div style={{ fontSize: '14px', color: '#667085' }}>Участников</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #E2E7EF'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>
              {stats.events}
            </div>
            <div style={{ fontSize: '14px', color: '#667085' }}>Мероприятий</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #E2E7EF'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>
              {stats.achievements}
            </div>
            <div style={{ fontSize: '14px', color: '#667085' }}>Достижений</div>
          </div>
        </div>

        {/* БЫСТРЫЕ ССЫЛКИ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px'
        }}>
          <Link to="/clubs" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textDecoration: 'none',
            border: '1px solid #E2E7EF',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          >
            <div style={{ fontSize: '24px' }}>🏫</div>
            <h3 style={{ fontSize: '16px', color: '#0B1F3A', margin: '8px 0 4px' }}>КЮДы</h3>
            <p style={{ fontSize: '13px', color: '#667085' }}>Просмотр всех клубов</p>
          </Link>

          <Link to="/participants" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textDecoration: 'none',
            border: '1px solid #E2E7EF',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          >
            <div style={{ fontSize: '24px' }}>👥</div>
            <h3 style={{ fontSize: '16px', color: '#0B1F3A', margin: '8px 0 4px' }}>Участники</h3>
            <p style={{ fontSize: '13px', color: '#667085' }}>Просмотр всех участников</p>
          </Link>

          <Link to="/achievements" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textDecoration: 'none',
            border: '1px solid #E2E7EF',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          >
            <div style={{ fontSize: '24px' }}>🏆</div>
            <h3 style={{ fontSize: '16px', color: '#0B1F3A', margin: '8px 0 4px' }}>Достижения</h3>
            <p style={{ fontSize: '13px', color: '#667085' }}>Просмотр достижений</p>
          </Link>

          <Link to="/reports" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textDecoration: 'none',
            border: '1px solid #E2E7EF',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          >
            <div style={{ fontSize: '24px' }}>📋</div>
            <h3 style={{ fontSize: '16px', color: '#0B1F3A', margin: '8px 0 4px' }}>Отчёты</h3>
            <p style={{ fontSize: '13px', color: '#667085' }}>Просмотр отчётов</p>
          </Link>

          <Link to="/appeals" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textDecoration: 'none',
            border: '1px solid #E2E7EF',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          >
            <div style={{ fontSize: '24px' }}>📨</div>
            <h3 style={{ fontSize: '16px', color: '#0B1F3A', margin: '8px 0 4px' }}>Обращения</h3>
            <p style={{ fontSize: '13px', color: '#667085' }}>Просмотр обращений</p>
          </Link>

          <Link to="/analytics" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textDecoration: 'none',
            border: '1px solid #E2E7EF',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          >
            <div style={{ fontSize: '24px' }}>📊</div>
            <h3 style={{ fontSize: '16px', color: '#0B1F3A', margin: '8px 0 4px' }}>Аналитика</h3>
            <p style={{ fontSize: '13px', color: '#667085' }}>Просмотр аналитики</p>
          </Link>
        </div>
      </div>
    </div>
  )
}