// src/pages/PresidentTasks.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function PresidentTasks() {
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [reports, setReports] = useState({})
  const [loading, setLoading] = useState(true)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [isPresident, setIsPresident] = useState(false)
  const [userClub, setUserClub] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: ''
  })
  const [reportForm, setReportForm] = useState({
    content: '',
    attachments: []
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

      // ============================================================
      // ПРОВЕРКА: ЯВЛЯЕТСЯ ЛИ ПОЛЬЗОВАТЕЛЬ ПРЕЗИДЕНТОМ
      // ============================================================
      if (role === 'participant') {
        const { data: clubsData } = await supabase
          .from('clubs')
          .select('id, name, president_id')
          .eq('president_id', profileData.id)

        if (clubsData && clubsData.length > 0) {
          setIsPresident(true)
          setUserClub(clubsData[0])
          console.log('👑 Пользователь президент клуба:', clubsData[0].name)
        } else {
          setIsPresident(false)
          console.log('👤 Пользователь не является президентом')
        }
      } else {
        // Для координаторов, админов — доступ есть всегда
        setIsPresident(true)
      }

      // ============================================================
      // ЗАГРУЗКА ЗАДАНИЙ
      // ============================================================
      let query = supabase
        .from('president_tasks')
        .select(`
          *,
          club:club_id (id, name),
          assigned_by:assigned_by (id, full_name),
          assigned_to:assigned_to (id, full_name)
        `)
        .order('created_at', { ascending: false })

      // Если участник — показываем только его задания
      if (role === 'participant') {
        if (isPresident) {
          // Показываем задания только для его клуба
          query = query.eq('club_id', userClub?.id)
        } else {
          // Если не президент — показываем пустой список
          setTasks([])
          setLoading(false)
          return
        }
      }

      // Если координатор клуба — показываем задания его клуба
      if (role === 'club_coordinator') {
        const { data: coordData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profileData.id)

        if (coordData && coordData.length > 0) {
          const clubIds = coordData.map(c => c.club_id)
          query = query.in('club_id', clubIds)
        }
      }

      const { data: tasksData, error } = await query
      if (!error) {
        setTasks(tasksData || [])
      }

      // Загружаем отчеты
      const { data: reportsData } = await supabase
        .from('president_reports')
        .select('*')
        .in('task_id', tasksData?.map(t => t.id) || [])
        .order('submitted_at', { ascending: false })

      if (reportsData) {
        const reportsMap = {}
        reportsData.forEach(r => {
          if (!reportsMap[r.task_id]) reportsMap[r.task_id] = []
          reportsMap[r.task_id].push(r)
        })
        setReports(reportsMap)
      }

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  // ============================================================
  // ОСТАЛЬНЫЕ ФУНКЦИИ (handleSubmitTask, handleSubmitReport и т.д.)
  // ============================================================
  const handleSubmitTask = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      // Получаем клуб пользователя
      const { data: clubData } = await supabase
        .from('club_coordinators')
        .select('club_id')
        .eq('profile_id', profile.id)
        .single()

      if (!clubData) {
        setMessage('❌ Вы не привязаны к КЮДу')
        setMessageType('error')
        setLoading(false)
        return
      }

      // Получаем президента клуба
      const { data: club } = await supabase
        .from('clubs')
        .select('president_id')
        .eq('id', clubData.club_id)
        .single()

      if (!club?.president_id) {
        setMessage('❌ У КЮДа нет президента')
        setMessageType('error')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('president_tasks')
        .insert([{
          club_id: clubData.club_id,
          title: form.title,
          description: form.description,
          deadline: form.deadline || null,
          assigned_by: profile.id,
          assigned_to: club.president_id,
          status: 'pending'
        }])

      if (error) throw error

      setMessage('✅ Задание создано!')
      setMessageType('success')
      setForm({ title: '', description: '', deadline: '' })
      setShowTaskForm(false)
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setLoading(false)
  }

  const handleSubmitReport = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('president_reports')
        .insert([{
          task_id: selectedTask.id,
          content: reportForm.content,
          submitted_by: profile.id,
          status: 'pending'
        }])

      if (error) throw error

      await supabase
        .from('president_tasks')
        .update({ status: 'in_progress' })
        .eq('id', selectedTask.id)

      setMessage('✅ Отчет отправлен!')
      setMessageType('success')
      setReportForm({ content: '', attachments: [] })
      setShowReportForm(false)
      setSelectedTask(null)
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setLoading(false)
  }

  const handleApproveReport = async (reportId, taskId) => {
    try {
      const { error } = await supabase
        .from('president_reports')
        .update({
          status: 'approved',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (error) throw error

      await supabase
        .from('president_tasks')
        .update({ status: 'completed' })
        .eq('id', taskId)

      setMessage('✅ Отчет одобрен!')
      setMessageType('success')
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  const handleRejectReport = async (reportId, taskId) => {
    if (!confirm('Отклонить отчет?')) return

    try {
      const { error } = await supabase
        .from('president_reports')
        .update({
          status: 'rejected',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (error) throw error

      await supabase
        .from('president_tasks')
        .update({ status: 'pending' })
        .eq('id', taskId)

      setMessage('❌ Отчет отклонен')
      setMessageType('error')
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      'pending': { text: 'Ожидает', color: '#8A6A00', bg: '#FBF4DC' },
      'in_progress': { text: 'В работе', color: '#174A7E', bg: '#EAF2FA' },
      'completed': { text: 'Выполнено', color: '#16845B', bg: '#E8F5EF' },
      'rejected': { text: 'Отклонено', color: '#B3262E', bg: '#FCEBEC' }
    }
    return labels[status] || labels['pending']
  }

  const canCreateTasks = profile?.role === 'admin' || 
                          profile?.role === 'movement_coordinator' ||
                          profile?.role === 'club_coordinator'

  const canSubmitReport = profile?.role === 'participant' && isPresident

  const canReview = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' ||
                    profile?.role === 'club_coordinator'

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    )
  }

  // ============================================================
  // ЕСЛИ УЧАСТНИК НЕ ПРЕЗИДЕНТ — ПОКАЗЫВАЕМ СООБЩЕНИЕ
  // ============================================================
  if (profile?.role === 'participant' && !isPresident) {
    return (
      <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
        <Navigation profile={profile} />
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px' }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px 40px',
            textAlign: 'center',
            border: '1px solid #E2E7EF',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👑</div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A', marginBottom: '12px' }}>
              Доступ ограничен
            </h2>
            <p style={{ color: '#667085', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              Этот раздел доступен только для президентов КЮДов.
            </p>
            <p style={{ color: '#98A2B3', fontSize: '14px', marginTop: '8px' }}>
              Если вы президент КЮДа, обратитесь к координатору для назначения.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/dashboard')}
              style={{ marginTop: '24px', padding: '12px 32px' }}
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // ОСНОВНОЙ РЕНДЕР (для президентов, координаторов, админов)
  // ============================================================
  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              👑 Задания президента КЮДа
            </h1>
            <p style={{ color: '#667085', fontSize: '16px' }}>
              {profile?.role === 'participant' && isPresident 
                ? `Ваши задания как президента клуба "${userClub?.name}"` 
                : 'Управление заданиями для президентов КЮДов'}
            </p>
          </div>
          {canCreateTasks && (
            <button
              className="btn btn-primary"
              style={{
                padding: '10px 24px',
                background: '#0B1F3A',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              onClick={() => setShowTaskForm(!showTaskForm)}
            >
              {showTaskForm ? '✖ Закрыть' : '➕ Создать задание'}
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

        {/* Форма создания задания */}
        {showTaskForm && canCreateTasks && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid #E2E7EF'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📝 Создать задание для президента
            </h3>
            <form onSubmit={handleSubmitTask}>
              <div className="form-group">
                <label className="form-label">Название задания *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Например: Подготовить отчет о деятельности клуба"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea
                  className="form-input"
                  rows="4"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Подробное описание задания..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Срок выполнения</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={loading}
                  style={{
                    padding: '10px 24px',
                    background: '#16845B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {loading ? '⏳ Создание...' : '✅ Создать'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTaskForm(false)}
                  style={{
                    padding: '10px 24px',
                    background: 'transparent',
                    color: '#0B1F3A',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Список заданий */}
        {tasks.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px 40px',
            textAlign: 'center',
            border: '1px solid #E2E7EF'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ fontSize: '20px', color: '#0B1F3A', marginBottom: '8px' }}>
              Заданий пока нет
            </h3>
            <p style={{ color: '#667085' }}>
              {canCreateTasks 
                ? 'Создайте первое задание для президента КЮДа' 
                : 'Ожидайте новых заданий от координаторов'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tasks.map((task) => {
              const status = getStatusLabel(task.status)
              const taskReports = reports[task.id] || []
              const latestReport = taskReports[0]

              return (
                <div
                  key={task.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    border: '1px solid #E2E7EF',
                    borderLeft: `4px solid ${status.color}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                        {task.title}
                      </h3>
                      <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                        <span>🏫 {task.club?.name || 'КЮД'}</span>
                        <span style={{ margin: '0 8px' }}>•</span>
                        <span>👤 {task.assigned_to?.full_name || 'Президент'}</span>
                        {task.deadline && (
                          <>
                            <span style={{ margin: '0 8px' }}>•</span>
                            <span>📅 Срок: {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>
                          </>
                        )}
                      </div>
                      {task.description && (
                        <p style={{ color: '#475467', marginTop: '8px', fontSize: '14px' }}>
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '4px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: status.bg,
                        color: status.color
                      }}>
                        {status.text}
                      </span>
                      {canSubmitReport && task.status !== 'completed' && task.status !== 'rejected' && (
                        <button
                          style={{
                            padding: '6px 16px',
                            background: '#C9A227',
                            color: '#0B1F3A',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                          onClick={() => {
                            setSelectedTask(task)
                            setShowReportForm(true)
                          }}
                        >
                          📤 Отправить отчет
                        </button>
                      )}
                      {canReview && latestReport?.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            style={{
                              padding: '4px 12px',
                              background: '#E8F5EF',
                              color: '#16845B',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                            onClick={() => handleApproveReport(latestReport.id, task.id)}
                          >
                            ✅ Одобрить
                          </button>
                          <button
                            style={{
                              padding: '4px 12px',
                              background: '#FCEBEC',
                              color: '#B3262E',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                            onClick={() => handleRejectReport(latestReport.id, task.id)}
                          >
                            ❌ Отклонить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Отчеты */}
                  {taskReports.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F4F6F9' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#667085', marginBottom: '8px' }}>
                        📄 Отчеты ({taskReports.length})
                      </div>
                      {taskReports.map((report) => (
                        <div
                          key={report.id}
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
                                {report.content}
                              </div>
                              <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                                📅 {new Date(report.submitted_at).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                            <span style={{
                              padding: '2px 12px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: report.status === 'approved' ? '#E8F5EF' :
                                        report.status === 'rejected' ? '#FCEBEC' : '#FBF4DC',
                              color: report.status === 'approved' ? '#16845B' :
                                     report.status === 'rejected' ? '#B3262E' : '#8A6A00'
                            }}>
                              {report.status === 'approved' ? '✅ Одобрено' :
                               report.status === 'rejected' ? '❌ Отклонено' : '⏳ На проверке'}
                            </span>
                          </div>
                          {report.feedback && (
                            <div style={{
                              fontSize: '13px',
                              color: '#174A7E',
                              marginTop: '8px',
                              padding: '8px 12px',
                              background: '#EAF2FA',
                              borderRadius: '6px'
                            }}>
                              💬 {report.feedback}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Модалка отправки отчета */}
        {showReportForm && selectedTask && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
                📤 Отправить отчет
              </h3>
              <p style={{ color: '#667085', marginBottom: '16px' }}>
                Задание: <strong>{selectedTask.title}</strong>
              </p>

              <form onSubmit={handleSubmitReport}>
                <div className="form-group">
                  <label className="form-label">Текст отчета *</label>
                  <textarea
                    className="form-input"
                    rows="6"
                    value={reportForm.content}
                    onChange={(e) => setReportForm({ ...reportForm, content: e.target.value })}
                    required
                    placeholder="Опишите выполненную работу..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={loading}
                    style={{
                      padding: '10px 24px',
                      background: '#16845B',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    {loading ? '⏳ Отправка...' : '📤 Отправить'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowReportForm(false)
                      setSelectedTask(null)
                      setReportForm({ content: '', attachments: [] })
                    }}
                    style={{
                      padding: '10px 24px',
                      background: 'transparent',
                      color: '#0B1F3A',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
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