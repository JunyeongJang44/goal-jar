import { supabase, isSupabaseConfigured } from './supabaseClient'

// 데이터 레이어: Supabase 가 설정돼 있으면 공유 DB,
// 아니면 localStorage 로 동작하는 로컬 데모 모드.
//
//  - goals        : { id, title, target_amount, created_at }      (여러 행)
//  - transactions : { id, goal_id, name, type, amount, memo, created_at }
//      type = 'deposit' | 'withdraw', amount 는 항상 양수.

const LS_GOALS = 'funfun.goals'
const LS_TX = 'funfun.transactions'

export const DEMO_MODE = !isSupabaseConfigured

// ---------- 로컬(데모) 헬퍼 ----------
const lsRead = (k) => {
  const raw = localStorage.getItem(k)
  return raw ? JSON.parse(raw) : []
}
const lsWrite = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const uuid = () => crypto.randomUUID()

// ---------- 목표(goals) ----------
export async function fetchGoals() {
  if (DEMO_MODE) {
    return lsRead(LS_GOALS)
      .filter((g) => !g.deleted_at)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createGoal({ title, emoji, target_amount }) {
  const row = {
    title: (title || '새 목표').trim() || '새 목표',
    emoji: emoji || '🎯',
    target_amount: Number(target_amount) || 0,
  }
  if (DEMO_MODE) {
    const goals = lsRead(LS_GOALS)
    const g = { ...row, id: uuid(), created_at: new Date().toISOString() }
    goals.push(g)
    lsWrite(LS_GOALS, goals)
    return g
  }
  const { data, error } = await supabase.from('goals').insert(row).select().single()
  if (error) throw error
  return data
}

// 목표 이름 수정과 목표 삭제는 UI에서 불가(의도적으로 제거).
// 특정 시점 복구 등은 어드민이 DB를 직접 수정한다.

// ---------- 입출금(transactions) ----------
export async function fetchTransactions(goalId) {
  if (DEMO_MODE) {
    return lsRead(LS_TX)
      .filter((t) => t.goal_id === goalId && !t.deleted_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addTransaction({ goal_id, name, type, amount, memo }) {
  const row = {
    goal_id,
    name: (name || '익명').trim() || '익명',
    type: type === 'withdraw' ? 'withdraw' : 'deposit',
    amount: Number(amount),
    memo: (memo || '').slice(0, 10) || null,
  }
  if (DEMO_MODE) {
    const list = lsRead(LS_TX)
    const entry = { ...row, id: uuid(), created_at: new Date().toISOString() }
    list.push(entry)
    lsWrite(LS_TX, list)
    return entry
  }
  const { data, error } = await supabase
    .from('transactions')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

// 트랜잭션 삭제는 UI에서 불가(의도적으로 제거).
// 특정 기록 제거가 필요하면 어드민이 DB를 직접 수정한다.

// 누적액 = 입금 합 - 출금 합
export function calcTotal(transactions) {
  return transactions.reduce(
    (sum, t) => sum + (t.type === 'withdraw' ? -Number(t.amount) : Number(t.amount)),
    0,
  )
}

// 실시간 구독: Supabase 모드에서만. 데모 모드는 no-op.
export function subscribeAll(onChange) {
  if (DEMO_MODE || !supabase) return () => {}
  const channel = supabase
    .channel('funfun-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => onChange())
    .subscribe()
  return () => supabase.removeChannel(channel)
}
