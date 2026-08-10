// src/pages/Participants.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Participants() {
  const [profile, setProfile] = useState(null)
  const [participants, setParticipants] = useState([])
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    birth_date: '',
    school: '',
    class_name: '',
    club_id: ''
  })
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

      const { data: clubsData } = await supabase
        .from('clubs')
        .select('*')
        .order('name')
      setClubs(clubsData || [])

      await loadParticipants()
    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadParticipants = async () => {
    let query = supabase
      .from('participants')
      .select(`
        *,
        clubs:club_id (name)
      `)
      .order('full_name')

    if (profile?.role === 'club_coordinator') {
      const { data: coordinatorData } = await supabase
        .from('club_coordinators')
        .select('club_id')
        .eq('profile_id', profile.id)
        .single()

      if (coordinatorData) {
        query = query.eq('club_id', coordinatorData.club_id)
      }
    }

    const { data, error } = await query
    if (!error) {
      setParticipants(data || [])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const participantData = {
        full_name: form.full_name,
        birth_date: form.birth_date || null,
        school: form.school || '',
        class_name: form.class_name || '',
        club_id: form.club_id || null
      }

      const { error } = await supabase
        .from('participants')
        .insert([participantData])

      if (error) throw error

      setMessage('✅ Участник добавлен!')
      resetForm()
      loadParticipants()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({
      full_name: '',
      birth_date: '',
      school: '',
      class_name: '',
      club_id: ''
    })
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить участника?')) return

    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id)

    if (!error) {
      loadParticipants()
    }
  }

  const canManage = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' || 
                    profile?.role === 'club_coordinator'

  if (!canManage) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>⛔ Доступ запрещён</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Только координаторы и администраторы</p>
        </div>
      </div>
    )
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1>👥 Участники</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {profile?.role === 'club_coordinator' ? 'Участники вашего клуба' : 'Все участники движения'}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✖ Закрыть' : '➕ Добавить участника'}
          </button>
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

        {showForm && (
          <div className="card" style={{ marginBottom: '30px', padding: '24px' }}>
            <h3>📝 Добавить участника</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">ФИО</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  placeholder="Иванов Иван Иванович"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Дата рождения</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Школа</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.school}
                  onChange={(e) => setForm({ ...form, school: e.target.value })}
                  placeholder="Школа №1"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Класс</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  placeholder="8А"
                />
              </div>

              {(profile?.role === 'admin' || profile?.role === 'movement_coordinator') && clubs.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Клуб</label>
                  <select
                    className="form-select"
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  >
                    <option value="">Без клуба</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : '✅ Добавить'}
                </button>
                <button type="button" className="btn btn-outline" onClick={resetForm}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: '0', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gray-border)', background: 'var(--gray-light)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>ФИО</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Класс</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Школа</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Клуб</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Участников пока нет
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-border)' }}>
                    <td style={{ padding: '12px 16px' }}>{p.full_name}</td>
                    <td style={{ padding: '12px 16px' }}>{p.class_name || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{p.school || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{p.clubs?.name || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => navigate(`/participant/${p.id}`)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        👁️ Профиль
                      </button>
                      {(profile?.role === 'admin' || profile?.role === 'movement_coordinator') && (
                        <button
                          className="btn btn-red"
                          onClick={() => handleDelete(p.id)}
                          style={{ padding: '4px 12px', fontSize: '12px', marginLeft: '6px' }}
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}