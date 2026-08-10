// src/pages/Profile.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Ошибка загрузки профиля:', error)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone || '',
      })
      .eq('id', profile.id)

    if (error) {
      setMessage('❌ Ошибка: ' + error.message)
    } else {
      setMessage('✅ Профиль успешно обновлён!')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
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
      
      <div className="container" style={{ paddingTop: '30px', maxWidth: '600px' }}>
        <h1>👤 Мой профиль</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
          Редактирование личных данных
        </p>

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

        <form onSubmit={handleSave} className="card" style={{ padding: '32px' }}>
          <div className="form-group">
            <label className="form-label">ФИО</label>
            <input
              type="text"
              className="form-input"
              value={profile?.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={profile?.email || ''}
              disabled
              style={{ background: '#f0f0f0' }}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Email нельзя изменить — это ваш логин
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Телефон</label>
            <input
              type="tel"
              className="form-input"
              value={profile?.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+7 (XXX) XXX-XX-XX"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Роль</label>
            <input
              type="text"
              className="form-input"
              value={profile?.role || ''}
              disabled
              style={{ background: '#f0f0f0' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ width: '100%', padding: '14px' }}
          >
            {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
          </button>
        </form>

        {/* Дополнительная информация */}
        <div className="card" style={{ marginTop: '20px', padding: '20px', background: 'var(--gray-light)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            <strong>ID пользователя:</strong> {profile?.id}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            <strong>Дата регистрации:</strong> {new Date(profile?.created_at).toLocaleDateString('ru-RU')}
          </p>
        </div>
      </div>
    </div>
  )
}