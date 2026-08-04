import { useState } from 'react'
import { money, curMonth } from './lib'

const PAY_SCHEDULE = {
  '2026-07': [3,10,17,24,31],
  '2026-08': [7,14,21,28],
  '2026-09': [4,11,18,25],
  '2026-10': [2,9,16,23,30],
  '2026-11': [6,13,20,27],
  '2026-12': [4,11,18,25],
  '2027-01': [1,8,15,22,29],
}

function getCheckLabel(bill, billSlots, month) {
  const days = PAY_SCHEDULE[month] || []
  const totalSlots = days.length
  if (!totalSlots) return null
  const monthSlot = billSlots.find(s => s.bill_id === bill.id && s.month === month)
  let slot
  if (monthSlot?.check_slot !== null && monthSlot?.check_slot !== undefined) {
    slot = monthSlot.check_slot
  } else if (monthSlot?.split_slots) {
    try { slot = JSON.parse(monthSlot.split_slots)[0] } catch(e) {}
  } else if (bill.due_day) {
    slot = Math.min(totalSlots - 1, Math.floor((bill.due_day - 1) / (31 / totalSlots)))
  } else return null
  const day = days[slot]
  if (!day) return null
  const date = new Date(`${month}-${String(day).padStart(2,'0')}T00:00`)
  return `Check ${slot+1} · ${date.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`
}

function PayForm({ bill, monthAmt, onSave, onClose }) {
  const [amt, setAmt] = useState(String(+(monthAmt - (bill.paid_amount || 0)).toFixed(2)))
  const [billMonth, setBillMonth] = useState(curMonth())
  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,var(--pink-soft),var(--lav))', borderRadius: 14, padding: 12, marginBottom: 12, textAlign: 'center' }}>
        <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="$0.00" inputMode="decimal" autoFocus style={{ fontSize: 32, fontWeight: 800, color: '#5a3f56', background: 'none', border: 'none', textAlign: 'center', width: '100%', outline: 'none' }} />
      </div>
      <div className="field">
        <label>Which month is this for?</label>
        <input type="month" value={billMonth} onChange={e => setBillMonth(e.target.value)} />
        <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 4 }}>Change if catching up on a late payment</div>
      </div>
      <button className="apply" onClick={() => { if (+amt > 0) onSave(+amt, billMonth) }}>Apply payment ✨</button>
      <button className="cancel" onClick={onClose} style={{ marginTop: 8 }}>Cancel</button>
    </div>
  )
}

export default function Bills({ db, update, insert, remove, showToast }) {
  const allMonths = ['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12','2027-01']
  const curM = curMonth()
  const [viewMonth, setViewMonth] = useState(curM)
  const monthIdx = allMonths.indexOf(viewMonth) === -1 ? allMonths.length - 1 : allMonths.indexOf(viewMonth)
  const isCurrentMonth = viewMonth === curM

  const [expanded, setExpanded] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [paySheet, setPaySheet] = useState(null)
  const [historyBill, setHistoryBill] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [noteSheet, setNoteSheet] = useState(null)
  const [noteText, setNoteText] = useState('')

  const billSlots = db.bill_slots || []
  const getMonthAmt = (bill) => {
    const slot = billSlots.find(s => s.bill_id === bill.id && s.month === viewMonth)
    return slot?.amount_override || bill.amount
  }

  const getBillNote = (bill) => {
    const slot = billSlots.find(s => s.bill_id === bill.id && s.month === viewMonth)
    return slot?.note || ''
  }

  const saveBillNote = (bill, note) => {
    const existing = billSlots.find(s => s.bill_id === bill.id && s.month === viewMonth)
    if (existing) { update('bill_slots', existing.id, { note }) }
    else { insert('bill_slots', { bill_id: bill.id, month: viewMonth, note }) }
    showToast('Note saved ✨')
    setNoteSheet(null)
  }

  const getBillStatus = (bill) => {
    if (isCurrentMonth) return { isPaid: bill.status === 'paid', isPartial: bill.status === 'partial', paidAmt: bill.paid_amount || 0 }
    const payments = (db.spend || []).filter(s => s.bill_id === bill.id && (s.bill_month === viewMonth || s.date?.slice(0,7) === viewMonth))
    const paidAmt = payments.reduce((s, p) => s + p.amount, 0)
    const mAmt = getMonthAmt(bill)
    return { isPaid: paidAmt >= mAmt, isPartial: paidAmt > 0 && paidAmt < mAmt, paidAmt }
  }

  const active = (db.bills || []).filter(b => !b.archived)
  const archived = (db.bills || []).filter(b => b.archived)
  const total = active.reduce((s, b) => s + getMonthAmt(b), 0)
  const paidSoFar = active.reduce((s, b) => { const { isPaid, paidAmt } = getBillStatus(b); return s + (isPaid ? getMonthAmt(b) : paidAmt) }, 0)
  const stillOwed = total - paidSoFar
  const paidCount = active.filter(b => getBillStatus(b).isPaid).length
  const pct = total > 0 ? Math.round(paidSoFar / total * 100) : 0
  const today = new Date().getDate()
  const billPayments = (db.spend || []).filter(s => s.bill_id)

  const sorted = [...active].sort((a, b) => {
    const aS = getBillStatus(a); const bS = getBillStatus(b)
    if (aS.isPaid && !bS.isPaid) return 1
    if (!aS.isPaid && bS.isPaid) return -1
    const aOver = !aS.isPaid && a.due_day && a.due_day < today && !a.running
    const bOver = !bS.isPaid && b.due_day && b.due_day < today && !b.running
    if (aOver && !bOver) return -1
    if (!aOver && bOver) return 1
    return (a.due_day || 0) - (b.due_day || 0)
  })
  const unpaid = sorted.filter(b => !getBillStatus(b).isPaid)
  const paid = sorted.filter(b => getBillStatus(b).isPaid)

  const logPayment = (b, amt, billMonth) => {
    const mAmt = getMonthAmt(b)
    const newPaid = Math.min((b.paid_amount || 0) + amt, mAmt)
    const status = newPaid >= mAmt ? 'paid' : 'partial'
    if (isCurrentMonth) update('bills', b.id, { paid_amount: newPaid, status })
    insert('spend', { place: b.name, category: b.grp || 'Housing', emoji: '🧾', color: '#a89be6', amount: amt, date: new Date().toISOString().slice(0,10), bill_id: b.id, bill_month: billMonth })
    showToast(`Payment logged — ${money(amt)} on ${b.name} ✨`)
    setPaySheet(null)
    setExpanded(null)
  }

  const deletePayment = (p) => {
    if (!window.confirm('Delete this payment?')) return
    const bill = db.bills.find(b => b.id === p.bill_id)
    if (bill && isCurrentMonth) {
      const rest = billPayments.filter(x => x.id !== p.id && x.bill_id === p.bill_id)
      const newPaid = rest.reduce((s, x) => s + x.amount, 0)
      update('bills', bill.id, { paid_amount: newPaid, status: newPaid <= 0 ? 'unpaid' : newPaid >= bill.amount ? 'paid' : 'partial' })
    }
    remove('spend', p.id)
    showToast('Payment deleted')
  }

  const saveEdit = (e) => {
    e.preventDefault()
    const f = e.target
    update('bills', editing.id, { name: f.bname.value, amount: +f.amount.value || 0, due_day: +f.due.value || 1, autopay: f.autopay.checked })
    setEditing(null)
    showToast('Bill updated ✨')
  }

  const addBill = (e) => {
    e.preventDefault()
    const f = e.target
    insert('bills', { name: f.bname.value, amount: +f.amount.value || 0, due_day: +f.due.value || 1, autopay: f.autopay.checked, status: 'unpaid', paid_amount: 0, running: false, archived: false })
    setAdding(false)
    showToast('Bill added ✨')
  }

  const toggle = id => setExpanded(expanded === id ? null : id)

  const BillRow = ({ b }) => {
    const mAmt = getMonthAmt(b)
    const { isPaid, isPartial, paidAmt } = getBillStatus(b)
    const isOverdue = !isPaid && !b.running && b.due_day && b.due_day < today && isCurrentMonth
    const isOpen = expanded === b.id
    const payCount = billPayments.filter(p => p.bill_id === b.id).length
    const note = getBillNote(b)
    const checkLabel = getCheckLabel(b, billSlots, viewMonth)

    return (
      <div style={{ background: '#fff', border: `1px solid ${isOverdue ? '#fca5a5' : 'var(--line)'}`, borderRadius: 14, marginBottom: 8, overflow: 'hidden' }}>
        <button onClick={() => toggle(b.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '13px 14px', gap: 12, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isPaid ? '#3b8f6a' : isPartial ? '#d4a017' : isOverdue ? '#c0483f' : '#dcd6e0'}`, background: isPaid ? '#3b8f6a' : 'none', display: 'grid', placeItems: 'center', fontSize: 10, color: isPaid ? '#fff' : isPartial ? '#d4a017' : '', fontWeight: 800, flexShrink: 0 }}>
            {isPaid ? '✓' : isPartial ? '½' : ''}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: isPaid ? 'var(--ink2)' : 'var(--ink)' }}>{b.name}</div>
            <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
              {b.autopay && <span style={{ background: '#e0f2fe', color: '#0878a0', padding: '1px 5px', borderRadius: 6, fontWeight: 800 }}>auto</span>}
              {isOverdue && <span style={{ background: '#fee2e2', color: '#c0483f', padding: '1px 5px', borderRadius: 6, fontWeight: 800 }}>overdue</span>}
              {isPartial && <span style={{ fontWeight: 700, color: '#d4a017' }}>{money(paidAmt)} paid · {money(mAmt - paidAmt)} left</span>}
              {!isPartial && <span>due {b.due_day}{b.due_day===1?'st':b.due_day===2?'nd':b.due_day===3?'rd':'th'}{b.running ? ' · running' : ''}</span>}
              {checkLabel && <span style={{ background: 'var(--lav)', color: '#5a52a0', padding: '1px 5px', borderRadius: 6, fontWeight: 700 }}>{checkLabel}</span>}
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--mono)', color: isPaid ? '#3b8f6a' : isOverdue ? '#c0483f' : 'var(--ink)', flexShrink: 0 }}>
            {money(mAmt, 2)}{mAmt !== b.amount && <span style={{ fontSize: 9, color: 'var(--ink2)', marginLeft: 3 }}>*</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink2)', marginLeft: 4 }}>{isOpen ? '▴' : '▾'}</div>
        </button>
        {isOpen && (
          <div style={{ borderTop: '1px solid var(--line)', background: '#f8f4fb' }}>
            {note && <div style={{ padding: '8px 14px', fontSize: 11, color: '#6a5a73', fontStyle: 'italic', borderBottom: '1px solid var(--line)' }}>📝 {note}</div>}
            <div style={{ padding: '10px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!isPaid && isCurrentMonth && <button onClick={() => setPaySheet(b)} style={{ flex: 1, minWidth: 55, padding: '9px 6px', borderRadius: 10, fontSize: 11, fontWeight: 800, border: 'none', background: 'var(--matcha)', color: '#3a5a1f', cursor: 'pointer' }}>Pay</button>}
              {isPaid && isCurrentMonth && <button onClick={() => { const p = billPayments.filter(x => x.bill_id === b.id); p.forEach(x => remove('spend', x.id)); update('bills', b.id, { paid_amount: 0, status: 'unpaid' }); showToast(`${b.name} reverted`) }} style={{ flex: 1, minWidth: 55, padding: '9px 6px', borderRadius: 10, fontSize: 11, fontWeight: 800, border: 'none', background: '#fee2e2', color: '#c0483f', cursor: 'pointer' }}>Undo</button>}
              {payCount > 0 && <button onClick={() => setHistoryBill(b)} style={{ flex: 1, minWidth: 55, padding: '9px 6px', borderRadius: 10, fontSize: 11, fontWeight: 800, border: 'none', background: '#e0f2fe', color: '#0878a0', cursor: 'pointer' }}>History</button>}
              <button onClick={() => { setNoteText(note); setNoteSheet(b) }} style={{ flex: 1, minWidth: 55, padding: '9px 6px', borderRadius: 10, fontSize: 11, fontWeight: 800, border: 'none', background: '#fff3dc', color: '#9a6a1a', cursor: 'pointer' }}>📝 Note</button>
              {isCurrentMonth && <button onClick={() => { setEditing(b); setExpanded(null) }} style={{ flex: 1, minWidth: 55, padding: '9px 6px', borderRadius: 10, fontSize: 11, fontWeight: 800, border: 'none', background: 'var(--lav)', color: '#5a52a0', cursor: 'pointer' }}>Edit</button>}
              {!b.autopay && isCurrentMonth && <button onClick={() => { update('bills', b.id, { archived: true }); showToast(`${b.name} archived`) }} style={{ flex: 1, minWidth: 55, padding: '9px 6px', borderRadius: 10, fontSize: 11, fontWeight: 800, border: 'none', background: '#fee2e2', color: '#c0483f', cursor: 'pointer' }}>Unsub</button>}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="pagetitle">Bills 💌</div>
      <p className="pagesub">Track your monthly payments</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '10px 16px', marginBottom: 14 }}>
        <button onClick={() => setViewMonth(allMonths[Math.max(0, monthIdx-1)])} disabled={monthIdx===0} style={{ fontSize: 20, color: monthIdx===0?'#dcd6e0':'#9c3f74', background: 'none', border: 'none', cursor: monthIdx===0?'default':'pointer', fontWeight: 800 }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{new Date(viewMonth+'-15').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
          {!isCurrentMonth && <div style={{ fontSize: 10, color: '#9c3f74', fontWeight: 700, marginTop: 2 }}>viewing past month · read only</div>}
        </div>
        <button onClick={() => setViewMonth(allMonths[Math.min(allMonths.length-1, monthIdx+1)])} disabled={monthIdx===allMonths.length-1} style={{ fontSize: 20, color: monthIdx===allMonths.length-1?'#dcd6e0':'#9c3f74', background: 'none', border: 'none', cursor: monthIdx===allMonths.length-1?'default':'pointer', fontWeight: 800 }}>›</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, borderRadius: 14, padding: 12, textAlign: 'center', background: 'var(--pink-soft)', color: '#9c3f74' }}>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--mono)' }}>{money(stillOwed)}</div>
          <div style={{ fontSize: 9, fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.4px', opacity: .8 }}>still owed</div>
        </div>
        <div style={{ flex: 1, borderRadius: 14, padding: 12, textAlign: 'center', background: '#e7f2c7', color: '#3a5a1f' }}>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--mono)' }}>{money(paidSoFar)}</div>
          <div style={{ fontSize: 9, fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.4px', opacity: .8 }}>paid</div>
        </div>
        <div style={{ flex: 1, borderRadius: 14, padding: 12, textAlign: 'center', background: 'var(--lav)', color: '#5a52a0' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{paidCount}/{active.length}</div>
          <div style={{ fontSize: 9, fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.4px', opacity: .8 }}>done</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '13px 14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>Monthly progress</div>
          <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{pct}% paid</div>
        </div>
        <div style={{ height: 8, background: '#f0eaf5', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: 'linear-gradient(90deg,var(--pink),#c48fd0)' }} />
        </div>
      </div>

      <div className="desktop-bills-grid">
        <div>
          {unpaid.length > 0 && <>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--pink)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 4px 10px' }}>Due</div>
            {unpaid.map(b => <BillRow key={b.id} b={b} />)}
          </>}
        </div>
        <div>
          {paid.length > 0 && <>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#3b8f6a', letterSpacing: 1, textTransform: 'uppercase', margin: '0 4px 10px' }}>Paid ✅</div>
            {paid.map(b => <BillRow key={b.id} b={b} />)}
          </>}
        </div>
      </div>

      {isCurrentMonth && (adding ? (
        <form style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginTop: 8 }} onSubmit={addBill}>
          <div className="field"><label>Name</label><input name="bname" required placeholder="e.g. Spotify" /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label>Amount</label><input name="amount" type="number" step="0.01" placeholder="0.00" /></div>
            <div className="field" style={{ flex: 1 }}><label>Due day</label><input name="due" type="number" placeholder="1" /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <input type="checkbox" name="autopay" id="autopay" />
            <label htmlFor="autopay" style={{ fontSize: 13, fontWeight: 600 }}>This is on autopay</label>
          </div>
          <button className="apply" type="submit">Add bill ✨</button>
          <button className="cancel" type="button" onClick={() => setAdding(false)} style={{ marginTop: 8 }}>Cancel</button>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: '100%', padding: 13, borderRadius: 14, border: '1.5px dashed var(--pink)', background: 'var(--pink-soft)', color: '#9c3f74', fontWeight: 800, fontSize: 13, marginTop: 8, cursor: 'pointer' }}>+ Add a bill</button>
      ))}

      {archived.length > 0 && <>
        <button onClick={() => setShowArchived(!showArchived)} style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'none', border: 'none', color: 'var(--ink2)', fontWeight: 700, fontSize: 12, marginTop: 12, cursor: 'pointer' }}>
          📁 {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
        </button>
        {showArchived && archived.map(b => (
          <div key={b.id} style={{ background: '#f6f2f7', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink2)' }}>{b.name}</div><div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 2 }}>was {money(b.amount)}/mo</div></div>
            <button onClick={() => update('bills', b.id, { archived: false })} style={{ fontSize: 11, fontWeight: 800, color: '#3b8f6a', background: '#e1f5ee', border: 'none', borderRadius: 10, padding: '5px 12px', cursor: 'pointer' }}>↩ Restore</button>
          </div>
        ))}
      </>}

      {paySheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setPaySheet(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 16px 32px' }}>
            <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Log a payment 💳</div>
            <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 14 }}>{paySheet.name} · {money(getMonthAmt(paySheet) - (paySheet.paid_amount||0))} remaining</div>
            <PayForm bill={paySheet} monthAmt={getMonthAmt(paySheet)} onSave={(amt, month) => logPayment(paySheet, amt, month)} onClose={() => setPaySheet(null)} />
          </div>
        </div>
      )}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setEditing(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 16px 32px' }}>
            <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Edit bill ✏️</div>
            <form onSubmit={saveEdit}>
              <div className="field"><label>Name</label><input name="bname" defaultValue={editing.name} required /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="field" style={{ flex: 1 }}><label>Amount</label><input name="amount" type="number" step="0.01" defaultValue={editing.amount} /></div>
                <div className="field" style={{ flex: 1 }}><label>Due day</label><input name="due" type="number" defaultValue={editing.due_day} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <input type="checkbox" name="autopay" id="editautopay" defaultChecked={editing.autopay} />
                <label htmlFor="editautopay" style={{ fontSize: 13, fontWeight: 600 }}>On autopay</label>
              </div>
              <button className="apply" type="submit">Save changes ✨</button>
              <button className="cancel" type="button" onClick={() => setEditing(null)} style={{ marginTop: 8 }}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      {noteSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setNoteSheet(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 16px 32px' }}>
            <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>📝 Note for {noteSheet.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink2)', marginBottom: 14 }}>{new Date(viewMonth+'-15').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="e.g. Verizon July — paid from Aug check" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--line)', fontSize: 14, fontFamily: 'inherit', resize: 'none', marginBottom: 12 }} />
            <button onClick={() => saveBillNote(noteSheet, noteText)} style={{ width: '100%', padding: 13, borderRadius: 14, background: '#fff3dc', border: '1.5px solid #f5e2c4', color: '#9a6a1a', fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>Save note ✨</button>
            <button onClick={() => setNoteSheet(null)} style={{ width: '100%', padding: 11, borderRadius: 14, background: '#fff', border: '1.5px solid var(--line)', color: 'var(--ink2)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {historyBill && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setHistoryBill(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 16px 32px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>💳 {historyBill.name} — history</div>
            <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 14 }}>Tap delete to remove a payment</div>
            {billPayments.filter(p => p.bill_id === historyBill.id).length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--ink2)', padding: '20px 0', fontSize: 13 }}>No payments logged yet</div>
            )}
            {billPayments.filter(p => p.bill_id === historyBill.id).map(p => (
              <div key={p.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{money(p.amount, 2)}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 3 }}>{p.date}{p.bill_month ? ` · for ${p.bill_month}` : ''}</div>
                </div>
                <button onClick={() => deletePayment(p)} style={{ fontSize: 12, fontWeight: 700, color: '#c0483f', background: '#fee2e2', border: 'none', borderRadius: 10, padding: '6px 12px', cursor: 'pointer' }}>Delete</button>
              </div>
            ))}
            <button onClick={() => setHistoryBill(null)} style={{ width: '100%', padding: 11, borderRadius: 14, background: '#fff', border: '1.5px solid var(--line)', color: 'var(--ink2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
