import { useState, useEffect, useCallback } from 'react'
import { supabase, hasSupabase } from './supabaseClient'
import { SEED_CHECKS, SEED_BILLS, SEED_DEBTS, SEED_GOALS, SEED_CREDIT, SEED_EZ } from './seed'

const curMonth = () => new Date().toISOString().slice(0, 7)
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

// YOUR permanent user ID — data always loads from this, no login needed
const FIXED_USER_ID = 'b8596a83-3ce9-41ea-871d-bc6e64e41b53'

function buildDemo() {
  const m = curMonth()
  return {
    bills: SEED_BILLS.map((b, i) => ({ id: uid(), name: b.name, amount: b.amount, grp: b.grp, due_day: b.due_day, month: m, status: 'unpaid', paid_amount: 0, running: b.name === 'Rent', autopay: ['Tidal Music','iCloud','T-Mobile Phone'].includes(b.name), archived: false, sort: i })),
    spend: [], checks: SEED_CHECKS.map(c => ({ id: uid(), ...c })),
    accounts: [{ id: 'acc1', name: 'Ally Savings', sort: 1 }],
    goals: SEED_GOALS.map((g, i) => ({ id: uid(), account_id: 'acc1', ...g, sort: i })),
    deposits: [],
    debts: SEED_DEBTS.map((d, i) => ({ id: uid(), name: d.name, balance: d.balance, apr: d.apr, min_payment: d.min, sort: i })),
    debt_payments: [],
    violations: SEED_EZ.map(v => ({ id: uid(), ...v })),
    credit_scores: SEED_CREDIT.map(c => ({ id: uid(), ...c })),
    saved_tips: [],
    profile: { pay_yourself_target: 125 },
  }
}

export function useData() {
  const [db, setDb] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkMonthReset = async () => {
    if (!hasSupabase) return
    const currentMonth = new Date().toISOString().slice(0, 7)
    // Check last reset month from profile
    const { data: prof } = await supabase.from('ww_profiles').select('last_reset_month').eq('id', FIXED_USER_ID).maybeSingle()
    if (prof && prof.last_reset_month !== currentMonth) {
      // New month — reset all bills to unpaid and clear paid amounts
      await supabase.from('ww_bills')
        .update({ status: 'unpaid', paid_amount: 0 })
        .eq('user_id', FIXED_USER_ID)
        .eq('archived', false)
      // Save current month as last reset
      await supabase.from('ww_profiles').update({ last_reset_month: currentMonth }).eq('id', FIXED_USER_ID)
    }
  }

  const loadAll = useCallback(async () => {
    await checkMonthReset()
    if (!hasSupabase) { setDb(buildDemo()); setLoading(false); return }
    setLoading(true)
    const tables = ['bills','spend','checks','accounts','goals','deposits','debts','debt_payments','violations','credit_scores','saved_tips','one_time_items','bill_slots']
    const out = {}
    await Promise.all(tables.map(async t => {
      const { data } = await supabase.from('ww_' + t).select('*').eq('user_id', FIXED_USER_ID)
      out[t] = data || []
    }))
    const { data: prof } = await supabase.from('ww_profiles').select('*').eq('id', FIXED_USER_ID).maybeSingle()
    out.profile = prof || { pay_yourself_target: 125 }
    setDb(out)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const insert = async (table, row) => {
    const local = { id: uid(), ...row }
    setDb(d => ({ ...d, [table]: [...d[table], local] }))
    if (hasSupabase) {
      const { data } = await supabase.from('ww_' + table).insert({ ...row, user_id: FIXED_USER_ID }).select().single()
      if (data) setDb(d => ({ ...d, [table]: d[table].map(x => x.id === local.id ? data : x) }))
    }
    return local
  }

  const update = async (table, id, patch) => {
    if (table === 'profiles') {
      // profiles uses user_id as key, update locally and upsert
      setDb(d => ({ ...d, profile: { ...d.profile, ...patch } }))
      if (hasSupabase) await supabase.from('ww_profiles').update(patch).eq('id', FIXED_USER_ID)
      return
    }
    setDb(d => ({ ...d, [table]: d[table].map(x => x.id === id ? { ...x, ...patch } : x) }))
    if (hasSupabase) await supabase.from('ww_' + table).update(patch).eq('id', id)
  }

  const remove = async (table, id) => {
    setDb(d => ({ ...d, [table]: d[table].filter(x => x.id !== id) }))
    if (hasSupabase) await supabase.from('ww_' + table).delete().eq('id', id)
  }

  return { db, setDb, loading, insert, update, remove, reload: loadAll }
}
