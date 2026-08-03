import { useState } from 'react'
import { money, monthLabel, MS, TEACHINGS, teachCtx, pickNudge, CATS } from './lib'

const START_DEBT = 39300

function Debts({ db, update, insert, showToast }) {
  const [extra, setExtra] = useState(75)
  const [editingExtra, setEditingExtra] = useState(false)
  const [editingDebt, setEditingDebt] = useState(null)
  const [skipSheet, setSkipSheet] = useState(null)
  const [windfallSheet, setWindfallSheet] = useState(false)

  const debts = [...db.debts].filter(d => d.balance > 0).sort((a, b) => a.balance - b.balance)
  const total = debts.reduce((s, d) => s + d.balance, 0)
  const pct = Math.max(0, Math.round(((START_DEBT - total) / START_DEBT) * 100))

  // Build weekly payoff plan (snowball)
  const buildPlan = () => {
    let balances = debts.map(d => ({ ...d }))
    const weeks = []
    let weekNum = 0
    const today = new Date()
    while (balances.some(d => d.balance > 0) && weekNum < 52) {
      const focus = balances.find(d => d.balance > 0)
      if (!focus) break
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + weekNum * 7)
      // find next thursday
      while (checkDate.getDay() !== 4) checkDate.setDate(checkDate.getDate() + 1)
      const dateStr = checkDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const extraThisWeek = Math.min(extra, focus.balance)
      focus.balance = Math.max(0, focus.balance - extraThisWeek)
      const cleared = focus.balance === 0
      weeks.push({ weekNum, dateStr, debtName: focus.name, debtId: focus.id, extra: extraThisWeek, cleared, remaining: focus.balance })
      weekNum++
    }
    return weeks
  }

  const plan = buildPlan()
  const thisWeek = plan[0]
  const nextWeek = plan[1]
  const firstMilestone = plan.find(w => w.cleared)

  const saveDebt = (d, name, balance, apr, min) => {
    update('debts', d.id, { name, balance: +balance, apr: +apr, min_payment: +min })
    showToast('Debt updated ✨')
    setEditingDebt(null)
  }

  const removeDebt = (d) => {
    if (window.confirm(`Mark ${d.name} as paid off?`)) {
      update('debts', d.id, { balance: 0 })
      showToast(`${d.name} cleared! 🎉`)
      setEditingDebt(null)
    }
  }

  const logPayment = (d, amt) => {
    const newBal = Math.max(0, d.balance - (+amt || 0))
    update('debts', d.id, { balance: newBal })
    insert('debt_payments', { debt_id: d.id, amount: +amt, date: new Date().toISOString().slice(0,10) })
    showToast(`Payment logged on ${d.name} ✨`)
  }

  const logWindfall = (amt) => {
    const focus = debts[0]
    if (focus && amt > 0) {
      logPayment(focus, amt)
      showToast(`${money(amt)} windfall applied to ${focus.name} 🎉`)
    }
    setWindfallSheet(false)
  }

  return (
    <div>
      {/* Progress ring */}
      <div className="feat" style={{ marginTop: 0 }}>
        <div className="ring" style={{ background: `conic-gradient(#c48fd0 ${pct}%, #fff 0)` }}>
          <b style={{ color: '#8a5fa0' }}>{pct}%<small>paid off</small></b>
        </div>
        <div><div className="goalname">{money(total)} to go</div><div className="goalsub">was {money(START_DEBT)}</div><div className="goaleta" style={{ color: '#b07bb0' }}>🕊️ lighter every month</div></div>
      </div>

      {/* Extra payment control */}
      <div style={{ background: 'linear-gradient(135deg,#fdeef5,#eee7fb)', borderRadius: 16, padding: 14, marginTop: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#5a3f56', marginBottom: 8 }}>Extra toward debt per check</div>
        {editingExtra ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" defaultValue={extra} id="extrainp" style={{ flex: 1, padding: '8px 12px', borderRadius: 12, border: '1.5px solid var(--line)', fontSize: 16, fontWeight: 800 }} />
            <button onClick={() => { const v = +document.getElementById('extrainp').value; if (v > 0) setExtra(v); setEditingExtra(false) }} style={{ padding: '8px 16px', borderRadius: 12, background: 'var(--matcha)', color: '#4e6327', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Save</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#9c3f74', fontFamily: 'var(--mono)' }}>{money(extra)}/check</div>
            <button onClick={() => setEditingExtra(true)} style={{ fontSize: 11, fontWeight: 800, color: '#9c3f74', background: 'rgba(255,255,255,.7)', border: 'none', borderRadius: 20, padding: '5px 12px', cursor: 'pointer' }}>change</button>
          </div>
        )}
        <div style={{ background: 'rgba(255,255,255,.6)', borderRadius: 10, padding: '8px 10px', fontSize: 11, color: '#6a4f66', marginTop: 8, lineHeight: 1.4 }}>
          💡 Based on your checks, ~{money(extra)} extra/check clears your debts fastest while keeping a buffer.
        </div>
      </div>

      {/* Weekly plan */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--pink)', letterSpacing: '.5px', marginBottom: 10 }}>YOUR WEEKLY PAYOFF PLAN · SNOWBALL</div>

      {/* This week */}
      {thisWeek && (
        <div style={{ background: '#fff', border: '1.5px solid var(--pink)', borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
            <div><div style={{ fontSize: 13, fontWeight: 800 }}>This week · {thisWeek.dateStr}</div><div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 1 }}>focus: {thisWeek.debtName}</div></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setWindfallSheet(true)} style={{ fontSize: 10, fontWeight: 800, color: '#3b8f6a', background: '#e1f5ee', border: 'none', borderRadius: 8, padding: '4px 9px', cursor: 'pointer' }}>+ windfall</button>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'var(--pink-soft)', color: '#9c3f74' }}>Now</span>
            </div>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{debts[0]?.name}</div>
                <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 1 }}>{money(debts[0]?.balance, 2)} remaining · snowball focus</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--mono)', color: '#9c3f74' }}>+{money(extra)}</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 6, fontStyle: 'italic' }}>+ minimums on all other debts</div>
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)', background: '#fdeef5' }}>
            <button onClick={() => { const amt = prompt(`Log payment on ${debts[0]?.name}`, extra); if (amt && +amt > 0) logPayment(debts[0], amt) }} style={{ width: '100%', padding: 10, borderRadius: 12, background: 'var(--pink)', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              💳 Log this week's payment
            </button>
          </div>
        </div>
      )}

      {/* Next week */}
      {nextWeek && (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
            <div><div style={{ fontSize: 13, fontWeight: 800 }}>Next week · {nextWeek.dateStr}</div><div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 1 }}>{nextWeek.debtName} · {money(nextWeek.remaining)} left after</div></div>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'var(--lav)', color: '#5a52a0' }}>Upcoming</span>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{nextWeek.debtName} extra</span>
            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--mono)', color: '#9c3f74' }}>+{money(nextWeek.extra)}</span>
          </div>
        </div>
      )}

      {/* First milestone */}
      {firstMilestone && (
        <div style={{ background: 'linear-gradient(135deg,#e1f5ee,#e8f3fb)', borderRadius: 14, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🎉</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#245b86' }}>{firstMilestone.debtName} cleared ~{firstMilestone.dateStr}</div>
            <div style={{ fontSize: 11, color: '#4a7a9b', marginTop: 2 }}>That {money(extra)}/check rolls into the next debt</div>
          </div>
        </div>
      )}

      {/* Debt list */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--pink)', letterSpacing: '.5px', marginBottom: 10 }}>ALL DEBTS · TAP TO EDIT</div>
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
        {debts.map((d, i) => (
          <button key={d.id} onClick={() => setEditingDebt(d)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: i < debts.length-1 ? '1px solid var(--line)' : 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: i === 0 ? 'var(--pink)' : 'var(--pink-soft)', color: i === 0 ? '#fff' : '#9c3f74', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{i+1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
                <div style={{ fontSize: 10, color: d.apr > 20 ? '#c0483f' : 'var(--ink2)', fontWeight: 700, marginTop: 1 }}>{d.apr ? `${d.apr}% APR` : 'no APR'} · min {money(d.min_payment || 25)}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--mono)' }}>{money(d.balance, 2)}</div>
              <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 1 }}>› edit</div>
            </div>
          </button>
        ))}
      </div>

      {/* Windfall sheet */}
      {windfallSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setWindfallSheet(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 16px 32px' }}>
            <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>💰 Log a windfall</div>
            <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 14 }}>Unexpected money? Apply it straight to {debts[0]?.name} and watch your timeline shrink.</div>
            <div style={{ background: 'linear-gradient(135deg,var(--pink-soft),var(--lav))', borderRadius: 14, padding: 12, marginBottom: 12, textAlign: 'center' }}>
              <input id="windinp" placeholder="$0.00" inputMode="decimal" style={{ fontSize: 28, fontWeight: 800, color: '#5a3f56', background: 'none', border: 'none', textAlign: 'center', width: '100%', outline: 'none' }} />
            </div>
            <button onClick={() => { const v = +document.getElementById('windinp').value; if (v > 0) logWindfall(v) }} style={{ width: '100%', padding: 13, borderRadius: 14, background: '#e1f5ee', border: '1.5px solid #b8e0cc', color: '#3b8f6a', fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>Apply to {debts[0]?.name} ✨</button>
            <button onClick={() => setWindfallSheet(false)} style={{ width: '100%', padding: 11, borderRadius: 14, background: '#fff', border: '1.5px solid var(--line)', color: 'var(--ink2)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Edit debt sheet */}
      {editingDebt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setEditingDebt(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 16px 32px' }}>
            <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Edit debt ✏️</div>
            <div className="field"><label>Name</label><input id="dname" defaultValue={editingDebt.name} style={{ width: '100%', padding: '9px 12px', borderRadius: 12, border: '1.5px solid var(--line)', fontSize: 14, fontWeight: 600 }} /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="field" style={{ flex: 1 }}><label>Balance</label><input id="dbal" type="number" step="0.01" defaultValue={editingDebt.balance} style={{ width: '100%', padding: '9px 12px', borderRadius: 12, border: '1.5px solid var(--line)', fontSize: 14 }} /></div>
              <div className="field" style={{ flex: 1 }}><label>APR %</label><input id="dapr" type="number" step="0.1" defaultValue={editingDebt.apr} style={{ width: '100%', padding: '9px 12px', borderRadius: 12, border: '1.5px solid var(--line)', fontSize: 14 }} /></div>
            </div>
            <div className="field"><label>Min payment</label><input id="dmin" type="number" step="0.01" defaultValue={editingDebt.min_payment} style={{ width: '100%', padding: '9px 12px', borderRadius: 12, border: '1.5px solid var(--line)', fontSize: 14 }} /></div>
            <div style={{ background: '#fff6ea', borderRadius: 12, padding: '9px 12px', fontSize: 11, color: '#9a6a1a', fontWeight: 600, marginBottom: 14, lineHeight: 1.5 }}>
              💡 Changing balance or minimum recalculates your entire payoff plan instantly.
            </div>
            <button onClick={() => saveDebt(editingDebt, document.getElementById('dname').value, document.getElementById('dbal').value, document.getElementById('dapr').value, document.getElementById('dmin').value)} style={{ width: '100%', padding: 13, borderRadius: 14, background: 'var(--matcha)', color: '#4e6327', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', marginBottom: 8 }}>Save changes ✨</button>
            <button onClick={() => setEditingDebt(null)} style={{ width: '100%', padding: 11, borderRadius: 14, background: '#fff', border: '1.5px solid var(--line)', color: 'var(--ink2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>Cancel</button>
            <button onClick={() => removeDebt(editingDebt)} style={{ width: '100%', padding: 10, borderRadius: 12, background: 'none', border: 'none', color: '#c0483f', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>🗑 Mark as paid off / remove</button>
          </div>
        </div>
      )}
    </div>
  )
}


function DebtPayForm({ debt, isCharge, onSave, onClose }) {
  const [amt, setAmt] = useState('')
  const preview = +amt > 0 ? (isCharge ? debt.balance + +amt : Math.max(0, debt.balance - +amt)) : null
  return (
    <div>
      <div className="amountf" style={{ background: isCharge ? 'linear-gradient(135deg,#fdeaea,#faf0e2)' : 'linear-gradient(135deg,#eef6dd,#e8f3fb)' }}>
        <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="$0.00" inputMode="decimal" style={{ color: isCharge ? '#c0483f' : '#51691f' }} />
      </div>
      {preview !== null && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink2)', marginBottom: 10 }}>New balance → <b>{money(preview, 2)}</b></div>}
      <button className="apply" style={{ background: isCharge ? '#e88f8f' : 'var(--matcha)', color: isCharge ? '#fff' : '#4e6327' }} onClick={() => { if (+amt > 0) onSave(debt, amt, isCharge) }}>
        {isCharge ? 'Log charge' : 'Apply payment ✨'}
      </button>
      <button className="cancel" onClick={onClose}>Cancel</button>
    </div>
  )
}

function Income({ db }) {
  const byMonth = {}
  db.checks.forEach(c => {
    const m = c.date.slice(0, 7)
    byMonth[m] = byMonth[m] || { gross: 0, net: 0, tax: 0, n: 0 }
    byMonth[m].gross += c.gross; byMonth[m].net += c.net; byMonth[m].tax += c.tax; byMonth[m].n++
  })
  const months = Object.keys(byMonth).sort()
  const iGross = db.checks.reduce((s, c) => s + c.gross, 0)
  const iYtd = db.checks.reduce((s, c) => s + c.net, 0)
  const nMonths = months.length || 1
  const avgMo = iYtd / nMonths
  const avgCheck = db.checks.length ? iYtd / db.checks.length : 0
  const keepRate = iGross ? Math.round(iYtd / iGross * 100) : 0
  const nets = months.map(m => byMonth[m].net)
  const maxNet = Math.max(...nets, 1)
  const hi = months.length ? months.reduce((a, m) => byMonth[m].net > byMonth[a].net ? m : a, months[0]) : null
  const lo = months.length ? months.reduce((a, m) => byMonth[m].net < byMonth[a].net ? m : a, months[0]) : null
  return (
    <div>
      <div className="grid2" style={{ marginBottom: 12 }}>
        <div className="tile t-sage"><div className="big">{money(iYtd)}</div><div className="cap">take-home YTD 💵</div></div>
        <div className="tile t-lav"><div className="big">{money(iGross)}</div><div className="cap">gross earned</div></div>
      </div>
      <div className="sec">Averages</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
        <div className="tile t-sky" style={{ padding: 12 }}><div className="big" style={{ fontSize: 18 }}>{money(avgMo)}</div><div className="cap">/ month</div></div>
        <div className="tile t-sky" style={{ padding: 12 }}><div className="big" style={{ fontSize: 18 }}>{money(avgMo / 4)}</div><div className="cap">/ week</div></div>
        <div className="tile t-sky" style={{ padding: 12 }}><div className="big" style={{ fontSize: 18 }}>{money(avgCheck)}</div><div className="cap">/ check</div></div>
      </div>
      <div className="tile t-peach" style={{ textAlign: 'center', marginBottom: 12 }}>
        <div className="big" style={{ fontSize: 18 }}>You keep {keepRate}%</div>
        <div className="cap">of what you earn</div>
      </div>
      <div className="sec">Trend</div>
      <div className="panel">
        <div className="chart">
          {months.map(m => <div className={'cbar ' + (m === hi ? 'hi' : m === lo ? 'lo' : '')} key={m}><div className="barfill" style={{ height: Math.round(byMonth[m].net / maxNet * 100) + '%' }} /><div className="cm">{MS[+m.slice(5) - 1]}</div></div>)}
        </div>
        {hi && lo && <div className="hilo">
          <div className="h hi"><div className="hlbl">▲ Highest</div><div className="hv">{money(byMonth[hi].net)}</div><div className="hmo">{MS[+hi.slice(5) - 1]}</div></div>
          <div className="h lo"><div className="hlbl">▼ Lowest</div><div className="hv">{money(byMonth[lo].net)}</div><div className="hmo">{MS[+lo.slice(5) - 1]}</div></div>
        </div>}
      </div>
      <div className="sec">By month</div>
      <div className="card">
        {months.map(m => <div className="brow" key={m}><div><div className="nm">{monthLabel(m).replace(/ \d+/, '')}</div><div className="mt">{byMonth[m].n} checks</div></div><div style={{ textAlign: 'right' }}><div className="amt" style={{ color: '#245b86' }}>{money(byMonth[m].net)}</div><div className="mt">of {money(byMonth[m].gross)}</div></div></div>)}
      </div>
    </div>
  )
}

function EZPass({ db, update, showToast }) {
  const [state, setState] = useState('NY')
  const [paySheet, setPaySheet] = useState(null)
  const vs = db.violations.filter(v => v.state === state)
  const owed = vs.filter(v => v.status !== 'paid').reduce((s, v) => s + v.due, 0)
  const cleared = vs.filter(v => v.status === 'paid').reduce((s, v) => s + v.due, 0)
  const pctCleared = Math.round(cleared / (cleared + owed || 1) * 100)
  const unpaid = vs.filter(v => v.status !== 'paid')
  return (
    <div>
      <div className="pills" style={{ marginBottom: 14 }}>
        <button className={state === 'NY' ? 'on' : ''} onClick={() => setState('NY')}>NY ({db.violations.filter(v => v.state === 'NY' && v.status !== 'paid').length} owed)</button>
        <button className={state === 'NJ' ? 'on' : ''} onClick={() => setState('NJ')}>NJ ({db.violations.filter(v => v.state === 'NJ' && v.status !== 'paid').length} owed)</button>
      </div>
      <div className="feat" style={{ marginTop: 0, background: 'linear-gradient(135deg,#e9f7ef,#e6f2fa)' }}>
        <div className="ring" style={{ background: `conic-gradient(#5bbd8e ${pctCleared}%, #fff 0)` }}><b style={{ color: '#3b8f6a' }}>{pctCleared}%<small>cleared</small></b></div>
        <div><div className="goalname">{money(owed)} to go</div><div className="goalsub">{unpaid.length} of {vs.length} {state} left</div></div>
      </div>
      <div className="sec" style={{ marginTop: 16 }}>{state} violations</div>
      <div className="card">
        {unpaid.length === 0 && <div className="brow"><div className="nm" style={{ color: '#3b8f6a' }}>🎉 All {state} violations cleared!</div></div>}
        {unpaid.map(v => (
          <div className="vrow" key={v.id}>
            <div><div className="vref">{v.ref}</div><div className="mt">{v.vdate ? new Date(v.vdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : ''} · <span style={{ color: v.status === 'collections' ? '#c0483f' : '#9a6a1a', fontWeight: 700 }}>{v.status}</span></div></div>
            <div style={{ textAlign: 'right' }}><div className="amt">{money(v.due, 2)}</div><button className="tag" style={{ background: 'var(--matcha)', color: '#4e6327' }} onClick={() => setPaySheet(v)}>Log payment</button></div>
          </div>
        ))}
      </div>
      {paySheet && (
        <div className="overlay" onClick={() => setPaySheet(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Log EZ-Pass payment</h3>
            <p className="shint">{paySheet.ref} · {money(paySheet.due, 2)} due</p>
            <div className="amountf"><input defaultValue={paySheet.due} id="ezamt" inputMode="decimal" /></div>
            <button className="apply" onClick={() => { update('violations', paySheet.id, { status: 'paid' }); showToast('Marked paid'); setPaySheet(null) }}>Mark paid ✨</button>
            <button className="cancel" onClick={() => setPaySheet(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

const TOPIC_STYLES = {
  Debt: { bg: 'linear-gradient(135deg,#efeaff,#d8d0ff)', color: '#4a3a90', emoji: '💳' },
  Saving: { bg: 'linear-gradient(135deg,#e7f2c7,#d0e8a0)', color: '#3a5a1f', emoji: '🐷' },
  Mindset: { bg: 'linear-gradient(135deg,#fdeaf3,#f8c8dc)', color: '#7a2f57', emoji: '🧠' },
  Investing: { bg: 'linear-gradient(135deg,#dcecfa,#c0dcf8)', color: '#1a4a7a', emoji: '📈' },
  Credit: { bg: 'linear-gradient(135deg,#fdeede,#f8d8b8)', color: '#7a4a1a', emoji: '⭐' },
  Budgeting: { bg: 'linear-gradient(135deg,#e8f8f0,#c0e8d8)', color: '#1a5a3a', emoji: '💰' },
  Income: { bg: 'linear-gradient(135deg,#fff3dc,#ffe8b0)', color: '#6a5000', emoji: '💵' },
  'Real Estate': { bg: 'linear-gradient(135deg,#fdeaf3,#e8c8ff)', color: '#5a1a7a', emoji: '🏠' },
}

const SOURCE_STYLES = {
  'Dave Ramsey': { bg: 'linear-gradient(135deg,#e7f2c7,#b8e090)', color: '#2a5a0f', emoji: '📗' },
  'Ramit Sethi': { bg: 'linear-gradient(135deg,#dcecfa,#a8ccf0)', color: '#0a3a6a', emoji: '📘' },
  'Morgan Housel': { bg: 'linear-gradient(135deg,#fdeede,#f8c8a8)', color: '#6a3a0a', emoji: '📙' },
  'Robert Kiyosaki': { bg: 'linear-gradient(135deg,#fdeaf3,#f8a8c8)', color: '#6a0a2a', emoji: '📕' },
  'David Bach': { bg: 'linear-gradient(135deg,#e8f8f0,#a8e8c8)', color: '#0a4a2a', emoji: '📒' },
  'Elizabeth Warren': { bg: 'linear-gradient(135deg,#efeaff,#c8b8ff)', color: '#3a0a6a', emoji: '📓' },
}

function Teachings({ db, insert, showToast }) {
  const [view, setView] = useState('topic')
  const [openKey, setOpenKey] = useState(null)
  const ctx = teachCtx(db)
  const nudge = pickNudge(db)

  const topics = [...new Set(TEACHINGS.map(t => t.topic))]
  const sources = [...new Set(TEACHINGS.map(t => t.source.split('·')[0].trim()))].filter(s => SOURCE_STYLES[s])
  const savedTips = db.saved_tips || []

  if (openKey) {
    const isSource = !!SOURCE_STYLES[openKey]
    const list = isSource
      ? TEACHINGS.filter(t => t.source.startsWith(openKey))
      : TEACHINGS.filter(t => t.topic === openKey)
    return (
      <div>
        <button className="link" onClick={() => setOpenKey(null)}>← back</button>
        <div style={{ fontSize: 18, fontWeight: 800, margin: '12px 0 16px' }}>{openKey}</div>
        {list.map(t => (
          <div className="teach" key={t.id} style={{ marginBottom: 14 }}>
            <div className="tlabel">{t.label}</div>
            <div className="tprinciple">{t.principle}</div>
            <div className="tsrc">— {t.source}</div>
            <div className="applybox"><div className="ah">📊 How this applies to you</div><div className="at">{t.apply(ctx)}</div></div>
          </div>
        ))}
        <button className="link" onClick={() => setOpenKey(null)} style={{ display: 'block', marginTop: 8 }}>← back</button>
      </div>
    )
  }

  return (
    <div>
      {/* Daily teaching — lavender/pink halo style */}
      <div style={{ background: 'linear-gradient(135deg,var(--pink-soft),var(--lav))', borderRadius: 22, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 800, color: '#9c3f74', marginBottom: 8 }}>✨ Today's teaching · {nudge.t.source.split('·')[0]}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#5a3f56', marginBottom: 8, lineHeight: 1.4 }}>{nudge.t.principle}</div>
        <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 12, padding: '10px 13px', fontSize: 12, color: '#6a4f66', fontWeight: 600, lineHeight: 1.5 }}>📊 {nudge.text}</div>
        <button onClick={() => setOpenKey(nudge.t.topic)} style={{ marginTop: 12, fontSize: 12, fontWeight: 800, color: '#9c3f74', background: 'none', border: 'none' }}>See more in {nudge.t.topic} →</button>
      </div>

      {/* Saved tips */}
      {savedTips.length > 0 && <>
        <div className="sec">💾 Your saved tips</div>
        {savedTips.map(tip => (
          <div key={tip.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginBottom: 10, display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <div><div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>{tip.text}</div><div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 4 }}>{tip.source}</div></div>
          </div>
        ))}
      </>}
      <button className="addbtn" style={{ marginBottom: 16 }} onClick={() => { const t = prompt('Paste a tip you found'); if (t) { insert('saved_tips', { text: t, source: 'my note', topic: 'Mindset' }); showToast('Tip saved') } }}>+ Save a tip you found</button>

      {/* Library */}
      <div className="sec">📖 The library</div>
      <div className="pills"><button className={view === 'topic' ? 'on' : ''} onClick={() => setView('topic')}>By topic</button><button className={view === 'source' ? 'on' : ''} onClick={() => setView('source')}>By source</button></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {view === 'topic' ? topics.map(t => {
          const st = TOPIC_STYLES[t] || { bg: 'var(--lav)', color: '#5a52a0', emoji: '📖' }
          const cnt = TEACHINGS.filter(x => x.topic === t).length
          return (
            <button key={t} onClick={() => setOpenKey(t)} style={{ borderRadius: 18, padding: '18px 20px', background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>{st.emoji}</span>
                <div><div style={{ fontSize: 15, fontWeight: 800 }}>{t}</div><div style={{ fontSize: 11, opacity: .75, marginTop: 3 }}>{cnt} teachings</div></div>
              </div>
              <span style={{ fontSize: 22, opacity: .4 }}>›</span>
            </button>
          )
        }) : sources.map(s => {
          const st = SOURCE_STYLES[s] || { bg: 'var(--lav)', color: '#5a52a0', emoji: '📖' }
          const cnt = TEACHINGS.filter(t => t.source.startsWith(s)).length
          return (
            <button key={s} onClick={() => setOpenKey(s)} style={{ borderRadius: 18, padding: '18px 20px', background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>{st.emoji}</span>
                <div><div style={{ fontSize: 15, fontWeight: 800 }}>{s}</div><div style={{ fontSize: 11, opacity: .75, marginTop: 3 }}>{cnt} teachings</div></div>
              </div>
              <span style={{ fontSize: 22, opacity: .4 }}>›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}


const SWATCHES = [
  '#4CAF50','#66BB6A','#FF7043','#FF8A65','#FFA726','#FFB74D',
  '#42A5F5','#64B5F6','#26A69A','#4DB6AC','#7E57C2','#9575CD',
  '#EC407A','#F06292','#EF5350','#EF9A9A','#AB47BC','#CE93D8',
  '#29B6F6','#4FC3F7','#5C6BC0','#7986CB','#E53935','#EF5350',
  '#8D6E63','#A1887F','#EF9FC9','#C9B8EE','#9EC9EF','#D7E6A3',
]

function SettingsEmbed({ catColors, setCatColors }) {
  const [editing, setEditing] = useState(null)
  const { CATS } = require ? { CATS: [] } : {}
  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 14, lineHeight: 1.5 }}>Tap a category to change its color. Updates your chart immediately.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {CATS.map(([name, emoji, defaultColor]) => {
          const color = catColors[name] || defaultColor
          return (
            <div key={name}>
              <button onClick={() => setEditing(editing === name ? null : name)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#fff', border: '1px solid var(--line)', borderRadius: editing === name ? '14px 14px 0 0' : 14, cursor: 'pointer' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{emoji} {name}</div>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink2)' }}>{editing === name ? '▴' : '▾'}</div>
              </button>
              {editing === name && (
                <div style={{ background: '#f8f4fb', border: '1px solid var(--line)', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: 12, marginBottom: 2 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SWATCHES.map(s => (
                      <button key={s} onClick={() => { setCatColors(prev => ({ ...prev, [name]: s })); setEditing(null) }} style={{ width: 30, height: 30, borderRadius: '50%', background: s, border: color === s ? '3px solid #3a3340' : '3px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function More({ db, update, insert, showToast, signOut, demo, catColors = {}, setCatColors }) {
  const [sub, setSub] = useState('debts')
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const titles = { debts: 'Breaking Free 🕊️', income: 'Income 📈', ez: 'EZ-Pass 🚗', teach: 'Teachings 📚' }
  const subsub = { debts: 'Lighter every month', income: 'The big picture', ez: 'Violations to clear', teach: 'Money wisdom, applied to you' }

  return (
    <div className="screen">
      <div className="pagetitle">{titles[sub]}</div>
      <p className="pagesub">{subsub[sub]}</p>
      <div className="monthbar">
        <button className={'chip' + (sub === 'debts' ? ' on' : '')} onClick={() => setSub('debts')}>💳 Debts</button>
        <button className={'chip' + (sub === 'income' ? ' on' : '')} onClick={() => setSub('income')}>📈 Income</button>
        <button className={'chip' + (sub === 'ez' ? ' on' : '')} onClick={() => setSub('ez')}>🚗 EZ-Pass</button>
        {/* Teachings hidden — {<button className={'chip' + (sub === 'teach' ? ' on' : '')} onClick={() => setSub('teach')}>📚 Teachings</button>} */}
      </div>
      {sub === 'debts' && <Debts db={db} update={update} insert={insert} showToast={showToast} />}
      {sub === 'income' && <Income db={db} />}
      {sub === 'ez' && <EZPass db={db} update={update} showToast={showToast} />}
      {/* Teachings hidden */}

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        {demo ? <span style={{ fontSize: 11, color: 'var(--ink2)' }}>Demo mode — nothing is saved</span>
          : confirmSignOut
            ? <div style={{ background: '#fdeef5', borderRadius: 16, padding: 16, border: '1px solid #f0dced' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#5a3f56', marginBottom: 12 }}>Sign out? Your data stays safe — just enter your email to get back in.</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={{ flex: 1, padding: 12, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', color: 'var(--ink2)', fontWeight: 700 }} onClick={() => setConfirmSignOut(false)}>Cancel</button>
                  <button style={{ flex: 1, padding: 12, borderRadius: 12, background: 'var(--pink)', color: '#fff', fontWeight: 700, border: 'none' }} onClick={signOut}>Yes, sign out</button>
                </div>
              </div>
            : <button className="link" onClick={() => setConfirmSignOut(true)}>Sign out</button>}
      </div>
    </div>
  )
}
