import { useState, useRef } from 'react'
import { money, curMonth, todayISO, CATS, guessCategory } from './lib'

const SWATCHES = ['#ef9fc9','#c9b8ee','#9ec9ef','#8bb23a','#f6b26b','#5bbd8e','#e88f8f','#c48fd0','#7bafe0','#f0997b','#d4a017','#3a9e8f','#9b6dbd','#d45c8a','#4aa8c8']
const EMOJIS = ['✨','🌸','💫','🌿','🎀','🌙','💕','🔥','🍓','🌈','💎','🦋','🌺','🍰','🎵']

function CustomCatBuilder({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✨')
  const [color, setColor] = useState('#ef9fc9')
  return (
    <div style={{ width: '100%', background: '#fff', border: '1.5px solid var(--line)', borderRadius: 14, padding: 10, marginTop: 4 }}>
      <input style={{ width: '100%', padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 13, fontWeight: 600, marginBottom: 8 }} placeholder="Category name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--ink2)', marginBottom: 5 }}>EMOJI</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} style={{ width: 28, height: 28, borderRadius: 8, border: emoji === e ? '2px solid var(--pink)' : '2px solid transparent', background: emoji === e ? 'var(--pink-soft)' : '#f4f0f6', fontSize: 14, cursor: 'pointer' }}>{e}</button>)}
      </div>
      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--ink2)', marginBottom: 5 }}>COLOR</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {SWATCHES.map(c => <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '3px solid #3a3340' : '3px solid transparent', cursor: 'pointer' }} />)}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => { if (name) onAdd(name, emoji, color) }} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'var(--matcha)', color: '#4e6327', fontWeight: 800, fontSize: 11, border: 'none' }}>{emoji} Add</button>
        <button onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 10, background: '#f4f0f6', color: 'var(--ink2)', fontWeight: 700, fontSize: 11, border: 'none' }}>Cancel</button>
      </div>
    </div>
  )
}

function SpendSheet({ db, insert, update, remove, onClose, showToast, editing }) {
  const [cat, setCat] = useState(editing?.category || 'Dining')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [place, setPlace] = useState(editing?.place || '')
  const [date, setDate] = useState(editing?.date || todayISO())
  const [linkBill, setLinkBill] = useState(!!editing?.bill_id)
  const [billId, setBillId] = useState(editing?.bill_id || '')
  const [billMonth, setBillMonth] = useState(editing?.bill_month || curMonth())
  const [showMore, setShowMore] = useState(false)
  const [addingCat, setAddingCat] = useState(false)
  const [customCats, setCustomCats] = useState([])
  const allCats = [...CATS, ...customCats.map(c => [c.name, c.emoji, c.color, 'c-custom'])]
  const catMeta = allCats.find(c => c[0] === cat) || CATS[0]
  const allBills = db.bills.filter(b => !b.archived)

  const save = () => {
    const amt = +amount || 0
    const row = { place, category: cat, emoji: catMeta[1], color: catMeta[2], amount: amt, date, bill_id: linkBill ? billId : null, bill_month: linkBill ? billMonth : null }
    if (editing) update('spend', editing.id, row)
    else insert('spend', row)
    if (linkBill && billId) {
      const b = db.bills.find(x => x.id === billId)
      if (b) { const p = (b.paid_amount || 0) + amt; update('bills', billId, { paid_amount: p, status: p >= b.amount ? 'paid' : 'partial' }) }
    }
    showToast(editing ? 'Updated' : 'Spend added')
    onClose()
  }

  const del = () => { if (window.confirm('Delete?')) { remove('spend', editing.id); showToast('Deleted'); onClose() } }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 80, left: 0, right: 0, top: '8vh', background: 'var(--bg)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        {/* Fixed header */}
        <div style={{ padding: '12px 14px 8px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 10px' }} />
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{editing ? 'Edit spend' : 'Log a spend 💸'}</div>
          <div style={{ background: 'linear-gradient(135deg,var(--pink-soft),var(--lav))', borderRadius: 14, padding: '10px', marginBottom: 8, textAlign: 'center' }}>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="$0.00" inputMode="decimal" autoFocus style={{ fontSize: 28, fontWeight: 800, color: '#5a3f56', background: 'none', border: 'none', textAlign: 'center', width: '100%', outline: 'none' }} />
          </div>
          <input value={place} onChange={e => setPlace(e.target.value)} placeholder="Where? e.g. Whole Foods" style={{ width: '100%', padding: '7px 11px', borderRadius: 11, border: '1.5px solid var(--line)', background: '#fff', fontSize: 13, fontWeight: 600, color: '#3a3340' }} />
        </div>

        {/* Scrollable middle */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 0' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 5 }}>Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {allCats.map(([c, e, col]) => (
              <button key={c} onClick={() => setCat(c)} style={{
                padding: '5px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                border: `2px solid ${cat === c ? col : 'transparent'}`,
                background: cat === c ? col + '22' : '#f4f0f6',
                color: cat === c ? col : '#7a6a84', cursor: 'pointer'
              }}>{e} {c}</button>
            ))}
            {addingCat
              ? <CustomCatBuilder onAdd={(name, emoji, color) => { setCustomCats(p => [...p, { name, emoji, color }]); setCat(name); setAddingCat(false) }} onCancel={() => setAddingCat(false)} />
              : <button onClick={() => setAddingCat(true)} style={{ padding: '5px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700, border: '1.5px dashed var(--pink)', background: '#fff', color: '#9c3f74', cursor: 'pointer' }}>+ custom</button>
            }
          </div>

          <button onClick={() => setShowMore(v => !v)} style={{ fontSize: 12, fontWeight: 800, color: '#9c3f74', background: 'var(--pink-soft)', border: 'none', padding: '8px 14px', borderRadius: 12, marginBottom: 8, width: '100%', textAlign: 'left' }}>
            {showMore ? '▴ Hide date & bill options' : '▾ Date & bill options'}
          </button>

          {showMore && (
            <div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--ink2)', marginBottom: 4 }}>DATE</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '7px 11px', borderRadius: 11, border: '1.5px solid var(--line)', background: '#fff', fontSize: 13 }} />
              </div>
              <div style={{ background: '#fff', border: '1.5px solid #e7f0f8', borderRadius: 12, padding: '9px 12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>Pays a bill? 🧾</div>
                  <button onClick={() => setLinkBill(v => !v)} style={{ width: 40, height: 24, borderRadius: 12, background: linkBill ? '#5aa0d8' : '#dcd6e0', position: 'relative', border: 'none', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, [linkBill ? 'right' : 'left']: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
                  </button>
                </div>
                {linkBill && (
                  <div style={{ marginTop: 8 }}>
                    <select value={billId} onChange={e => setBillId(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 10, border: '1.5px solid #dce8f4', background: '#f4f9fd', fontSize: 13, marginBottom: 6 }}>
                      <option value="">Pick a bill…</option>
                      {allBills.map(b => <option key={b.id} value={b.id}>{b.name} — {b.status === 'paid' ? '✅ paid' : money(b.amount - (b.paid_amount || 0)) + ' left'}</option>)}
                    </select>
                    <input type="month" value={billMonth} onChange={e => setBillMonth(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 10, border: '1.5px solid #dce8f4', background: '#f4f9fd', fontSize: 13 }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pinned buttons */}
        <div style={{ padding: '8px 14px 16px', flexShrink: 0, borderTop: '1px solid var(--line)' }}>
          <button className="apply" onClick={save}>{editing ? 'Save changes ✨' : 'Add spend ✨'}</button>
          <button className="cancel" onClick={onClose} style={{ marginTop: 6 }}>Cancel</button>
          {editing && <button onClick={del} style={{ width: '100%', marginTop: 6, padding: 9, borderRadius: 12, background: 'none', border: 'none', color: '#c0483f', fontWeight: 700, fontSize: 12 }}>🗑 Delete</button>}
        </div>
      </div>
    </div>
  )
}

function CSVImport({ db, insert, onClose, showToast }) {
  const [rows, setRows] = useState(null)
  const [cats, setCats] = useState({})
  const fileRef = useRef()

  const parseCSV = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = ev.target.result.split('\n').filter(l => l.trim())
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
      const dateIdx = headers.findIndex(h => h.includes('date'))
      const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('merchant') || h.includes('name') || h.includes('memo'))
      const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('debit'))
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
        const amt = Math.abs(parseFloat(cols[amtIdx] || '0'))
        if (!amt) return null
        const merchant = cols[descIdx] || 'Unknown'
        return { date: cols[dateIdx] || todayISO(), merchant, amount: amt, guessed: guessCategory(merchant) }
      }).filter(Boolean)
      const initCats = {}
      parsed.forEach((r, i) => { initCats[i] = r.guessed || '__unrecognized__' })
      setRows(parsed); setCats(initCats)
    }
    reader.readAsText(file)
  }

  const doImport = () => {
    rows.forEach((r, i) => {
      const cat = cats[i]; if (cat === '__skip__') return
      const needsCat = cat === '__unrecognized__'
      const catMeta = CATS.find(c => c[0] === cat)
      insert('spend', { place: r.merchant, category: needsCat ? 'Needs category' : cat, emoji: needsCat ? '❓' : (catMeta?.[1] || '💸'), color: needsCat ? '#dcd6e0' : (catMeta?.[2] || '#c9b8ee'), amount: r.amount, date: r.date, bill_id: null, needs_category: needsCat })
    })
    showToast(`${rows.filter((_, i) => cats[i] !== '__skip__').length} imported ✨`)
    onClose()
  }

  if (!rows) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 14px 32px' }}>
        <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 12px' }} />
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Import from bank CSV 📥</div>
        <p style={{ fontSize: 11, color: 'var(--ink2)', marginBottom: 14 }}>Download transactions from your bank and upload the CSV file.</p>
        <div style={{ border: '2px dashed var(--pink)', borderRadius: 16, padding: 24, textAlign: 'center', background: 'var(--pink-soft)', marginBottom: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#7a2f57', marginBottom: 10 }}>Choose your CSV file</div>
          <input ref={fileRef} type="file" accept=".csv" onChange={parseCSV} style={{ display: 'none' }} />
          <button style={{ padding: '10px 20px', borderRadius: 12, background: 'var(--pink)', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none' }} onClick={() => fileRef.current.click()}>Choose file</button>
        </div>
        <button className="cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )

  const total = rows.filter((_, i) => cats[i] !== '__skip__').reduce((s, r) => s + r.amount, 0)
  const matched = rows.filter((_, i) => cats[i] !== '__unrecognized__' && cats[i] !== '__skip__').length
  const unrecognized = rows.filter((_, i) => cats[i] === '__unrecognized__').length

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 80, left: 0, right: 0, top: '8vh', background: 'var(--bg)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 14px 8px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 10px' }} />
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Review import 📥</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, borderRadius: 12, padding: 10, textAlign: 'center', background: 'var(--pink-soft)', color: '#9c3f74' }}><div style={{ fontSize: 15, fontWeight: 800 }}>{rows.length}</div><div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>FOUND</div></div>
            <div style={{ flex: 1, borderRadius: 12, padding: 10, textAlign: 'center', background: 'var(--lav)', color: '#5a52a0' }}><div style={{ fontSize: 15, fontWeight: 800 }}>{money(total)}</div><div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>TOTAL</div></div>
            <div style={{ flex: 1, borderRadius: 12, padding: 10, textAlign: 'center', background: '#e7f2c7', color: '#51691f' }}><div style={{ fontSize: 15, fontWeight: 800 }}>{matched}/{rows.length}</div><div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>MATCHED</div></div>
          </div>
          {unrecognized > 0 && <div style={{ background: '#fff6ea', border: '1px solid #f5e2c4', borderRadius: 10, padding: '8px 11px', fontSize: 11, color: '#9a6a1a', fontWeight: 600 }}>💛 {unrecognized} will import as "Needs category"</div>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 10, marginBottom: 8, opacity: cats[i] === '__skip__' ? .45 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div><div style={{ fontSize: 12, fontWeight: 800 }}>{r.merchant}</div><div style={{ fontSize: 10, color: 'var(--ink2)' }}>{r.date}</div></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: '#c0483f' }}>${r.amount.toFixed(2)}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[...CATS.map(c => c[0]), '__skip__'].map(c => (
                  <button key={c} onClick={() => setCats(prev => ({ ...prev, [i]: c }))}
                    style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 10, border: 'none', background: cats[i] === c ? 'var(--lav)' : '#f4f0f6', color: cats[i] === c ? '#5a52a0' : 'var(--ink2)' }}>
                    {c === '__skip__' ? '⏭ Skip' : CATS.find(x => x[0] === c)?.[1] + ' ' + c || c}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 14px 16px', flexShrink: 0, borderTop: '1px solid var(--line)' }}>
          <button className="apply" onClick={doImport}>Import {rows.filter((_, i) => cats[i] !== '__skip__').length} transactions ✨</button>
          <button className="cancel" onClick={onClose} style={{ marginTop: 6 }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function Spend({ db, insert, update, remove, showToast, catColors = {} }) {
  const [sheet, setSheet] = useState(false)
  const [editing, setEditing] = useState(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const [showAllCats, setShowAllCats] = useState(false)

  const m = curMonth()
  const monthSpend = db.spend.filter(s => s.date.slice(0, 7) === m)
  const total = monthSpend.reduce((s, x) => s + x.amount, 0)

  // category totals
  const catTotals = {}
  monthSpend.forEach(s => { catTotals[s.category] = (catTotals[s.category] || 0) + s.amount })
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1])
  const topCats = showAllCats ? sortedCats : sortedCats.slice(0, 5)
  const maxCat = sortedCats[0]?.[1] || 1

  const colorOf = c => catColors[c] || (CATS.find(x => x[0] === c)?.[2]) || '#c9b8ee'
  const emojiOf = c => { const found = CATS.find(x => x[0] === c); return found ? found[1] : '💸' }

  const days = [...new Set(monthSpend.map(s => s.date))].sort().reverse()

  return (
    <div className="screen">
      <div className="pagetitle">Spending 💸 {Object.keys(catColors).length > 0 ? `(${Object.keys(catColors).length} custom)` : ""}</div>
      <p className="pagesub">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

      {/* Small action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => { setEditing(null); setSheet(true) }} style={{ flex: 1, padding: '9px 12px', borderRadius: 12, fontSize: 13, fontWeight: 800, border: 'none', background: 'var(--pink)', color: '#fff', cursor: 'pointer' }}>✨ Log a spend</button>
        <button onClick={() => setCsvOpen(true)} style={{ flex: 1, padding: '9px 12px', borderRadius: 12, fontSize: 13, fontWeight: 800, border: 'none', background: 'var(--lav)', color: '#5a52a0', cursor: 'pointer' }}>📥 Import CSV</button>
      </div>

      {/* Month summary with bar chart */}
      <div style={{ background: 'linear-gradient(135deg,#fdeef5,#eee7fb)', borderRadius: 18, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#5a3f56', marginBottom: 2 }}>{money(total)}</div>
        <div style={{ fontSize: 11, color: '#9d8fa8', marginBottom: 14 }}>spent this month · {sortedCats.length} categories</div>
        {topCats.map(([cat, amt]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colorOf(cat), flexShrink: 0 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: '#5a3f56', width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</div>
            <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(amt / maxCat * 100)}%`, background: colorOf(cat), borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5a3f56', minWidth: 40, textAlign: 'right' }}>{money(amt)}</div>
          </div>
        ))}
        {sortedCats.length > 5 && (
          <button onClick={() => setShowAllCats(v => !v)} style={{ fontSize: 11, fontWeight: 700, color: '#9c3f74', background: 'none', border: 'none', padding: '4px 0', marginTop: 4, cursor: 'pointer' }}>
            {showAllCats ? '▴ Show less' : `▾ + ${sortedCats.length - 5} more categories`}
          </button>
        )}
      </div>

      {/* Daily entries */}
      {days.map(day => (
        <div key={day}>
          <div className="daylabel">{day === todayISO() ? 'Today' : new Date(day + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <div className="card">
            {monthSpend.filter(s => s.date === day).map(s => (
              <button key={s.id} onClick={() => { setEditing(s); setSheet(true) }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: s.needs_category ? '#fff6ea' : 'none', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: colorOf(s.category) + '22', display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0 }}>{s.emoji || emojiOf(s.category)}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#3a3340' }}>{s.place || s.category}</div>
                    <div style={{ fontSize: 10, color: '#9d8fa8', marginTop: 1 }}>
                      {s.category}
                      {s.needs_category && <span style={{ fontSize: 9, fontWeight: 800, color: '#9a6a1a', background: '#fff6ea', padding: '1px 6px', borderRadius: 8, marginLeft: 5 }}>needs category</span>}
                      {s.bill_id && <span style={{ fontSize: 9, fontWeight: 800, color: '#3b8f6a', marginLeft: 5 }}>→ Bill</span>}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3a3340', fontFamily: 'var(--mono)' }}>{money(s.amount, 2)}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {monthSpend.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💸</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No spending logged yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Tap "Log a spend" to get started</div>
        </div>
      )}

      {sheet && <SpendSheet db={db} insert={insert} update={update} remove={remove} showToast={showToast} editing={editing} onClose={() => { setSheet(false); setEditing(null) }} />}
      {csvOpen && <CSVImport db={db} insert={insert} showToast={showToast} onClose={() => setCsvOpen(false)} />}
    </div>
  )
}
