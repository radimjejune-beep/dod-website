// src/pages/Register.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('participant')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: role }
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          full_name: fullName,
          email: email,
          role: role
        }])

      if (profileError) {
        setError('Ошибка создания профиля: ' + profileError.message)
      } else {
        setSuccess(true)
        setTimeout(() => navigate('/login'), 2000)
      }
    }
    setLoading(false)
  }

  return (
    <div className="auth-bg">
      <div className="card" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '40px',
        animation: 'fadeIn 0.5s ease',
        position: 'relative',
        zIndex: 1
      }}>
        {/* ЛОГОТИП */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, var(--mid-blue), var(--mid-blue-light))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '28px',
            boxShadow: '0 4px 16px rgba(11, 43, 74, 0.3)'
          }}>
            🌍
          </div>
          <h1 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '2px' }}>
            Дипломаты будущего
          </h1>
          <p style={{ 
            fontSize: '12px', 
            color: 'var(--gold)', 
            fontWeight: '600',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            МИД РФ • Регистрация
          </p>
        </div>

        {/* ОШИБКИ / УСПЕХ */}
        {error && (
          <div style={{
            padding: '14px',
            background: '#FED7D7',
            color: '#9B2C2C',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center',
            borderLeft: '4px solid #D4202B'
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '14px',
            background: '#C6F6D5',
            color: '#276749',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center',
            borderLeft: '4px solid #38A169'
          }}>
            ✅ Регистрация успешна! Перенаправление на вход...
          </div>
        )}

        {/* ФОРМА */}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">ФИО</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Введите ваше полное имя"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@mail.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Пароль (мин. 6 символов)</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Введите пароль"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Роль в системе</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="participant">👤 Участник (ребенок)</option>
              <option value="parent">👨‍👩‍👦 Родитель</option>
              <option value="club_coordinator">🏫 Координатор КЮДа</option>
              <option value="tutor">📚 Тьютор</option>
              <option value="movement_coordinator">⭐ Координатор движения</option>
              <option value="admin">🔧 Администратор</option>
            </select>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '8px',
              padding: '10px',
              background: 'var(--gray-light)',
              borderRadius: '8px',
              lineHeight: '1.4',
              border: '1px solid var(--gray-border)'
            }}>
              {role === 'participant' && '👤 Участник: запись на мероприятия, просмотр профиля'}
              {role === 'parent' && '👨‍👩‍👦 Родитель: управление профилем ребёнка'}
              {role === 'club_coordinator' && '🏫 Координатор КЮДа: управление клубом, отчёты'}
              {role === 'tutor' && '📚 Тьютор: рекомендации, достижения'}
              {role === 'movement_coordinator' && '⭐ Координатор движения: управление всей системой'}
              {role === 'admin' && '🔧 Администратор: полный доступ ко всему'}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-gold"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '16px', 
              fontSize: '16px',
              marginTop: '8px'
            }}
          >
            {loading ? '⏳ Регистрация...' : '✅ Зарегистрироваться'}
          </button>
        </form>

        <p style={{ 
          marginTop: '24px', 
          textAlign: 'center', 
          fontSize: '14px', 
          color: 'var(--text-secondary)'
        }}>
          Уже есть аккаунт?{' '}
          <a href="/login" style={{ 
            color: 'var(--mid-blue)', 
            fontWeight: '600',
            textDecoration: 'none',
            borderBottom: '2px solid var(--gold)',
            paddingBottom: '2px'
          }}>
            Войти
          </a>
        </p>

        {/* ЗОЛОТАЯ ЛИНИЯ ВНИЗУ */}
        <div style={{
          marginTop: '24px',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
          borderRadius: '2px'
        }} />
      </div>
    </div>
  )
}