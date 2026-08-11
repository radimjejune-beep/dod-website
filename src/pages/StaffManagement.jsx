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
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [coordinatorClubId, setCoordinatorClubId] = useState(null)
  
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
    event_id: '',
    event_title: '',
    role: '',
    responsibilities: [],
    notes: '',
    start_date: '',
    end_date: '',
    is_lead_tutor: false
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

      let staffQuery = supabase
        .from('profiles')
        .select(`
          *,
          club_coordinators:club_id (clubs:club_id (name))
        `)
        .order('full_name')

      // Координатор КЮДа видит только тьюторов
      if (profile?.role === 'club_coordinator') {
        staffQuery = staffQuery.eq('role', 'tutor')
      } else {
        staffQuery = staffQuery.in('role', ['tutor', 'club_coordinator', 'movement_coordinator', 'admin'])
      }

      const { data: staffData } = await staffQuery
      setStaff(staffData || [])

      const { data: rolesData } = await supabase
        .from('staff_roles')
        .select('*')
        .order('name')
      setRoles(rolesData || [])

      let eventsQuery = supabase
        .from('events')
        .select('id, title, event_date, club_id')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(20)

      // Координатор КЮДа видит только свои мероприятия
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

  const createNewStaff = async (name, email) => {
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (existingUser) {
        setMessage('❌ Пользователь с таким email уже существует')
        setMessageType('error')
        return null
      }

      const tempPassword = Math.random().toString(36).slice(-8) + '!'

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: tempPassword,
        options: {
          data: {
            full_name: name,
            role: 'tutor'
          }
        }
      })

      if (authError) {
        setMessage('❌ Ошибка при создании пользователя: ' + authError.message)
        setMessageType('error')
        return null
      }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            full_name: name,
            email: email,
            role: 'tutor'
          }])

        if (profileError) {
          setMessage('❌ Ошибка при создании профиля: ' + profileError.message)
          setMessageType('error')
          return null
        }

        setMessage(`✅ Сотрудник "${name}" создан! Временный пароль: ${tempPassword}`)
        setMessageType('success')
        
        await loadData()
        return authData.user.id
      }
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
      return null
    }
  }

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
        } else if (form.staff_email) {
          const newId = await createNewStaff(form.staff_name, form.staff_email)
          if (newId) {
            staffId = newId
            await loadData()
            const { data: updatedStaff } = await supabase
              .from('profiles')
              .select('*')
              .eq('role', 'tutor')
              .order('full_name')
            setStaff(updatedStaff || [])
          }
        } else {
          setMessage('❌ Для нового сотрудника укажите email')
          setMessageType('error')
          setLoading(false)
          return
        }
      }

      if (!staffId) {
        setMessage('❌ Пожалуйста, выберите или создайте сотрудника')
        setMessageType('error')
        setLoading(false)
        return
      }

      let eventId = form.event_id
      
      if (!eventId && form.event_title) {
        const found = events.find(e => 
          e.title.toLowerCase() === form.event_title.toLowerCase()
        )
        if (found) {
          eventId = found.id
        }
      }

      if (!eventId) {
        setMessage('❌ Пожалуйста, выберите мероприятие из списка')
        setMessageType('error')
        setLoading(false)
        return
      }

      // Проверка: координатор КЮДа может приглашать только на свои мероприятия
      if (profile?.role === 'club_coordinator' && coordinatorClubId) {
        const event = events.find(e => e.id === eventId)
        if (event && event.club_id !== coordinatorClubId) {
          setMessage('❌ Вы можете приглашать тьюторов только на мероприятия вашего клуба')
          setMessageType('error')
          setLoading(false)
          return
        }
      }

      const { error } = await supabase
        .from('event_assignments')
        .insert([{
          event_id: eventId,
          staff_id: staffId,
          role: form.role || 'Тьютор',
          responsibilities: form.responsibilities || [],
          notes: form.notes || '',
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          assigned_by: profile.id,
          invited_by: profile.id,
          status: 'pending',
          is_lead_tutor: form.is_lead_tutor || false
        }])

      if (error) throw error

      setMessage('✅ Приглашение отправлено!')
      setMessageType('success')
      setForm({
        staff_id: '',
        staff_name: '',
        staff_email: '',
        staff_role: 'tutor',
        event_id: '',
        event_title: '',
        role: '',
        responsibilities: [],
        notes: '',
        start_date: '',
        end_date: '',
        is_lead_tutor: false
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

  const handleRespondInvitation = async (assignmentId, status, declineReason = '') => {
    setMessage('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('event_assignments')
        .update({
          status: status,
          responded_at: new Date().toISOString(),
          decline_reason: declineReason || null
        })
        .eq('id', assignmentId)

      if (error) throw error

      setMessage(status === 'accepted' ? '✅ Приглашение принято!' : '❌ Приглашение отклонено')
      setMessageType(status === 'accepted' ? 'success' : 'error')
      loadAssignments()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setLoading(false)
  }

  const handleRemoveAssignment = async (id) => {
    if (!confirm('Удалить назначение?')) return

    const { error } = await supabase
      .from('event_assignments')
      .delete()
      .eq('id', id)

    if (!error) {
      loadAssignments()
    }
  }

  // ПРАВА ДОСТУПА — КООРДИНАТОР КЮДА МОЖЕТ УПРАВЛЯТЬ
  const canManage = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' || 
                    profile?.role === 'club_coordinator'

  const isTutor = profile?.role === 'tutor'

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
              {isTutor ? '📨 Мои приглашения' : '👥 Сотрудники'}
            </h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              {isTutor 
                ? 'Приглашения на мероприятия от координаторов' 
                : profile?.role === 'club_coordinator' 
                  ? 'Приглашение тьюторов на мероприятия вашего клуба' 
                  : 'Управление тьюторами и координаторами'}
            </p>
          </div>
          {canManage && (
            <button
              className="btn btn-primary"
              onClick={() => setShowAssignmentForm(!showAssignmentForm)}
            >
              {showAssignmentForm ? '✖ Закрыть' : '➕ Пригласить тьютора'}
            </button>
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

        {showAssignmentForm && canManage && (
          <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              📝 Пригласить тьютора на мероприятие
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
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Тьютор</label>
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
                    placeholder="Введите имя тьютора..."
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
                      <div
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderTop: '2px solid #C9A227',
                          background: '#FBF4DC',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#E8D9A8'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#FBF4DC'}
                        onClick={() => {
                          setForm({ ...form, staff_name: staffSearch, staff_id: 'new' })
                          setShowStaffDropdown(false)
                          const emailInput = document.getElementById('new-staff-email')
                          if (emailInput) emailInput.focus()
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#0B1F3A' }}>
                          ➕ Создать нового тьютора: "{staffSearch}"
                        </div>
                        <div style={{ fontSize: '12px', color: '#667085' }}>
                          Будет создан новый тьютор
                        </div>
                      </div>
                    </div>
                  )}

                  {form.staff_id === 'new' && (
                    <div style={{
                      marginTop: '8px',
                      padding: '12px',
                      background: '#FBF4DC',
                      borderRadius: '8px',
                      border: '1px solid #C9A227'
                    }}>
                      <div style={{ fontWeight: '600', color: '#0B1F3A', marginBottom: '4px' }}>
                        ✨ Новый тьютор
                      </div>
                      <input
                        id="new-staff-email"
                        type="email"
                        className="form-input"
                        value={form.staff_email}
                        onChange={(e) => setForm({ ...form, staff_email: e.target.value })}
                        placeholder="Email нового тьютора"
                        style={{ marginBottom: '6px' }}
                      />
                      <div style={{ fontSize: '12px', color: '#667085' }}>
                        Будет создан пользователь с ролью "Тьютор"
                      </div>
                    </div>
                  )}

                  {form.staff_id && form.staff_id !== 'new' && (
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

                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Мероприятие</label>
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
                            {e.club_id && (
                              <span style={{
                                marginLeft: '8px',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                background: '#EAF2FA',
                                color: '#174A7E'
                              }}>
                                Клубное
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {availableEvents.length === 0 && (
                        <div style={{
                          padding: '10px 14px',
                          textAlign: 'center',
                          color: '#667085'
                        }}>
                          Нет доступных мероприятий
                        </div>
                      )}
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

                <div className="form-group">
                  <label className="form-label">Роль на мероприятии</label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    required
                  >
                    <option value="">Выберите роль</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.icon} {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Даты проведения</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="date"
                      className="form-input"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      placeholder="Начало"
                    />
                    <input
                      type="date"
                      className="form-input"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      placeholder="Окончание"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
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

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Примечание для тьютора</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Дополнительная информация о мероприятии"
                  />
                </div>

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
                    <span style={{ fontSize: '12px', color: '#98A2B3' }}>
                      (только он сможет финально оценивать участников)
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? '⏳ Отправка...' : '📤 Отправить приглашение'}
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
                            {inv.start_date && ` — ${new Date(inv.start_date).toLocaleDateString('ru-RU')}`}
                          </div>
                          <div style={{ fontSize: '13px', color: '#667085' }}>
                            👤 Пригласил: {inv.invited_by_profile?.full_name || 'Неизвестно'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#667085' }}>
                            🎯 Роль: <span style={{
                              padding: '2px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: '#EAF2FA',
                              color: '#174A7E'
                            }}>
                              {inv.role}
                            </span>
                          </div>
                          {inv.is_lead_tutor && (
                            <div style={{ marginTop: '4px' }}>
                              <span style={{
                                padding: '2px 12px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: '600',
                                background: '#FBF4DC',
                                color: '#8A6A00'
                              }}>
                                ⭐ Старший тьютор
                              </span>
                            </div>
                          )}
                          {inv.notes && (
                            <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                              📝 {inv.notes}
                            </div>
                          )}
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
                              onClick={() => handleRespondInvitation(inv.id, 'accepted')}
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

        {!isTutor && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              {profile?.role === 'club_coordinator' ? 'Тьюторы' : 'Список сотрудников'}
            </h3>
            {staff.length === 0 ? (
              <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>
                {profile?.role === 'club_coordinator' ? 'Тьюторов пока нет' : 'Сотрудников пока нет'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {staff.map((s) => {
                  const staffAssignments = assignments.filter(a => a.staff_id === s.id)
                  const isLeadTutor = staffAssignments.some(a => a.is_lead_tutor === true)
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                          </div>
                          <div style={{ fontSize: '13px', color: '#667085' }}>
                            {s.role} • {s.position || 'Должность не указана'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', color: '#667085' }}>
                            🎯 {staffAssignments.length} назначений
                          </div>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 12px', fontSize: '12px', marginTop: '4px' }}
                            onClick={() => {
                              setSelectedStaff(s)
                              setForm({ ...form, staff_id: s.id, staff_name: s.full_name })
                              setStaffSearch(s.full_name)
                              setShowAssignmentForm(true)
                            }}
                          >
                            📋 Пригласить
                          </button>
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