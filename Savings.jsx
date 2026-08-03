import { useState } from 'react'
import { money } from './lib'

const GC = ['#7bafe0', '#a89be6', '#ef9fc9']
const BARS = ['linear-gradient(90deg,#7bafe0,#9ec9ef)', 'linear-gradient(90deg,#a89be6,#c9b8ee)', 'linear-gradient(90deg,#ef9fc9,#f6b6d4)']
const CLS = ['s1', 's2', 's3']

function pace(goal) {
  if (!goal.target_date) return null
  const now = new Date(), end = new Date(goal.target_date)
  const months = Math.max(1, Math.round((end - now) / (1000 * 60 * 60 * 24 * 30)))
  const need = Math.max(0, goal.target - goal.saved)
  const perMo = need / months
  const slow = perMo > 400
  return { text: `${money(perMo)}/mo to reach it by ${end.toLocaleDateString('en-US', { month: 'short' })} — ${slow ? 'a stretch' : "you've got this"}`, slow }
}

export default function Savings({ db, insert, update, remove, showToast }) {
  const [addingAcct, setAddingAcct] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [editingAcct, setEditingAcct] = useState(null)
  const [depositGoal, setDepositGoal] = useState(null)

  const saved = db.goals.reduce((s, g) => s + g.saved, 0)
  const target = db.goals.reduce((s, g) => s + g.target, 0) || 1
  const pct = Math.round(saved / target * 100)
  const accts = db.accounts.length ? db.accounts : [{ id: 'none', name: 'Savings' }]
  const autoSaved = db.deposits.filter(d => d.source === 'paycheck').reduce((s, d) => s + d.amount, 0)

  let acc = 0
  const stops = db.goals.map((g, i) => { const f = g.saved / target * 100; const s = `${GC[i % 3]} ${acc}% ${acc + f}%`; acc += f; return s })
  stops.push(`#e5dced ${acc}% 100%`)

  const doDeposit = (g, amt) => {
    if (!amt || isNaN(+amt) || +amt <= 0) return
    update('goals', g.id, { saved: g.saved + (+amt) })
    insert('deposits', { goal_id: g.id, amount: +amt, source: 'manual', date: new Date().toISOString().slice(0, 10) })
    showToast(`Added ${money(+amt)} to ${g.name}`)
    setDepositGoal(null)
  }

  const saveGoalEdit = (g, name, target, date) => {
    update('goals', g.id, { name, target: +target || g.target, target_date: date || null })
    setEditingGoal(null); showToast('Goal updated')
  }

  const saveAcctEdit = (a, name) => {
    update('accounts', a.id, { name })
    setEditingAcct(null); showToast('Account updated')
  }

  const addAccount = e => {
    e.preventDefault()
    const name = e.target.acct.value
    if (name) { insert('accounts', { name, sort: db.accounts.length }); showToast('Account added') }
    setAddingAcct(false)
  }

  const addGoal = acctId => {
    const name = prompt('Goal name (e.g. Vacation)')
    if (!name) return
    const tgt = prompt('Target amount', '1000')
    insert('goals', { account_id: acctId, name, emoji: '✨', target: +tgt || 0, saved: 0, target_date: null, sort: db.goals.length })
    showToast('Goal added')
  }

  return (
    <div className="screen">
      <div className="pagetitle">Savings 💫</div>
      <p className="pagesub">Every dollar has a name</p>
      <div className="halo">
        <div className="donut" style={{ background: `conic-gradient(${stops.join(',')})` }}>
          <b><span>{money(saved)}</span>of {money(target)}</b>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#6a3f5e' }}>{pct}% of the way there ✨</div>
          <div style={{ fontSize: 11, color: '#8a6b80', marginTop: 3 }}>across {accts.length} account{accts.length > 1 ? 's' : ''}</div>
          {autoSaved > 0 && <div style={{ display: 'inline-block', fontSize: 11, color: '#3b8f6a', fontWeight: 800, marginTop: 8, background: 'rgba(255,255,255,.7)', padding: '4px 10px', borderRadius: 20 }}>↑ {money(autoSaved)} auto-saved</div>}
        </div>
      </div>

      {accts.map(a => {
        const goals = db.goals.filter(g => g.account_id === a.id)
        const bal = goals.reduce((s, g) => s + g.saved, 0)
        return (
          <div key={a.id}>
            <div className="acchead">
              <div className="an">🏦 {a.name}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="tag" style={{ background: 'var(--lav)', color: '#5a52a0' }} onClick={() => setEditingAcct(a)}>Edit</button>
                <div className="ab">{money(bal)}</div>
              </div>
            </div>
            {goals.map((g, i) => {
              const p = Math.min(100, Math.round(g.saved / (g.target || 1) * 100))
              const pc = pace(g)
              return (
                <div className={'goalcard ' + CLS[i % 3]} key={g.id}>
                  <div className="gtop">
                    <span className="gn">{g.emoji} {g.name}</span>
                    <span className="gpill" style={{ color: '#5a52a0' }}>{money(g.saved)} / {money(g.target)}</span>
                  </div>
                  <div className="bar" style={{ margin: '12px 0 8px' }}><i style={{ width: p + '%', background: BARS[i % 3] }} /></div>
                  <div className="grow"><span>{p}% saved</span><span>{g.target_date ? '🎯 by ' + new Date(g.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'no date'}</span></div>
                  {pc && <div className={'pace ' + (pc.slow ? 'slow' : 'on')}>{pc.slow ? '🐢' : '🌷'} {pc.text}</div>}
                  <div className="gactions">
                    <button className="gbtn dep" onClick={() => setDepositGoal(g)}>+ Deposit</button>
                    <button className="gbtn hist" onClick={() => setEditingGoal(g)}>✏️ Edit</button>
                  </div>
                </div>
              )
            })}
            <button className="miniadd" style={{ margin: '2px 4px 8px' }} onClick={() => addGoal(a.id)}>+ add goal to {a.name}</button>
          </div>
        )
      })}

      {addingAcct ? (
        <form className="card" style={{ marginTop: 10, padding: 14 }} onSubmit={addAccount}>
          <div className="field"><label>Account name</label><input name="acct" placeholder="e.g. Chase Savings" required /></div>
          <button className="apply" type="submit">Add account</button>
          <button className="cancel" type="button" onClick={() => setAddingAcct(false)}>Cancel</button>
        </form>
      ) : (
        <button className="addbtn" onClick={() => setAddingAcct(true)}>+ Add account</button>
      )}

      {/* Deposit sheet */}
      {depositGoal && (
        <div className="overlay" onClick={() => setDepositGoal(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>+ Deposit into {depositGoal.name}</h3>
            <p className="shint">{money(depositGoal.saved)} saved · {money(depositGoal.target - depositGoal.saved)} to go</p>
            <DepositForm onSave={amt => doDeposit(depositGoal, amt)} onClose={() => setDepositGoal(null)} />
          </div>
        </div>
      )}

      {/* Edit goal sheet */}
      {editingGoal && (
        <div className="overlay" onClick={() => setEditingGoal(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Edit goal ✏️</h3>
            <EditGoalForm goal={editingGoal} onSave={saveGoalEdit} onClose={() => setEditingGoal(null)} />
          </div>
        </div>
      )}

      {/* Edit account sheet */}
      {editingAcct && (
        <div className="overlay" onClick={() => setEditingAcct(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Edit account ✏️</h3>
            <div className="field"><label>Account name</label><input id="acctname" defaultValue={editingAcct.name} /></div>
            <button className="apply" onClick={() => saveAcctEdit(editingAcct, document.getElementById('acctname').value)}>Save</button>
            <button className="cancel" onClick={() => setEditingAcct(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function DepositForm({ onSave, onClose }) {
  const [amt, setAmt] = useState('')
  return (
    <div>
      <div className="amountf"><input value={amt} onChange={e => setAmt(e.target.value)} placeholder="$0.00" inputMode="decimal" /></div>
      <button className="apply" onClick={() => onSave(amt)}>Add deposit ✨</button>
      <button className="cancel" onClick={onClose}>Cancel</button>
    </div>
  )
}

function EditGoalForm({ goal, onSave, onClose }) {
  const [name, setName] = useState(goal.name)
  const [target, setTarget] = useState(String(goal.target))
  const [date, setDate] = useState(goal.target_date || '')
  return (
    <div>
      <div className="field"><label>Goal name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field"><label>Target amount</label><input type="number" step="0.01" value={target} onChange={e => setTarget(e.target.value)} /></div>
      <div className="field"><label>Target date (optional)</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <button className="apply" onClick={() => onSave(goal, name, target, date)}>Save changes ✨</button>
      <button className="cancel" onClick={onClose}>Cancel</button>
    </div>
  )
}
