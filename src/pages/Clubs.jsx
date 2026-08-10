// src/pages/Clubs.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Clubs() {
  const [profile, setProfile] = useState(null)
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name: '', description: '' })
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Загружаем профиль текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }

      // Строим запрос для клубов
      let query = supabase
        .from('clubs')
        .select(`
          *,
          participants:participants(count)
        `)
        .order('name')

      // Если координатор КЮДа — показываем только свой клуб
      if (profile?.role === 'club_coordinator') {
        const { data: coordinatorData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profile.id)
          .single()

        if (coordinatorData) {
          query = query.eq('id', coordinatorData.club_id)
        }
      }

      const { data, error } = await query
      if (!error) {
        setClubs(data || [])
      } else {
        console.error('Ошибка загрузки клубов:', error)
      }
    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('clubs')
        .insert([{ name: form.name, description: form.description }])

      if (error) throw error

      setMessage('✅ КЮД создан!')
      setForm({ name: '', description: '' })
      setShowForm(false)
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить КЮД?')) return

    const { error } = await supabase
      .from('clubs')
      .delete()
      .eq('id', id)

    if (!error) {
      loadData()
    }
  }

  const canManage = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1>🏫 КЮДы</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {profile?.role === 'club_coordinator' ? 'Ваш клуб' : 'Клубы юных дипломатов'}
            </p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✖ Закрыть' : '➕ Создать КЮД'}
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: '14px',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
            background: message.includes('✅') ? '#C6F6D5' : '#FED7D7',
            color: message.includes('✅') ? '#276749' : '#9B2C2C'
          }}>
            {message}
          </div>
        )}

        {showForm && canManage && (
          <div className="card" style={{ marginBottom: '30px', padding: '24px' }}>
            <h3>📝 Создать КЮД</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Название</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="КЮД «Смена»"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea
                  className="form-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="3"
                  placeholder="Описание клуба"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? '⏳ Создание...' : '✅ Создать'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {clubs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '18px' }}>🏫 КЮДов пока нет</p>
              {canManage && <p style={{ color: 'var(--text-secondary)' }}>Создайте первый клуб!</p>}
            </div>
          ) : (
            clubs.map((club) => (
              <div key={club.id} className="card card-gold-border" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>{club.name}</h3>
                    {club.description && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{club.description}</p>
                    )}
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      👥 Участников: {club.participants?.[0]?.count || 0}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      className="btn btn-red"
                      onClick={(e) => { e.stopPropagation(); handleDelete(club.id) }}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '12px', width: '100%' }}
                  onClick={() => navigate(`/club/${club.id}`)}
                >
                  👁️ Перейти в КЮД
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}