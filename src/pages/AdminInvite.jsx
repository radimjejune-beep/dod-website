// src/pages/AdminInvite.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function AdminInvite() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [codes, setCodes] = useState([])
  const [clubs, setClubs] = useState([])
  const [form, setForm] = useState({
    role: 'club_coordinator',
    club_id: '',
    invited_name: '',
    invited_email: '',
    invited_password: ''
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
      }

      const { data: clubsData } = await supabase
        .from('clubs')
        .select('*')
        .order('name')
      setClubs(clubsData || [])

      const { data: codesData } = await supabase
        .from('invitation_codes')
        .select('*')
        .order('created_at', { ascending: false })
      setCodes(codesData || [])
    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const generateCode = async () => {
    setMessage('')
    setLoading(true)

    try {
      // Проверяем, что email не занят
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', form.invited_email)
        .single()

      if (existingUser) {
        setMessage('❌ Этот email уже зарегистрирован в системе')
        setLoading(false)
        return
      }

      // Генерируем код из первых букв имени
      const nameParts = form.invited_name.trim().split(' ')
      let code = ''
      if (nameParts.length >= 2) {
        code = nameParts[0].slice(0, 2).toUpperCase() + nameParts[1].slice(0, 2).toUpperCase()
      } else {
        code = nameParts[0].slice(0, 4).toUpperCase()
      }
      // Добавляем случайные цифры для уникальности
      code = code + Math.floor(100 + Math.random() * 900)

      const { error } = await supabase
        .from('invitation_codes')
        .insert([{
          code: code,
          role: form.role,
          club_id: form.club_id || null,
          created_by: profile.id,
          invited_name: form.invited_name,
          invited_email: form.invited_email,
          invited_password: form.invited_password,
          is_used: false,
          expires_at: null
        }])

      if (error) throw error

      setMessage(`✅ Приглашение создано для ${form.invited_name}!`)
      setForm({
        role: 'club_coordinator',
        club_id: '',
        invited_name: '',
        invited_email: '',
        invited_password: ''
      })
      loadData()
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const deleteCode = async (id) => {
    if (!confirm('Удалить приглашение?')) return

    const { error } = await supabase
      .from('invitation_codes')
      .delete()
      .eq('id', id)

    if (!error) {
      loadData()
    }
  }

  const copyInvitation = (code) => {
    const text = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏛️ ДОД «Дипломаты будущего»
  Приглашение в систему
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Уважаемый(ая) ${code.invited_name}!

Вас приглашают присоединиться к платформе 
Детского общественного движения «Дипломаты будущего».

Ваши данные для входа:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔑 Код: ${code.code}
  📧 Email: ${code.invited_email}
  🔒 Пароль: ${code.invited_password}
  👤 Роль: ${code.role}
  ${code.club_id ? `🏫 Клуб: ${clubs.find(c => c.id === code.club_id)?.name || '—'}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Для входа перейдите по ссылке:
https://dod-website.vercel.app/login

С уважением,
Команда ДОД «Дипломаты будущего»
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `
    navigator.clipboard.writeText(text)
    setMessage('✅ Данные приглашения скопированы в буфер обмена!')
    setTimeout(() => setMessage(''), 3000)
  }

  if (profile?.role !== 'admin' && profile?.role !== 'movement_coordinator') {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>⛔ Доступ запрещён</h1>
          <p style={{ color: '#667085' }}>Только администратор или координатор движения</p>
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

  const roleLabels = {
    'club_coordinator': '🏫 Координатор КЮДа',
    'tutor': '📚 Тьютор',
    'movement_coordinator': '⭐ Координатор движения',
    'admin': '🔧 Администратор'
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>🎫 Именные приглашения</h1>
        <p style={{ color: '#667085', marginBottom: '24px' }}>
          Создавайте именные приглашения для координаторов, тьюторов и других сотрудников
        </p>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '16px',
            textAlign: 'center',
            background: message.includes('✅') ? '#E8F5EF' : '#FCEBEC',
            color: message.includes('✅') ? '#16845B' : '#B3262E',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {/* ФОРМА СОЗДАНИЯ ПРИГЛАШЕНИЯ */}
        <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            📝 Создать именное приглашение
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">ФИО приглашаемого</label>
              <input
                type="text"
                className="form-input"
                value={form.invited_name}
                onChange={(e) => setForm({ ...form, invited_name: e.target.value })}
                required
                placeholder="Иванов Иван Иванович"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email (логин)</label>
              <input
                type="email"
                className="form-input"
                value={form.invited_email}
                onChange={(e) => setForm({ ...form, invited_email: e.target.value })}
                required
                placeholder="ivanov@mail.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Пароль</label>
              <input
                type="text"
                className="form-input"
                value={form.invited_password}
                onChange={(e) => setForm({ ...form, invited_password: e.target.value })}
                required
                placeholder="Введите пароль (минимум 6 символов)"
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Роль</label>
              <select
                className="form-select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="club_coordinator">🏫 Координатор КЮДа</option>
                <option value="tutor">📚 Тьютор</option>
                <option value="movement_coordinator">⭐ Координатор движения</option>
                <option value="admin">🔧 Администратор</option>
              </select>
            </div>

            {form.role === 'club_coordinator' && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">КЮД (для координатора)</label>
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
          </div>

          <button
            className="btn btn-primary"
            onClick={generateCode}
            disabled={loading}
            style={{ marginTop: '8px', padding: '12px 32px' }}
          >
            {loading ? '⏳ Создание...' : '🎫 Создать приглашение'}
          </button>
        </div>

        {/* СПИСОК ПРИГЛАШЕНИЙ */}
        <div className="card" style={{ padding: '0', overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Код</th>
                <th>Приглашённый</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Клуб</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#667085' }}>
                    Приглашений пока нет
                  </td>
                </tr>
              ) : (
                codes.map((code) => (
                  <tr key={code.id}>
                    <td style={{ fontWeight: '600', color: '#0B1F3A' }}>{code.code}</td>
                    <td>{code.invited_name || '—'}</td>
                    <td>{code.invited_email || '—'}</td>
                    <td>{roleLabels[code.role] || code.role}</td>
                    <td>{clubs.find(c => c.id === code.club_id)?.name || '—'}</td>
                    <td>
                      <span style={{
                        padding: '2px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: code.is_used ? '#FCEBEC' : '#E8F5EF',
                        color: code.is_used ? '#B3262E' : '#16845B'
                      }}>
                        {code.is_used ? '🔴 Использован' : '🟢 Активен'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => copyInvitation(code)}
                        >
                          📋
                        </button>
                        {!code.is_used && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            onClick={() => deleteCode(code.id)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
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