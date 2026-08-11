// src/pages/ImportParticipants.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'
import * as XLSX from 'xlsx'

export default function ImportParticipants() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [file, setFile] = useState(null)
  const [previewData, setPreviewData] = useState([])
  const [importedCount, setImportedCount] = useState(0)
  const [errors, setErrors] = useState([])
  const [clubs, setClubs] = useState([])
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

      // Проверка прав — только админ или координатор движения
      if (profileData?.role !== 'admin' && profileData?.role !== 'movement_coordinator') {
        navigate('/dashboard')
        return
      }

      // Загружаем клубы
      const { data: clubsData } = await supabase
        .from('clubs')
        .select('id, name')
        .order('name')
      setClubs(clubsData || [])

    } catch (err) {
      console.error('Ошибка:', err)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setFile(file)
    setErrors([])
    setPreviewData([])
    setMessage('')

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)

        const requiredColumns = ['full_name', 'email']
        const firstRow = jsonData[0] || {}
        const missingColumns = requiredColumns.filter(col => !(col in firstRow))

        if (missingColumns.length > 0) {
          setMessage(`❌ В файле отсутствуют колонки: ${missingColumns.join(', ')}`)
          setMessageType('error')
          return
        }

        const formattedData = jsonData.map((row, index) => ({
          index: index + 1,
          full_name: row.full_name || '',
          email: row.email || '',
          phone: row.phone || '',
          school: row.school || '',
          class_name: row.class_name || '',
          club: row.club || row.club_name || '',
          birth_date: row.birth_date || '',
          role: row.role || 'participant'
        }))

        setPreviewData(formattedData)
        setMessage(`✅ Загружено ${formattedData.length} записей. Проверьте данные и нажмите "Импортировать".`)
        setMessageType('success')
      } catch (err) {
        setMessage('❌ Ошибка чтения файла: ' + err.message)
        setMessageType('error')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (previewData.length === 0) {
      setMessage('❌ Нет данных для импорта')
      setMessageType('error')
      return
    }

    if (!confirm(`Импортировать ${previewData.length} участников?`)) return

    setLoading(true)
    setMessage('')
    setErrors([])
    let successCount = 0
    const errorList = []

    const clubsMap = {}
    clubs.forEach(c => {
      clubsMap[c.name.toLowerCase()] = c.id
    })

    for (const row of previewData) {
      try {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', row.email)
          .maybeSingle()

        if (existingUser) {
          errorList.push(`⚠️ ${row.full_name} (${row.email}) — уже существует`)
          continue
        }

        const tempPassword = Math.random().toString(36).slice(-8) + '!'

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: row.email,
          password: tempPassword,
          options: {
            data: {
              full_name: row.full_name,
              role: row.role || 'participant',
              birth_date: row.birth_date || null,
              phone: row.phone || '',
              school: row.school || '',
              class_name: row.class_name || ''
            }
          }
        })

        if (authError) {
          errorList.push(`❌ ${row.full_name} (${row.email}) — ${authError.message}`)
          continue
        }

        if (authData.user) {
          // ============================================================
          // СОЗДАНИЕ ПРОФИЛЯ СО СТАТУСОМ 'approved'
          // ============================================================
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                full_name: row.full_name,
                email: row.email,
                role: row.role || 'participant',
                birth_date: row.birth_date || null,
                phone: row.phone || '',
                school: row.school || '',
                class_name: row.class_name || '',
                registration_status: 'approved'  // ← СРАЗУ ОДОБРЕН
              }
            ])

          if (profileError) {
            errorList.push(`❌ ${row.full_name} (${row.email}) — ${profileError.message}`)
            continue
          }

          // Привязываем к клубу
          let clubId = null
          if (row.club) {
            const clubName = row.club.toLowerCase()
            if (clubsMap[clubName]) {
              clubId = clubsMap[clubName]
            } else {
              const foundClub = clubs.find(c => 
                c.name.toLowerCase().includes(clubName) || 
                clubName.includes(c.name.toLowerCase())
              )
              if (foundClub) {
                clubId = foundClub.id
              }
            }
          }

          if (clubId) {
            await supabase
              .from('club_participants')
              .insert([
                {
                  profile_id: authData.user.id,
                  club_id: clubId,
                  status: 'active'
                }
              ])
          }

          successCount++
        }
      } catch (err) {
        errorList.push(`❌ ${row.full_name} (${row.email}) — ${err.message}`)
      }
    }

    setImportedCount(successCount)
    setErrors(errorList)

    if (errorList.length === 0) {
      setMessage(`✅ Успешно импортировано ${successCount} участников!`)
      setMessageType('success')
    } else {
      setMessage(`⚠️ Импортировано: ${successCount}, Ошибок: ${errorList.length}`)
      setMessageType('error')
    }

    setLoading(false)
  }

  const downloadTemplate = () => {
    const template = [
      {
        full_name: 'Иванов Иван Иванович',
        email: 'ivan@example.com',
        phone: '+7 (999) 123-45-67',
        school: 'Школа №1',
        class_name: '8А',
        club: 'КЮД Москва (1468)',
        birth_date: '2010-01-15',
        role: 'participant'
      },
      {
        full_name: 'Петрова Мария Сергеевна',
        email: 'maria@example.com',
        phone: '+7 (999) 234-56-78',
        school: 'Гимназия №2',
        class_name: '9Б',
        club: 'КЮД Москва (1529)',
        birth_date: '2009-05-20',
        role: 'participant'
      }
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(template)
    XLSX.utils.book_append_sheet(wb, ws, 'Участники')
    
    ws['!cols'] = [
      { wch: 30 },
      { wch: 30 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 }
    ]

    XLSX.writeFile(wb, 'Шаблон_импорта_участников.xlsx')
  }

  if (!profile) return null

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
            📥 Импорт участников
          </h1>
          <p style={{ color: '#667085', fontSize: '16px' }}>
            Загрузите Excel-файл с данными участников для массового добавления
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px',
            fontWeight: '500',
            whiteSpace: 'pre-line'
          }}>
            {message}
          </div>
        )}

        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            📋 Шаг 1: Скачайте шаблон
          </h3>
          <p style={{ color: '#667085', marginBottom: '12px' }}>
            Скачайте шаблон Excel-файла с правильной структурой колонок
          </p>
          <button
            className="btn btn-primary"
            onClick={downloadTemplate}
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
            📥 Скачать шаблон
          </button>
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            📤 Шаг 2: Загрузите файл
          </h3>
          <p style={{ color: '#667085', marginBottom: '12px' }}>
            Загрузите заполненный Excel-файл (.xlsx или .xls)
          </p>
          <div style={{
            border: '2px dashed #D5DCE7',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            background: '#F8FAFC',
            transition: 'all 0.2s'
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.currentTarget.style.borderColor = '#C9A227'
            e.currentTarget.style.background = '#FBF4DC'
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = '#D5DCE7'
            e.currentTarget.style.background = '#F8FAFC'
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.style.borderColor = '#D5DCE7'
            e.currentTarget.style.background = '#F8FAFC'
            const file = e.dataTransfer.files[0]
            if (file) {
              const input = document.getElementById('fileInput')
              const dt = new DataTransfer()
              dt.items.add(file)
              input.files = dt.files
              handleFileUpload({ target: input })
            }
          }}
          >
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>📂</div>
            <p style={{ color: '#667085', marginBottom: '8px' }}>
              Перетащите файл сюда или нажмите для выбора
            </p>
            <input
              id="fileInput"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{
                display: 'none'
              }}
            />
            <button
              className="btn btn-secondary"
              onClick={() => document.getElementById('fileInput').click()}
              style={{
                padding: '8px 24px',
                background: 'transparent',
                border: '1.5px solid #D5DCE7',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Выбрать файл
            </button>
            {file && (
              <div style={{ marginTop: '12px', color: '#16845B' }}>
                ✅ Файл выбран: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
              </div>
            )}
          </div>
        </div>

        {previewData.length > 0 && (
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                📊 Шаг 3: Проверка данных
              </h3>
              <span style={{ fontSize: '14px', color: '#667085' }}>
                {previewData.length} записей
              </span>
            </div>

            <div style={{ overflow: 'auto', maxHeight: '300px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F4F6F9' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>ФИО</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Школа</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Класс</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Клуб</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 20).map((row) => (
                    <tr key={row.index} style={{ borderBottom: '1px solid #F4F6F9' }}>
                      <td style={{ padding: '8px 12px' }}>{row.index}</td>
                      <td style={{ padding: '8px 12px' }}>{row.full_name}</td>
                      <td style={{ padding: '8px 12px' }}>{row.email}</td>
                      <td style={{ padding: '8px 12px' }}>{row.school}</td>
                      <td style={{ padding: '8px 12px' }}>{row.class_name}</td>
                      <td style={{ padding: '8px 12px' }}>{row.club || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 20 && (
                <div style={{ padding: '8px', textAlign: 'center', color: '#98A2B3' }}>
                  ... и еще {previewData.length - 20} записей
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-success"
                onClick={handleImport}
                disabled={loading}
                style={{
                  padding: '10px 32px',
                  background: '#16845B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {loading ? '⏳ Импорт...' : '✅ Импортировать всех'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setPreviewData([])
                  setFile(null)
                  document.getElementById('fileInput').value = ''
                  setMessage('')
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
                ❌ Очистить
              </button>
            </div>

            {errors.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#FCEBEC', borderRadius: '8px' }}>
                <div style={{ fontWeight: '600', color: '#B3262E', marginBottom: '8px' }}>
                  ⚠️ Ошибки при импорте:
                </div>
                {errors.map((err, idx) => (
                  <div key={idx} style={{ fontSize: '13px', color: '#667085', padding: '2px 0' }}>
                    {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}