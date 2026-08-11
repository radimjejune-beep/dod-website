// src/pages/Register.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('participant')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [school, setSchool] = useState('')
  const [classname, setClassname] = useState('')
  const [selectedClubId, setSelectedClubId] = useState('')
  const [clubs, setClubs] = useState([])
  const [loadingClubs, setLoadingClubs] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isMinor, setIsMinor] = useState(false)
  const [parentFullName, setParentFullName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [agreePersonalData, setAgreePersonalData] = useState(false)
  const [agreeMinorData, setAgreeMinorData] = useState(false)
  const [agreeImageUse, setAgreeImageUse] = useState(false)
  const [agreePhotoPublication, setAgreePhotoPublication] = useState(false)
  
  const [childFullName, setChildFullName] = useState('')
  const [childBirthDate, setChildBirthDate] = useState('')
  const [childSchool, setChildSchool] = useState('')
  const [childClass, setChildClass] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedChild, setSelectedChild] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const navigate = useNavigate()

  // Загрузка клубов
  useEffect(() => {
    loadClubs()
  }, [])

  const loadClubs = async () => {
    setLoadingClubs(true)
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('name')
      
      if (!error) {
        setClubs(data || [])
      }
    } catch (err) {
      console.error('Ошибка загрузки клубов:', err)
    }
    setLoadingClubs(false)
  }

  useEffect(() => {
    if (birthDate) {
      const age = calculateAge(birthDate)
      setIsMinor(age < 18)
    }
  }, [birthDate])

  useEffect(() => {
    if (role === 'parent' && searchQuery.length > 2) {
      searchChild()
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }, [searchQuery, role])

  const calculateAge = (birthDateStr) => {
    const birth = new Date(birthDateStr)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const searchChild = async () => {
    if (searchQuery.length < 3) return
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'participant')
      .ilike('full_name', `%${searchQuery}%`)
      .limit(5)

    if (!error && data) {
      setSearchResults(data)
      setShowSearchResults(data.length > 0)
    }
  }

  const handleSelectChild = (child) => {
    setSelectedChild(child)
    setChildFullName(child.full_name)
    setChildBirthDate(child.birth_date || '')
    setChildSchool(child.school || '')
    setChildClass(child.class_name || '')
    setSearchQuery(child.full_name)
    setShowSearchResults(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    // ============================================================
    // ПРОВЕРКИ БЕЗОПАСНОСТИ
    // ============================================================
    
    // 1. Только участник или родитель
    const allowedRoles = ['participant', 'parent']
    if (!allowedRoles.includes(role)) {
      setError('❌ Регистрация доступна только для участников и родителей')
      setLoading(false)
      return
    }

    // 2. Проверка email
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('❌ Введите корректный email')
      setLoading(false)
      return
    }

    // 3. Проверка пароля
    if (!password || password.length < 6) {
      setError('❌ Пароль должен содержать минимум 6 символов')
      setLoading(false)
      return
    }

    // 4. Проверка ФИО
    if (!fullName || fullName.trim().length < 2) {
      setError('❌ Введите ваше ФИО')
      setLoading(false)
      return
    }

    // 5. Проверка даты рождения
    if (!birthDate) {
      setError('❌ Укажите дату рождения')
      setLoading(false)
      return
    }

    // 6. Проверка согласий
    if (!agreeToTerms || !agreePersonalData) {
      setError('❌ Для регистрации необходимо ознакомиться с Политикой и дать согласие на обработку персональных данных')
      setLoading(false)
      return
    }

    if (isMinor && !agreeMinorData) {
      setError('❌ Для регистрации несовершеннолетнего необходимо согласие законного представителя')
      setLoading(false)
      return
    }

    // 7. Если родитель — проверяем, что выбран ребёнок
    if (role === 'parent' && !selectedChild) {
      setError('❌ Пожалуйста, найдите и выберите своего ребёнка в системе')
      setLoading(false)
      return
    }

    // 8. Проверка выбранного клуба
    if (selectedClubId) {
      const { data: clubExists } = await supabase
        .from('clubs')
        .select('id')
        .eq('id', selectedClubId)
        .single()
      
      if (!clubExists) {
        setError('❌ Выбранный клуб не существует')
        setLoading(false)
        return
      }
    }

    // ============================================================
    // РЕГИСТРАЦИЯ
    // ============================================================
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            birth_date: birthDate,
            phone: phone,
            school: school,
            class_name: classname,
            is_minor: isMinor
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Создание профиля
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: fullName,
              email: email,
              role: role,
              birth_date: birthDate || null,
              phone: phone || null,
              is_minor: isMinor,
              school: school || null,
              class_name: classname || null
            }
          ])

        if (profileError) throw profileError

        // Привязка к клубу
        if (role === 'participant' && selectedClubId) {
          const { error: clubError } = await supabase
            .from('club_participants')
            .insert([
              {
                profile_id: authData.user.id,
                club_id: selectedClubId,
                status: 'active'
              }
            ])

          if (clubError) {
            console.error('Ошибка привязки к клубу:', clubError)
          }
        }

        // Привязка родителя к ребёнку
        if (role === 'parent' && selectedChild) {
          const { error: relationError } = await supabase
            .from('parent_child_relations')
            .insert([
              {
                parent_id: authData.user.id,
                child_id: selectedChild.id,
                status: 'active'
              }
            ])

          if (relationError) throw relationError
        }

        // Сохранение согласий
        const consents = [
          {
            user_id: authData.user.id,
            consent_type: 'personal_data',
            consent_text: 'Согласие на обработку персональных данных',
            version: '1.0',
            ip_address: '...',
            user_agent: navigator.userAgent || 'unknown'
          },
          {
            user_id: authData.user.id,
            consent_type: 'has_read_privacy',
            consent_text: 'Ознакомление с Политикой',
            version: '1.0',
            ip_address: '...',
            user_agent: navigator.userAgent || 'unknown'
          }
        ]

        if (agreeImageUse) {
          consents.push({
            user_id: authData.user.id,
            consent_type: 'image_use',
            consent_text: 'Согласие на использование изображения',
            version: '1.0',
            ip_address: '...',
            user_agent: navigator.userAgent || 'unknown'
          })
        }

        if (agreePhotoPublication) {
          consents.push({
            user_id: authData.user.id,
            consent_type: 'photo_publication',
            consent_text: 'Согласие на публикацию фотографий',
            version: '1.0',
            ip_address: '...',
            user_agent: navigator.userAgent || 'unknown'
          })
        }

        if (isMinor) {
          consents.push({
            user_id: authData.user.id,
            consent_type: 'minor_personal_data',
            consent_text: `Согласие законного представителя на обработку ПД несовершеннолетнего. Законный представитель: ${parentFullName}, ${parentPhone}`,
            version: '1.0',
            ip_address: '...',
            user_agent: navigator.userAgent || 'unknown'
          })
        }

        for (const consent of consents) {
          await supabase.from('user_consents').insert([consent])
        }

        await supabase.from('consent_logs').insert([
          {
            user_id: authData.user.id,
            action: 'given',
            consent_type: 'personal_data',
            ip_address: '...',
            user_agent: navigator.userAgent || 'unknown',
            details: { 
              consents_given: consents.map(c => c.consent_type),
              is_minor: isMinor,
              role: role,
              club_id: selectedClubId || null,
              has_parent: role === 'parent' && !!selectedChild
            }
          }
        ])

        setSuccess(true)
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (err) {
      setError('❌ Ошибка регистрации: ' + err.message)
    }
    setLoading(false)
  }

  const availableRoles = [
    { value: 'participant', label: '👤 Участник' },
    { value: 'parent', label: '👨‍👩‍👦 Родитель' },
  ]

  return (
    <div className="auth-bg">
      <div className="card" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '32px',
        animation: 'fadeIn 0.5s ease',
        position: 'relative',
        zIndex: 1,
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            fontSize: '24px',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.3)'
          }}>
            🌍
          </div>
          <h1 style={{ fontSize: '20px', color: '#172033', marginBottom: '2px' }}>
            Детское общественное движение
          </h1>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
            «Дипломаты будущего»
          </h2>
          <p style={{
            fontSize: '10px',
            color: '#C9A227',
            fontWeight: '600',
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}>
            Ассоциация российских дипломатов
          </p>
          <div style={{
            marginTop: '8px',
            fontSize: '13px',
            color: '#667085'
          }}>
            Регистрация в системе
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#FCEBEC',
            color: '#B3262E',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px',
            background: '#E8F5EF',
            color: '#16845B',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ✅ Регистрация успешна! Перенаправление на вход...
          </div>
        )}

        <form onSubmit={handleRegister}>
          {/* РОЛЬ */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
              Кто вы?
            </h4>
            <div className="form-group">
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <div style={{
                fontSize: '12px',
                color: '#667085',
                marginTop: '6px',
                padding: '8px',
                background: '#F4F6F9',
                borderRadius: '8px'
              }}>
                {role === 'participant' && '👤 Участник: запись на мероприятия, просмотр профиля, достижения'}
                {role === 'parent' && '👨‍👩‍👦 Родитель: управление профилем ребёнка, запись на мероприятия'}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#98A2B3',
                marginTop: '6px',
                padding: '8px',
                background: '#FBF4DC',
                borderRadius: '8px',
                border: '1px solid #E8D9A8'
              }}>
                ℹ️ Остальные роли (координаторы, тьюторы, администраторы) создаются только администратором системы.
              </div>
            </div>
          </div>

          {/* ЛИЧНЫЕ ДАННЫЕ */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
              Личные данные
            </h4>

            <div className="form-group">
              <label className="form-label">ФИО *</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Иванов Иван Иванович"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Дата рождения *</label>
              <input
                type="date"
                className="form-input"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
              {birthDate && (
                <div style={{
                  fontSize: '12px',
                  color: isMinor ? '#C9A227' : '#16845B',
                  marginTop: '4px'
                }}>
                  {isMinor ? '🔞 Несовершеннолетний (требуется согласие родителей)' : '✅ Совершеннолетний'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Телефон</label>
              <input
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (XXX) XXX-XX-XX"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
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
              <label className="form-label">Пароль (мин. 6 символов) *</label>
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
          </div>

          {/* ИНФОРМАЦИЯ ОБ УЧАСТНИКЕ */}
          {role === 'participant' && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                Информация об участнике
              </h4>

              <div className="form-group">
                <label className="form-label">Школа</label>
                <input
                  type="text"
                  className="form-input"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Школа №1"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Класс</label>
                <input
                  type="text"
                  className="form-input"
                  value={classname}
                  onChange={(e) => setClassname(e.target.value)}
                  placeholder="8А"
                />
              </div>

              {/* ВЫБОР КЛУБА */}
              <div className="form-group">
                <label className="form-label">
                  🏫 Клуб юных дипломатов
                  <span style={{ fontSize: '12px', color: '#98A2B3', fontWeight: '400', marginLeft: '8px' }}>
                    (необязательно)
                  </span>
                </label>
                <select
                  className="form-select"
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  disabled={loadingClubs}
                >
                  <option value="">— Выберите клуб —</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
                {selectedClubId && (
                  <div style={{
                    fontSize: '12px',
                    color: '#16845B',
                    marginTop: '4px',
                    padding: '4px 8px',
                    background: '#E8F5EF',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    ✅ Выбран клуб: {clubs.find(c => c.id === selectedClubId)?.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ДЛЯ РОДИТЕЛЯ — ПОИСК РЕБЁНКА */}
          {role === 'parent' && (
            <div style={{ marginBottom: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E7EF' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                👨‍👩‍👦 Привязка ребёнка
              </h4>
              <p style={{ fontSize: '12px', color: '#667085', marginBottom: '12px' }}>
                Найдите своего ребёнка в системе по ФИО
              </p>

              <div className="form-group">
                <label className="form-label">Поиск ребёнка</label>
                <input
                  type="text"
                  className="form-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Введите ФИО ребёнка..."
                />
                {showSearchResults && searchResults.length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    border: '1px solid #E2E7EF',
                    borderRadius: '10px',
                    background: 'white',
                    overflow: 'hidden'
                  }}>
                    {searchResults.map((child) => (
                      <div
                        key={child.id}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #F4F6F9',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        onClick={() => handleSelectChild(child)}
                      >
                        <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                          {child.full_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#667085' }}>
                          {child.school || 'Школа не указана'} • {child.class_name || 'Класс не указан'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.length > 2 && searchResults.length === 0 && !selectedChild && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#667085'
                  }}>
                    Дети не найдены. Возможно, ребёнок ещё не зарегистрирован.
                  </div>
                )}
              </div>

              {selectedChild && (
                <div style={{
                  padding: '12px',
                  background: '#E8F5EF',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px', color: '#16845B' }}>
                      ✅ Выбран: {selectedChild.full_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      {selectedChild.school || 'Школа не указана'} • {selectedChild.class_name || 'Класс не указан'}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#B3262E',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onClick={() => {
                      setSelectedChild(null)
                      setSearchQuery('')
                      setChildFullName('')
                      setChildBirthDate('')
                      setChildSchool('')
                      setChildClass('')
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ДАННЫЕ РОДИТЕЛЯ (если несовершеннолетний) */}
          {isMinor && (
            <div style={{ marginBottom: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E7EF' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                Данные законного представителя
                <span style={{ fontSize: '12px', color: '#667085', fontWeight: '400', marginLeft: '8px' }}>
                  (обязательно для несовершеннолетних)
                </span>
              </h4>

              <div className="form-group">
                <label className="form-label">ФИО законного представителя *</label>
                <input
                  type="text"
                  className="form-input"
                  value={parentFullName}
                  onChange={(e) => setParentFullName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  required={isMinor}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Телефон законного представителя</label>
                <input
                  type="tel"
                  className="form-input"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="+7 (XXX) XXX-XX-XX"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email законного представителя</label>
                <input
                  type="email"
                  className="form-input"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@mail.com"
                />
              </div>
            </div>
          )}

          {/* ЮРИДИЧЕСКИЕ СОГЛАСИЯ */}
          <div style={{
            marginBottom: '16px',
            padding: '16px',
            background: '#F8FAFC',
            borderRadius: '10px',
            border: '1px solid #E2E7EF'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
              Юридические согласия
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                  required
                />
                <span>
                  Я ознакомился(ась) с{' '}
                  <a href="/legal/privacy-policy" target="_blank" style={{ color: '#174A7E' }}>
                    Политикой обработки персональных данных
                  </a>
                  <span style={{ color: '#B3262E', marginLeft: '4px' }}>*</span>
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreePersonalData}
                  onChange={(e) => setAgreePersonalData(e.target.checked)}
                  style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                  required
                />
                <span>
                  Я даю{' '}
                  <a href="/legal/consent-personal-data" target="_blank" style={{ color: '#174A7E' }}>
                    согласие на обработку персональных данных
                  </a>
                  <span style={{ color: '#B3262E', marginLeft: '4px' }}>*</span>
                </span>
              </label>

              {isMinor && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreeMinorData}
                    onChange={(e) => setAgreeMinorData(e.target.checked)}
                    style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>
                    Я даю{' '}
                    <a href="/legal/consent-minor" target="_blank" style={{ color: '#174A7E' }}>
                      согласие на обработку персональных данных несовершеннолетнего
                    </a>
                    <span style={{ color: '#B3262E', marginLeft: '4px' }}>*</span>
                  </span>
                </label>
              )}

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreeImageUse}
                  onChange={(e) => setAgreeImageUse(e.target.checked)}
                  style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>
                  Я даю согласие на использование изображения
                  <span style={{ color: '#98A2B3', fontSize: '12px', marginLeft: '4px' }}>(необязательно)</span>
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreePhotoPublication}
                  onChange={(e) => setAgreePhotoPublication(e.target.checked)}
                  style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>
                  Я даю согласие на публикацию моих фотографий на сайте и в социальных сетях движения
                  <span style={{ color: '#98A2B3', fontSize: '12px', marginLeft: '4px' }}>(необязательно)</span>
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              marginTop: '8px'
            }}
          >
            {loading ? '⏳ Регистрация...' : '✅ Зарегистрироваться'}
          </button>
        </form>

        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#667085'
        }}>
          Уже есть аккаунт?{' '}
          <a href="/login" style={{
            color: '#0B1F3A',
            fontWeight: '600',
            textDecoration: 'none',
            borderBottom: '2px solid #C9A227',
            paddingBottom: '2px'
          }}>
            Войти
          </a>
        </p>

        <div style={{
          marginTop: '20px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #C9A227, transparent)',
          borderRadius: '2px'
        }} />
      </div>
    </div>
  )
}