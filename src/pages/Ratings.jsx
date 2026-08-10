// src/pages/Ratings.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Ratings() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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
        <h1>🏆 Рейтинг КЮДов</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Топ клубов юных дипломатов
        </p>

        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '18px' }}>🏅 Здесь будет рейтинг КЮДов</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Рейтинг рассчитывается автоматически на основе ежемесячных отчетов
          </p>
        </div>
      </div>
    </div>
  )
}