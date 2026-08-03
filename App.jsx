import { useState, useEffect } from 'react'
import { useData } from './useData'
import Home from './Home.jsx'
import Bills from './Bills.jsx'
import Spend from './Spend.jsx'
import Checks from './Checks.jsx'
import Savings from './Savings.jsx'
import More from './More.jsx'
import { money, curMonth } from './lib'

const FIXED_USER_ID = 'b8596a83-3ce9-41ea-871d-bc6e64e41b53'

const TABS = [
  ['home', '🌸', 'Home'],
  ['bills', '💌', 'Bills'],
  ['spend', '💸', 'Spend'],
  ['checks', '📬', 'Checks'],
  ['savings', '💫', 'Savings'],
  ['more', '•••', 'More'],
]

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900)
  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 900)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isDesktop
}

function RightPanel({ db, tab }) {
  const debts = [...(db.debts || [])].filter(d => d.balance > 0).sort((a, b) => a.balance - b.balance)
  const focusDebt = debts[0]
  const sorted = [...(db.checks || [])].sort((a, b) => b.date.localeCompare(a.date))
  const last = sorted[0]

  const PAY_SCHEDULE = {
    '2026-07': [3,10,17,24,31], '2026-08': [7,14,21,28],
    '2026-09': [4,11,18,25], '2026-10': [2,9,16,23,30],
    '2026-11': [6,13,20,27], '2026-12': [4,11,18,25], '2027-01': [1,8,15,22,29],
  }

  const lastSlot = (() => {
    if (!last) return 0
    const m = last.date.slice(0,7)
    const days = PAY_SCHEDULE[m] || []
    const day = +last.date.slice(8,10)
    const idx = days.indexOf(day)
    return idx >= 0 ? idx : 0
  })()

  const billSlots = db.bill_slots || []
  const m = last?.date.slice(0,7) || curMonth()
  const days = PAY_SCHEDULE[m] || []
  const totalSlots = days.length

  const getBillsForSlot = (slot) => {
    return (db.bills || []).filter(b => !b.archived).filter(b => {
      const monthSlot = billSlots.find(s => s.bill_id === b.id && s.month === m)
      if (monthSlot) {
        if (monthSlot.split_slots) { try { return JSON.parse(monthSlot.split_slots).includes(slot) } catch(e) {} }
        return monthSlot.check_slot === slot
      }
      if (!b.due_day) return false
      const slotSize = 31 / totalSlots
      return Math.min(totalSlots - 1, Math.floor((b.due_day - 1) / slotSize)) === slot
    })
  }

  const billsThisCheck = last ? getBillsForSlot(lastSlot) : []
  const totalBills = billsThisCheck.reduce((s, b) => s + b.amount, 0)
  const leftover = last ? Math.max(0, last.net - totalBills - 125 - 75) : 0

  const credit = db.credit_scores || []
  const latest = { exp: 0, tu: 0, eq: 0 }
  credit.forEach(c => {
    if (c.bureau === 'Experian') latest.exp = c.score
    if (c.bureau === 'TransUnion') latest.tu = c.score
    if (c.bureau === 'Equifax') latest.eq = c.score
  })

  return (
    <div style={{ width: 260, background: '#fff', borderLeft: '1px solid var(--line)', flexShrink: 0, overflowY: 'auto', padding: '20px 16px' }}>
      {/* This check */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 10 }}>This check</div>
      <div style={{ background: 'linear-gradient(135deg,#fdeef5,#eee7fb)', borderRadius: 14, padding: 14, textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: '#5a3f56', fontFamily: 'var(--mono)', lineHeight: 1 }}>{money(leftover)}</div>
        <div style={{ fontSize: 11, color: '#9d8fa8', marginTop: 4 }}>left this check</div>
        {last && <div style={{ fontSize: 10, color: '#9c3f74', marginTop: 3, fontWeight: 700 }}>Check {lastSlot+1} · {new Date(last.date+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>}
      </div>
      {last && (
        <div style={{ fontSize: 11, marginBottom: 14 }}>
          {[['Net', money(last.net), '#5a52a0'], ['− Bills', money(totalBills), 'var(--ink2)'], ['− Savings', money(125), 'var(--ink2)'], ['− Debt', money(75), 'var(--ink2)']].map(([l,v,c]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: 'var(--ink2)' }}>
              <span>{l}</span><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', borderTop: '1px solid var(--line)', marginTop: 4, fontWeight: 800, color: '#5a52a0' }}>
            <span>Left</span><span style={{ fontFamily: 'var(--mono)' }}>{money(leftover)}</span>
          </div>
        </div>
      )}

      {/* Debt */}
      {focusDebt && <>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 10, marginTop: 4, paddingTop: 14, borderTop: '1px solid var(--line)' }}>Breaking free 🕊️</div>
        <div style={{ background: 'linear-gradient(135deg,#fdeef5,#eee7fb)', borderRadius: 12, padding: 12, marginBottom: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#9d8fa8', marginBottom: 2 }}>focus debt</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#5a3f56' }}>{focusDebt.name}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#9c3f74', fontFamily: 'var(--mono)' }}>{money(focusDebt.balance)}</div>
          <div style={{ fontSize: 9, color: '#9d8fa8', marginTop: 2 }}>+$75 extra this check</div>
        </div>
        {debts.map((d, i) => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 16, height: 16, borderRadius: 5, background: i===0?'var(--pink)':'var(--pink-soft)', color: i===0?'#fff':'#9c3f74', fontSize: 8, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{i+1}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: i===0?'var(--ink)':'var(--ink2)' }}>{d.name}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', color: i===0?'#9c3f74':'var(--ink2)' }}>{money(d.balance)}</span>
          </div>
        ))}
      </>}

      {/* Credit */}
      {(latest.exp > 0 || latest.tu > 0 || latest.eq > 0) && <>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>Credit scores</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['EXP', latest.exp], ['TU', latest.tu], ['EQ', latest.eq]].map(([label, score]) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', background: 'var(--lav)', borderRadius: 10, padding: '8px 4px' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#5a52a0' }}>{score || '—'}</div>
              <div style={{ fontSize: 9, color: '#5a52a0', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [toast, setToast] = useState(null)
  const [catColors, setCatColorsState] = useState({})
  const { db, setDb, loading, insert, update, remove } = useData()
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (db?.profile?.cat_colors && Object.keys(db.profile.cat_colors).length > 0) {
      setCatColorsState(db.profile.cat_colors)
    }
  }, [db?.profile?.cat_colors])

  const setCatColors = (updater) => {
    setCatColorsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      update('profiles', FIXED_USER_ID, { cat_colors: next })
      return next
    })
  }

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2200) }

  if (loading || !db) return <div className="loadwrap"><div className="spin" /></div>

  const api = { db, setDb, insert, update, remove, showToast, go: setTab }

  const content = (
    <>
      {tab === 'home' && <Home {...api} />}
      {tab === 'bills' && <Bills {...api} />}
      {tab === 'spend' && <Spend {...api} catColors={catColors} />}
      {tab === 'checks' && <Checks {...api} />}
      {tab === 'savings' && <Savings {...api} />}
      {tab === 'more' && <More {...api} demo={false} />}
    </>
  )

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#e8e3ee', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ display: 'flex', width: '100%', maxWidth: 1280, height: 'calc(100vh - 48px)', maxHeight: 880, background: 'var(--bg)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(80,60,90,.25)' }}>
          {/* Sidebar */}
          <div style={{ width: 200, background: '#fff', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '24px 18px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#3a3340' }}>The Wealthy Woman</div>
              <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 2 }}>your money, your power</div>
            </div>
            <div style={{ padding: '12px 10px', flex: 1 }}>
              {TABS.map(([id, e, l]) => (
                <button key={id} onClick={() => setTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: tab===id ? 800 : 600, color: tab===id ? '#9c3f74' : 'var(--ink2)', background: tab===id ? 'var(--pink-soft)' : 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 2 }}>
                  <span style={{ fontSize: 18, width: 22, textAlign: 'center' }}>{e}</span>{l}
                </button>
              ))}
            </div>
            <div style={{ padding: '12px 10px', borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--pink),#c48fd0)', display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0 }}>👑</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Jailene</div>
                  <div style={{ fontSize: 10, color: 'var(--ink2)' }}>{new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="desktop-main" style={{ flex: 1, overflowY: 'auto', minWidth: 0, width: '100%' }}>
            {content}
          </div>

          {/* Right panel */}
          <RightPanel db={db} tab={tab} />
        </div>
        {toast && <div className="toast" style={{ position: 'fixed' }}>{toast}</div>}
      </div>
    )
  }

  // Mobile layout
  return (
    <div className="appframe">
      <div className="appscroll">{content}</div>
      <nav className="nav">
        {TABS.map(([id, e, l]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <span className="emo">{e}</span>{l}
          </button>
        ))}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
