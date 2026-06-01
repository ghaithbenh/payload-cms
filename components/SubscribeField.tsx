'use client'

import { useField, FieldLabel } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

export const SubscribeField: TextFieldClientComponent = ({ field, path }) => {
  const { value, setValue } = useField<string>({ path })
  const done = !!value

  return (
    <div className="field-type text">
      <FieldLabel label={field.label} path={path} required={field.required} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          id={`field-${path}`}
          type="text"
          value={value || ''}
          onChange={(e) => setValue(e.target.value)}
          style={{ flex: 1 }}
        />
        {done && (
          <span
            style={{
              background: '#22c55e',
              color: '#fff',
              padding: '2px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: '22px',
              whiteSpace: 'nowrap',
            }}
          >
            DONE
          </span>
        )}
      </div>
    </div>
  )
}
