// src/pages/StaffManagement.jsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function StaffManagement() {
  const [profile, setProfile] = useState(null)
  const [staff, setStaff] = useState([])
  const [roles, setRoles] = useState([])
  const [events, setEvents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [coordinatorClubId, setCoordinatorClubId] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'tutors', 'coordinators', 'admin'
  
  // Поиск для назначений
  const [staffSearch, setStaffSearch] = useState('')
  const [staffResults, setStaffResults] = useState([])
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)
  const [eventSearch, setEventSearch] = useState('')
  const [eventResults, setEventResults] = useState([])
  const [showEventDropdown, setShowEventDropdown] = useState(false)
  const staffInputRef = useRef(null)
  const eventInputRef = useRef(null)
  
  const [form, setForm] = useState({
    staff_id: '',
    staff_name: '',
    staff_email: '',
    staff_role: 'tutor',
    staff_position: '',
    event_id: '',
    event_title: '',
    role: '',
    responsibilities: [],
    notes: '',
    start_date: '',
    end_date: '',
    is_lead_tutor: false,
    assignment_type: 'event' // 'event' | 'other'
  })
  
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    email: '',
    role: 'tutor',
    position: '',
    phone: '',
    bio: ''
  })
  
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (staffSearch.length > 1) {
      const filtered = staff.filter(s =>
        s.full_name.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.role.toLowerCase().includes(staffSearch.toLowerCase())
      )
      setStaffResults(filtered)
      setShowStaffDropdown(filtered.length > 0)
    } else {
      setStaffResults([])
      setShowStaffDropdown(false)
    }
  }, [staffSearch, staff])

  useEffect(() => {
    if (eventSearch.length > 1) {
      const filtered = events.filter(e =>
        e.title.toLowerCase().includes(eventSearch.toLowerCase())
      )
      setEventResults(filtered)
      setShowEventDropdown(filtered.length > 0)
    } else {
      setEventResults([])
      setShowEventDropdown(false)
    }
  }, [eventSearch, events])

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

        if (data?.role === 'club_coordinator') {
          const { data: coordinatorData } = await supabase
            .from('club_coordinators')
            .select('club_id')
            .eq('profile_id', data.id)
            .single()
          
          if (coordinatorData) {
            setCoordinatorClubId(coordinatorData.club_id)
          }
        }
      }

      // Загружаем всех сотрудников (тьюторы, координаторы, админы)
      let staffQuery = supabase
        .from('profiles')
        .select(`
          *,
          club_coordinators:club_id (clubs:club_id (name))
        `)
        .in('role', ['tutor', 'club_coordinator', 'movement_coordinator', 'admin'])
        .order('full_name')

      const { data: staffData } = await staffQuery
      setStaff(staffData || [])

      // Загружаем роли
      const { data: rolesData } = await supabase
        .from('staff_roles')
        .select('*')
        .order('name')
      setRoles(rolesData || [])

      // Загружаем мероприятия
      let eventsQuery = supabase
        .from('events')
        .select('id, title, event_date, club_id')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(20)

      if (profile?.role === 'club_coordinator' && coordinatorClubId) {
        eventsQuery = eventsQuery.eq('club_id', coordinatorClubId)
      }

      const { data: eventsData } = await eventsQuery
      setEvents(eventsData || [])

      await loadAssignments()

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadAssignments = async () => {
    const { data: assignmentsData } = await supabase
      .from('event_assignments')
      .select(`
        *,
        events:event_id (title, event_date),
        staff:staff_id (full_name, role),
        invited_by_profile:invited_by (full_name)
      `)
      .order('assigned_at', { ascending: false })
    setAssignments(assignmentsData || [])

    if (profile?.role === 'tutor') {
      const { data: invitationsData } = await supabase
        .from('event_assignments')
        .select(`
          *,
          events:event_id (title, event_date, description, location),
          invited_by_profile:invited_by (full_name)
        `)
        .eq('staff_id', profile.id)
        .in('status', ['pending', 'accepted'])
        .order('assigned_at', { ascending: false })
      setInvitations(invitationsData || [])
    }
  }

  // ============================================================
  // ВЫБОР СОТРУДНИКА И МЕРОПРИЯТИЯ
  // ============================================================
  const handleSelectStaff = (staffMember) => {
    setForm({ ...form, staff_id: staffMember.id, staff_name: staffMember.full_name, staff_email: staffMember.email || '' })
    setStaffSearch(staffMember.full_name)
    setShowStaffDropdown(false)
  }

  const handleSelectEvent = (event) => {
    setForm({ ...form, event_id: event.id, event_title: event.title })
    setEventSearch(event.title)
    setShowEventDropdown(false)
  }

  // ============================================================
  // СОЗДАНИЕ НОВОГО СОТРУДНИКА
  // ============================================================
  const handleCreateStaff = async (e) => {
    e.preventDefault()
    setMessage('')
    setMessageType('success')
    setLoading(true)

    try {
      const tempPassword = Math.random().toString(36).slice(-8) + '!'

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: staffForm.email,
        password: tempPassword,
        options: {
          data: {
            full_name: staffForm.full_name,
            role: staffForm.role,
            position: staffForm.position || '',
            phone: staffForm.phone || '',
            bio: staffForm.bio || ''
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            full_name: staffForm.full_name,
            email: staffForm.email,
            role: staffForm.role,
            position: staffForm.position || '',
            phone: staffForm.phone || '',
            bio: staffForm.bio || ''
          }])

        if (profileError) throw profileError

        setMessage(`✅ Сотрудник "${staffForm.full_name}" создан! Временный пароль: ${tempPassword}`)
        setMessageType('success')
        setStaffForm({
          full_name: '',
          email: '',
          role: 'tutor',
          position: '',
          phone: '',
          bio: ''
        })
        setShowStaffForm(false)
        loadData()
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setLoading(false)
  }

  // ============================================================
  // НАЗНАЧЕНИЕ НА МЕРОПРИЯТИЕ ИЛИ ДРУГИЕ ОБЯЗАННОСТИ
  // ============================================================
  const handleAssign = async (e) => {
    e.preventDefault()
    setMessage('')
    setMessageType('success')
    setLoading(true)

    try {
      let staffId = form.staff_id

      if (!staffId && form.staff_name) {
        const found = staff.find(s => 
          s.full_name.toLowerCase() === form.staff_name.toLowerCase()
        )
        if (found) {
          staffId = found.id
        } else {
          setMessage('❌ Пожалуйста, выберите сотрудника из списка')
          setMessageType('error')
          setLoading(false)
          return
        }
      }

      if (!staffId) {
        setMessage('❌ Пожалуйста, выберите сотрудника')
        setMessageType('error')
        setLoading(false)
        return
      }

      // Проверка: координатор КЮДа может приглашать только на свои мероприятия
      if (profile?.role === 'club_coordinator' && coordinatorClubId) {
        const event = events.find(e => e.id === form.event_id)
        if (event && event.club_id !== coordinatorClubId) {
          setMessage('❌ Вы можете приглашать только на мероприятия вашего клуба')
          setMessageType('error')
          setLoading(false)
          return
        }
      }

      const assignmentData = {
        event_id: form.event_id || null,
        staff_id: staffId,
        role: form.role || 'Тьютор',
        responsibilities: form.responsibilities || [],
        notes: form.notes || '',
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        assigned_by: profile.id,
        invited_by: profile.id,
        status: 'accepted',
        is_lead_tutor: form.is_lead_tutor || false,
        assignment_type: form.assignment_type || 'event'
      }

      const { error } = await supabase
        .from('event_assignments')
        .insert([assignmentData])

      if (error) throw error

      setMessage('✅ Сотрудник назначен!')
      setMessageType('success')
      setForm({
        staff_id: '',
        staff_name: '',
        staff_email: '',
        staff_role: 'tutor',
        staff_position: '',
        event_id: '',
        event_title: '',
        role: '',
        responsibilities: [],
        notes: '',
        start_date: '',
        end_date: '',
        is_lead_tutor: false,
        assignment_type: 'event'
      })
      setStaffSearch('')
      setEventSearch('')
      setShowAssignmentForm(false)
      loadAssignments()
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setLoading(false)
  }

  // ============================================================
  // УДАЛЕНИЕ НАЗНАЧЕНИЯ
  // ============================================================
  const handleRemoveAssignment = async (id) => {
    if (!confirm('Удалить назначение?')) return

    const { error } = await supabase
      .from('event_assignments')
      .delete()
      .eq('id', id)

    if (!error) {
      loadAssignments()
      setMessage('✅ Назначение удалено')
      setMessageType('success')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  // ============================================================
  // УДАЛЕНИЕ СОТРУДНИКА
  // ============================================================
  const handleRemoveStaff = async (staffId) => {
    if (!confirm('Удалить сотрудника? Все его назначения также будут удалены.')) return

    try {
      await supabase
        .from('event_assignments')
        .delete()
        .eq('staff_id', staffId)

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', staffId)

      if (error) throw error

      setMessage('✅ Сотрудник удалён')
      setMessageType('success')
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  // ============================================================
  // ПРАВА ДОСТУПА
  // ============================================================
  const canManage = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' || 
                    profile?.role === 'club_coordinator'

  const isTutor = profile?.role === 'tutor'
  const isAdmin = profile?.role === 'admin'
  const isMovementCoordinator = profile?.role === 'movement_coordinator'

  // Фильтрация сотрудников по вкладкам
  const getFilteredStaff = () => {
    if (activeTab === 'all') return staff
    return staff.filter(s => s.role === activeTab)
  }

  const filteredStaff = getFilteredStaff()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { color: '#C9A227', bg: '#FBF4DC', label: '⏳ Ожидает' },
      'accepted': { color: '#16845B', bg: '#E8F5EF', label: '✅ Принято' },
      'declined': { color: '#B3262E', bg: '#FCEBEC', label: '❌ Отклонено' },
      'cancelled': { color: '#667085', bg: '#F4F6F9', label: '✖ Отменено' }
    }
    return badges[status] || badges['pending']
  }

  const availableEvents = profile?.role === 'club_coordinator' 
    ? events.filter(e => e.club_id === coordinatorClubId)
    : events

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
              {isTutor ? '📨 Мои приглашения' : '👥 Сотрудники'}
            </h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              {isTutor 
                ? 'Приглашения на мероприятия от координаторов' 
                : profile?.role === 'club_coordinator' 
                  ? 'Управление сотрудниками вашего клуба' 
                  : 'Управление всеми сотрудниками движения'}
            </p>
          </div>
          {canManage && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowStaffForm(!showStaffForm)}
                style={{
                  background: '#0B1F3A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {showStaffForm ? '✖ Закрыть' : '➕ Добавить сотрудника'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowAssignmentForm(!showAssignmentForm)}
                style={{
                  background: '#C9A227',
                  color: '#0B1F3A',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {showAssignmentForm ? '✖ Закрыть' : '📋 Назначить'}
              </button>
            </div>
          )}
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '16px',
            textAlign: 'center',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px',
            whiteSpace: 'pre-line'
          }}>
            {message}
          </div>
        )}

        {/* ============================================================
            ФОРМА ДОБАВЛЕНИЯ СОТРУДНИКА
            ============================================================ */}
        {showStaffForm && canManage && (
          <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              📝 Добавить сотрудника
            </h3>
            <form onSubmit={handleCreateStaff}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">ФИО *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={staffForm.full_name}
                    onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                    required
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    required
                    placeholder="ivan@example.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Роль *</label>
                  <select
                    className="form-select"
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    required
                  >
                    <option value="tutor">📚 Тьютор</option>
                    <option value="club_coordinator">🏫 Координатор КЮДа</option>
                    <option value="movement_coordinator">⭐ Координатор движения</option>
                    <option value="admin">🔧 Администратор</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Должность</label>
                  <input
                    type="text"
                    className="form-input"
                    value={staffForm.position}
                    onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })}
                    placeholder="Старший тьютор"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Телефон</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">О сотруднике</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={staffForm.bio}
                    onChange={(e) => setStaffForm({ ...staffForm, bio: e.target.value })}
                    placeholder="Краткая информация о сотруднике"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? '⏳ Создание...' : '✅ Создать сотрудника'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowStaffForm(false)}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
            ФОРМА НАЗНАЧЕНИЯ
            ============================================================ */}
        {showAssignmentForm && canManage && (
          <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              📋 Назначить сотрудника
              {profile?.role === 'club_coordinator' && (
                <span style={{
                  marginLeft: '12px',
                  fontSize: '13px',
                  fontWeight: '400',
                  color: '#667085'
                }}>
                  (только для вашего клуба)
                </span>
              )}
            </h3>
            <form onSubmit={handleAssign}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* ВЫБОР СОТРУДНИКА */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Сотрудник *</label>
                  <input
                    ref={staffInputRef}
                    type="text"
                    className="form-input"
                    value={staffSearch}
                    onChange={(e) => {
                      setStaffSearch(e.target.value)
                      setForm({ ...form, staff_name: e.target.value, staff_id: '' })
                    }}
                    onFocus={() => {
                      if (staffSearch.length > 1) {
                        const filtered = staff.filter(s =>
                          s.full_name.toLowerCase().includes(staffSearch.toLowerCase())
                        )
                        setStaffResults(filtered)
                        setShowStaffDropdown(filtered.length > 0)
                      }
                    }}
                    placeholder="Введите имя сотрудника..."
                    required
                  />
                  {showStaffDropdown && staffResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #E2E7EF',
                      borderRadius: '10px',
                      boxShadow: '0 8px 30px rgba(11, 31, 58, 0.12)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 100
                    }}>
                      {staffResults.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #F4F6F9',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          onClick={() => handleSelectStaff(s)}
                        >
                          <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                            {s.full_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            {s.role} • {s.position || 'Должность не указана'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {form.staff_id && (
                    <div style={{
                      marginTop: '6px',
                      padding: '6px 12px',
                      background: '#E8F5EF',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#16845B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      ✅ Выбран: <strong>{form.staff_name}</strong>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#B3262E',
                          cursor: 'pointer',
                          fontSize: '14px',
                          marginLeft: 'auto'
                        }}
                        onClick={() => {
                          setForm({ ...form, staff_id: '', staff_name: '', staff_email: '' })
                          setStaffSearch('')
                          setStaffResults([])
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* ТИП НАЗНАЧЕНИЯ */}
                <div className="form-group">
                  <label className="form-label">Тип назначения *</label>
                  <select
                    className="form-select"
                    value={form.assignment_type}
                    onChange={(e) => setForm({ ...form, assignment_type: e.target.value })}
                    required
                  >
                    <option value="event">📅 Мероприятие</option>
                    <option value="social">📱 Социальные сети</option>
                    <option value="content">✍️ Контент</option>
                    <option value="logistics">📦 Логистика</option>
                    <option value="photo">📸 Фото/Видео</option>
                    <option value="other">📌 Другое</option>
                  </select>
                </div>

                {/* МЕРОПРИЯТИЕ (если выбран тип 'event') */}
                {form.assignment_type === 'event' && (
                  <div className="form-group" style={{ position: 'relative', gridColumn: '1 / -1' }}>
                    <label className="form-label">Мероприятие *</label>
                    <input
                      ref={eventInputRef}
                      type="text"
                      className="form-input"
                      value={eventSearch}
                      onChange={(e) => {
                        setEventSearch(e.target.value)
                        setForm({ ...form, event_title: e.target.value, event_id: '' })
                      }}
                      onFocus={() => {
                        if (eventSearch.length > 1) {
                          const filtered = availableEvents.filter(e =>
                            e.title.toLowerCase().includes(eventSearch.toLowerCase())
                          )
                          setEventResults(filtered)
                          setShowEventDropdown(filtered.length > 0)
                        }
                      }}
                      placeholder="Введите название мероприятия..."
                      required
                    />
                    {showEventDropdown && eventResults.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #E2E7EF',
                        borderRadius: '10px',
                        boxShadow: '0 8px 30px rgba(11, 31, 58, 0.12)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 100
                      }}>
                        {eventResults.map((e) => (
                          <div
                            key={e.id}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #F4F6F9',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            onClick={() => handleSelectEvent(e)}
                          >
                            <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                              {e.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#667085' }}>
                              📅 {new Date(e.event_date).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {form.event_id && (
                      <div style={{
                        marginTop: '6px',
                        padding: '6px 12px',
                        background: '#E8F5EF',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#16845B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        ✅ Выбрано: <strong>{form.event_title}</strong>
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#B3262E',
                            cursor: 'pointer',
                            fontSize: '14px',
                            marginLeft: 'auto'
                          }}
                          onClick={() => {
                            setForm({ ...form, event_id: '', event_title: '' })
                            setEventSearch('')
                            setEventResults([])
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ОПИСАНИЕ ЗАДАЧ (для других типов) */}
                {form.assignment_type !== 'event' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Описание задачи</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Опишите, что нужно сделать..."
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Роль/Функция</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Фото, видео, координация"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Обязанности</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.responsibilities.join(', ')}
                    onChange={(e) => setForm({
                      ...form,
                      responsibilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Фото, видео, логистика, координация"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Дата начала</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Дата окончания</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>

                {form.assignment_type === 'event' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.is_lead_tutor}
                        onChange={(e) => setForm({ ...form, is_lead_tutor: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontWeight: '500', color: '#0B1F3A' }}>
                        ⭐ Назначить старшим тьютором
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? '⏳ Назначение...' : '📤 Назначить'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAssignmentForm(false)}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
            ПРИГЛАШЕНИЯ (ДЛЯ ТЬЮТОРА)
            ============================================================ */}
        {isTutor && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📨 Мои приглашения
            </h3>
            {invitations.length === 0 ? (
              <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>
                У вас пока нет приглашений
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {invitations.map((inv) => {
                  const status = getStatusBadge(inv.status)
                  return (
                    <div
                      key={inv.id}
                      style={{
                        padding: '16px 20px',
                        background: '#F8FAFC',
                        borderRadius: '10px',
                        border: '1px solid #E2E7EF',
                        borderLeft: `4px solid ${status.color}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                            {inv.events?.title || 'Мероприятие'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#667085' }}>
                            📅 {inv.events?.event_date ? new Date(inv.events.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#667085' }}>
                            👤 Пригласил: {inv.invited_by_profile?.full_name || 'Неизвестно'}
                          </div>
                          <div style={{ marginTop: '6px' }}>
                            <span style={{
                              padding: '2px 12px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: status.bg,
                              color: status.color
                            }}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                        {inv.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-success"
                              style={{ padding: '6px 16px', fontSize: '12px' }}
                              onClick={() => {
                                const confirm = window.confirm('Принять приглашение?')
                                if (confirm) {
                                  handleRespondInvitation(inv.id, 'accepted')
                                }
                              }}
                            >
                              ✅ Принять
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 16px', fontSize: '12px' }}
                              onClick={() => {
                                const reason = prompt('Укажите причину отказа (необязательно):')
                                handleRespondInvitation(inv.id, 'declined', reason || '')
                              }}
                            >
                              ❌ Отклонить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ВСЕ СОТРУДНИКИ
            ============================================================ */}
        {!isTutor && (
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                {profile?.role === 'club_coordinator' ? 'Сотрудники' : 'Все сотрудники'}
              </h3>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 14px', fontSize: '12px' }}
                  onClick={() => setActiveTab('all')}
                >
                  Все
                </button>
                <button
                  className={`btn ${activeTab === 'tutor' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 14px', fontSize: '12px' }}
                  onClick={() => setActiveTab('tutor')}
                >
                  📚 Тьюторы
                </button>
                <button
                  className={`btn ${activeTab === 'club_coordinator' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 14px', fontSize: '12px' }}
                  onClick={() => setActiveTab('club_coordinator')}
                >
                  🏫 Координаторы
                </button>
                {(isAdmin || isMovementCoordinator) && (
                  <button
                    className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 14px', fontSize: '12px' }}
                    onClick={() => setActiveTab('admin')}
                  >
                    🔧 Админы
                  </button>
                )}
              </div>
            </div>

            {filteredStaff.length === 0 ? (
              <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>
                Сотрудников не найдено
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredStaff.map((s) => {
                  const staffAssignments = assignments.filter(a => a.staff_id === s.id)
                  const isLeadTutor = staffAssignments.some(a => a.is_lead_tutor === true)
                  const currentEvents = staffAssignments.filter(a => a.assignment_type === 'event')
                  const otherTasks = staffAssignments.filter(a => a.assignment_type !== 'event')
                  
                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: '16px 20px',
                        background: '#F8FAFC',
                        borderRadius: '10px',
                        border: '1px solid #E2E7EF'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                            {s.full_name}
                            {isLeadTutor && (
                              <span style={{
                                marginLeft: '8px',
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: '600',
                                background: '#FBF4DC',
                                color: '#8A6A00'
                              }}>
                                ⭐ Старший
                              </span>
                            )}
                            {s.role && (
                              <span style={{
                                marginLeft: '8px',
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                background: '#EAF2FA',
                                color: '#174A7E'
                              }}>
                                {s.role === 'tutor' ? '📚 Тьютор' :
                                 s.role === 'club_coordinator' ? '🏫 Координатор' :
                                 s.role === 'movement_coordinator' ? '⭐ Координатор движения' :
                                 '🔧 Администратор'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#667085' }}>
                            {s.position || 'Должность не указана'}
                            {s.email && <span style={{ marginLeft: '8px' }}>• {s.email}</span>}
                            {s.phone && <span style={{ marginLeft: '8px' }}>• {s.phone}</span>}
                          </div>
                          {s.bio && (
                            <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                              {s.bio}
                            </div>
                          )}
                          {staffAssignments.length > 0 && (
                            <div style={{ marginTop: '6px' }}>
                              {currentEvents.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#667085' }}>
                                  📅 Мероприятия: {currentEvents.map(a => a.events?.title).join(', ')}
                                </div>
                              )}
                              {otherTasks.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#667085' }}>
                                  📌 Задачи: {otherTasks.map(a => a.notes || a.assignment_type).join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <div style={{ fontSize: '13px', color: '#667085' }}>
                            🎯 {staffAssignments.length} назначений
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {canManage && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 12px', fontSize: '12px' }}
                                onClick={() => {
                                  setSelectedStaff(s)
                                  setForm({ ...form, staff_id: s.id, staff_name: s.full_name })
                                  setStaffSearch(s.full_name)
                                  setShowAssignmentForm(true)
                                }}
                              >
                                📋 Назначить
                              </button>
                            )}
                            {(isAdmin || isMovementCoordinator) && (
                              <button
                                className="btn btn-danger"
                                style={{ padding: '4px 12px', fontSize: '12px' }}
                                onClick={() => handleRemoveStaff(s.id)}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}