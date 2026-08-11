// src/pages/Reports.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Reports() {
  const [profile, setProfile] = useState(null)
  const [reports, setReports] = useState([])
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    id: null,
    club_id: '',
    report_month: '',
    report_text: '',
    events_count: 0,
    participants_count: 0
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

      // Загружаем клубы
      let clubsQuery = supabase
        .from('clubs')
        .select('*')
        .order('name')

      if (profile?.role === 'club_coordinator') {
        const { data: coordinatorData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profile.id)
          .single()

        if (coordinatorData) {
          clubsQuery = clubsQuery.eq('id', coordinatorData.club_id)
        }
      }

      const { data: clubsData } = await clubsQuery
      setClubs(clubsData || [])

      // Загружаем отчёты
      let reportsQuery = supabase
        .from('reports')
        .select(`
          *,
          clubs:club_id (name),
          author:submitted_by (full_name),
          approver:approved_by (full_name)
        `)
        .order('report_month', { ascending: false })

      if (profile?.role === 'club_coordinator') {
        const { data: coordinatorData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profile.id)
          .single()

        if (coordinatorData) {
          reportsQuery = reportsQuery.eq('club_id', coordinatorData.club_id)
        } else {
          setReports([])
          setLoading(false)
          return
        }
      }

      const { data: reportsData } = await reportsQuery
      setReports(reportsData || [])

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
      const reportData = {
        club_id: form.club_id,
        report_month: form.report_month,
        report_text: form.report_text,
        events_count: parseInt(form.events_count) || 0,
        participants_count: parseInt(form.participants_count) || 0,
        status: 'draft',
        submitted_by: profile?.id
      }

      let error
      if (form.id) {
        const { error: updateError } = await supabase
          .from('reports')
          .update(reportData)
          .eq('id', form.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('reports')
          .insert([reportData])
        error = insertError
      }

      if (error) throw error

      setMessage(form.id ? '✅ Отчёт обновлён!' : '✅ Отчёт создан!')
      setForm({
        id: null,
        club_id: '',
        report_month: '',
        report_text: '',
        events_count: 0,
        participants_count: 0
      })
      setShowForm(false)
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const handleSubmitReport = async (id) => {
    if (!confirm('Отправить отчёт на проверку?')) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: profile.id
        })
        .eq('id', id)

      if (error) throw error

      setMessage('✅ Отчёт отправлен на проверку!')
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const handleReview = async (id, status, comment) => {
    setLoading(true)

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: status,
          reviewer_comment: comment || null,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
          approved_by: status === 'approved' ? profile.id : null,
          quality_score: status === 'approved' ? 5 : null
        })
        .eq('id', id)

      if (error) throw error

      setMessage(status === 'approved' ? '✅ Отчёт утверждён!' : '❌ Отчёт отклонён')
      loadData()
      setShowModal(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  // ============================================================
  // УДАЛЕНИЕ ОТЧЁТА (для координатора КЮДа, координатора движения и админа)
  // ============================================================
  const handleDelete = async (id) => {
    if (!confirm('Удалить этот отчёт? Это действие нельзя отменить.')) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id)

      if (error) throw error

      setMessage('✅ Отчёт удалён!')
      loadData()
      setShowModal(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  // ============================================================
  // ПРОВЕРКА ПРАВ НА УДАЛЕНИЕ
  // ============================================================
  const canDelete = profile?.role === 'admin' || 
                     profile?.role === 'movement_coordinator' || 
                     profile?.role === 'club_coordinator'

  const canCreate = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' || 
                    profile?.role === 'club_coordinator'

  const canReview = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

  const isClubCoordinator = profile?.role === 'club_coordinator'

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { color: '#8A9AAA', bg: '#F4F6F9', label: 'Черновик' },
      'submitted': { color: '#C9A227', bg: '#FBF4DC', label: 'На проверке' },
      'approved': { color: '#16845B', bg: '#E8F5EF', label: 'Утверждён' },
      'rejected': { color: '#B3262E', bg: '#FCEBEC', label: 'Отклонён' }
    }
    return badges[status] || badges['draft']
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
              {isClubCoordinator ? '📊 Отчёты моего клуба' : '📊 Отчёты КЮДов'}
            </h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              {isClubCoordinator 
                ? 'Ежемесячные отчёты вашего клуба' 
                : 'Проверка и утверждение отчётов всех КЮДов'}
            </p>
          </div>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => {
              setForm({
                id: null,
                club_id: clubs[0]?.id || '',
                report_month: new Date().toISOString().slice(0, 7) + '-01',
                report_text: '',
                events_count: 0,
                participants_count: 0
              })
              setShowForm(!showForm)
            }}>
              {showForm ? '✖ Закрыть' : '➕ Создать отчёт'}
            </button>
          )}
        </div>

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

        {showForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              {form.id ? '✏️ Редактировать отчёт' : '📝 Новый отчёт'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Клуб</label>
                <select
                  className="form-select"
                  value={form.club_id}
                  onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  required
                >
                  <option value="">Выберите клуб</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Отчётный месяц</label>
                <input
                  type="month"
                  className="form-input"
                  value={form.report_month ? form.report_month.slice(0, 7) : ''}
                  onChange={(e) => setForm({ ...form, report_month: e.target.value + '-01' })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Текст отчёта</label>
                <textarea
                  className="form-input"
                  value={form.report_text}
                  onChange={(e) => setForm({ ...form, report_text: e.target.value })}
                  rows="6"
                  placeholder="Опишите проведённые мероприятия, достижения, планы..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Количество мероприятий</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.events_count}
                    onChange={(e) => setForm({ ...form, events_count: e.target.value })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Участников всего</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.participants_count}
                    onChange={(e) => setForm({ ...form, participants_count: e.target.value })}
                    min="0"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : form.id ? '💾 Обновить' : '✅ Сохранить'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              {isClubCoordinator ? 'Отчёты вашего клуба' : 'Все отчёты'}
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              Всего: {reports.length}
            </span>
          </div>

          {reports.length === 0 ? (
            <div style={{
              background: '#F8FAFC',
              borderRadius: '10px',
              padding: '40px',
              textAlign: 'center',
              border: '1px dashed #E2E7EF'
            }}>
              <p style={{ color: '#667085', fontSize: '14px' }}>
                {isClubCoordinator ? 'У вашего клуба пока нет отчётов' : 'Отчётов пока нет'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reports.map((report) => {
                const status = getStatusBadge(report.status)
                const isEditable = canCreate && report.status === 'draft'
                const isDeletable = canDelete && (report.status === 'draft' || report.status === 'rejected')
                
                return (
                  <div
                    key={report.id}
                    style={{
                      padding: '16px 20px',
                      background: '#F8FAFC',
                      borderRadius: '10px',
                      borderLeft: `4px solid ${status.color}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F0F2F5'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}
                    onClick={() => {
                      setSelectedReport(report)
                      setShowModal(true)
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '16px', color: '#0B1F3A' }}>
                          {report.report_month 
                            ? new Date(report.report_month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) 
                            : 'Отчёт'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#667085', marginTop: '2px' }}>
                          🏫 {report.clubs?.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#667085' }}>
                          📊 Мероприятий: {report.events_count} • 👥 Участников: {report.participants_count}
                        </div>
                        {report.report_text && (
                          <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                            {report.report_text.length > 100 ? report.report_text.slice(0, 100) + '...' : report.report_text}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          padding: '2px 12px',
                          borderRadius: '20px',
                          background: status.bg,
                          color: status.color
                        }}>
                          {status.label}
                        </span>
                        
                        {/* РЕДАКТИРОВАНИЕ */}
                        {isEditable && (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setForm({
                                id: report.id,
                                club_id: report.club_id,
                                report_month: report.report_month,
                                report_text: report.report_text || '',
                                events_count: report.events_count,
                                participants_count: report.participants_count
                              })
                              setShowForm(true)
                            }}
                          >
                            ✏️
                          </button>
                        )}
                        
                        {/* ОТПРАВКА НА ПРОВЕРКУ */}
                        {report.status === 'draft' && canCreate && (
                          <button
                            className="btn btn-success"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSubmitReport(report.id)
                            }}
                          >
                            📤 Отправить
                          </button>
                        )}
                        
                        {/* УДАЛЕНИЕ (для координатора КЮДа, координатора движения и админа) */}
                        {isDeletable && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(report.id)
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО */}
      {showModal && selectedReport && (
        <div
          style={{
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
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#98A2B3',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              {selectedReport.report_month 
                ? new Date(selectedReport.report_month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
                : 'Отчёт'}
            </h2>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#667085' }}>
                🏫 {selectedReport.clubs?.name}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 14px',
                borderRadius: '20px',
                background: getStatusBadge(selectedReport.status).bg,
                color: getStatusBadge(selectedReport.status).color
              }}>
                {getStatusBadge(selectedReport.status).label}
              </span>
            </div>

            {selectedReport.report_text && (
              <div style={{ marginTop: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', color: '#667085', lineHeight: '1.6', margin: 0 }}>
                  {selectedReport.report_text}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
                  {selectedReport.events_count}
                </div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Мероприятий</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
                  {selectedReport.participants_count}
                </div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Участников</div>
              </div>
            </div>

            {selectedReport.reviewer_comment && (
              <div style={{ marginTop: '16px', padding: '14px', background: '#E8EDF3', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0B1F3A' }}>
                  💬 Комментарий проверяющего:
                </div>
                <p style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                  {selectedReport.reviewer_comment}
                </p>
                {selectedReport.approver?.full_name && (
                  <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                    — {selectedReport.approver.full_name}
                  </div>
                )}
              </div>
            )}

            {canReview && selectedReport.status === 'submitted' && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E7EF' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
                  Действия проверяющего
                </h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-success"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const comment = prompt('Введите комментарий (необязательно):')
                      if (comment !== null) {
                        handleReview(selectedReport.id, 'approved', comment || '')
                      }
                    }}
                  >
                    ✅ Утвердить
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const comment = prompt('Введите причину отклонения:')
                      if (comment) {
                        handleReview(selectedReport.id, 'rejected', comment)
                      }
                    }}
                  >
                    ❌ Отклонить
                  </button>
                </div>
              </div>
            )}

            {selectedReport.status === 'approved' && canReview && (
              <div style={{ marginTop: '16px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    if (confirm('Вернуть отчёт на доработку?')) {
                      handleReview(selectedReport.id, 'submitted', 'Возвращён на доработку')
                    }
                  }}
                >
                  🔄 Вернуть на доработку
                </button>
              </div>
            )}

            {/* КНОПКА УДАЛЕНИЯ В МОДАЛКЕ */}
            {canDelete && (selectedReport.status === 'draft' || selectedReport.status === 'rejected') && (
              <div style={{ marginTop: '16px' }}>
                <button
                  className="btn btn-danger"
                  style={{ width: '100%' }}
                  onClick={() => handleDelete(selectedReport.id)}
                >
                  🗑️ Удалить отчёт
                </button>
              </div>
            )}

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => setShowModal(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}