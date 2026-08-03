import { useState } from 'react'
import { CATS } from './lib'

const SWATCHES = [
  '#4CAF50','#66BB6A','#81C784','#FF7043','#FF8A65','#FFA726',
  '#FFB74D','#42A5F5','#64B5F6','#26A69A','#4DB6AC','#7E57C2',
  '#9575CD','#EC407A','#F06292','#EF5350','#EF9A9A','#AB47BC',
  '#CE93D8','#FF8A65','#FFAB91','#29B6F6','#4FC3F7','#5C6BC0',
  '#7986CB','#E53935','#EF5350','#8D6E63','#A1887F','#EF9FC9',
  '#C9B8EE','#9EC9EF','#D7E6A3','#F6B26B','#5BBD8E','#FFD54F',
]

export default function Settings({ catColors, setCatColors, onClose }) {
  const [editing, setEditing] = useState(null)

  const allCats = CATS.map(([name, emoji]) => ({
    name, emoji, color: catColors[name] || CATS.find(c => c[0] === name)?.[2] || '#c9b8ee'
  }))

  const pickColor = (name, color) => {
    setCatColors(prev => ({ ...prev, [name]: color }))
    setEditing(null)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '52px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Settings ⚙️</div>
        <button onClick={onClose} style={{ fontSize: 13, fontWeight: 700, color: '#9c3f74', background: 'var(--pink-soft)', border: 'none', padding: '6px 14px', borderRadius: 20 }}>Done</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--pink)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Category Colors</div>
        <p style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 16, lineHeight: 1.5 }}>Tap any category to change its color. Changes apply to your donut chart and chips immediately.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {allCats.map(({ name, emoji, color }) => (
            <div key={name}>
              <button onClick={() => setEditing(editing === name ? null : name)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', border: '1px solid var(--line)', borderRadius: editing === name ? '14px 14px 0 0' : 14, cursor: 'pointer' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{emoji} {name}</div>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink2)' }}>{editing === name ? '▴' : '▾'}</div>
              </button>
              {editing === name && (
                <div style={{ background: '#f8f4fb', border: '1px solid var(--line)', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: 12, marginBottom: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink2)', marginBottom: 8 }}>PICK A COLOR</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SWATCHES.map(s => (
                      <button key={s} onClick={() => pickColor(name, s)} style={{ width: 32, height: 32, borderRadius: '50%', background: s, border: color === s ? '3px solid #3a3340' : '3px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, background: 'var(--lav)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#5a52a0', marginBottom: 4 }}>💡 Tip</div>
          <div style={{ fontSize: 11, color: '#6a5a9a', lineHeight: 1.5 }}>Pick colors that are distinct from each other so your donut chart is easy to read at a glance.</div>
        </div>
      </div>
    </div>
  )
}
