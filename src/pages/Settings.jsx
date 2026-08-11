// src/pages/Settings.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Settings() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('news')
  const navigate = useNavigate()

  // ===== НОВОСТИ =====
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsForm, setNewsForm] = useState({ title: '', content: '', image_file: null, image_url: '' })
  const [newsImagePreview, setNewsImagePreview] = useState('')
  const [editingNewsId, setEditingNewsId] = useState(null)
  const [newsMessage, setNewsMessage] = useState('')

  // ===== ПОЛЬЗОВАТЕЛИ =====
  const [users, setUsers] = useState([])

  // ===== КЮДы =====
  const [clubsList, setClubsList] = useState([])
  const [usersList, setUsersList] = useState([])
  const [clubCoordinators, setClubCoordinators] = useState([])
  const [coordinatorForm, setCoordinatorForm] = useState({ club_id: '', profile_id: '' })
  const [coordinatorMessage, setCoordinatorMessage] = useState('')

  // ===== ОБЩИЕ НАСТРОЙКИ =====
  const [settings, setSettings] = useState({
    heroTitle: 'Добро пожаловать в ДОД «Дипломаты будущего»',
    heroSubtitle: 'Система управления движением',
    primaryColor: '#0B1F3A',
    accentColor: '#C9A227',
    siteName: 'Дипломаты будущего',
  })
  const [settingsMessage, setSettingsMessage] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    await loadNews()
    await loadUsers()
    await loadSettings()
    await loadClubsData()
    setLoading(false)
  }

  // ============================================================
  // НОВОСТИ
  // ============================================================
  const loadNews = async () => {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setNews(data || [])
    }
  }

  const handleNewsSubmit = async (e) => {
    e.preventDefault()
    setNewsLoading(true)
    setNewsMessage('')

    let imageUrl = newsForm.image_url

    if (newsForm.image_file) {
      const fileExt = newsForm.image_file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('news-images')
        .upload(fileName, newsForm.image_file)

      if (uploadError) {
        setNewsMessage('❌ Ошибка загрузки фото: ' + uploadError.message)
        setNewsLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('news-images')
        .getPublicUrl(fileName)
      
      imageUrl = urlData.publicUrl
    }

    const newsData = {
      title: newsForm.title,
      content: newsForm.content,
      image_url: imageUrl,
      author_id: profile?.id,
      is_published: true
    }

    let error
    if (editingNewsId) {
      const { error: updateError } = await supabase
        .from('news')
        .update(newsData)
        .eq('id', editingNewsId)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('news')
        .insert([newsData])
      error = insertError
    }

    if (error) {
      setNewsMessage('❌ Ошибка: ' + error.message)
    } else {
      setNewsMessage(editingNewsId ? '✅ Новость обновлена!' : '✅ Новость создана!')
      resetNewsForm()
      loadNews()
      setTimeout(() => setNewsMessage(''), 3000)
    }
    setNewsLoading(false)
  }

  const resetNewsForm = () => {
    setNewsForm({ title: '', content: '', image_file: null, image_url: '' })
    setNewsImagePreview('')
    setEditingNewsId(null)
  }

  const handleEditNews = (item) => {
    setNewsForm({
      title: item.title,
      content: item.content,
      image_file: null,
      image_url: item.image_url || ''
    })
    setNewsImagePreview(item.image_url || '')
    setEditingNewsId(item.id)
    setActiveTab('news')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteNews = async (id) => {
    if (!confirm('Удалить эту новость?')) return

    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', id)

    if (!error) {
      loadNews()
    }
  }

  const handleNewsFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setNewsForm({ ...newsForm, image_file: file })
      const reader = new FileReader()
      reader.onload = (event) => {
        setNewsImagePreview(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // ============================================================
  // ПОЛЬЗОВАТЕЛИ
  // ============================================================
  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setUsers(data || [])
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
    }
  }

  // ============================================================
  // КЮДЫ И КООРДИНАТОРЫ
  // ============================================================
  const loadClubsData = async () => {
    const { data: clubsData } = await supabase
      .from('clubs')
      .select('*')
      .order('name')
    setClubsList(clubsData || [])

    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['club_coordinator', 'admin', 'movement_coordinator'])
      .order('full_name')
    setUsersList(usersData || [])

    const { data: coordinatorsData } = await supabase
      .from('club_coordinators')
      .select(`
        *,
        clubs:club_id (name),
        profiles:profile_id (full_name, email, role)
      `)
    setClubCoordinators(coordinatorsData || [])
  }

  const handleAssignCoordinator = async (e) => {
    e.preventDefault()
    setCoordinatorMessage('')
    setLoading(true)

    try {
      // Проверяем, есть ли уже привязка у этого пользователя
      const { data: existing, error: checkError } = await supabase
        .from('club_coordinators')
        .select('id')
        .eq('profile_id', coordinatorForm.profile_id)

      if (checkError) throw checkError

      if (existing && existing.length > 0) {
        // Обновляем существующую привязку
        const { error: updateError } = await supabase
          .from('club_coordinators')
          .update({ club_id: coordinatorForm.club_id })
          .eq('profile_id', coordinatorForm.profile_id)

        if (updateError) throw updateError
        setCoordinatorMessage('✅ Привязка обновлена!')
      } else {
        // Создаём новую привязку
        const { error: insertError } = await supabase
          .from('club_coordinators')
          .insert([{
            profile_id: coordinatorForm.profile_id,
            club_id: coordinatorForm.club_id
          }])

        if (insertError) throw insertError
        setCoordinatorMessage('✅ Координатор назначен!')
      }

      loadClubsData()
      setCoordinatorForm({ club_id: '', profile_id: '' })
      setTimeout(() => setCoordinatorMessage(''), 3000)
    } catch (err) {
      setCoordinatorMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const handleRemoveCoordinator = async (id) => {
    if (!confirm('Удалить назначение?')) return

    const { error } = await supabase
      .from('club_coordinators')
      .delete()
      .eq('id', id)

    if (!error) {
      loadClubsData()
    }
  }

  // ============================================================
  // ОБЩИЕ НАСТРОЙКИ
  // ============================================================
  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single()
    
    if (!error && data) {
      setSettings({
        heroTitle: data.hero_title || settings.heroTitle,
        heroSubtitle: data.hero_subtitle || settings.heroSubtitle,
        primaryColor: data.primary_color || settings.primaryColor,
        accentColor: data.accent_color || settings.accentColor,
        siteName: data.site_name || settings.siteName,
      })
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    setSettingsMessage('')

    const { error: checkError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)

    let error
    if (checkError) {
      const { error: insertError } = await supabase
        .from('site_settings')
        .insert([{
          hero_title: settings.heroTitle,
          hero_subtitle: settings.heroSubtitle,
          primary_color: settings.primaryColor,
          accent_color: settings.accentColor,
          site_name: settings.siteName,
        }])
      error = insertError
    } else {
      const { error: updateError } = await supabase
        .from('site_settings')
        .update({
          hero_title: settings.heroTitle,
          hero_subtitle: settings.heroSubtitle,
          primary_color: settings.primaryColor,
          accent_color: settings.accentColor,
          site_name: settings.siteName,
        })
        .eq('id', 1)
      error = updateError
    }

    if (error) {
      setSettingsMessage('❌ Ошибка: ' + error.message)
    } else {
      setSettingsMessage('✅ Настройки сохранены!')
      setTimeout(() => setSettingsMessage(''), 3000)
    }
    setSavingSettings(false)
  }

  // ============================================================
  // ПРОВЕРКА ПРАВ
  // ============================================================
  const canManage = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

  if (!canManage) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>⛔ Доступ запрещён</h1>
          <p style={{ color: '#667085' }}>
            Только администратор или координатор движения
          </p>
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
        <h1>⚙️ Настройки сайта</h1>
        <p style={{ color: '#667085', marginBottom: '24px' }}>
          Управление контентом и настройками системы
        </p>

        {/* ===== ВКЛАДКИ ===== */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid #E2E7EF',
          paddingBottom: '4px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('news')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'news' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'news' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'news' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            📰 Новости
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'users' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'users' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'users' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            👥 Пользователи
          </button>
          <button
            onClick={() => setActiveTab('clubs')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'clubs' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'clubs' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'clubs' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            🏫 КЮДы
          </button>
          <button
            onClick={() => navigate('/events')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              color: '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            📅 Мероприятия
          </button>
          <button
            onClick={() => setActiveTab('general')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'general' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'general' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'general' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            ⚙️ Общие
          </button>
        </div>

        {/* ============================================================
            ВКЛАДКА: НОВОСТИ
            ============================================================ */}
        {activeTab === 'news' && (
          <div>
            <div className="card" style={{ marginBottom: '30px', padding: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>
                {editingNewsId ? '✏️ Редактировать новость' : '📝 Создать новость'}
              </h3>

              {newsMessage && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  textAlign: 'center',
                  background: newsMessage.includes('✅') ? '#C6F6D5' : '#FED7D7',
                  color: newsMessage.includes('✅') ? '#276749' : '#9B2C2C'
                }}>
                  {newsMessage}
                </div>
              )}

              <form onSubmit={handleNewsSubmit}>
                <div className="form-group">
                  <label className="form-label">Заголовок</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newsForm.title}
                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                    required
                    placeholder="Введите заголовок"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Текст</label>
                  <textarea
                    className="form-input"
                    value={newsForm.content}
                    onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                    required
                    rows="4"
                    placeholder="Введите текст новости"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Фото</label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*"
                    onChange={handleNewsFileChange}
                    style={{ padding: '8px' }}
                  />
                  {newsImagePreview && (
                    <div style={{ marginTop: '10px' }}>
                      <img src={newsImagePreview} alt="Превью" style={{
                        maxWidth: '100%',
                        maxHeight: '150px',
                        borderRadius: '8px',
                        border: '2px solid #E2E7EF'
                      }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn-primary" disabled={newsLoading}>
                    {newsLoading ? '⏳ Сохранение...' : editingNewsId ? '💾 Обновить' : '➕ Создать'}
                  </button>
                  {editingNewsId && (
                    <button type="button" className="btn btn-secondary" onClick={resetNewsForm}>
                      ❌ Отменить
                    </button>
                  )}
                </div>
              </form>
            </div>

            <h3 style={{ marginBottom: '16px' }}>📋 Все новости</h3>
            
            {news.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                <p>📭 Новостей пока нет</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {news.map((item) => (
                  <div key={item.id} className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {item.image_url && (
                      <img src={item.image_url} alt="Новость" style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        flexShrink: 0
                      }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '15px', marginBottom: '2px' }}>{item.title}</h4>
                      <p style={{ fontSize: '12px', color: '#667085' }}>
                        📅 {new Date(item.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleEditNews(item)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteNews(item.id)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: ПОЛЬЗОВАТЕЛИ
            ============================================================ */}
        {activeTab === 'users' && (
          <div className="card" style={{ padding: '0', overflow: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E7EF', background: '#F4F6F9' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>ФИО</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Роль</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#667085' }}>
                      Пользователей пока нет
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #E2E7EF' }}>
                      <td style={{ padding: '12px 16px' }}>{user.full_name || 'Без имени'}</td>
                      <td style={{ padding: '12px 16px' }}>{user.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={user.role || 'participant'}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="form-select"
                          style={{ 
                            width: 'auto', 
                            padding: '6px 12px', 
                            fontSize: '13px',
                            border: '1.5px solid #D5DCE7',
                            borderRadius: '8px',
                            outline: 'none',
                            background: 'white'
                          }}
                        >
                          <option value="participant">👤 Участник</option>
                          <option value="parent">👨‍👩‍👦 Родитель</option>
                          <option value="club_coordinator">🏫 Координатор КЮДа</option>
                          <option value="tutor">📚 Тьютор</option>
                          <option value="movement_coordinator">⭐ Координатор движения</option>
                          <option value="admin">🔧 Администратор</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: КЮДы
            ============================================================ */}
        {activeTab === 'clubs' && (
          <div>
            <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>🏫 Назначить координатора КЮДа</h3>

              {coordinatorMessage && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  textAlign: 'center',
                  background: coordinatorMessage.includes('✅') ? '#C6F6D5' : '#FED7D7',
                  color: coordinatorMessage.includes('✅') ? '#276749' : '#9B2C2C'
                }}>
                  {coordinatorMessage}
                </div>
              )}

              <form onSubmit={handleAssignCoordinator}>
                <div className="form-group">
                  <label className="form-label">КЮД</label>
                  <select
                    className="form-select"
                    value={coordinatorForm.club_id}
                    onChange={(e) => setCoordinatorForm({ ...coordinatorForm, club_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white'
                    }}
                  >
                    <option value="">Выберите КЮД</option>
                    {clubsList.map((club) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Координатор</label>
                  <select
                    className="form-select"
                    value={coordinatorForm.profile_id}
                    onChange={(e) => setCoordinatorForm({ ...coordinatorForm, profile_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white'
                    }}
                  >
                    <option value="">Выберите пользователя</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading}
                  style={{
                    padding: '10px 28px',
                    background: '#0B1F3A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? '⏳ Назначение...' : '✅ Назначить'}
                </button>
              </form>
            </div>

            <h3 style={{ marginBottom: '16px' }}>📋 Назначенные координаторы</h3>

            <div className="card" style={{ padding: '0', overflow: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E7EF', background: '#F4F6F9' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>КЮД</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Координатор</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {clubCoordinators.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#667085' }}>
                        Назначений пока нет
                      </td>
                    </tr>
                  ) : (
                    clubCoordinators.map((cc) => (
                      <tr key={cc.id} style={{ borderBottom: '1px solid #E2E7EF' }}>
                        <td style={{ padding: '12px 16px' }}>{cc.clubs?.name || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{cc.profiles?.full_name || '—'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleRemoveCoordinator(cc.id)}
                            style={{ 
                              padding: '4px 12px', 
                              fontSize: '12px',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#FCEBEC',
                              color: '#B3262E',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Удалить
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: ОБЩИЕ НАСТРОЙКИ
            ============================================================ */}
        {activeTab === 'general' && (
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>⚙️ Общие настройки сайта</h3>

            {settingsMessage && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                textAlign: 'center',
                background: settingsMessage.includes('✅') ? '#C6F6D5' : '#FED7D7',
                color: settingsMessage.includes('✅') ? '#276749' : '#9B2C2C'
              }}>
                {settingsMessage}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Название сайта</label>
              <input
                type="text"
                className="form-input"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Заголовок на главной</label>
              <input
                type="text"
                className="form-input"
                value={settings.heroTitle}
                onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Подзаголовок на главной</label>
              <input
                type="text"
                className="form-input"
                value={settings.heroSubtitle}
                onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Основной цвет</label>
                <input
                  type="color"
                  className="form-input"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  style={{ padding: '4px', height: '50px', width: '100%', borderRadius: '10px', border: '1.5px solid #D5DCE7' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Акцентный цвет</label>
                <input
                  type="color"
                  className="form-input"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  style={{ padding: '4px', height: '50px', width: '100%', borderRadius: '10px', border: '1.5px solid #D5DCE7' }}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              style={{ 
                width: '100%', 
                padding: '14px', 
                marginTop: '8px',
                background: '#0B1F3A',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {savingSettings ? '⏳ Сохранение...' : '💾 Сохранить настройки'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}