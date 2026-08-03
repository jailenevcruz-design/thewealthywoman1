import { useState, useEffect } from 'react'
import { money, curMonth, getDailySlots, pickNudge } from './lib'

function Hero() {
  const [slots] = useState(() => getDailySlots())
  const [i, setI] = useState(0)
  const next = () => setI(x => (x + 1) % 3)
  useEffect(() => { const t = setInterval(next, 15000); return () => clearInterval(t) }, [])
  const { quote: q, image } = slots[i]
  return (
    <div>
      <div className="hero" onClick={next} style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center 30%' }}>
        <div className="scrim" />
        <div className="inner">
          <div className="kicker">🌸 Her money era</div>
          <div className="quote">"{q.t}"</div>
          {q.by && <div className="by">— {q.by}</div>}
        </div>
      </div>
      <div className="dots">{[0,1,2].map(d => <i key={d} className={d === i ? 'on' : ''} />)}</div>
    </div>
  )
}

function Gauge({ score, color }) {
  const frac = Math.max(0, Math.min(1, (score - 300) / 550))
  const off = 157 - 157 * frac
  const ang = Math.PI * (1 - frac), cx = 60 + 50 * Math.cos(ang), cy = 55 - 50 * Math.sin(ang)
  return (
    <svg className="gauge" viewBox="0 0 120 60">
      <path d="M10,55 A50,50 0 0,1 110,55" fill="none" stroke="#eee" strokeWidth="9" strokeLinecap="round" />
      <path d="M10,55 A50,50 0 0,1 110,55" fill="none" stroke="url(#gg)" strokeWidth="9" strokeLinecap="round" strokeDasharray="157" strokeDashoffset={off} />
      <circle cx={cx} cy={cy} r="5" fill={color} stroke="#fff" strokeWidth="2" />
      <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#E24B4A" /><stop offset="0.4" stopColor="#EF9F27" />
        <stop offset="0.7" stopColor="#97C459" /><stop offset="1" stopColor="#1D9E75" />
      </linearGradient></defs>
    </svg>
  )
}

const band = s => s >= 800 ? ['Excellent','#1D9E75'] : s >= 740 ? ['Very good','#3b8f6a'] : s >= 670 ? ['Good','#639922'] : s >= 580 ? ['Fair','#BA7517'] : ['Poor','#C0483F']

export default function Home({ db, go, update, showToast }) {
  const m = curMonth()
  const mb = db.bills.filter(b => !b.archived)
  const paid = mb.filter(b => b.status === 'paid').length
  const totalDebt = db.debts.reduce((s, d) => s + d.balance, 0)
  const saved = db.goals.reduce((s, g) => s + g.saved, 0)
  const START_DEBT = 39300
  const pct = Math.max(0, Math.round(((START_DEBT - totalDebt) / START_DEBT) * 100))
  const ef = db.goals.find(g => /emergency/i.test(g.name)) || db.goals[0] || { saved: 0, target: 1 }
  const efPct = Math.round((ef.saved / (ef.target || 1)) * 100)
  const thisMonthNet = db.checks.filter(c => c.date.slice(0, 7) === m).reduce((s, c) => s + c.net, 0)
  const nextBill = [...mb].filter(b => b.status !== 'paid').sort((a, b) => a.due_day - b.due_day)[0]
  const nudge = pickNudge(db)

  const editScore = cs => {
    const v = prompt(`Update ${cs.bureau} score`, cs.score)
    if (v && !isNaN(+v)) { update('credit_scores', cs.id, { score: +v }); showToast('Score updated') }
  }

  return (
    <div>
      <div className="apphead">
        <div><h1>The Wealthy Woman 🌸</h1><div className="cats">Bills · Savings · Debt · Take-home</div></div>
        <div className="synced">Synced</div>
      </div>
      <div className="screen">
        <Hero />

        <div className="sec">This month at a glance</div>
        <div className="grid2" style={{ marginBottom: 12 }}>
          <button className="tile t-pink" onClick={() => go('bills')}><div className="big">{paid}/{mb.length}</div><div className="cap">bills paid 💌</div></button>
          <button className="tile t-sage" onClick={() => go('checks')}><div className="big">{money(thisMonthNet)}</div><div className="cap">take-home 📬</div></button>
        </div>
        <div className="grid2">
          <button className="tile t-lav" onClick={() => go('more')}><div className="big">{money(totalDebt)}</div><div className="cap">total debt 💳</div></button>
          <button className="tile t-sky" onClick={() => go('savings')}><div className="big">{money(saved)}</div><div className="cap">saved 💫</div></button>
        </div>

        <button className="feat" onClick={() => go('more')}>
          <div className="ring" style={{ background: `conic-gradient(var(--pink) ${pct}%, #efe6f2 0)` }}>
            <b style={{ color: 'var(--pink)' }}>{pct}%<small>paid off</small></b>
          </div>
          <div>
            <div className="goalname">Breaking Free 🕊️</div>
            <div className="goalsub">{money(totalDebt)} to go</div>
            <div className="goaleta" style={{ color: 'var(--pink)' }}>every payment counts</div>
          </div>
          <div className="featdots"><i className="on" /><i /></div>
        </button>

        <div className="sec p">Quick log</div>
        <div className="grid4">
          <button className="ql a" onClick={() => go('spend')}><span className="emo">🧾</span>Bill</button>
          <button className="ql b" onClick={() => go('checks')}><span className="emo">💵</span>Income</button>
          <button className="ql c" onClick={() => go('savings')}><span className="emo">💫</span>Save</button>
          <button className="ql d" onClick={() => go('more')}><span className="emo">🚗</span>EZ</button>
        </div>

        <div className="grid2" style={{ marginTop: 16 }}>
          <div className="statcard t-lav">
            <div className="lbl">💫 {ef.name || 'Emergency'}</div>
            <div className="num">{money(ef.saved)}<span style={{ fontSize: 13, opacity: .7 }}> / {money(ef.target)}</span></div>
            <div className="bar dk" style={{ marginTop: 9 }}><i style={{ width: Math.min(100, efPct) + '%', background: '#8b7fd0' }} /></div>
            <div className="foot">{efPct}% there</div>
          </div>
          <div className="statcard t-pink">
            <div className="lbl">💌 Next bill</div>
            <div className="num">{nextBill ? money(nextBill.amount) : '—'}</div>
            <div className="foot">{nextBill ? `${nextBill.name} · due ${nextBill.due_day}${nextBill.due_day === 1 ? 'st' : 'th'}` : 'all paid 🎉'}</div>
          </div>
        </div>

        <div className="sec">Credit scores</div>
        <div className="creditgrid">
          {db.credit_scores.filter(c => c.bureau !== 'Equifax').map(cs => {
            const [lbl, col] = band(cs.score)
            return (
              <button key={cs.id} className={'credit ' + (cs.bureau === 'Experian' ? 'a' : 'b')} onClick={() => editScore(cs)}>
                <div className="who">{cs.bureau}</div>
                <div className="score" style={{ color: col }}>{cs.score}</div>
                <div className="band" style={{ color: col }}>{lbl}</div>
                <Gauge score={cs.score} color={col} />
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink2)', textAlign: 'center', marginTop: 10 }}>tap a score to update it</p>
      </div>
    </div>
  )
}
