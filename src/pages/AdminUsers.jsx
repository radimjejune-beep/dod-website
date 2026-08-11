// src/pages/AdminUsers.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function AdminUsers() {
  const [profile, setProfile] = useState(null)
  const [users, setUsers] = useState([])
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedClub, setSelectedClub] = useState('')
  const [showBindModal, setShowBindModal] = useState(false)
  const [bindType, setBindType] = useState('parent') // 'parent' or 'club'
  const [selectedUser, setSelectedUser] = useState(null)
  const [bindTargetId, setBindTargetId] = useState('')
  const [bindTargetSearch, setBindTargetSearch] = useState('')
  const [bindTargets, setBindTargets] = useState([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
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

      // Проверка прав — только админ
      if (profileData.role !== 'admin' && profileData.role !== 'movement_coordinator') {
        navigate('/dashboard')
        return
      }

      // Загружаем клубы
      const { data: clubsData } = await supabase
        .from('clubs')
        .select('*')
        .order('name')
      setClubs(clubsData || [])

      // Загружаем всех пользователей
      await loadUsers()

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        club_participants!left (
          club_id,
          clubs:club_id (
            id,
            name
          )
        ),
        parent_child_relations!left (
          id,
          child_id,
          profiles:child_id (
            id,
            full_name,
            school,
            class_name
          )
        ),
        parent_child_relations_parent!left (
          id,
          parent_id,
          profiles:parent_id (
            id,
            full_name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (!error) {
      // Форматируем данные
      const formattedUsers = data.map(u => ({
        ...u,
        club: u.club_participants?.[0]?.clubs || null,
        children: u.parent_child_relations?.map(r => r.profiles) || [],
        parents: u.parent_child_relations_parent?.map(r => r.profiles) || []
      }))
      setUsers(formattedUsers || [])
    }
  }

  const getFilteredUsers = () => {
    let filtered = users

    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedRole) {
      filtered = filtered.filter(u => u.role === selectedRole)
    }

    if (selectedClub) {
      filtered = filtered.filter(u =>
        u.club_participants?.some(cp => cp.club_id === selectedClub)
      )
    }

    return filtered
  }

  const filteredUsers = getFilteredUsers()

  // ============================================================
  // ПОИСК ДЛЯ ПРИВЯЗКИ
  // ============================================================
  const searchBindTargets = async (query) => {
    if (query.length < 2) {
      setBindTargets([])
      return
    }

    let targetRole = bindType === 'parent' ? 'parent' : 'participant'
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', targetRole)
      .ilike('full_name', `%${query}%`)
      .limit(10)

    setBindTargets(data || [])
  }

  // ============================================================
  // ПРИВЯЗКА РЕБЕНКА К РОДИТЕЛЮ
  // ============================================================
  const handleBindParent = async () => {
    if (!selectedUser || !bindTargetId) {
      setMessage('❌ Выберите родителя и ребёнка')
      setMessageType('error')
      return
    }

    try {
      const { error } = await supabase
        .from('parent_child_relations')
        .insert([{
          parent_id: bindTargetId,
          child_id: selectedUser.id,
          status: 'active'
        }])

      if (error) throw error

      setMessage('✅ Ребёнок привязан к родителю!')
      setMessageType('success')
      setShowBindModal(false)
      loadUsers()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  // ============================================================
  // ПРИВЯЗКА УЧАСТНИКА К КЛУБУ
  // ============================================================
  const handleBindClub = async () => {
    if (!selectedUser || !bindTargetId) {
      setMessage('❌ Выберите участника и клуб')
      setMessageType('error')
      return
    }

    try {
      // Проверяем, есть ли уже привязка
      const { data: existing } = await supabase
        .from('club_participants')
        .select('id')
        .eq('profile_id', selectedUser.id)
        .eq('club_id', bindTargetId)
        .maybeSingle()

      if (existing) {
        setMessage('⚠️ Участник уже привязан к этому клубу')
        setMessageType('error')
        return
      }

      const { error } = await supabase
        .from('club_participants')
        .insert([{
          profile_id: selectedUser.id,
          club_id: bindTargetId,
          status: 'active'
        }])

      if (error) throw error

      setMessage('✅ Участник привязан к клубу!')
      setMessageType('success')
      setShowBindModal(false)
      loadUsers()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  // ============================================================
  // УДАЛЕНИЕ ПРИВЯЗКИ
  // ============================================================
  const handleUnbindParent = async (childId) => {
    if (!confirm('Отвязать ребёнка от родителя?')) return

    try {
      const { error } = await supabase
        .from('parent_child_relations')
        .delete()
        .eq('child_id', childId)

      if (error) throw error

      setMessage('✅ Привязка удалена')
      setMessageType('success')
      loadUsers()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  const handleUnbindClub = async (profileId) => {
    if (!confirm('Отвязать участника от клуба?')) return

    try {
      const { error } = await supabase
        .from('club_participants')
        .delete()
        .eq('profile_id', profileId)

      if (error) throw error

      setMessage('✅ Привязка к клубу удалена')
      setMessageType('success')
      loadUsers()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`Изменить роль пользователя на ${newRole}?`)) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setMessage('✅ Роль изменена')
      setMessageType('success')
      loadUsers()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  const openBindModal = (user, type) => {
    setSelectedUser(user)
    setBindType(type)
    setBindTargetId('')
    setBindTargetSearch('')
    setBindTargets([])
    setShowBindModal(true)
  }

  const getRoleLabel = (role) => {
    const labels = {
      'participant': '👤 Участник',
      'parent': '👨‍👩‍👦 Родитель',
      'club_coordinator': '🏫 Координатор КЮДа',
      'tutor': '📚 Тьютор',
      'movement_coordinator': '⭐ Координатор движения',
      'admin': '🔧 Администратор'
    }
    return labels[role] || role
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              👥 Управление пользователями
            </h1>
            <p style={{ color: '#667085', fontSize: '16px' }}>
              Всего пользователей: {users.length}
            </p>
          </div>
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

        {/* ФИЛЬТРЫ */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Поиск по ФИО, email..."
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">Все роли</option>
              <option value="participant">Участник</option>
              <option value="parent">Родитель</option>
              <option value="club_coordinator">Координатор КЮДа</option>
              <option value="tutor">Тьютор</option>
              <option value="movement_coordinator">Координатор движения</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="form-select"
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
            >
              <option value="">Все КЮДы</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '14px', color: '#667085' }}>
            Найдено: <strong>{filteredUsers.length}</strong>
          </div>
        </div>

        {/* ТАБЛИЦА */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          overflow: 'auto',
          border: '1px solid #E2E7EF',
          boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#F4F6F9', borderBottom: '2px solid #E2E7EF' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>ФИО</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Роль</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Клуб</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Дети/Родители</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                    Пользователей не найдено
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F4F6F9', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0B1F3A' }}>
                      {u.full_name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#667085' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #D5DCE7',
                          fontSize: '12px',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="participant">Участник</option>
                        <option value="parent">Родитель</option>
                        <option value="club_coordinator">Координатор КЮДа</option>
                        <option value="tutor">Тьютор</option>
                        <option value="movement_coordinator">Координатор движения</option>
                        <option value="admin">Администратор</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.club ? (
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          background: '#EAF2FA',
                          color: '#174A7E'
                        }}>
                          {u.club.name}
                        </span>
                      ) : (
                        <span style={{ color: '#98A2B3', fontSize: '12px' }}>—</span>
                      )}
                      {u.role === 'participant' && !u.club && (
                        <button
                          style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            background: '#FBF4DC',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            color: '#8A6A00'
                          }}
                          onClick={() => openBindModal(u, 'club')}
                        >
                          Привязать к клубу
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#667085' }}>
                      {u.children?.length > 0 && (
                        <div>
                          <span style={{ fontWeight: '600', color: '#0B1F3A' }}>Дети:</span>
                          {u.children.map(c => (
                            <span key={c.id} style={{ display: 'inline-block', marginRight: '4px' }}>
                              {c.full_name}
                              <button
                                style={{
                                  marginLeft: '4px',
                                  padding: '0 4px',
                                  background: '#FCEBEC',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '10px',
                                  color: '#B3262E'
                                }}
                                onClick={() => handleUnbindParent(c.id)}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {u.parents?.length > 0 && (
                        <div>
                          <span style={{ fontWeight: '600', color: '#0B1F3A' }}>Родители:</span>
                          {u.parents.map(p => p.full_name).join(', ')}
                        </div>
                      )}
                      {u.role === 'parent' && u.children?.length === 0 && (
                        <button
                          style={{
                            padding: '2px 8px',
                            background: '#FBF4DC',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            color: '#8A6A00'
                          }}
                          onClick={() => openBindModal(u, 'parent')}
                        >
                          Привязать ребёнка
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        style={{
                          padding: '4px 12px',
                          background: '#F4F6F9',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        onClick={() => navigate(`/participant/${u.id}`)}
                      >
                        👁️
                      </button>
                      {u.role === 'participant' && u.club && (
                        <button
                          style={{
                            marginLeft: '4px',
                            padding: '4px 8px',
                            background: '#FCEBEC',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            color: '#B3262E'
                          }}
                          onClick={() => handleUnbindClub(u.id)}
                          title="Отвязать от клуба"
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

        {/* МОДАЛЬНОЕ ОКНО ПРИВЯЗКИ */}
        {showBindModal && selectedUser && (
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
          onClick={() => setShowBindModal(false)}
          >
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A' }}>
                  {bindType === 'parent' ? '👨‍👩‍👦 Привязать ребёнка к родителю' : '🏫 Привязать участника к клубу'}
                </h3>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: '#98A2B3',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowBindModal(false)}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#667085', fontSize: '14px' }}>
                  {bindType === 'parent' 
                    ? `Пользователь: ${selectedUser.full_name} (Родитель)`
                    : `Пользователь: ${selectedUser.full_name} (Участник)`}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {bindType === 'parent' ? 'Поиск ребёнка' : 'Поиск клуба'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={bindTargetSearch}
                  onChange={(e) => {
                    setBindTargetSearch(e.target.value)
                    if (bindType === 'parent') {
                      searchBindTargets(e.target.value)
                    } else {
                      // Для клуба — фильтруем из списка
                      const query = e.target.value.toLowerCase()
                      const filtered = clubs.filter(c => 
                        c.name.toLowerCase().includes(query)
                      )
                      setBindTargets(filtered)
                    }
                  }}
                  placeholder={bindType === 'parent' ? 'Введите ФИО ребёнка...' : 'Введите название клуба...'}
                />
              </div>

              {bindTargets.length > 0 && (
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #E2E7EF',
                  borderRadius: '10px',
                  marginBottom: '16px'
                }}>
                  {bindTargets.map((target) => (
                    <div
                      key={target.id}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #F4F6F9',
                        background: bindTargetId === target.id ? '#F4F6F9' : 'white',
                        transition: 'background 0.15s'
                      }}
                      onClick={() => {
                        setBindTargetId(target.id)
                        setBindTargetSearch(target.full_name || target.name)
                        setBindTargets([])
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                        {target.full_name || target.name}
                      </div>
                      {target.role && (
                        <div style={{ fontSize: '12px', color: '#667085' }}>
                          {getRoleLabel(target.role)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {bindTargetId && (
                <div style={{
                  padding: '12px',
                  background: '#E8F5EF',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  ✅ Выбрано: <strong>{bindTargetSearch}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn btn-success"
                  onClick={bindType === 'parent' ? handleBindParent : handleBindClub}
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
                  ✅ Привязать
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowBindModal(false)}
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}