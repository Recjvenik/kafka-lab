import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TABS = [
    { id: 'offsets', label: 'Offset Behavior' },
    { id: 'reset', label: 'Offset Reset' },
    { id: 'rebalance', label: 'Rebalancing' },
    { id: 'semantics', label: 'Delivery Semantics' },
    { id: 'ordering', label: 'Ordering Guarantees' },
]

export default function ScenariosPage() {
    const [active, setActive] = useState('offsets')
    return (
        <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', background: 'rgba(168,85,247,0.12)', color: '#a855f7', borderRadius: 20, border: '1px solid rgba(168,85,247,0.2)' }}>Module 7</span>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.5px' }}>Scenarios Lab</h1>
                <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Deep-dive into offsets, rebalancing, delivery guarantees, and ordering.</p>
            </div>
            <TabBar tabs={TABS} active={active} setActive={setActive} color="#a855f7" />
            <AnimatePresence mode="wait">
                <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    {active === 'offsets' && <OffsetBehavior />}
                    {active === 'reset' && <OffsetReset />}
                    {active === 'rebalance' && <RebalancingSimulator />}
                    {active === 'semantics' && <DeliverySemantics />}
                    {active === 'ordering' && <OrderingGuarantees />}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

function TabBar({ tabs, active, setActive, color }) {
    return (
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
            {tabs.map(t => (
                <button key={t.id} onClick={() => setActive(t.id)} style={{
                    padding: '9px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
                    color: active === t.id ? color : '#475569', fontSize: 13, fontWeight: active === t.id ? 700 : 400,
                    borderBottom: active === t.id ? `2px solid ${color}` : '2px solid transparent', marginBottom: '-1px',
                }}>{t.label}</button>
            ))}
        </div>
    )
}

function GlassCard({ children, style }) {
    return <div className="glass" style={{ borderRadius: 14, padding: 20, ...style }}>{children}</div>
}

// ── Offset Behavior ─────────────────────────────────────────
function OffsetBehavior() {
    const [committed, setCommitted] = useState(4)
    const [produced, setProduced] = useState(8)
    const msgs = Array.from({ length: produced }, (_, i) => i)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Offsets: Per Partition, Per Group</h2>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                    Offsets are <strong style={{ color: '#e2e8f0' }}>per partition, per consumer group</strong>. Two groups reading the same partition
                    have completely independent offsets — neither affects the other.
                </p>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>
                    The <strong style={{ color: '#f97316' }}>committed offset</strong> is the last offset the consumer
                    has durably saved to <code style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '1px 5px', borderRadius: 4 }}>__consumer_offsets</code>.
                    On restart, the consumer resumes from committed offset.
                </p>
            </GlassCard>

            <GlassCard>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#94a3b8' }}>
                    Partition Log (drag the sliders to simulate)
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                    {msgs.map(i => {
                        const isCommitted = i < committed
                        const isProcessed = i < produced
                        return (
                            <div key={i} style={{
                                width: 52, height: 52, borderRadius: 8, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                background: isCommitted ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.08)',
                                border: `1px solid ${isCommitted ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.2)'}`,
                            }}>
                                <div style={{ fontSize: 10, color: '#475569' }}>@{i}</div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: isCommitted ? '#4ade80' : '#60a5fa', marginTop: 2 }}>
                                    {isCommitted ? 'committed' : 'polled'}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b' }}>Produced messages: <strong style={{ color: '#3b82f6' }}>{produced}</strong></label>
                        <input type="range" min={1} max={12} value={produced} onChange={e => { setProduced(+e.target.value); setCommitted(Math.min(committed, +e.target.value)) }} style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b' }}>Committed offset: <strong style={{ color: '#22c55e' }}>{committed}</strong></label>
                        <input type="range" min={0} max={produced} value={committed} onChange={e => setCommitted(+e.target.value)} style={{ width: '100%' }} />
                    </div>
                </div>

                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(249,115,22,0.08)', borderRadius: 10, fontSize: 12, color: '#f97316' }}>
                    Consumer lag = {produced - committed} messages (produced {produced} - committed {committed})
                </div>
            </GlassCard>
        </div>
    )
}

// ── Offset Reset ─────────────────────────────────────────────
function OffsetReset() {
    const [mode, setMode] = useState('earliest')
    const msgs = Array.from({ length: 10 }, (_, i) => i)
    const startOffset = mode === 'earliest' ? 0 : mode === 'latest' ? 10 : null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>auto.offset.reset</h2>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                    When a consumer group has <strong style={{ color: '#e2e8f0' }}>no committed offsets</strong> (new group or retention expired),
                    this setting determines where to start reading.
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    {['earliest', 'latest', 'none'].map(m => (
                        <button key={m} onClick={() => setMode(m)} style={{
                            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12,
                            background: mode === m ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                            color: mode === m ? '#a855f7' : '#64748b', fontWeight: mode === m ? 700 : 400,
                        }}>{m}</button>
                    ))}
                </div>
            </GlassCard>

            <GlassCard>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: '#94a3b8' }}>Partition Log</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                    {msgs.map(i => {
                        const isRead = startOffset !== null && i >= startOffset
                        return (
                            <div key={i} style={{
                                flex: 1, height: 44, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isRead ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isRead ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                fontSize: 10, color: isRead ? '#c084fc' : '#334155', fontWeight: isRead ? 700 : 400,
                            }}>@{i}</div>
                        )
                    })}
                </div>
                <div style={{
                    padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: mode === 'earliest' ? 'rgba(34,197,94,0.1)' : mode === 'latest' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                    color: mode === 'earliest' ? '#4ade80' : mode === 'latest' ? '#60a5fa' : '#ef4444',
                }}>
                    {mode === 'earliest' && '✓ Reads from offset 0 — processes all historical messages (good for backfill)'}
                    {mode === 'latest' && '✓ Reads only new messages — skips history (good for real-time processing)'}
                    {mode === 'none' && '⚠️ Throws exception if no committed offset — fail fast strategy'}
                </div>
            </GlassCard>
        </div>
    )
}

// ── Rebalancing Simulator ────────────────────────────────────
function RebalancingSimulator() {
    const [consumers, setConsumers] = useState([
        { id: 0, alive: true, partitions: [0, 1] },
        { id: 1, alive: true, partitions: [2, 3] },
        { id: 2, alive: true, partitions: [4] },
    ])
    const [rebalancing, setRebalancing] = useState(false)
    const [log, setLog] = useState([])

    function redistribute(newConsumers) {
        const alive = newConsumers.filter(c => c.alive)
        const allPartitions = [0, 1, 2, 3, 4]
        if (alive.length === 0) return newConsumers.map(c => ({ ...c, partitions: [] }))
        return newConsumers.map(c => {
            if (!c.alive) return { ...c, partitions: [] }
            const idx = alive.findIndex(a => a.id === c.id)
            return { ...c, partitions: allPartitions.filter(p => p % alive.length === idx) }
        })
    }

    function triggerRebalance(action, consumerId) {
        setRebalancing(true)
        const now = new Date().toLocaleTimeString()
        setLog(l => [{ ts: now, msg: action }, ...l.slice(0, 7)])

        setTimeout(() => {
            setConsumers(prev => {
                const updated = prev.map(c => {
                    if (action === 'add' && c.id === consumerId) return { ...c }
                    if (action.startsWith('crash') && c.id === consumerId) return { ...c, alive: false }
                    return c
                })
                const withNew = action === 'add'
                    ? [...updated, { id: updated.length, alive: true, partitions: [] }]
                    : updated
                return redistribute(withNew)
            })
            setRebalancing(false)
        }, 1000)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Rebalancing Simulator</h2>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                    Any membership change triggers a rebalance. During rebalancing, <strong style={{ color: '#ef4444' }}>all consumers stop</strong> until
                    partition assignment is complete (stop-the-world pause).
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={() => triggerRebalance('add', consumers.length)} style={btnStyle('#22c55e')}>+ Add Consumer</button>
                    <button onClick={() => {
                        const alive = consumers.filter(c => c.alive)
                        if (alive.length > 0) triggerRebalance('crash ' + alive[alive.length - 1].id, alive[alive.length - 1].id)
                    }} style={btnStyle('#ef4444')}>💀 Crash Consumer</button>
                </div>
            </GlassCard>

            {/* Consumer cards */}
            <GlassCard>
                {rebalancing && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.12)', borderRadius: 10, fontSize: 12, color: '#ef4444', fontWeight: 700 }}
                    >
                        🔄 REBALANCING IN PROGRESS — all consumers paused…
                    </motion.div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {consumers.map(c => (
                        <motion.div
                            key={c.id}
                            animate={{ opacity: rebalancing ? 0.4 : c.alive ? 1 : 0.3, scale: rebalancing ? 0.97 : 1 }}
                            style={{
                                background: c.alive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)',
                                border: `1px solid ${c.alive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
                                borderRadius: 10, padding: '12px 14px', minWidth: 110,
                            }}
                        >
                            <div style={{ fontSize: 18, marginBottom: 4 }}>{c.alive ? '⚡' : '💀'}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: c.alive ? '#4ade80' : '#ef4444' }}>Consumer-{c.id}</div>
                            <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
                                {c.alive
                                    ? c.partitions.length === 0 ? '(idle)' : `P-${c.partitions.join(', P-')}`
                                    : 'crashed'
                                }
                            </div>
                        </motion.div>
                    ))}
                </div>
            </GlassCard>

            {/* Event log */}
            {log.length > 0 && (
                <GlassCard>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#94a3b8' }}>Rebalance Events</div>
                    {log.map((l, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                            <span style={{ color: '#334155' }}>[{l.ts}]</span> {l.msg}
                        </div>
                    ))}
                </GlassCard>
            )}
        </div>
    )
}

// ── Delivery Semantics ───────────────────────────────────────
function DeliverySemantics() {
    const [selected, setSelected] = useState('at-least-once')
    const semantics = {
        'at-most-once': {
            color: '#ef4444',
            title: 'At-Most-Once',
            desc: 'Commit before processing. If processing fails after commit → message lost forever.',
            steps: ['poll()', 'commit offsets', 'process messages', '(if crash here → message lost)'],
            risk: 'Data loss possible',
            use: 'Metrics, non-critical events',
        },
        'at-least-once': {
            color: '#eab308',
            title: 'At-Least-Once',
            desc: 'Commit after processing. If crash before commit → message redelivered → duplicates possible.',
            steps: ['poll()', 'process messages', 'commit offsets', '(if crash before commit → retry)'],
            risk: 'Duplicates possible',
            use: 'Most Kafka applications (handle duplicates)',
        },
        'exactly-once': {
            color: '#22c55e',
            title: 'Exactly-Once (EOS)',
            desc: 'Idempotent producer + transactions. No duplicates, no data loss. Complex to implement.',
            steps: ['beginTransaction()', 'produce', 'process', 'commitTransaction()'],
            risk: 'Higher latency, complex setup',
            use: 'Financial, order processing',
        },
    }
    const s = semantics[selected]
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(semantics).map(([k, v]) => (
                    <button key={k} onClick={() => setSelected(k)} style={{
                        flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12,
                        background: selected === k ? `${v.color}18` : 'rgba(255,255,255,0.04)',
                        color: selected === k ? v.color : '#475569', fontWeight: selected === k ? 700 : 400,
                        borderBottom: `2px solid ${selected === k ? v.color : 'transparent'}`,
                    }}>{v.title}</button>
                ))}
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={selected} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <GlassCard>
                        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{s.desc}</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                            {s.steps.map((step, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{
                                        padding: '8px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                        background: `${s.color}12`, border: `1px solid ${s.color}25`, color: s.color,
                                    }}>{step}</div>
                                    {i < s.steps.length - 1 && <div style={{ color: '#334155', fontSize: 12 }}>→</div>}
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '10px 14px', flex: 1 }}>
                                <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>Risk</div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.risk}</div>
                            </div>
                            <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '10px 14px', flex: 1 }}>
                                <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, marginBottom: 4 }}>Use When</div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.use}</div>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

// ── Ordering Guarantees ──────────────────────────────────────
function OrderingGuarantees() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Ordering Guarantees in Kafka</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {[
                        {
                            title: 'Within a Partition',
                            color: '#22c55e',
                            icon: '✅',
                            desc: 'Messages are STRICTLY ordered within a single partition. Offset 5 is always after offset 4.',
                        },
                        {
                            title: 'Across Partitions',
                            color: '#ef4444',
                            icon: '❌',
                            desc: 'NO ordering guarantee across partitions. Consumer may read P0-msg2 before P1-msg1 even if P1-msg1 was produced first.',
                        },
                        {
                            title: 'Same-Key Messages',
                            color: '#f97316',
                            icon: '🔑',
                            desc: 'All messages with the same key go to the same partition → ordering guaranteed for that key.',
                        },
                    ].map(item => (
                        <div key={item.title} style={{
                            background: `${item.color}08`, border: `1px solid ${item.color}20`, borderRadius: 12, padding: 16,
                        }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: item.color, marginBottom: 6 }}>{item.title}</div>
                            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{item.desc}</div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#94a3b8' }}>💡 Ordering Pattern</div>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                    To guarantee per-entity order (e.g., all events for user-123), use the <strong style={{ color: '#f97316' }}>entity ID as the message key</strong>.
                    All messages with the same key go to the same partition. The consumer sees them in order.
                </p>
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(249,115,22,0.08)', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, color: '#fdba74' }}>
                    producer.send("orders", key="user-123", value=...)<br />
                    producer.send("orders", key="user-123", value=...)  ← always to same partition
                </div>
            </GlassCard>
        </div>
    )
}

function btnStyle(color) {
    return {
        padding: '8px 16px', background: `${color}15`, border: `1px solid ${color}25`,
        borderRadius: 8, color, cursor: 'pointer', fontSize: 12, fontWeight: 600,
    }
}
