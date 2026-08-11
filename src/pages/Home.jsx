// src/pages/Home.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Home() {
  const [profile, setProfile] = useState(null)
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
    loadNews()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
  }

  const loadNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      if (!error) {
        setNews(data || [])
      }
    } catch (err) {
      console.error('Ошибка загрузки новостей:', err)
    }
    setLoading(false)
  }

  const handleGetStarted = () => {
    if (profile) {
      navigate('/dashboard')
    } else {
      navigate('/register')
    }
  }

  const handleLogin = () => {
    navigate('/login')
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      {/* ===== HERO ===== */}
      <section className="hero" style={{
        borderRadius: '0',
        margin: '0',
        padding: '80px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(201, 162, 39, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(23, 74, 126, 0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        
        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Эмблема */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'rgba(201, 162, 39, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            border: '2px solid rgba(201, 162, 39, 0.3)'
          }}>
            🕊️
          </div>
          
          <h1 style={{
            fontSize: '52px',
            fontWeight: '800',
            marginBottom: '16px',
            letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #E8D9A8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            ДОД «Дипломаты будущего»
          </h1>
          <p style={{
            fontSize: '22px',
            opacity: 0.85,
            marginBottom: '36px',
            lineHeight: 1.6,
            maxWidth: '700px',
            margin: '0 auto 36px',
            fontWeight: '300',
            color: 'rgba(255,255,255,0.9)'
          }}>
            Развиваем навыки дипломатии, международного общения и лидерства у молодёжи
          </p>
          
          {/* Кнопки */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {profile ? (
              <button
                onClick={handleGetStarted}
                className="btn btn-gold"
                style={{ 
                  padding: '16px 48px',
                  fontSize: '18px',
                  borderRadius: '12px',
                  background: 'var(--color-gold)',
                  color: 'var(--color-white)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 8px 30px rgba(201, 162, 39, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                📊 Перейти в кабинет
              </button>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  className="btn"
                  style={{
                    padding: '16px 40px',
                    fontSize: '18px',
                    borderRadius: '12px',
                    background: 'transparent',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.1)'
                    e.target.style.borderColor = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent'
                    e.target.style.borderColor = 'rgba(255,255,255,0.5)'
                  }}
                >
                  🔑 Вход
                </button>
                <button
                  onClick={handleGetStarted}
                  className="btn btn-gold"
                  style={{ 
                    padding: '16px 48px',
                    fontSize: '18px',
                    borderRadius: '12px',
                    background: 'var(--color-gold)',
                    color: 'var(--color-white)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 8px 30px rgba(201, 162, 39, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  🚀 Присоединиться
                </button>
              </>
            )}
          </div>

          {/* Быстрые ссылки для авторизованных */}
          {profile && (
            <div style={{
              marginTop: '24px',
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link to="/events" style={{
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'color 0.2s',
                padding: '4px 12px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.05)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'white'
                e.target.style.background = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255,255,255,0.6)'
                e.target.style.background = 'rgba(255,255,255,0.05)'
              }}
              >
                📅 Мероприятия
              </Link>
              <Link to="/clubs" style={{
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'color 0.2s',
                padding: '4px 12px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.05)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'white'
                e.target.style.background = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255,255,255,0.6)'
                e.target.style.background = 'rgba(255,255,255,0.05)'
              }}
              >
                🏫 КЮДы
              </Link>
              <Link to="/profile" style={{
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'color 0.2s',
                padding: '4px 12px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.05)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'white'
                e.target.style.background = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255,255,255,0.6)'
                e.target.style.background = 'rgba(255,255,255,0.05)'
              }}
              >
                👤 Профиль
              </Link>
            </div>
          )}

          {!profile && (
            <p style={{
              marginTop: '20px',
              fontSize: '15px',
              opacity: 0.6,
              color: 'rgba(255,255,255,0.7)'
            }}>
              Уже есть аккаунт? <Link to="/login" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: '600' }}>Войти</Link>
            </p>
          )}
        </div>
      </section>

      {/* ===== СТАТИСТИКА ===== */}
      <section style={{ 
        maxWidth: '1200px', 
        margin: '-30px auto 0', 
        padding: '0 24px',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px 40px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)'
        }}>
          <div className="stat-card">
            <div className="stat-number">10+</div>
            <div className="stat-label">КЮДов</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">500+</div>
            <div className="stat-label">Участников</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">50+</div>
            <div className="stat-label">Мероприятий</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">8</div>
            <div className="stat-label">Лет работы</div>
          </div>
        </div>
      </section>

      {/* ===== НОВОСТИ ===== */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h2 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: 'var(--color-navy)',
              marginBottom: '4px'
            }}>
              📰 Новости движения
            </h2>
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '16px' }}>
              Главные события и достижения
            </p>
          </div>
          {news.length > 6 && (
            <Link to="/news" style={{ 
              color: 'var(--color-gold)', 
              fontWeight: '600', 
              textDecoration: 'none',
              fontSize: '15px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateX(4px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateX(0)'}
            >
              Все новости →
            </Link>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="spinner" />
          </div>
        ) : news.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '18px' }}>Новостей пока нет</p>
          </div>
        ) : (
          <div className="grid-news">
            {news.map((item, index) => (
              <Link 
                key={item.id} 
                to={`/news/${item.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="news-card" style={{
                  animation: `fadeIn 0.5s ease ${index * 0.1}s both`
                }}>
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="news-card-image"
                    />
                  ) : (
                    <div className="news-card-image" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, var(--color-navy), var(--color-blue))',
                      color: 'white',
                      fontSize: '48px'
                    }}>
                      🕊️
                    </div>
                  )}
                  <div className="news-card-body">
                    <div className="news-card-date">
                      📅 {new Date(item.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <h3 className="news-card-title">{item.title}</h3>
                    <p className="news-card-excerpt">
                      {item.content?.substring(0, 120) || ''}
                      {item.content?.length > 120 ? '...' : ''}
                    </p>
                    <div style={{
                      marginTop: 'auto',
                      paddingTop: '12px',
                      color: 'var(--color-gold)',
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      Читать далее →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ===== МИССИЯ ===== */}
      <section style={{ 
        background: 'var(--color-navy)',
        padding: '60px 24px',
        marginTop: '20px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            margin: '0 auto 20px',
            background: 'rgba(201, 162, 39, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px'
          }}>
            🌍
          </div>
          <h2 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: 'white',
            marginBottom: '16px'
          }}>
            Наша миссия
          </h2>
          <p style={{ 
            fontSize: '18px', 
            color: 'rgba(255,255,255,0.7)',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: 1.8
          }}>
            Воспитание нового поколения дипломатов,<br />
            развитие лидерских качеств и формирование<br />
            гражданской позиции у молодёжи
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '40px',
            marginTop: '32px',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>🤝</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Дипломатия</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>🎯</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Лидерство</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>🌐</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Международное общение</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>⭐</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Гражданская позиция</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== УБРАЛИ FOOTER ===== */}
      {/* Footer уже есть в App.jsx, не нужно дублировать */}
    </div>
  )
}