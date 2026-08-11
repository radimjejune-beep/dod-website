// src/components/ConsentCheckboxes.jsx
import { useState } from 'react'

export default function ConsentCheckboxes({ onChange, errors }) {
  const [consents, setConsents] = useState({
    personalData: false,
    minorPersonalData: false,
    imageUse: false,
    photoPublication: false,
    hasReadPrivacy: false
  })

  const handleChange = (key, value) => {
    const newConsents = { ...consents, [key]: value }
    setConsents(newConsents)
    if (onChange) {
      onChange(newConsents)
    }
  }

  const allRequired = consents.personalData && consents.hasReadPrivacy

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        padding: '16px',
        background: '#F8FAFC',
        borderRadius: '10px',
        border: '1px solid #E2E7EF',
        marginBottom: '12px'
      }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
          Юридические согласия
        </h4>
        <p style={{ fontSize: '12px', color: '#667085', marginBottom: '12px' }}>
          Для регистрации на платформе необходимо ознакомиться и дать согласие:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consents.hasReadPrivacy}
              onChange={(e) => handleChange('hasReadPrivacy', e.target.checked)}
              style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>
              Я ознакомился(ась) с{' '}
              <a href="/legal/privacy-policy" target="_blank" style={{ color: '#174A7E' }}>
                Политикой обработки персональных данных
              </a>
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consents.personalData}
              onChange={(e) => handleChange('personalData', e.target.checked)}
              style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>
              Я даю{' '}
              <a href="/legal/consent-personal-data" target="_blank" style={{ color: '#174A7E' }}>
                согласие на обработку персональных данных
              </a>
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consents.imageUse}
              onChange={(e) => handleChange('imageUse', e.target.checked)}
              style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>
              Я даю{' '}
              <a href="/legal/consent-image" target="_blank" style={{ color: '#174A7E' }}>
                согласие на использование изображения
              </a>
              <span style={{ color: '#98A2B3', fontSize: '12px' }}> (необязательно)</span>
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consents.photoPublication}
              onChange={(e) => handleChange('photoPublication', e.target.checked)}
              style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>
              Я даю согласие на публикацию моих фотографий на сайте и в социальных сетях движения
              <span style={{ color: '#98A2B3', fontSize: '12px' }}> (необязательно)</span>
            </span>
          </label>
        </div>

        {errors && !allRequired && (
          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: '#FCEBEC',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#B3262E'
          }}>
            Для регистрации необходимо ознакомиться с Политикой и дать согласие на обработку персональных данных
          </div>
        )}
      </div>

      <div style={{
        fontSize: '11px',
        color: '#98A2B3',
        textAlign: 'center'
      }}>
        Все согласия можно отозвать в личном кабинете в разделе «Согласия»
      </div>
    </div>
  )
}