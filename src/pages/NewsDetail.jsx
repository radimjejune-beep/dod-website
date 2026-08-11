// src/pages/NewsDetail.jsx
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'

export default function NewsDetail() {
  const { id } = useParams()
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadNews()
    checkAuth()
  }, [id])

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
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setNews(data)
    } catch (err) {
      console.error('Ошибка загрузки новости:', err)
      navigate('/')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
        <Navigation profile={profile} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div className="spinner" />
        </div>
        <Footer />
      </div>
    )
  }

  if (!news) {
    return (
      <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>❌ Новость не найдена</h1>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
            ← Вернуться на главную
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <Link to="/" style={{ 
          display: 'inline-block',
          marginBottom: '20px',
          color: '#174A7E',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          ← Назад к новостям
        </Link>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          border: '1px solid #E2E7EF',
          boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)'
        }}>
          {news.image_url && (
            <div style={{
              marginBottom: '24px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#F4F6F9'
            }}>
              <img 
                src={news.image_url} 
                alt={news.title}
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}

          <div style={{
            fontSize: '14px',
            color: '#98A2B3',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📅</span>
            {new Date(news.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>

          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#0B1F3A',
            marginBottom: '16px',
            lineHeight: 1.3
          }}>
            {news.title}
          </h1>

          <div style={{
            fontSize: '16px',
            lineHeight: 1.8,
            color: '#475467',
            whiteSpace: 'pre-wrap'
          }}>
            {news.content}
          </div>

          <div style={{
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #F4F6F9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <Link to="/" style={{
              padding: '10px 24px',
              background: '#0B1F3A',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#174A7E'}
            onMouseLeave={(e) => e.target.style.background = '#0B1F3A'}
            >
              ← Все новости
            </Link>
            
            {profile && (
              <Link to="/dashboard" style={{
                padding: '10px 24px',
                background: 'transparent',
                color: '#0B1F3A',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#F4F6F9'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                📊 На главную
              </Link>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}