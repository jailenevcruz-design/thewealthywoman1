import { useState } from 'react'
import { money, curMonth, todayISO, CATS, guessCategory } from './lib'

const ALL_MONTHS = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12','2027-01']

function SpendSheet({ db, insert, update, remove, onClose, showToast, editing }) {
  const [cat, setCat] = useState(editing?.category || 'Dining')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [place, setPlace] = useState(editing?.place || '')
  const [date, setDate] = useState(editing?.date || todayISO())
  const [linkBill, setLinkBill] = useState(!!editing?.bill_id)
  const [billId, setBillId] = useState(editing?.bill_id || '')
  const [billMonth, setBillMonth] = useState(editing?.bill_month || curMonth())
  const [showMore, setShowMore] = useState(false)
  const allBills = (db.bills || []).filter(b => !b.archived)
  const catMeta = CATS.find(c => c[0] === cat) || CATS[0]

  const save = () => {
    const amt = +amount || 0
    const row = { place, category: cat, emoji: catMeta[1], color: catMeta[2], amount: amt, date, bill_id: linkBill ? billId : null, bill_month: linkBill ? billMonth : null }
    if (editing) update('spend', editing.id, row)
    else insert('spend', row)
    if (linkBill && billId) {
      const b = db.bills.find(x => x.id === billId)
      if (b) { const p = (b.paid_amount || 0) + amt; update('bills', billId, { paid_amount: p, status: p >= b.amount ? 'paid' : 'partial' }) }
    }
    showToast(editing ? 'Updated ✨' : 'Spend logged ✨')
    onClose()
  }

  const del = () => { if (window.confirm('Delete?')) { remove('spend', editing.id); showToast('Deleted'); onClose() } }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, top: '8vh', background: 'var(--bg)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px 8px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 10px' }} />
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{editing ? 'Edit spend' : 'Log a spend 💸'}</div>
          <div style={{ background: 'linear-gradient(135deg,var(--pink-soft),var(--lav))', borderRadius: 14, padding: 10, marginBottom: 8, textAlign: 'center' }}>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="$0.00" inputMode="decimal" autoFocus style={{ fontSize: 28, fontWeight: 800, color: '#5a3f56', background: 'none', border: 'none', textAlign: 'center', width: '100%', outline: 'none' }} />
          </div>
          <input value={place} onChange={e => setPlace(e.target.value)} placeholder="Where? e.g. Whole Foods" style={{ width: '100%', padding: '8px 12px', borderRadius: 11, border: '1.5px solid var(--line)', background: '#fff', fontSize: 13, fontWeight: 600, color: '#3a3340' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 0' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6 }}>Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {CATS.map(([c, e, col]) => (
              <button key={c} onClick={() => setCat(c)} style={{ padding: '5px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700, border: `2px solid ${cat === c ? col : 'transparent'}`, background: cat === c ? col + '22' : '#f4f0f6', color: cat === c ? col : '#7a6a84', cursor: 'pointer' }}>{e} {c}</button>
            ))}
          </div>
          <button onClick={() => setShowMore(v => !v)} style={{ fontSize: 12, fontWeight: 800, color: '#9c3f74', background: 'var(--pink-soft)', border: 'none', padding: '8px 14px', borderRadius: 12, marginBottom: 8, width: '100%', textAlign: 'left' }}>
            {showMore ? '▴ Hide date & bill options' : '▾ Date & bill options'}
          </button>
          {showMore && (
            <div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--ink2)', marginBottom: 4 }}>DATE</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 11, border: '1.5px solid var(--line)', background: '#fff', fontSize: 13 }} />
              </div>
              <div style={{ background: '#fff', border: '1.5px solid #e7f0f8', borderRadius: 12, padding: '10px 13px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>Pays a bill? 🧾</div>
                  <button onClick={() => setLinkBill(v => !v)} style={{ width: 40, height: 24, borderRadius: 12, background: linkBill ? '#5aa0d8' : '#dcd6e0', position: 'relative', border: 'none', flexShrink: 0, cursor: 'pointer' }}>
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
        <div style={{ padding: '8px 16px 24px', flexShrink: 0, borderTop: '1px solid var(--line)' }}>
          <button className="apply" onClick={save}>{editing ? 'Save changes ✨' : 'Add spend ✨'}</button>
          <button className="cancel" onClick={onClose} style={{ marginTop: 6 }}>Cancel</button>
          {editing && <button onClick={del} style={{ width: '100%', marginTop: 6, padding: 9, borderRadius: 12, background: 'none', border: 'none', color: '#c0483f', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>🗑 Delete</button>}
        </div>
      </div>
    </div>
  )
}

function CSVImport({ db, insert, onClose, showToast }) {
  const [rows, setRows] = useState(null)
  const [cats, setCats] = useState({})
  const [fileRef] = useState({ current: null })

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
      parsed.forEach((r, i) => { initCats[i] = r.guessed || 'Dining' })
      setRows(parsed); setCats(initCats)
    }
    reader.readAsText(file)
  }

  const doImport = () => {
    rows.forEach((r, i) => {
      if (cats[i] === '__skip__') return
      const catMeta = CATS.find(c => c[0] === cats[i]) || CATS[0]
      insert('spend', { place: r.merchant, category: cats[i], emoji: catMeta[1], color: catMeta[2], amount: r.amount, date: r.date, bill_id: null })
    })
    showToast(`${rows.filter((_, i) => cats[i] !== '__skip__').length} transactions imported ✨`)
    onClose()
  }

  if (!rows) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 16px 32px' }}>
        <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 12px' }} />
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Import from bank CSV 📥</div>
        <p style={{ fontSize: 11, color: 'var(--ink2)', marginBottom: 14 }}>Download transactions from your bank and upload the CSV.</p>
        <div style={{ border: '2px dashed var(--pink)', borderRadius: 16, padding: 24, textAlign: 'center', background: 'var(--pink-soft)', marginBottom: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#7a2f57', marginBottom: 10 }}>Choose your CSV file</div>
          <input ref={r => fileRef.current = r} type="file" accept=".csv" onChange={parseCSV} style={{ display: 'none' }} />
          <button style={{ padding: '10px 20px', borderRadius: 12, background: 'var(--pink)', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>Choose file</button>
        </div>
        <button className="cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, top: '8vh', background: 'var(--bg)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px 8px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 10px' }} />
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Review import 📥</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, borderRadius: 12, padding: 10, textAlign: 'center', background: 'var(--pink-soft)', color: '#9c3f74' }}><div style={{ fontSize: 15, fontWeight: 800 }}>{rows.length}</div><div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>FOUND</div></div>
            <div style={{ flex: 1, borderRadius: 12, padding: 10, textAlign: 'center', background: 'var(--lav)', color: '#5a52a0' }}><div style={{ fontSize: 15, fontWeight: 800 }}>{money(rows.filter((_,i)=>cats[i]!=='__skip__').reduce((s,r)=>s+r.amount,0))}</div><div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>TOTAL</div></div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 10, marginBottom: 8, opacity: cats[i] === '__skip__' ? .45 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div><div style={{ fontSize: 12, fontWeight: 800 }}>{r.merchant}</div><div style={{ fontSize: 10, color: 'var(--ink2)' }}>{r.date}</div></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: '#c0483f' }}>${r.amount.toFixed(2)}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[...CATS.map(c => c[0]), '__skip__'].map(c => (
                  <button key={c} onClick={() => setCats(prev => ({ ...prev, [i]: c }))} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 10, border: 'none', background: cats[i] === c ? 'var(--lav)' : '#f4f0f6', color: cats[i] === c ? '#5a52a0' : 'var(--ink2)', cursor: 'pointer' }}>
                    {c === '__skip__' ? '⏭ Skip' : CATS.find(x => x[0] === c)?.[1] + ' ' + c}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 16px 24px', flexShrink: 0, borderTop: '1px solid var(--line)' }}>
          <button className="apply" onClick={doImport}>Import {rows.filter((_,i)=>cats[i]!=='__skip__').length} transactions ✨</button>
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

  const allMonths = ALL_MONTHS
  const curM = curMonth()
  const [viewMonth, setViewMonth] = useState(curM)
  const monthIdx = allMonths.indexOf(viewMonth) === -1 ? allMonths.indexOf(curM) : allMonths.indexOf(viewMonth)

  const monthSpend = (db.spend || []).filter(s => s.date?.slice(0, 7) === viewMonth)
  const prevMonth = allMonths[monthIdx - 1]
  const prevSpend = prevMonth ? (db.spend || []).filter(s => s.date?.slice(0, 7) === prevMonth) : []
  const total = monthSpend.reduce((s, x) => s + x.amount, 0)
  const prevTotal = prevSpend.reduce((s, x) => s + x.amount, 0)
  const diff = total - prevTotal
  const isCurrentMonth = viewMonth === curM

  const colorOf = c => catColors[c] || CATS.find(x => x[0] === c)?.[2] || '#c9b8ee'
  const emojiOf = c => CATS.find(x => x[0] === c)?.[1] || '💸'

  // Category totals sorted by amount
  const catTotals = {}
  monthSpend.forEach(s => { catTotals[s.category] = (catTotals[s.category] || 0) + s.amount })
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1])
  const top5 = sortedCats.slice(0, 5)
  const otherCats = sortedCats.slice(5)
  const otherTotal = otherCats.reduce((s, [, v]) => s + v, 0)
  const maxAmt = top5[0]?.[1] || 1
  const displayCats = showAllCats ? sortedCats : [...top5, ...(otherCats.length > 0 ? [['Other', otherTotal]] : [])]

  const days = [...new Set(monthSpend.map(s => s.date))].sort().reverse()

  return (
    <div className="screen">
      <div className="pagetitle">Spending 💸</div>

      {/* Month picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '10px 16px', marginBottom: 12 }}>
        <button onClick={() => setViewMonth(allMonths[Math.max(0, monthIdx-1)])} disabled={monthIdx===0} style={{ fontSize: 20, color: monthIdx===0?'#dcd6e0':'#9c3f74', background: 'none', border: 'none', cursor: monthIdx===0?'default':'pointer', fontWeight: 800 }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{new Date(viewMonth+'-15').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
          <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 2 }}>{monthSpend.length} transactions</div>
        </div>
        <button onClick={() => setViewMonth(allMonths[Math.min(allMonths.length-1, monthIdx+1)])} disabled={monthIdx===allMonths.length-1} style={{ fontSize: 20, color: monthIdx===allMonths.length-1?'#dcd6e0':'#9c3f74', background: 'none', border: 'none', cursor: monthIdx===allMonths.length-1?'default':'pointer', fontWeight: 800 }}>›</button>
      </div>

      {/* Action buttons */}
      {isCurrentMonth && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => { setEditing(null); setSheet(true) }} style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 800, border: 'none', background: 'var(--pink)', color: '#fff', cursor: 'pointer' }}>✨ Log a spend</button>
          <button onClick={() => setCsvOpen(true)} style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 800, border: 'none', background: 'var(--lav)', color: '#5a52a0', cursor: 'pointer' }}>📥 Import CSV</button>
        </div>
      )}

      {/* Summary hero */}
      <div style={{ background: 'linear-gradient(135deg,#fdeef5,#eee7fb)', borderRadius: 18, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#5a3f56', fontFamily: 'var(--mono)' }}>{money(total)}</div>
        <div style={{ fontSize: 11, color: '#9d8fa8', marginTop: 3 }}>spent · {sortedCats.length} categories</div>
        {prevTotal > 0 && (
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, marginTop: 5, padding: '2px 8px', borderRadius: 8, background: diff > 0 ? '#fee2e2' : '#e1f5ee', color: diff > 0 ? '#c0483f' : '#3b8f6a' }}>
            {diff > 0 ? '↑' : '↓'} {money(Math.abs(diff))} vs {new Date(prevMonth+'-15').toLocaleDateString('en-US',{month:'short'})}
          </div>
        )}

        {sortedCats.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#9d8fa8', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 8 }}>Top categories</div>
            {displayCats.map(([cat, amt]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: cat === 'Other' ? '#dcd6e0' : colorOf(cat), flexShrink: 0 }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: '#5a3f56', width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}{cat === 'Other' && otherCats.length > 0 ? ` (${otherCats.length})` : ''}</div>
                <div style={{ flex: 1, height: 7, background: 'rgba(0,0,0,.07)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(amt / (top5[0]?.[1] || 1) * 100)}%`, background: cat === 'Other' ? '#dcd6e0' : colorOf(cat), borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5a3f56', minWidth: 42, textAlign: 'right', fontFamily: 'var(--mono)' }}>{money(amt)}</div>
              </div>
            ))}
            {otherCats.length > 0 && (
              <button onClick={() => setShowAllCats(v => !v)} style={{ fontSize: 11, fontWeight: 700, color: '#9c3f74', background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer' }}>
                {showAllCats ? '▴ Show less' : `▾ See all ${sortedCats.length} categories`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Daily transactions */}
      {monthSpend.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💸</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No spending in {new Date(viewMonth+'-15').toLocaleDateString('en-US',{month:'long'})}</div>
        </div>
      )}
      {days.map(day => {
        const daySpend = monthSpend.filter(s => s.date === day)
        const dayTotal = daySpend.reduce((s, x) => s + x.amount, 0)
        return (
          <div key={day}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, fontWeight: 800, color: '#9d8fa8', margin: '14px 2px 7px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              <span>{day === todayISO() ? 'Today' : new Date(day + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span style={{ fontFamily: 'var(--mono)', color: '#5a3f56', fontWeight: 700 }}>{money(dayTotal)}</span>
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
              {daySpend.map((s, idx) => (
                <button key={s.id} onClick={() => { setEditing(s); setSheet(true) }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'none', border: 'none', borderBottom: idx < daySpend.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: colorOf(s.category) + '22', display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0 }}>{s.emoji || emojiOf(s.category)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#3a3340' }}>{s.place || s.category}</div>
                      <div style={{ fontSize: 10, color: '#9d8fa8', marginTop: 1 }}>{s.category}{s.bill_id && <span style={{ fontSize: 9, fontWeight: 800, color: '#3b8f6a', marginLeft: 5 }}>→ Bill</span>}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#3a3340', fontFamily: 'var(--mono)' }}>{money(s.amount, 2)}</div>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {sheet && <SpendSheet db={db} insert={insert} update={update} remove={remove} showToast={showToast} editing={editing} onClose={() => { setSheet(false); setEditing(null) }} />}
      {csvOpen && <CSVImport db={db} insert={insert} showToast={showToast} onClose={() => setCsvOpen(false)} />}
    </div>
  )
}
