// src/pages/Appeals.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Appeals() {
  const [profile, setProfile] = useState(null)
  const [appeals, setAppeals] = useState([])
  const [clubId, setClubId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [showForm, setShowForm] = useState(false)
  const [selectedAppeal, setSelectedAppeal] = useState(null)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [form, setForm] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  })
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const role = profileData?.role

      // Проверка прав — только координаторы и выше
      const allowedRoles = ['club_coordinator', 'movement_coordinator', 'admin']
      if (!allowedRoles.includes(role)) {
        navigate('/dashboard')
        return
      }

      // Получаем клуб координатора
      if (role === 'club_coordinator') {
        const { data: coordData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profileData.id)
          .single()

        if (coordData) {
          setClubId(coordData.club_id)
        }
      }

      await loadAppeals(role, profileData.id)

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadAppeals = async (role, userId) => {
    let query = supabase
      .from('appeals')
      .select(`
        *,
        clubs:club_id (name, city),
        coordinator:coordinator_id (full_name),
        answers:appeal_replies (
          id,
          message,
          created_at,
          author:author_id (full_name, role)
        )
      `)
      .order('created_at', { ascending: false })

    if (role === 'club_coordinator') {
      // Координатор видит только свои обращения
      query = query.eq('coordinator_id', userId)
    }

    const { data, error } = await query
    if (!error) {
      setAppeals(data || [])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      const { error } = await supabase
        .from('appeals')
        .insert([{
          club_id: clubId,
          coordinator_id: user.id,
          subject: form.subject,
          message: form.message,
          priority: form.priority,
          status: 'pending'
        }])

      if (error) throw error

      setMessage('✅ Обращение отправлено!')
      setMessageType('success')
      setForm({ subject: '', message: '', priority: 'medium' })
      setShowForm(false)
      loadAppeals(profile?.role, profile?.id)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setSending(false)
  }

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyMessage.trim()) return

    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      const { error } = await supabase
        .from('appeal_replies')
        .insert([{
          appeal_id: selectedAppeal.id,
          author_id: user.id,
          message: replyMessage
        }])

      if (error) throw error

      // Обновляем статус обращения
      await supabase
        .from('appeals')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAppeal.id)

      setMessage('✅ Ответ отправлен!')
      setMessageType('success')
      setReplyMessage('')
      setShowReplyForm(false)
      loadAppeals(profile?.role, profile?.id)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setSending(false)
  }

  const handleCloseAppeal = async (appealId) => {
    if (!confirm('Закрыть обращение?')) return

    try {
      const { error } = await supabase
        .from('appeals')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appealId)

      if (error) throw error

      setMessage('✅ Обращение закрыто')
      setMessageType('success')
      loadAppeals(profile?.role, profile?.id)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { color: '#C9A227', bg: '#FBF4DC', label: '⏳ Ожидает' },
      'in_progress': { color: '#174A7E', bg: '#EAF2FA', label: '🔄 В работе' },
      'answered': { color: '#16845B', bg: '#E8F5EF', label: '✅ Отвечено' },
      'closed': { color: '#667085', bg: '#F4F6F9', label: '📌 Закрыто' }
    }
    return badges[status] || badges['pending']
  }

  const getPriorityBadge = (priority) => {
    const priorities = {
      'low': { color: '#667085', bg: '#F4F6F9', label: 'Низкий' },
      'medium': { color: '#C9A227', bg: '#FBF4DC', label: 'Средний' },
      'high': { color: '#B3262E', bg: '#FCEBEC', label: 'Высокий' },
      'urgent': { color: '#B3262E', bg: '#FCEBEC', label: '🔥 Срочно' }
    }
    return priorities[priority] || priorities['medium']
  }

  const canReply = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

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
      
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              📨 Обращения к руководству
            </h1>
            <p style={{ color: '#667085', fontSize: '16px' }}>
              {profile?.role === 'club_coordinator' 
                ? 'Ваши обращения к координатору движения' 
                : 'Все обращения от координаторов КЮДов'}
            </p>
          </div>
          {profile?.role === 'club_coordinator' && (
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: '10px 24px',
                background: '#0B1F3A',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {showForm ? '✖ Закрыть' : '✍️ Новое обращение'}
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}

        {/* ФОРМА НОВОГО ОБРАЩЕНИЯ */}
        {showForm && profile?.role === 'club_coordinator' && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              ✍️ Новое обращение
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Тема *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                  placeholder="Кратко опишите вопрос"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Приоритет</label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">🟢 Низкий</option>
                  <option value="medium">🟡 Средний</option>
                  <option value="high">🔴 Высокий</option>
                  <option value="urgent">🔥 Срочно</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Текст обращения *</label>
                <textarea
                  className="form-input"
                  rows="5"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  placeholder="Опишите ваше обращение подробно..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-success" disabled={sending}>
                  {sending ? '⏳ Отправка...' : '📤 Отправить'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* СПИСОК ОБРАЩЕНИЙ */}
        {appeals.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ fontSize: '20px', color: '#0B1F3A' }}>
              {profile?.role === 'club_coordinator' 
                ? 'У вас пока нет обращений' 
                : 'Обращений пока нет'}
            </h3>
            <p style={{ color: '#667085' }}>
              {profile?.role === 'club_coordinator' 
                ? 'Создайте обращение к координатору движения' 
                : 'Новые обращения появятся здесь'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {appeals.map((appeal) => {
              const status = getStatusBadge(appeal.status)
              const priority = getPriorityBadge(appeal.priority)
              const replies = appeal.answers || []

              return (
                <div
                  key={appeal.id}
                  className="card"
                  style={{
                    padding: '20px',
                    borderLeft: `4px solid ${status.color}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                          {appeal.subject}
                        </h3>
                        <span style={{
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: priority.bg,
                          color: priority.color
                        }}>
                          {priority.label}
                        </span>
                        <span style={{
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: status.bg,
                          color: status.color
                        }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                        🏫 {appeal.clubs?.name || 'КЮД'} 
                        {appeal.coordinator?.full_name && (
                          <> • 👤 {appeal.coordinator.full_name}</>
                        )}
                        {appeal.clubs?.city && (
                          <> • 📍 {appeal.clubs.city}</>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: '#475467', marginTop: '8px' }}>
                        {appeal.message}
                      </div>
                      <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                        📅 {new Date(appeal.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {canReply && appeal.status !== 'closed' && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 16px', fontSize: '12px', background: '#0B1F3A' }}
                          onClick={() => {
                            setSelectedAppeal(appeal)
                            setShowReplyForm(true)
                          }}
                        >
                          💬 Ответить
                        </button>
                      )}
                      {profile?.role === 'club_coordinator' && appeal.status !== 'closed' && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 16px', fontSize: '12px' }}
                          onClick={() => handleCloseAppeal(appeal.id)}
                        >
                          📌 Закрыть
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ОТВЕТЫ */}
                  {replies.length > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E7EF' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#667085', marginBottom: '8px' }}>
                        💬 Ответы ({replies.length})
                      </div>
                      {replies.map((reply) => (
                        <div
                          key={reply.id}
                          style={{
                            padding: '12px 16px',
                            background: '#F8FAFC',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            border: '1px solid #E2E7EF'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: '14px', color: '#0B1F3A' }}>
                                {reply.message}
                              </div>
                              <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                                👤 {reply.author?.full_name || 'Неизвестно'} 
                                {' • '}
                                📅 {new Date(reply.created_at).toLocaleString('ru-RU')}
                              </div>
                            </div>
                            {reply.author?.role && (
                              <span style={{
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                background: reply.author.role === 'admin' ? '#FCEBEC' : '#EAF2FA',
                                color: reply.author.role === 'admin' ? '#B3262E' : '#174A7E'
                              }}>
                                {reply.author.role === 'admin' ? '🔧 Админ' : '⭐ Координатор движения'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ФОРМА ОТВЕТА */}
        {showReplyForm && selectedAppeal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(11, 31, 58, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowReplyForm(false)}
          >
            <div
              className="card"
              style={{
                maxWidth: '600px',
                width: '100%',
                padding: '32px',
                maxHeight: '90vh',
                overflow: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0B1F3A', marginBottom: '4px' }}>
                💬 Ответ на обращение
              </h3>
              <p style={{ color: '#667085', marginBottom: '16px' }}>
                Тема: <strong>{selectedAppeal.subject}</strong>
              </p>

              <form onSubmit={handleReply}>
                <div className="form-group">
                  <label className="form-label">Текст ответа *</label>
                  <textarea
                    className="form-input"
                    rows="5"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    required
                    placeholder="Введите ваш ответ..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-success" disabled={sending}>
                    {sending ? '⏳ Отправка...' : '📤 Отправить ответ'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowReplyForm(false)}
                  >
                    ❌ Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}