import { useEffect, useState, useCallback, useRef } from 'react'
import {
  DEMO_MODE,
  fetchGoals,
  createGoal,
  fetchTransactions,
  addTransaction,
  calcTotal,
  subscribeAll,
} from './data'

import { celebrateGoal } from './celebrate'

const won = (n) => new Intl.NumberFormat('ko-KR').format(Number(n) || 0) + '원'

// 숫자가 또르르 올라가는 카운트업 훅
function useCountUp(value, duration = 700) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef(0)
  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])
  return display
}

export default function App() {
  const [goals, setGoals] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 입출금 입력 폼
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')

  // 목표 생성 폼 (생성만 가능 — 이름 수정은 불가)
  const [goalForm, setGoalForm] = useState(null) // null | { title, emoji, target }

  // 애니메이션 상태
  const [coins, setCoins] = useState([]) // 코인 튀는 효과
  const [walking, setWalking] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const prevReachedRef = useRef(false)

  const activeGoal = goals.find((g) => g.id === activeId) || null

  const loadGoals = useCallback(async () => {
    const g = await fetchGoals()
    setGoals(g)
    setActiveId((prev) => (prev && g.some((x) => x.id === prev) ? prev : g[0]?.id || null))
    return g
  }, [])

  const loadTxs = useCallback(async (goalId) => {
    if (!goalId) {
      setTxs([])
      return
    }
    const t = await fetchTransactions(goalId)
    setTxs(t)
  }, [])

  const reload = useCallback(async () => {
    try {
      const g = await loadGoals()
      const active = (activeId && g.some((x) => x.id === activeId)) ? activeId : g[0]?.id || null
      await loadTxs(active)
      setError('')
    } catch (e) {
      setError(e.message || '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [loadGoals, loadTxs, activeId])

  useEffect(() => {
    reload()
    const unsub = subscribeAll(reload)
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 활성 목표가 바뀌면 그 목표의 기록 로드
  useEffect(() => {
    if (activeId) loadTxs(activeId).catch((e) => setError(e.message))
  }, [activeId, loadTxs])

  const total = calcTotal(txs)
  const target = Number(activeGoal?.target_amount || 0)
  const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0
  const reached = target > 0 && total >= target
  const animatedTotal = useCountUp(total)

  // 방금 목표를 달성한 순간에만 축하 연출
  useEffect(() => {
    if (reached && !prevReachedRef.current) {
      setCelebrate(true)
      celebrateGoal() // 화면 전체 폭죽 + 꽃가루
      const burst = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now() + i,
        emoji: ['🎉', '✨', '🎊', '⭐'][i % 4],
        dx: (i - 2.5) * 36,
      }))
      setCoins((c) => [...c, ...burst])
      setTimeout(() => setCelebrate(false), 700)
    }
    prevReachedRef.current = reached
  }, [reached])

  // 코인 효과 자동 제거
  useEffect(() => {
    if (coins.length === 0) return
    const t = setTimeout(() => setCoins([]), 900)
    return () => clearTimeout(t)
  }, [coins])

  async function submitTx(type) {
    const value = Number(amount)
    if (!activeGoal) return
    if (reached) {
      setError('이미 목표를 달성해서 입출금이 마감됐어요.')
      return
    }
    if (!value || value <= 0) {
      setError('0보다 큰 금액을 입력하세요.')
      return
    }
    try {
      await addTransaction({ goal_id: activeGoal.id, name, type, amount: value, memo })
      setAmount(''); setName(''); setMemo('')
      // 입금이면 코인이 튀고 마스코트가 걸어감
      if (type === 'deposit') {
        const burst = Array.from({ length: 3 }, (_, i) => ({
          id: Date.now() + i,
          emoji: '🪙',
          dx: (i - 1) * 30,
        }))
        setCoins((c) => [...c, ...burst])
      }
      setWalking(true)
      setTimeout(() => setWalking(false), 900)
      await loadTxs(activeGoal.id)
      setError('')
    } catch (e) {
      setError(e.message || '기록 추가에 실패했습니다.')
    }
  }

  async function submitGoalForm(e) {
    e.preventDefault()
    try {
      const g = await createGoal({
        title: goalForm.title,
        emoji: goalForm.emoji,
        target_amount: goalForm.target,
      })
      await loadGoals()
      setActiveId(g.id)
      setGoalForm(null)
      setError('')
    } catch (e) {
      setError(e.message || '목표 생성에 실패했습니다.')
    }
  }

  if (loading) return <div className="app"><p className="muted">불러오는 중…</p></div>

  return (
    <div className="app">
      {DEMO_MODE && (
        <div className="banner">
          데모 모드 — 이 브라우저에만 저장됩니다. 기기 간 공유를 켜려면
          Supabase 키를 <code>.env</code> 에 넣으세요.
        </div>
      )}

      {/* 탭 네비게이션 */}
      <nav className="tabs">
        {goals.map((g) => (
          <button
            key={g.id}
            className={'tab' + (g.id === activeId ? ' active' : '')}
            onClick={() => setActiveId(g.id)}
          >
            {g.emoji || '🎯'} {g.title}
          </button>
        ))}
        <button
          className="tab add"
          onClick={() => setGoalForm({ title: '', emoji: '🎯', target: '' })}
        >
          + 새 목표
        </button>
      </nav>

      {/* 목표 생성/수정 폼 */}
      {goalForm && (
        <form onSubmit={submitGoalForm} className="goal-edit">
          <div className="emoji-field">
            <span className="emoji-preview">{goalForm.emoji}</span>
            <div className="emoji-picker">
              {['🎯','🐷','✈️','🏠','🚗','💍','🎁','📚','💻','🎓','🏖️','🎮','💰','🍰'].map((em) => (
                <button
                  type="button"
                  key={em}
                  className={'emoji-opt' + (goalForm.emoji === em ? ' sel' : '')}
                  onClick={() => setGoalForm({ ...goalForm, emoji: em })}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <input
            value={goalForm.title}
            onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
            placeholder="목표 이름 (예: 여행 자금) — 생성 후 변경 불가"
            autoFocus
          />
          <input
            type="number"
            value={goalForm.target}
            onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })}
            placeholder="목표 금액"
          />
          <div className="row">
            <button type="submit">만들기</button>
            <button type="button" className="ghost" onClick={() => setGoalForm(null)}>취소</button>
          </div>
        </form>
      )}

      {/* 빈 상태 */}
      {!activeGoal && !goalForm && (
        <section className="empty">
          <div className="big">🐷</div>
          <p className="muted">아직 목표가 없어요.<br/>첫 목표를 만들어 저금을 시작해봐요!</p>
          <button onClick={() => setGoalForm({ title: '', emoji: '🎯', target: '' })}>
            🎯 첫 목표 만들기
          </button>
        </section>
      )}

      {/* 활성 목표 화면 */}
      {activeGoal && (
        <>
          <section className={'progress-card' + (celebrate ? ' celebrate' : '')}>
            <div className="goal-head">
              <h1>{activeGoal.emoji || '🎯'} {activeGoal.title}</h1>
            </div>
            <div className="amounts">
              <span className="current">{won(animatedTotal)}</span>
              <span className="target">/ {won(target)}</span>
            </div>

            {/* 목표를 향해 걷는 마스코트 */}
            <div className="track">
              <span
                className={'mascot' + (walking ? ' walking' : '')}
                style={{ left: pct + '%' }}
              >
                {reached ? '🏆' : (activeGoal.emoji || '🐷')}
              </span>
              <div className="track-line">
                <div
                  className={'track-fill' + (reached ? ' done' : pct >= 80 ? ' almost' : '')}
                  style={{ width: pct + '%' }}
                />
              </div>
            </div>

            <div className={'pct' + (reached ? ' reached' : '')}>
              {reached ? '🎉 목표 달성!' : `${pct.toFixed(1)}% 달성 중`}
            </div>
          </section>

          <form className="add-form" onSubmit={(e) => e.preventDefault()}>
            <div className="add-row">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (선택)" />
              <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액" />
            </div>
            <input value={memo} maxLength={10} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (10자 이하)" disabled={reached} />
            <div className="btn-row">
              <button type="button" className="deposit" onClick={() => submitTx('deposit')} disabled={reached}>+ 입금</button>
              <button type="button" className="withdraw" onClick={() => submitTx('withdraw')} disabled={reached}>− 출금</button>
            </div>
            {reached && <p className="done-hint">🎉 목표를 달성해서 입출금이 마감됐어요!</p>}
          </form>

          {error && <p className="error">{error}</p>}

          <section className="list">
            <h2>기록 ({txs.length})</h2>
            {txs.length === 0 ? (
              <p className="muted">아직 기록이 없습니다. 첫 금액을 입력해보세요.</p>
            ) : (
              <ul>
                {txs.map((t) => (
                  <li key={t.id}>
                    <span className="who">{t.name || '익명'}</span>
                    <span className={'amt ' + t.type}>
                      {t.type === 'withdraw' ? '−' : '+'}{won(t.amount)}
                    </span>
                    {t.memo && <span className="memo">“{t.memo}”</span>}
                    <span className="when">{new Date(t.created_at).toLocaleString('ko-KR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* 코인/축하 효과 오버레이 */}
      {coins.map((c) => (
        <span
          key={c.id}
          className="coin-burst"
          style={{ marginLeft: c.dx + 'px' }}
        >
          {c.emoji}
        </span>
      ))}
    </div>
  )
}
