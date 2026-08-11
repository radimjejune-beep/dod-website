// src/pages/ChildBinding.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function ChildBinding() {
  const [profile, setProfile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [selectedChild, setSelectedChild] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [form, setForm] = useState({
    full_name: '',
    school: '',
    class_name: '',
    club_id: ''
  })
  const [clubs, setClubs] = useState([])
  const [alreadyBound, setAlreadyBound] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Поиск при изменении любого поля
    const timer = setTimeout(() => {
      if (form.full_name.length > 2 || form.school || form.class_name) {
        searchChildren()
      } else {
        setSearchResults([])
        setShowResults(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [form.full_name, form.school, form.class_name, form.club_id])

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
      const { data: clubsData } = await supabase
        .from('clubs')
        .select('*')
        .order('name')
      setClubs(clubsData || [])

      // Загружаем уже привязанных детей
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('profile_id', profile?.id)
        .single()

      if (parentData) {
        const { data: childrenData } = await supabase
          .from('parent_children')
          .select('participant_id')
          .eq('parent_id', parentData.id)
        setAlreadyBound(childrenData?.map(c => c.participant_id) || [])
      }

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const searchChildren = async () => {
    if (!form.full_name && !form.school && !form.class_name) return

    let query = supabase
      .from('participants')
      .select(`
        *,
        clubs:club_id (name)
      `)
      .order('full_name')

    if (form.full_name && form.full_name.length > 2) {
      query = query.ilike('full_name', `%${form.full_name}%`)
    }

    if (form.school) {
      query = query.ilike('school', `%${form.school}%`)
    }

    if (form.class_name) {
      query = query.ilike('class_name', `%${form.class_name}%`)
    }

    if (form.club_id) {
      query = query.eq('club_id', form.club_id)
    }

    const { data, error } = await query.limit(10)

    if (!error && data) {
      // Исключаем уже привязанных детей
      const filtered = data.filter(child => !alreadyBound.includes(child.id))
      setSearchResults(filtered)
      setShowResults(filtered.length > 0)
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }

  const handleSelectChild = (child) => {
    setSelectedChild(child)
    setForm({
      full_name: child.full_name,
      school: child.school || '',
      class_name: child.class_name || '',
      club_id: child.club_id || ''
    })
    setShowResults(false)
  }

  const handleBindChild = async () => {
    if (!selectedChild) {
      setMessage('❌ Пожалуйста, выберите ребёнка из списка')
      setMessageType('error')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      // Находим родителя
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('profile_id', profile.id)
        .single()

      if (!parentData) {
        setMessage('❌ Ошибка: профиль родителя не найден')
        setMessageType('error')
        setSaving(false)
        return
      }

      // Привязываем ребёнка
      const { error } = await supabase
        .from('parent_children')
        .insert([{
          parent_id: parentData.id,
          participant_id: selectedChild.id
        }])

      if (error) throw error

      setMessage(`✅ Ребёнок "${selectedChild.full_name}" успешно привязан!`)
      setMessageType('success')
      setSelectedChild(null)
      setForm({ full_name: '', school: '', class_name: '', club_id: '' })
      setSearchResults([])
      setShowResults(false)
      
      // Обновляем список привязанных
      setAlreadyBound([...alreadyBound, selectedChild.id])
      
      setTimeout(() => {
        navigate('/parent-dashboard')
      }, 2000)

    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setSaving(false)
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
      
      <div className="container" style={{ paddingTop: '30px', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
          🔗 Привязка ребёнка
        </h1>
        <p style={{ color: '#667085', marginBottom: '24px' }}>
          Найдите своего ребёнка в системе по ФИО, школе или классу
        </p>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '16px',
            textAlign: 'center',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        <div className="card" style={{ padding: '24px' }}>
          <div className="form-group">
            <label className="form-label">ФИО ребёнка</label>
            <input
              type="text"
              className="form-input"
              value={form.full_name}
              onChange={(e) => {
                setForm({ ...form, full_name: e.target.value })
                setSelectedChild(null)
              }}
              placeholder="Начните вводить ФИО..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Школа</label>
            <input
              type="text"
              className="form-input"
              value={form.school}
              onChange={(e) => {
                setForm({ ...form, school: e.target.value })
                setSelectedChild(null)
              }}
              placeholder="Введите школу"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Класс</label>
            <input
              type="text"
              className="form-input"
              value={form.class_name}
              onChange={(e) => {
                setForm({ ...form, class_name: e.target.value })
                setSelectedChild(null)
              }}
              placeholder="Например: 8А"
            />
          </div>

          <div className="form-group">
            <label className="form-label">КЮД (необязательно)</label>
            <select
              className="form-select"
              value={form.club_id}
              onChange={(e) => {
                setForm({ ...form, club_id: e.target.value })
                setSelectedChild(null)
              }}
            >
              <option value="">Все КЮДы</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
          </div>

          {/* РЕЗУЛЬТАТЫ ПОИСКА */}
          {showResults && searchResults.length > 0 && (
            <div style={{
              marginBottom: '16px',
              border: '1px solid #E2E7EF',
              borderRadius: '10px',
              overflow: 'hidden',
              background: 'white'
            }}>
              <div style={{
                padding: '8px 12px',
                background: '#F4F6F9',
                fontSize: '12px',
                color: '#667085',
                borderBottom: '1px solid #E2E7EF'
              }}>
                Найдено {searchResults.length} детей
              </div>
              {searchResults.map((child) => (
                <div
                  key={child.id}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #F4F6F9',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  onClick={() => handleSelectChild(child)}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                      {child.full_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      {child.school || 'Школа не указана'} • {child.class_name || 'Класс не указан'}
                      {child.clubs?.name && ` • 🏫 ${child.clubs.name}`}
                    </div>
                  </div>
                  {selectedChild?.id === child.id && (
                    <span style={{ color: '#16845B', fontSize: '18px' }}>✅</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {showResults && searchResults.length === 0 && (
            <div style={{
              padding: '16px',
              background: '#F8FAFC',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#667085',
              marginBottom: '16px'
            }}>
              Дети не найдены. Попробуйте изменить параметры поиска.
            </div>
          )}

          {selectedChild && (
            <div style={{
              padding: '12px 16px',
              background: '#E8F5EF',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: '600', color: '#16845B' }}>
                  ✅ Выбран: {selectedChild.full_name}
                </div>
                <div style={{ fontSize: '12px', color: '#667085' }}>
                  {selectedChild.school || 'Школа не указана'} • {selectedChild.class_name || 'Класс не указан'}
                </div>
              </div>
              <button
                className="btn btn-danger"
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => {
                  setSelectedChild(null)
                  setForm({ ...form, full_name: '', school: '', class_name: '' })
                }}
              >
                ✕
              </button>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleBindChild}
            disabled={saving || !selectedChild}
            style={{ width: '100%', padding: '14px' }}
          >
            {saving ? '⏳ Привязка...' : '🔗 Привязать ребёнка'}
          </button>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => navigate('/parent-dashboard')}
          style={{ width: '100%', marginTop: '12px' }}
        >
          ← Назад
        </button>
      </div>
    </div>
  )
}