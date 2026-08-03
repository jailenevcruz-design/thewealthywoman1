import { useState } from 'react'
import { money, curMonth, todayISO } from './lib'

// Hardcoded Friday pay schedule through Jan 2027
const PAY_SCHEDULE = {
  '2026-07': [3,10,17,24,31],
  '2026-08': [7,14,21,28],
  '2026-09': [4,11,18,25],
  '2026-10': [2,9,16,23,30],
  '2026-11': [6,13,20,27],
  '2026-12': [4,11,18,25],
  '2027-01': [1,8,15,22,29],
}

function getChecksForMonth(m) {
  return (PAY_SCHEDULE[m] || []).map((day, i) => ({
    slot: i,
    day,
    date: `${m}-${String(day).padStart(2,'0')}`,
    label: `Check ${i+1} · ${new Date(`${m}-${String(day).padStart(2,'0')}T00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`
  }))
}

function getBillsForSlot(slot, totalSlots, allBills, month, billSlots) {
  const results = []
  ;(allBills || []).filter(b => !b.archived).forEach(b => {
    // Check monthly slot assignment first
    const monthSlot = (billSlots || []).find(s => s.bill_id === b.id && s.month === month)
    if (monthSlot) {
      if (monthSlot.split_slots) {
        try {
          const slots = JSON.parse(monthSlot.split_slots)
          const amts = monthSlot.split_amts ? JSON.parse(monthSlot.split_amts) : []
          const idx = slots.indexOf(slot)
          if (idx !== -1) { results.push({ ...b, _splitAmt: +amts[idx] || b.amount / slots.length }); return }
          return // has monthly slot but not this one
        } catch(e) {}
      }
      if (monthSlot.check_slot === slot) { results.push(b); return }
      return // has monthly slot but different one
    }
    // Fall back to auto-placement by due date
    if (!b.due_day) return
    const slotSize = 31 / totalSlots
    const s = Math.min(totalSlots - 1, Math.floor((b.due_day - 1) / slotSize))
    if (s === slot) results.push(b)
  })
  return results
}

function getAmt(b, billSlots, month) {
  if (b._splitAmt) return b._splitAmt
  if (billSlots && month) {
    const slot = billSlots.find(s => s.bill_id === b.id && s.month === month)
    if (slot?.amount_override) return slot.amount_override
  }
  return b.amount
}

// ── Bill Assign Sheet ──
function BillAssignSheet({ bill, totalSlots, currentSlot, onAssign, onSplit, onMarkEarly, onClearEarly, onClose, monthAmt, onSaveAmt, currentMonth }) {
  const [mode, setMode] = useState('move')
  const [splitCount, setSplitCount] = useState(2)
  const initSplits = n => Array.from({length:n},(_,i)=>({ slot: Math.min(currentSlot+i,totalSlots-1), amount: +(bill.amount/n).toFixed(2) }))
  const [splits, setSplits] = useState(initSplits(2))
  const updateCount = n => { setSplitCount(n); setSplits(initSplits(n)) }
  const updateSplit = (i,k,v) => setSplits(p=>p.map((s,j)=>j===i?{...s,[k]:k==='slot'?+v:v}:s))
  const splitTotal = splits.reduce((s,x)=>s+(+x.amount||0),0)
  const remainder = +(bill.amount - splitTotal).toFixed(2)

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(60,45,70,.45)',display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'var(--bg)',borderRadius:'20px 20px 0 0',padding:'14px 16px 32px',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{width:36,height:4,background:'#dcd6e0',borderRadius:2,margin:'0 auto 12px'}}/>
        <div style={{fontSize:15,fontWeight:800,marginBottom:2}}>{bill.name}</div>
        <div style={{fontSize:12,color:'var(--ink2)',marginBottom:10}}>{money(bill.amount,2)} default · {bill.autopay?'🔄 autopay':'manual'}</div>
        <div style={{background:'#fff',border:'1.5px solid var(--line)',borderRadius:12,padding:'10px 13px',marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:800,color:'var(--ink2)',marginBottom:6}}>AMOUNT THIS MONTH</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input id="amtOverride" defaultValue={monthAmt||bill.amount} type="number" step="0.01" style={{flex:1,padding:'8px 11px',borderRadius:10,border:'1.5px solid var(--line)',fontSize:16,fontWeight:700}}/>
            <button onClick={()=>{const v=+document.getElementById('amtOverride').value;if(v>0)onSaveAmt(v)}} style={{padding:'8px 14px',borderRadius:10,background:'var(--matcha)',color:'#4e6327',fontWeight:800,fontSize:12,border:'none',cursor:'pointer'}}>Save</button>
          </div>
          <div style={{fontSize:10,color:'var(--ink2)',marginTop:5}}>Only affects this month — default stays {money(bill.amount)}</div>
        </div>
        <div style={{display:'flex',background:'#efe7f2',borderRadius:12,padding:3,marginBottom:16}}>
          <button onClick={()=>setMode('move')} style={{flex:1,padding:8,borderRadius:10,fontWeight:800,fontSize:12,border:'none',background:mode==='move'?'#fff':'none',color:mode==='move'?'#9c3f74':'var(--ink2)',cursor:'pointer'}}>Move to check</button>
          <button onClick={()=>setMode('split')} style={{flex:1,padding:8,borderRadius:10,fontWeight:800,fontSize:12,border:'none',background:mode==='split'?'#fff':'none',color:mode==='split'?'#9c3f74':'var(--ink2)',cursor:'pointer'}}>Split payments</button>
        </div>
        {mode==='move' ? (
          <div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:prevCheck?10:0}}>
              {Array.from({length:totalSlots},(_,i)=>(
                <button key={i} onClick={()=>onAssign(bill,i)} style={{flex:1,minWidth:50,padding:'12px 6px',borderRadius:12,fontWeight:800,fontSize:14,border:'none',background:currentSlot===i?'var(--pink)':'var(--lav)',color:currentSlot===i?'#fff':'#5a52a0',cursor:'pointer'}}>{i+1}</button>
              ))}
            </div>
              <button onClick={()=>onMarkEarly(bill)} style={{width:'100%',padding:'11px 14px',borderRadius:12,background:'#e7f2c7',border:'1.5px solid #b8d98a',color:'#3a5a1f',fontWeight:800,fontSize:12,cursor:'pointer',textAlign:'left',marginTop:8}}>
                ✅ Not from this check
                <div style={{fontSize:10,fontWeight:600,opacity:.8,marginTop:2}}>Removes from this check's total — mark as handled elsewhere</div>
              </button>
              {bill.early_payments && (() => { try { const ep = typeof bill.early_payments==='string'?JSON.parse(bill.early_payments):bill.early_payments; return ep[currentMonth]?.planned ? <button onClick={()=>onClearEarly(bill)} style={{width:'100%',padding:'9px 14px',borderRadius:12,background:'#fee2e2',border:'1.5px solid #fca5a5',color:'#c0483f',fontWeight:800,fontSize:11,cursor:'pointer',textAlign:'left',marginTop:6}}>↩ Put back on this check</button> : null } catch(e){return null} })()}
          </div>
        ) : (
          <div>
            <div style={{fontSize:11,fontWeight:800,color:'var(--ink2)',marginBottom:8}}>SPLIT ACROSS HOW MANY CHECKS?</div>
            <div style={{display:'flex',gap:8,marginBottom:16}}>
              {[2,3,4].map(n=>(
                <button key={n} onClick={()=>updateCount(n)} style={{flex:1,padding:10,borderRadius:12,fontWeight:800,fontSize:14,border:'none',background:splitCount===n?'var(--pink)':'var(--lav)',color:splitCount===n?'#fff':'#5a52a0',cursor:'pointer'}}>{n}</button>
              ))}
            </div>
            {splits.map((s,i)=>(
              <div key={i} style={{display:'flex',gap:10,marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:'var(--ink2)',marginBottom:4,fontWeight:800}}>CHECK</div>
                  <select value={s.slot} onChange={e=>updateSplit(i,'slot',e.target.value)} style={{width:'100%',padding:'9px 10px',borderRadius:11,border:'1.5px solid var(--line)',fontSize:13}}>
                    {Array.from({length:totalSlots},(_,j)=><option key={j} value={j}>Check {j+1}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:'var(--ink2)',marginBottom:4,fontWeight:800}}>AMOUNT</div>
                  <input value={s.amount} onChange={e=>updateSplit(i,'amount',e.target.value)} inputMode="decimal" style={{width:'100%',padding:'9px 10px',borderRadius:11,border:'1.5px solid var(--line)',fontSize:13}}/>
                </div>
              </div>
            ))}
            <div style={{background:remainder===0?'#e1f5ee':'#fff6ea',borderRadius:12,padding:'9px 13px',fontSize:12,fontWeight:700,color:remainder===0?'#3b8f6a':'#9a6a1a',marginBottom:14,display:'flex',justifyContent:'space-between'}}>
              <span>{remainder===0?'✅ Amounts match':'⚠️ Remainder'}</span>
              {remainder!==0&&<span style={{fontFamily:'var(--mono)'}}>{money(Math.abs(remainder),2)}</span>}
            </div>
            <button onClick={()=>onSplit(bill,splits)} disabled={remainder!==0} style={{width:'100%',padding:13,borderRadius:14,background:remainder===0?'var(--matcha)':'#dcd6e0',color:remainder===0?'#4e6327':'var(--ink2)',fontWeight:800,fontSize:14,border:'none',cursor:remainder===0?'pointer':'default',marginBottom:8}}>Confirm split ✨</button>
          </div>
        )}
        <button onClick={onClose} style={{width:'100%',padding:11,borderRadius:14,background:'#fff',border:'1.5px solid var(--line)',color:'var(--ink2)',fontWeight:700,fontSize:13,cursor:'pointer',marginTop:8}}>Cancel</button>
      </div>
    </div>
  )
}

// ── One-time item edit sheet ──
function OneTimeSheet({ item, totalSlots, onSave, onDelete, onClose }) {
  const [name, setName] = useState(item.name)
  const [amount, setAmount] = useState(String(item.amount))
  const [slot, setSlot] = useState(item.check_slot)
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(60,45,70,.45)',display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'var(--bg)',borderRadius:'20px 20px 0 0',padding:'14px 16px 32px'}}>
        <div style={{width:36,height:4,background:'#dcd6e0',borderRadius:2,margin:'0 auto 12px'}}/>
        <div style={{fontSize:15,fontWeight:800,marginBottom:14}}>Edit one-time item ✨</div>
        <div className="field"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Affirm payment" style={{width:'100%',padding:'9px 12px',borderRadius:12,border:'1.5px solid var(--line)',fontSize:14,fontWeight:600}}/></div>
        <div className="field"><label>Amount</label><input value={amount} onChange={e=>setAmount(e.target.value)} type="number" step="0.01" style={{width:'100%',padding:'9px 12px',borderRadius:12,border:'1.5px solid var(--line)',fontSize:14}}/></div>
        <div style={{fontSize:11,fontWeight:800,color:'var(--ink2)',marginBottom:8}}>MOVE TO CHECK</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          {Array.from({length:totalSlots},(_,i)=>(
            <button key={i} onClick={()=>setSlot(i)} style={{flex:1,minWidth:50,padding:'10px 6px',borderRadius:12,fontWeight:800,fontSize:13,border:'none',background:slot===i?'var(--pink)':'var(--lav)',color:slot===i?'#fff':'#5a52a0',cursor:'pointer'}}>{i+1}</button>
          ))}
        </div>
        <button onClick={()=>onSave(item.id,name,+amount||0,slot)} style={{width:'100%',padding:13,borderRadius:14,background:'var(--matcha)',color:'#4e6327',fontWeight:800,fontSize:14,border:'none',cursor:'pointer',marginBottom:8}}>Save changes ✨</button>
        <button onClick={onClose} style={{width:'100%',padding:11,borderRadius:14,background:'#fff',border:'1.5px solid var(--line)',color:'var(--ink2)',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:8}}>Cancel</button>
        <button onClick={()=>{ if(window.confirm('Remove this item?')) onDelete(item.id) }} style={{width:'100%',padding:10,borderRadius:12,background:'none',border:'none',color:'#c0483f',fontWeight:700,fontSize:12,cursor:'pointer'}}>🗑 Remove</button>
      </div>
    </div>
  )
}

// ── This Week ──
function ThisWeek({ check, slot, db, update, insert, remove, showToast }) {
  const m = check.date.slice(0,7)
  const checksForMonth = getChecksForMonth(m)
  const totalSlots = checksForMonth.length
  const billSlots = db.bill_slots || []
  const billsForSlot = getBillsForSlot(slot, totalSlots, db.bills, m, billSlots)
  const oneTimeItems = (db.one_time_items||[]).filter(i=>i.month===m&&i.check_slot===slot)
  const totalBills = billsForSlot.reduce((s,b)=>s+getAmt(b, billSlots, m),0)
  const totalOneTime = oneTimeItems.reduce((s,i)=>s+i.amount,0)
  const paidBills = billsForSlot.reduce((s,b)=>s+(b.status==='paid'?getAmt(b, billSlots, m):b.paid_amount||0),0)
  const paidCount = billsForSlot.filter(b=>b.status==='paid'||(b.paid_amount||0)>=getAmt(b, billSlots, m)).length
  const debtExtra = 75
  const savingsRec = 125
  const leftover = check.net - totalBills - totalOneTime - debtExtra - savingsRec
  const debts = [...(db.debts||[])].filter(d=>d.balance>0).sort((a,b)=>a.balance-b.balance)
  const focusDebt = debts[0]
  // Derive paid state from db.spend instead of local state
  const paidOneTimeIds = new Set((db.spend||[]).filter(s=>s.one_time_id).map(s=>s.one_time_id))

  const markBillPaid = (bill) => {
    const isPaid = bill.status==='paid'||(bill.paid_amount||0)>=getAmt(bill, billSlots, m)
    if (isPaid) {
      const linked = (db.spend||[]).find(s=>s.bill_id===bill.id)
      if (linked) remove('spend',linked.id)
      update('bills',bill.id,{status:'unpaid',paid_amount:0})
      showToast(`${bill.name} reverted`)
    } else {
      update('bills',bill.id,{status:'paid',paid_amount:bill.amount})
      insert('spend',{place:bill.name,category:'Housing',emoji:'🧾',color:'#a89be6',amount:getAmt(bill, billSlots, m),date:todayISO(),bill_id:bill.id})
      showToast(`${bill.name} paid ✨`)
    }
  }

  const markOneTimePaid = (item) => {
    const isPaid = paidOneTimeIds.has(item.id)
    if (isPaid) {
      const linked = (db.spend||[]).find(s=>s.one_time_id===item.id)
      if (linked) remove('spend',linked.id)
      showToast(`${item.name} reverted`)
    } else {
      insert('spend',{place:item.name,category:'Personal',emoji:'✨',color:'#f6b26b',amount:item.amount,date:todayISO(),one_time_id:item.id})
      showToast(`${item.name} marked paid ✨`)
    }
  }

  const logDebt = (debt,amt) => {
    update('debts',debt.id,{balance:Math.max(0,debt.balance-(+amt||0))})
    insert('debt_payments',{debt_id:debt.id,amount:+amt,date:todayISO()})
    showToast(`Payment logged on ${debt.name} ✨`)
  }

  const Row = ({icon,iconBg,iconColor,title,sub,amt,amtColor,btnLabel,btnColor,btnBg,onBtn,isDone}) => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid var(--line)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:22,height:22,borderRadius:'50%',background:isDone?'#3b8f6a':iconBg,border:`2px solid ${isDone?'#3b8f6a':iconColor||'#dcd6e0'}`,display:'grid',placeItems:'center',fontSize:10,color:isDone?'#fff':'',fontWeight:800,flexShrink:0}}>{isDone?'✓':icon}</div>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:isDone?'var(--ink2)':'var(--ink)'}}>{title}</div>
          {sub&&<div style={{fontSize:10,color:'var(--ink2)',marginTop:1}}>{sub}</div>}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{fontSize:12,fontWeight:700,fontFamily:'var(--mono)',color:amtColor||'var(--ink)'}}>{amt}</div>
        {btnLabel&&<button onClick={onBtn} style={{fontSize:10,fontWeight:800,color:btnColor||'#3b8f6a',background:btnBg||'#e1f5ee',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer'}}>{btnLabel}</button>}
      </div>
    </div>
  )

  return (
    <div>
      {/* Big left number hero - full width */}
      <div style={{background:'linear-gradient(135deg,#fdeef5,#eee7fb)',borderRadius:20,padding:20,marginBottom:14,textAlign:'center'}}>
        <div style={{fontSize:52,fontWeight:800,color:'#5a3f56',fontFamily:'var(--mono)',lineHeight:1}}>{money(Math.max(0,leftover))}</div>
        <div style={{fontSize:12,color:'#9d8fa8',marginTop:6,fontWeight:600}}>you have left this check</div>
        <div style={{fontSize:11,color:'#9c3f74',marginTop:4,fontWeight:700}}>after bills, one-time items & savings</div>
      </div>
      <div className="thisweek-grid">

      {/* Breakdown summary */}
      <div style={{background:'#fff',border:'1px solid var(--line)',borderRadius:16,overflow:'hidden',marginBottom:12}}>
        {[
          ['Net take-home', money(check.net,2), '#5a52a0'],
          ['− Bills this check', money(totalBills,2), '#c0483f'],
          ['− One-time items', money(totalOneTime,2), '#c0483f'],
          ['− Debt payment', money(debtExtra,2), '#c0483f'],
          ['− Savings', money(savingsRec,2), '#c0483f'],
        ].map(([label,amt,color],i,arr)=>(
          <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'9px 14px',borderBottom:i<arr.length-1?'1px solid var(--line)':'none',fontSize:12}}>
            <span style={{color:'var(--ink2)'}}>{label}</span>
            <span style={{fontFamily:'var(--mono)',fontWeight:700,color}}>{amt}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderTop:'1px solid var(--line)',fontSize:14,fontWeight:800,color:'#5a52a0'}}>
          <span>Left for you</span>
          <span style={{fontFamily:'var(--mono)'}}>{money(Math.max(0,leftover),2)}</span>
        </div>
      </div>

      {/* Bills */}
      <div style={{background:'#fff',border:'1px solid var(--line)',borderRadius:16,overflow:'hidden',marginBottom:12}}>
        <div style={{padding:'10px 14px',fontSize:10,fontWeight:800,color:'var(--ink2)',letterSpacing:'.5px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between'}}>
          <span>BILLS THIS CHECK</span><span>{paidCount}/{billsForSlot.length} paid</span>
        </div>
        {billsForSlot.length===0&&<div style={{padding:14,fontSize:12,color:'var(--ink2)'}}>No bills assigned — set up in Budgets</div>}
        {billsForSlot.map((b,idx)=>{
          const isPaid=b.status==='paid'||(b.paid_amount||0)>=getAmt(b, billSlots, m)
          return (
            <div key={b.id} style={{borderBottom:idx<billsForSlot.length-1?'1px solid var(--line)':'none'}}>
              <Row
                isDone={isPaid}
                icon={''}
                iconBg='#fff'
                title={b.name}
                sub={<>{b.autopay&&<span style={{background:'#e0f2fe',color:'#0878a0',padding:'1px 5px',borderRadius:6,fontWeight:800,marginRight:4}}>auto</span>}due {b.due_day}{b.due_day===1?'st':b.due_day===2?'nd':b.due_day===3?'rd':'th'}</>}
                amt={money(getAmt(b, billSlots, m),2)}
                amtColor={isPaid?'#3b8f6a':'var(--ink)'}
                btnLabel={isPaid?'undo':'pay'}
                btnColor={isPaid?'#c0483f':'#3b8f6a'}
                btnBg={isPaid?'#fee2e2':'#e1f5ee'}
                onBtn={()=>markBillPaid(b)}
              />
            </div>
          )
        })}
      </div>

      {/* One-time items */}
      {oneTimeItems.length>0&&(
        <div style={{background:'#fff',border:'1px solid var(--line)',borderRadius:16,overflow:'hidden',marginBottom:12}}>
          <div style={{padding:'10px 14px',fontSize:10,fontWeight:800,color:'var(--ink2)',letterSpacing:'.5px',borderBottom:'1px solid var(--line)'}}>ONE-TIME ITEMS</div>
          {oneTimeItems.map((item,idx)=>{
            const isPaid=paidOneTimeIds.has(item.id)
            return (
              <div key={item.id} style={{borderBottom:idx<oneTimeItems.length-1?'1px solid var(--line)':'none'}}>
                <Row
                  isDone={isPaid}
                  icon='✨'
                  iconBg='#fff3dc'
                  iconColor='#d4a017'
                  title={item.name}
                  sub='one-time'
                  amt={money(item.amount,2)}
                  amtColor={isPaid?'#3b8f6a':'var(--ink)'}
                  btnLabel={isPaid?'undo':'paid'}
                  btnColor={isPaid?'#c0483f':'#3b8f6a'}
                  btnBg={isPaid?'#fee2e2':'#e1f5ee'}
                  onBtn={()=>markOneTimePaid(item)}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Debt + Savings */}
      <div style={{background:'#fff',border:'1px solid var(--line)',borderRadius:16,overflow:'hidden',marginBottom:12}}>
        {focusDebt&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid var(--line)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:22,height:22,borderRadius:'50%',background:'var(--pink-soft)',display:'grid',placeItems:'center',fontSize:11,flexShrink:0}}>💳</div>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>{focusDebt.name}</div>
                <div style={{fontSize:10,color:'var(--ink2)',marginTop:1}}>debt payment · snowball</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{fontSize:12,fontWeight:700,fontFamily:'var(--mono)',color:'#9c3f74'}}>{money(debtExtra)}</div>
              <button onClick={()=>{const a=prompt(`Log payment on ${focusDebt.name}`,debtExtra);if(a&&+a>0)logDebt(focusDebt,a)}} style={{fontSize:10,fontWeight:800,color:'#9c3f74',background:'var(--pink-soft)',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer'}}>log</button>
            </div>
          </div>
        )}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:22,height:22,borderRadius:'50%',background:'#e7f2c7',display:'grid',placeItems:'center',fontSize:11,flexShrink:0}}>🌱</div>
            <div>
              <div style={{fontSize:12,fontWeight:700}}>Savings</div>
              <div style={{fontSize:10,color:'var(--ink2)',marginTop:1}}>pay yourself first</div>
            </div>
          </div>
          <div style={{fontSize:12,fontWeight:700,fontFamily:'var(--mono)',color:'#3b8f6a'}}>{money(savingsRec)}</div>
        </div>
      </div>
      </div>{/* end thisweek-grid */}
    </div>
  )
}


// ── Add Item Sheet ──
function AddItemSheet({ slot, slotLabel, month, bills, onAdd, onClose }) {
  const [name, setName] = useState('')
  const [amt, setAmt] = useState('')
  const [isEarlyBill, setIsEarlyBill] = useState(false)
  const [selectedBill, setSelectedBill] = useState('')
  const [coversMonth, setCoversMonth] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const activeBills = (bills||[]).filter(b=>!b.archived)

  const handleBillSelect = (billId) => {
    setSelectedBill(billId)
    const bill = activeBills.find(b=>b.id===billId)
    if (bill) { setName(bill.name); setAmt(String(bill.amount)) }
  }

  // Generate month options: current + next 3
  const monthOptions = []
  const [yr, mo] = month.split('-').map(Number)
  for (let i=0; i<4; i++) {
    const d = new Date(yr, mo-1+i, 1)
    const val = d.toISOString().slice(0,7)
    monthOptions.push({ val, label: d.toLocaleDateString('en-US',{month:'long',year:'numeric'}) })
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(60,45,70,.45)',display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'var(--bg)',borderRadius:'20px 20px 0 0',padding:'14px 16px 32px',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{width:36,height:4,background:'#dcd6e0',borderRadius:2,margin:'0 auto 12px'}}/>
        <div style={{fontSize:15,fontWeight:800,marginBottom:2}}>Add one-time item ✨</div>
        <div style={{fontSize:12,color:'var(--ink2)',marginBottom:16}}>{slotLabel}</div>

        {/* Early bill toggle */}
        <div style={{background:'#fff',border:'1.5px solid var(--line)',borderRadius:14,padding:'12px 14px',marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:13,fontWeight:800}}>This covers a bill early</div>
              <div style={{fontSize:11,color:'var(--ink2)',marginTop:2}}>e.g. paying Aug rent from this check</div>
            </div>
            <button onClick={()=>setIsEarlyBill(v=>!v)} style={{width:40,height:24,borderRadius:12,background:isEarlyBill?'#5aa0d8':'#dcd6e0',position:'relative',border:'none',flexShrink:0,cursor:'pointer'}}>
              <div style={{position:'absolute',top:3,[isEarlyBill?'right':'left']:3,width:18,height:18,borderRadius:'50%',background:'#fff'}}/>
            </button>
          </div>
          {isEarlyBill && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:10,fontWeight:800,color:'var(--ink2)',marginBottom:6}}>WHICH BILL?</div>
              <select value={selectedBill} onChange={e=>handleBillSelect(e.target.value)} style={{width:'100%',padding:'9px 11px',borderRadius:11,border:'1.5px solid var(--line)',fontSize:13,marginBottom:10}}>
                <option value="">Pick a bill…</option>
                {activeBills.map(b=><option key={b.id} value={b.id}>{b.name} · {money(b.amount)}</option>)}
              </select>
              <div style={{fontSize:10,fontWeight:800,color:'var(--ink2)',marginBottom:6}}>PAYING FOR WHICH MONTH?</div>
              <select value={coversMonth} onChange={e=>setCoversMonth(e.target.value)} style={{width:'100%',padding:'9px 11px',borderRadius:11,border:'1.5px solid var(--line)',fontSize:13}}>
                <option value="">Pick month…</option>
                {monthOptions.map(mo=><option key={mo.val} value={mo.val}>{mo.label}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="field"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Rent, Affirm payment, Birthday dinner" style={{width:'100%',padding:'9px 12px',borderRadius:12,border:'1.5px solid var(--line)',fontSize:14,fontWeight:600}}/></div>
        <div className="field"><label>Amount</label><input value={amt} onChange={e=>setAmt(e.target.value)} type="number" step="0.01" placeholder="0.00" style={{width:'100%',padding:'9px 12px',borderRadius:12,border:'1.5px solid var(--line)',fontSize:14}}/></div>

        {isEarlyBill && amt && selectedBill && (
          <div style={{background:'#e7f2c7',borderRadius:12,padding:'10px 13px',fontSize:11,color:'#3a5a1f',fontWeight:600,marginBottom:14,lineHeight:1.5}}>
            ✅ {name||'This bill'} will show as covered in {monthOptions.find(o=>o.val===coversMonth)?.label||'the selected month'}
            {+amt < (activeBills.find(b=>b.id===selectedBill)?.amount||0) ? ` · $${(activeBills.find(b=>b.id===selectedBill)?.amount||0) - (+amt||0)} still owed` : ' · fully covered'}
          </div>
        )}

        <button onClick={()=>{ if(submitting) return; setSubmitting(true); onAdd(name, amt, isEarlyBill?selectedBill:null, isEarlyBill?coversMonth:null); onClose(); }} disabled={submitting||!name||!amt||(isEarlyBill&&(!selectedBill||!coversMonth))} style={{width:'100%',padding:13,borderRadius:14,background:(submitting||!name||!amt||(isEarlyBill&&(!selectedBill||!coversMonth)))?'#dcd6e0':'var(--matcha)',color:(submitting||!name||!amt||(isEarlyBill&&(!selectedBill||!coversMonth)))?'var(--ink2)':'#4e6327',fontWeight:800,fontSize:14,border:'none',cursor:submitting?'default':'pointer',marginBottom:8}}>
          {submitting ? 'Adding…' : `Add to Check ${slot+1} ✨`}
        </button>
        <button onClick={onClose} style={{width:'100%',padding:11,borderRadius:14,background:'#fff',border:'1.5px solid var(--line)',color:'var(--ink2)',fontWeight:700,fontSize:13,cursor:'pointer'}}>Cancel</button>
      </div>
    </div>
  )
}

// ── Budgets ──
function Budgets({ db, update, insert, remove, showToast }) {
  const months = Object.keys(PAY_SCHEDULE)
  const curM = curMonth()
  const defaultIdx = (() => {
    const idx = months.indexOf(curM)
    if (idx !== -1) return idx
    // If current month not in schedule, find closest future month
    const future = months.findIndex(m => m >= curM)
    return future !== -1 ? future : months.length - 1
  })()
  const [monthIdx, setMonthIdx] = useState(defaultIdx)
  const [assignSheet, setAssignSheet] = useState(null)
  const [oneTimeSheet, setOneTimeSheet] = useState(null)
  const [addingSlot, setAddingSlot] = useState(null)
  const [newName, setNewName] = useState('')
  const [newAmt, setNewAmt] = useState('')

  const m = months[monthIdx]
  const checks = getChecksForMonth(m)
  const totalSlots = checks.length
  const oneTimeItems = (db.one_time_items||[]).filter(i=>i.month===m)
  const [yr, mo] = m.split('-').map(Number)
  const billSlots = db.bill_slots || []
  // Previous month's last check
  const prevM = months[monthIdx - 1]
  const prevChecks = prevM ? getChecksForMonth(prevM) : []
  const prevLastCheck = prevChecks.length > 0 ? prevChecks[prevChecks.length - 1] : null
  const prevCheck = prevLastCheck ? { ...prevLastCheck, month: prevM, date: `${prevM}-${String(prevLastCheck.day).padStart(2,'0')}`, label: `${new Date(prevM+'-15').toLocaleDateString('en-US',{month:'short'})} ${prevLastCheck.day} Check ${prevLastCheck.slot+1}` } : null

  const handleAssign = (bill, slot) => {
    const existing = billSlots.find(s => s.bill_id === bill.id && s.month === m)
    if (existing) {
      update('bill_slots', existing.id, { check_slot: slot, split_slots: null, split_amts: null })
    } else {
      insert('bill_slots', { bill_id: bill.id, month: m, check_slot: slot, split_slots: null, split_amts: null })
    }
    showToast(`${bill.name} → Check ${slot+1} for ${m}`)
    setAssignSheet(null)
  }

  const handleSaveAmt = (bill, amt) => {
    const existing = billSlots.find(s => s.bill_id === bill.id && s.month === m)
    if (existing) {
      update('bill_slots', existing.id, { amount_override: amt })
    } else {
      // Calculate current auto slot so bill stays visible after override
      const slotSize = 31 / totalSlots
      const autoSlot = bill.due_day ? Math.min(totalSlots - 1, Math.floor((bill.due_day - 1) / slotSize)) : 0
      insert('bill_slots', { bill_id: bill.id, month: m, check_slot: autoSlot, amount_override: amt })
    }
    showToast(`${bill.name} set to ${money(amt)} for ${m} ✨`)
    setAssignSheet(null)
  }

  const handleMarkEarly = (bill) => {
    const earlyPayments = bill.early_payments ? (typeof bill.early_payments==='string' ? JSON.parse(bill.early_payments) : bill.early_payments) : {}
    earlyPayments[m] = { amount: getAmt(bill, billSlots, m), label: 'planned · handled elsewhere', planned: true }
    update('bills', bill.id, { early_payments: earlyPayments })
    showToast(`${bill.name} removed from this check's total ✨`)
    setAssignSheet(null)
  }

  const handleClearEarly = (bill) => {
    const earlyPayments = bill.early_payments ? (typeof bill.early_payments==='string' ? JSON.parse(bill.early_payments) : bill.early_payments) : {}
    delete earlyPayments[m]
    update('bills', bill.id, { early_payments: earlyPayments })
    showToast(`${bill.name} back on this check`)
    setAssignSheet(null)
  }

  const handleSplit = (bill, splits) => {
    const existing = billSlots.find(s => s.bill_id === bill.id && s.month === m)
    const payload = { bill_id: bill.id, month: m, check_slot: splits[0].slot, split_slots: JSON.stringify(splits.map(s=>s.slot)), split_amts: JSON.stringify(splits.map(s=>s.amount)) }
    if (existing) { update('bill_slots', existing.id, payload) }
    else { insert('bill_slots', payload) }
    showToast(`${bill.name} split across ${splits.length} checks ✨`)
    setAssignSheet(null)
  }

  const addOneTime = (slot, name, amt, coversBillId, coversMonth) => {
    if (!name||!amt) return
    const payload = { name, amount:+amt||0, check_slot:slot, month:m, covers_bill_id: coversBillId||null, covers_month: coversMonth||null }
    insert('one_time_items', payload)
    // If covers a bill, mark that bill as early paid in the target month
    if (coversBillId && coversMonth) {
      const bill = (db.bills||[]).find(b=>b.id===coversBillId)
      if (bill) {
        const checkLabel = `${new Date(m+'-15').toLocaleDateString('en-US',{month:'short'})} ${checks[slot].day} Check ${slot+1}`
        // Store early payment info on the bill keyed by month
        const earlyPayments = bill.early_payments ? JSON.parse(bill.early_payments) : {}
        earlyPayments[coversMonth] = { check: `${m}-${String(checks[slot].day).padStart(2,'0')}`, label: checkLabel, amount: +amt||0 }
        update('bills', bill.id, { early_payments: JSON.stringify(earlyPayments) })
      }
    }
    setAddingSlot(null)
    showToast(`${name} added ✨`)
  }

  const saveOneTime = (id, name, amount, slot) => {
    const item = oneTimeItems.find(i=>i.id===id)
    if (!item) return
    // use remove + insert to update (simple approach)
    remove('one_time_items', id)
    insert('one_time_items',{name,amount,check_slot:slot,month:m})
    showToast('Updated ✨')
    setOneTimeSheet(null)
  }

  const deleteOneTime = (id) => {
    remove('one_time_items', id)
    setOneTimeSheet(null)
    showToast('Removed ✨')
  }

  return (
    <div>
      {/* Month picker */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',border:'1px solid var(--line)',borderRadius:14,padding:'11px 16px',marginBottom:14}}>
        <button onClick={()=>setMonthIdx(i=>Math.max(0,i-1))} disabled={monthIdx===0} style={{fontSize:20,color:monthIdx===0?'#dcd6e0':'#9c3f74',background:'none',border:'none',cursor:monthIdx===0?'default':'pointer',padding:'2px 8px',fontWeight:800}}>‹</button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:15,fontWeight:800}}>{new Date(m+'-15').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
          <div style={{fontSize:10,color:'var(--ink2)',marginTop:2}}>{totalSlots} checks · Fri {checks[0]?.day} – {checks[totalSlots-1]?.day}</div>
        </div>
        <button onClick={()=>setMonthIdx(i=>Math.min(months.length-1,i+1))} disabled={monthIdx===months.length-1} style={{fontSize:20,color:monthIdx===months.length-1?'#dcd6e0':'#9c3f74',background:'none',border:'none',cursor:monthIdx===months.length-1?'default':'pointer',padding:'2px 8px',fontWeight:800}}>›</button>
      </div>

      <div style={{background:'var(--lav)',borderRadius:12,padding:'9px 12px',fontSize:11,color:'#5a52a0',fontWeight:600,marginBottom:14,lineHeight:1.5}}>
        💡 Tap any bill to move or split it. Tap ✨ items to edit or move them.
      </div>

      <div className="budget-grid">
      {checks.map(({slot,day,label})=>{
        const billsHere = getBillsForSlot(slot, totalSlots, db.bills, m, billSlots)
        const itemsHere = oneTimeItems.filter(i=>i.check_slot===slot)
        const getEarlyAmt = b => { try { if (!b.early_payments) return 0; const ep = typeof b.early_payments === 'string' ? JSON.parse(b.early_payments) : b.early_payments; return ep[m]?.amount||0 } catch(e) { return 0 } }
        const billTotal = billsHere.reduce((s,b)=>{
          const early = getEarlyAmt(b)
          const amt = getAmt(b, billSlots, m)
          // If fully paid early, don't count. If partial, count remainder
          if (early >= amt) return s
          return s + (amt - early)
        }, 0)
        const itemTotal = itemsHere.reduce((s,i)=>s+i.amount,0)
        const total = billTotal + itemTotal
        const isBonus = slot===totalSlots-1&&totalSlots===5

        return (
          <div key={slot} style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <div style={{fontSize:10,fontWeight:800,color:'var(--pink)',letterSpacing:'.5px'}}>
                CHECK {slot+1} · FRI {new Date(yr,mo-1,day).toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase()}{isBonus?' · 🎁 BONUS':''}
              </div>
              <div style={{fontSize:11,fontWeight:800,color:'#5a3f56',fontFamily:'var(--mono)'}}>{money(total,2)}</div>
            </div>

            <div style={{background:'#fff',border:'1px solid var(--line)',borderRadius:14,overflow:'hidden'}}>
              {billsHere.length===0&&itemsHere.length===0&&(
                <div style={{padding:'12px 14px',fontSize:12,color:'var(--ink2)'}}>No bills assigned here yet</div>
              )}

              {(() => {
                const getEarly = b => { try { if (!b.early_payments) return null; const ep = typeof b.early_payments === 'string' ? JSON.parse(b.early_payments) : b.early_payments; return ep[m]||null } catch(e) { return null } }
                const regularBills = billsHere.filter(b => !getEarly(b))
                const earlyBills = billsHere.filter(b => !!getEarly(b))
                return <>
                  {regularBills.map((b,idx)=>(
                    <button key={b.id} onClick={()=>setAssignSheet({bill:b,currentSlot:slot})}
                      style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'none',border:'none',borderBottom:(idx<regularBills.length-1||earlyBills.length>0||itemsHere.length>0)?'1px solid var(--line)':'none',cursor:'pointer',textAlign:'left'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:22,height:22,borderRadius:7,background:b.autopay?'#e0f2fe':'var(--lav)',color:b.autopay?'#0878a0':'#5a52a0',fontSize:9,fontWeight:800,display:'grid',placeItems:'center',flexShrink:0}}>{b.autopay?'A':slot+1}</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:'var(--ink)'}}>{b.name}</div>
                          <div style={{fontSize:10,color:'var(--ink2)',marginTop:1}}>{b.autopay?'🔄 auto · ':''}due {b.due_day}{b.due_day===1?'st':'th'}{b._splitAmt?' · split':''}</div>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{fontSize:12,fontWeight:700,fontFamily:'var(--mono)'}}>{money(getAmt(b, billSlots, m),2)}</div>
                        <div style={{fontSize:12,color:'#9c3f74'}}>›</div>
                      </div>
                    </button>
                  ))}
                  {earlyBills.length>0&&(
                    <>
                      <div style={{padding:'7px 14px',background:'#f0faf4',borderBottom:'1px solid var(--line)',fontSize:9,fontWeight:800,color:'#3b8f6a',letterSpacing:'.5px'}}>✅ PAID EARLY FROM PREVIOUS CHECK</div>
                      {earlyBills.map((b,idx)=>{
                        const ep = getEarly(b)
                        const isPartial = ep && +ep.amount < +b.amount
                        return (
                          <button key={b.id} onClick={()=>setAssignSheet({bill:b,currentSlot:slot})}
                            style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#f0faf4',border:'none',borderBottom:(idx<earlyBills.length-1||itemsHere.length>0)?'1px solid var(--line)':'none',cursor:'pointer',textAlign:'left',opacity:.85}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{width:22,height:22,borderRadius:7,background:'#e1f5ee',color:'#3b8f6a',fontSize:10,fontWeight:800,display:'grid',placeItems:'center',flexShrink:0}}>✓</div>
                              <div>
                                <div style={{fontSize:12,fontWeight:700,color:'var(--ink2)'}}>{b.name}</div>
                                <div style={{fontSize:10,color:'#3b8f6a',marginTop:1}}>
                                  {ep?.label} · {money(ep?.amount||0)}
                                  {isPartial&&<span style={{color:'#d4a017',marginLeft:4}}>· {money(b.amount-(+ep.amount||0))} still owed</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{fontSize:12,fontWeight:700,fontFamily:'var(--mono)',color:'#3b8f6a'}}>{money(ep?.amount||0,2)}</div>
                              <div style={{fontSize:12,color:'#9c3f74'}}>›</div>
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}
                </>
              })()}

              {itemsHere.map((item,idx)=>(
                <button key={item.id} onClick={()=>setOneTimeSheet(item)}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#fffbf0',border:'none',borderBottom:idx<itemsHere.length-1?'1px solid var(--line)':'none',cursor:'pointer',textAlign:'left'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:22,height:22,borderRadius:7,background:'#fff3dc',color:'#9a6a1a',fontSize:11,display:'grid',placeItems:'center',flexShrink:0}}>✨</div>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:'var(--ink)'}}>{item.name}</div>
                      <div style={{fontSize:10,color:'#9a6a1a',marginTop:1}}>one-time · tap to edit</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{fontSize:12,fontWeight:700,fontFamily:'var(--mono)'}}>{money(item.amount,2)}</div>
                    <div style={{fontSize:12,color:'#9a6a1a'}}>›</div>
                  </div>
                </button>
              ))}

              {/* Add item footer */}
              {(
                <div style={{padding:'8px 14px',background:'#f8f4fb',borderTop:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <button onClick={()=>setAddingSlot(slot)} style={{fontSize:10,fontWeight:800,color:'#9a6a1a',background:'#fff3dc',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer'}}>+ add item</button>
                  <span style={{fontSize:11,color:'var(--ink2)'}}>{billsHere.length} bills{itemsHere.length>0?` · ${itemsHere.length} items`:''}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      </div>
      {addingSlot!==null&&<AddItemSheet
        slot={addingSlot}
        slotLabel={checks[addingSlot]?.label||`Check ${addingSlot+1}`}
        month={m}
        bills={db.bills}
        onAdd={(name,amt,billId,coversMonth)=>addOneTime(addingSlot,name,amt,billId,coversMonth)}
        onClose={()=>setAddingSlot(null)}
      />}
      {assignSheet&&<BillAssignSheet
        bill={assignSheet.bill}
        totalSlots={totalSlots}
        currentSlot={assignSheet.currentSlot}
        onAssign={handleAssign}
        onSplit={handleSplit}
        onMarkEarly={handleMarkEarly}
        onClearEarly={handleClearEarly}
        onClose={()=>setAssignSheet(null)}
        monthAmt={billSlots.find(s=>s.bill_id===assignSheet.bill.id&&s.month===m)?.amount_override||null}
        onSaveAmt={(amt)=>handleSaveAmt(assignSheet.bill,amt)}
        currentMonth={m}
      />}
      {oneTimeSheet&&<OneTimeSheet item={oneTimeSheet} totalSlots={totalSlots} onSave={saveOneTime} onDelete={deleteOneTime} onClose={()=>setOneTimeSheet(null)}/>}
    </div>
  )
}

// ── Main Checks component ──
export default function Checks({ db, insert, update, remove, showToast }) {
  const [pill, setPill] = useState('week')
  const sorted = [...(db.checks||[])].sort((a,b)=>b.date.localeCompare(a.date))
  const last = sorted[0]

  // Find slot for last check using PAY_SCHEDULE
  const lastSlot = (() => {
    if (!last) return 0
    const m = last.date.slice(0,7)
    const days = PAY_SCHEDULE[m] || []
    const day = +last.date.slice(8,10)
    const idx = days.indexOf(day)
    return idx >= 0 ? idx : 0
  })()

  const [form, setForm] = useState({
    date: todayISO(),
    gross: last ? String(last.gross) : '',
    tax: last ? String(last.tax) : '',
    ded: last ? String(last.ded) : '',
  })
  const net = (+form.gross||0) - (+form.tax||0) - (+form.ded||0)

  const saveCheck = () => {
    insert('checks',{date:form.date,gross:+form.gross||0,tax:+form.tax||0,ded:+form.ded||0,net})
    showToast('Check logged ✨')
    setPill('week')
  }

  const totG = (db.checks||[]).reduce((s,c)=>s+c.gross,0)
  const totN = (db.checks||[]).reduce((s,c)=>s+c.net,0)

  return (
    <div className="screen">
      <div className="pagetitle">Checks 📬</div>
      <p className="pagesub">Every paycheck, start to finish</p>
      <div className="pills">
        <button className={pill==='week'?'on':''} onClick={()=>setPill('week')}>This week</button>
        <button className={pill==='budgets'?'on':''} onClick={()=>setPill('budgets')}>Budgets</button>
        <button className={pill==='log'?'on':''} onClick={()=>setPill('log')}>+ Log</button>
        <button className={pill==='hist'?'on':''} onClick={()=>setPill('hist')}>History</button>
      </div>

      {pill==='week' && (
        last ? (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div>
                <div style={{fontSize:16,fontWeight:800}}>Check {lastSlot+1} · {new Date(last.date+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                <div style={{fontSize:11,color:'var(--ink2)',marginTop:2}}>{money(last.net,2)} net · slot {lastSlot+1} of {(PAY_SCHEDULE[last.date.slice(0,7)]||[]).length}</div>
              </div>
              <button onClick={()=>setPill('log')} style={{fontSize:12,fontWeight:800,color:'#5a52a0',background:'var(--lav)',border:'none',borderRadius:20,padding:'6px 14px',cursor:'pointer'}}>+ Log new</button>
            </div>
            <ThisWeek check={last} slot={lastSlot} db={db} update={update} insert={insert} remove={remove} showToast={showToast}/>
          </div>
        ) : (
          <div style={{textAlign:'center',padding:'40px 20px',color:'var(--ink2)'}}>
            <div style={{fontSize:32,marginBottom:10}}>📬</div>
            <div style={{fontSize:14,fontWeight:700}}>No checks logged yet</div>
            <button onClick={()=>setPill('log')} style={{marginTop:16,padding:'12px 24px',borderRadius:14,background:'var(--pink)',color:'#fff',fontWeight:800,fontSize:14,border:'none',cursor:'pointer'}}>+ Log your first check</button>
          </div>
        )
      )}

      {pill==='budgets' && <Budgets db={db} update={update} insert={insert} remove={remove} showToast={showToast}/>}

      {pill==='hist' && (
        <div>
          {sorted.map(c=>{
            const m=c.date.slice(0,7)
            const days=PAY_SCHEDULE[m]||[]
            const day=+c.date.slice(8,10)
            const slot=Math.max(0,days.indexOf(day))
            return (
              <button key={c.id} onClick={()=>setPill('week')} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',border:'1px solid var(--line)',borderRadius:14,padding:'12px 14px',marginBottom:8,cursor:'pointer',textAlign:'left'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800}}>{new Date(c.date+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                  <div style={{fontSize:11,color:'var(--ink2)',marginTop:2}}>Check {slot+1} · {money(c.gross,2)} gross</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#5a52a0',fontFamily:'var(--mono)'}}>{money(c.net,2)}</div>
                  <div style={{fontSize:10,color:'var(--ink2)'}}>net</div>
                </div>
              </button>
            )
          })}
          <div style={{background:'linear-gradient(135deg,#eef6dd,#e8f3fb)',borderRadius:14,padding:'12px 14px',marginTop:8}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:800}}>
              <span>YTD total</span><span style={{fontFamily:'var(--mono)',color:'#245b86'}}>{money(totN,2)}</span>
            </div>
            <div style={{fontSize:11,color:'var(--ink2)',marginTop:3}}>{(db.checks||[]).length} checks · {money(totG,2)} gross</div>
          </div>
        </div>
      )}

      {pill==='log' && (
        <div>
          <div style={{background:'var(--lav)',borderRadius:13,padding:'9px 12px',fontSize:11,fontWeight:700,color:'#5a52a0',marginBottom:14}}>✨ Pre-filled from last check — change what's different.</div>
          <div className="field"><label>Pay date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
          <div className="field"><label>Gross earned</label><input type="number" step="0.01" value={form.gross} onChange={e=>setForm({...form,gross:e.target.value})}/></div>
          <div style={{display:'flex',gap:10}}>
            <div className="field" style={{flex:1}}><label>Taxes</label><input type="number" step="0.01" value={form.tax} onChange={e=>setForm({...form,tax:e.target.value})}/></div>
            <div className="field" style={{flex:1}}><label>Deductions</label><input type="number" step="0.01" value={form.ded} onChange={e=>setForm({...form,ded:e.target.value})}/></div>
          </div>
          <div style={{background:'var(--lav2)',borderRadius:13,padding:'11px 14px',display:'flex',justifyContent:'space-between',marginBottom:16}}>
            <span style={{fontWeight:800,color:'#4a3f58'}}>Net take-home</span>
            <span style={{fontFamily:'var(--mono)',fontSize:17,fontWeight:800,color:'#6a4fa0'}}>{money(net,2)}</span>
          </div>
          <button onClick={saveCheck} style={{width:'100%',padding:13,borderRadius:14,background:'var(--matcha)',color:'#4e6327',fontWeight:800,fontSize:14,border:'none',cursor:'pointer',marginBottom:8}}>Save check ✨</button>
          <button onClick={()=>setPill('week')} style={{width:'100%',padding:11,borderRadius:14,background:'#fff',border:'1.5px solid var(--line)',color:'var(--ink2)',fontWeight:700,fontSize:13,cursor:'pointer'}}>Cancel</button>
        </div>
      )}
    </div>
  )
}
