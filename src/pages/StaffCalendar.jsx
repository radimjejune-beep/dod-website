// src/pages/StaffCalendar.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

export default function StaffCalendar() {
  const [profile, setProfile] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState('all')
  const [selectedStaffId, setSelectedStaffId] = useState(null)
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

      // Загружаем всех сотрудников
      const { data: staffData } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['tutor', 'club_coordinator', 'movement_coordinator', 'admin'])
        .order('full_name')
      setStaff(staffData || [])

      // Загружаем назначения
      await loadAssignments()

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadAssignments = async () => {
    let query = supabase
      .from('event_assignments')
      .select(`
        *,
        events:event_id (id, title, event_date, description, location, type),
        staff:staff_id (id, full_name, role),
        assigned_by_profile:assigned_by (full_name),
        invited_by_profile:invited_by (full_name)
      `)
      .order('assigned_at', { ascending: false })

    // Если тьютор — видит только свои назначения
    if (profile?.role === 'tutor') {
      query = query.eq('staff_id', profile.id)
    }

    const { data, error } = await query
    if (!error) {
      setAssignments(data || [])
    }
  }

  const getAssignmentsForDate = (date) => {
    return assignments.filter(a => {
      const start = new Date(a.start_date || a.events?.event_date)
      const end = a.end_date ? new Date(a.end_date) : start
      return date >= start && date <= end
    })
  }

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId)
    return staffMember?.full_name || 'Неизвестный'
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

  const getRoleColor = (role) => {
    const colors = {
      'tutor': '#174A7E',
      'club_coordinator': '#C9A227',
      'movement_coordinator': '#6B46C1',
      'admin': '#B3262E',
      'organizer': '#0B1F3A',
      'media': '#16845B',
      'educator': '#C9A227',
      'support': '#3182CE',
      'coordinator': '#6B46C1'
    }
    return colors[role] || '#667085'
  }

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayAssignments = getAssignmentsForDate(date)
      if (dayAssignments.length > 0) {
        const uniqueStaff = [...new Set(dayAssignments.map(a => a.staff_id))]
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2px',
            marginTop: '2px',
            flexWrap: 'wrap'
          }}>
            {uniqueStaff.slice(0, 4).map((staffId, i) => {
              const staffMember = staff.find(s => s.id === staffId)
              return (
                <div
                  key={staffId}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: getRoleColor(staffMember?.role || 'tutor'),
                    display: 'inline-block',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}
                />
              )
            })}
            {uniqueStaff.length > 4 && (
              <span style={{ fontSize: '7px', color: '#667085' }}>
                +{uniqueStaff.length - 4}
              </span>
            )}
          </div>
        )
      }
    }
    return null
  }

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dayAssignments = getAssignmentsForDate(date)
      if (dayAssignments.length > 0) {
        return 'staff-event-day'
      }
    }
    return null
  }

  const handleDateClick = (date) => {
    setSelectedDate(date)
    const dayAssignments = getAssignmentsForDate(date)
    if (dayAssignments.length > 0) {
      setSelectedAssignment(dayAssignments[0])
      setShowModal(true)
    }
  }

  const canManage = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' || 
                    profile?.role === 'club_coordinator'

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
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>📅 Календарь сотрудников</h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              {profile?.role === 'tutor' 
                ? 'Ваши назначения на мероприятия' 
                : 'Назначения сотрудников на мероприятия'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {canManage && (
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
                onClick={() => navigate('/staff')}
              >
                👥 Управление сотрудниками
              </button>
            )}
          </div>
        </div>

        {/* КАЛЕНДАРЬ */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #E2E7EF',
          boxShadow: '0 8px 30px rgba(11, 31, 58, 0.06)'
        }}>
          <style>
            {`
              .react-calendar {
                border: none !important;
                width: 100% !important;
                font-family: 'Inter', sans-serif !important;
              }
              .react-calendar__tile {
                padding: 12px 4px !important;
                height: 65px !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                border-radius: 8px !important;
                transition: all 0.2s ease !important;
                font-size: 14px !important;
              }
              .react-calendar__tile:hover {
                background: #F4F6F9 !important;
              }
              .react-calendar__tile--active {
                background: #0B1F3A !important;
                color: white !important;
              }
              .react-calendar__tile--now {
                background: #E8EDF3 !important;
              }
              .react-calendar__month-view__weekdays {
                font-size: 11px !important;
                font-weight: 600 !important;
                color: #667085 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
              }
              .react-calendar__month-view__weekdays__weekday {
                padding: 8px 0 !important;
              }
              .react-calendar__month-view__weekdays abbr {
                text-decoration: none !important;
              }
              .react-calendar__navigation {
                margin-bottom: 12px !important;
              }
              .react-calendar__navigation button {
                font-size: 16px !important;
                font-weight: 600 !important;
                color: #0B1F3A !important;
                padding: 8px 16px !important;
                border-radius: 8px !important;
                transition: all 0.2s ease !important;
              }
              .react-calendar__navigation button:hover {
                background: #F4F6F9 !important;
              }
              .staff-event-day {
                background: #F0F7FF !important;
                font-weight: 600 !important;
                border-radius: 8px !important;
              }
              .staff-event-day:hover {
                background: #E2E8F0 !important;
              }
              .react-calendar__month-view__days__day--weekend {
                color: #B3262E !important;
              }
            `}
          </style>

          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileContent={tileContent}
            tileClassName={tileClassName}
            onClickDay={handleDateClick}
          />
        </div>

        {/* СПИСОК НАЗНАЧЕНИЙ НА ВЫБРАННЫЙ ДЕНЬ */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📋 {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {getAssignmentsForDate(selectedDate).length} назначений
            </span>
          </div>

          {getAssignmentsForDate(selectedDate).length === 0 ? (
            <div style={{
              background: '#F8FAFC',
              borderRadius: '10px',
              padding: '30px',
              textAlign: 'center',
              border: '1px dashed #E2E7EF'
            }}>
              <p style={{ color: '#667085', fontSize: '14px' }}>На этот день назначений нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getAssignmentsForDate(selectedDate).map((a) => {
                const staffMember = staff.find(s => s.id === a.staff_id)
                const status = getStatusBadge(a.status)
                return (
                  <div
                    key={a.id}
                    className="card"
                    style={{
                      padding: '16px 20px',
                      cursor: 'pointer',
                      borderLeft: `4px solid ${getRoleColor(staffMember?.role || 'tutor')}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => {
                      setSelectedAssignment(a)
                      setShowModal(true)
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                        {a.events?.title || 'Мероприятие'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#667085' }}>
                        👤 {getStaffName(a.staff_id)}
                        <span style={{
                          marginLeft: '8px',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: '#EAF2FA',
                          color: '#174A7E'
                        }}>
                          {a.role}
                        </span>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: status.bg,
                          color: status.color
                        }}>
                          {status.label}
                        </span>
                      </div>
                      {a.notes && (
                        <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                          📝 {a.notes}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: '#98A2B3'
                    }}>
                      {a.start_date ? new Date(a.start_date).toLocaleDateString('ru-RU') : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО */}
      {showModal && selectedAssignment && (
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
              maxWidth: '500px',
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
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              {selectedAssignment.events?.title || 'Назначение'}
            </h2>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500', color: '#0B1F3A' }}>Сотрудник:</span>
                <span style={{ color: '#667085' }}>{getStaffName(selectedAssignment.staff_id)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500', color: '#0B1F3A' }}>Роль:</span>
                <span style={{
                  padding: '2px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: '#EAF2FA',
                  color: '#174A7E'
                }}>
                  {selectedAssignment.role}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500', color: '#0B1F3A' }}>Статус:</span>
                <span style={{
                  padding: '2px 12px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: getStatusBadge(selectedAssignment.status).bg,
                  color: getStatusBadge(selectedAssignment.status).color
                }}>
                  {getStatusBadge(selectedAssignment.status).label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500', color: '#0B1F3A' }}>Дата мероприятия:</span>
                <span style={{ color: '#667085' }}>
                  {selectedAssignment.events?.event_date 
                    ? new Date(selectedAssignment.events.event_date).toLocaleDateString('ru-RU')
                    : '—'}
                </span>
              </div>
              {selectedAssignment.start_date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '500', color: '#0B1F3A' }}>Даты проведения:</span>
                  <span style={{ color: '#667085' }}>
                    {new Date(selectedAssignment.start_date).toLocaleDateString('ru-RU')}
                    {selectedAssignment.end_date && selectedAssignment.end_date !== selectedAssignment.start_date && (
                      <> — {new Date(selectedAssignment.end_date).toLocaleDateString('ru-RU')}</>
                    )}
                  </span>
                </div>
              )}
              {selectedAssignment.notes && (
                <div style={{ marginTop: '8px', padding: '12px', background: '#F4F6F9', borderRadius: '8px' }}>
                  <span style={{ fontWeight: '500', color: '#0B1F3A' }}>📝 Примечание:</span>
                  <span style={{ color: '#667085', marginLeft: '4px' }}>{selectedAssignment.notes}</span>
                </div>
              )}
              {selectedAssignment.responsibilities && selectedAssignment.responsibilities.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontWeight: '500', color: '#0B1F3A' }}>📋 Обязанности:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {selectedAssignment.responsibilities.map((resp, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          background: '#E8F5EF',
                          color: '#16845B'
                        }}
                      >
                        {resp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '8px' }}
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