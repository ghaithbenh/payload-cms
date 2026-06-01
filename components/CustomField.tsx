'use client'

import { useField, FieldLabel } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

import './CustomField.css'

export const CustomField: TextFieldClientComponent = ({ field, path }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({ path })

  const maxLength = 100
  const charCount = (value || '').length
  const charPercent = Math.min((charCount / maxLength) * 100, 100)

  return (
    <div className="custom-field">
      <FieldLabel label={field.label} path={path} required={field.required} />
      <div className="custom-field__input-wrapper">
        <input
          id={`field-${path}`}
          className={`custom-field__input ${showError ? 'custom-field__input--error' : ''}`}
          type="text"
          value={value || ''}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter ${typeof field.label === 'string' ? field.label.toLowerCase() : 'value'}...`}
          maxLength={maxLength}
        />
        <div className="custom-field__progress-track">
          <div
            className="custom-field__progress-bar"
            style={{
              width: `${charPercent}%`,
              backgroundColor:
                charPercent > 80 ? '#ef4444' : charPercent > 50 ? '#f59e0b' : '#22c55e',
            }}
          />
        </div>
        <span className="custom-field__char-count">
          {charCount}/{maxLength}
        </span>
      </div>
      {showError && errorMessage && (
        <p className="custom-field__error">{errorMessage}</p>
      )}
    </div>
  )
}
