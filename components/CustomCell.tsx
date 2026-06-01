'use client'

import type { DefaultCellComponentProps } from 'payload'

export const CustomCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  const value = cellData as string || ''
  const maxLength = 100
  const charPercent = Math.min((value.length / maxLength) * 100, 100)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value || '—'}
      </span>
      <div
        style={{
          width: '40px',
          height: '4px',
          borderRadius: '2px',
          background: '#333',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${charPercent}%`,
            height: '100%',
            borderRadius: '2px',
            background:
              charPercent > 80 ? '#ef4444' : charPercent > 50 ? '#f59e0b' : '#22c55e',
            transition: 'width 0.2s',
          }}
        />
      </div>
    </div>
  )
}
