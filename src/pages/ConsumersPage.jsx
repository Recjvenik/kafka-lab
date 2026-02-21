import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Per: Kafka spec, one partition is owned by AT MOST one consumer per group.
// If consumers > partitions → some consumers are IDLE (a key teaching moment!)

const CONSUMER_COLORS = [
    '#f97316', '#3b82f6', '#22c55e', '#a855f7',
    '#ef4444', '#eab308', '#06b6d4', '#ec4899',
]

// ────────────────────────────────────────────────────────────
// Pure simulation helpers (no Zustand, purely local state for this page)
// ────────────────────────────────────────────────────────────
function assignPartitions(numPartitions, numConsumers, strategy = 'round-robin') {
    if (numConsumers === 0) return {}
    const assignment = {}
    for (let c = 0; c < numConsumers; c++) assignment[c] = []
    if (numPartitions === 0) return assignment

    if (strategy === 'round-robin') {
        for (let p = 0; p < numPartitions; p++) {
            assignment[p % numConsumers].push(p)
        }
    } else if (strategy === 'range') {
        for (let p = 0; p < numPartitions; p++) {
            const idx = Math.floor((p * numConsumers) / numPartitions)
            assignment[Math.min(idx, numConsumers - 1)].push(p)
        }
    }
    return assignment
}

// 6 canonical scenarios demonstrating consumer group behavior
const SCENARIOS = [
    {
        id: 'one-one',
        title: '1 Partition, 1 Consumer',
        partitions: 1, consumers: 1,
        tag: 'Simple',
        tagColor: '#3b82f6',
        insight: 'The consumer handles all messages. Full throughput but no parallelism.',
    },
    {
        id: 'one-many',
        title: '1 Partition, Many Consumers',
        partitions: 1, consumers: 4,
        tag: 'Idle Consumers!',
        tagColor: '#ef4444',
        insight: 'Only 1 consumer works. The other 3 sit idle — partitions are the parallelism ceiling!',
    },
    {
        id: 'many-one',
        title: 'Many Partitions, 1 Consumer',
        partitions: 6, consumers: 1,
        tag: 'Bottleneck',
        tagColor: '#eab308',
        insight: 'One consumer reads all 6 partitions sequentially. Message ordering is per-partition.',
    },
    {
        id: 'equal',
        title: 'Equal Partitions & Consumers',
        partitions: 4, consumers: 4,
        tag: 'Ideal Scaling ✓',
        tagColor: '#22c55e',
        insight: 'Perfect balance. Each consumer owns exactly 1 partition. Maximum throughput.',
    },
    {
        id: 'many-fewer',
        title: 'More Partitions, Fewer Consumers',
        partitions: 6, consumers: 3,
        tag: 'Load Sharing',
        tagColor: '#a855f7',
        insight: 'Each consumer handles 2 partitions. Still good throughput. Common in production.',
    },
    {
        id: 'many-more',
        title: 'More Consumers than Partitions',
        partitions: 3, consumers: 6,
        tag: 'Idle Consumers!',
        tagColor: '#ef4444',
        insight: 'Only 3 consumers work. 3 are idle standby — ready to take over if others fail.',
    },
]

export default function ConsumersPage() {
    const [activeTab, setActiveTab] = useState('scenario')
    return (
        <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
            <PageHeader />
            <TabBar active={activeTab} setActive={setActiveTab} />
            {activeTab === 'scenario' && <ScenarioExplorer />}
            {activeTab === 'playground' && <ConsumerGroupPlayground />}
            {activeTab === 'multigroup' && <MultiGroupSection />}
            {activeTab === 'pullloop' && <PollLoopVisualizer />}
        </div>
    )
}

function PageHeader() {
    return (
        <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 20, border: '1px solid rgba(34,197,94,0.2)' }}>Module 4 — Critical</span>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.5px' }}>Consumer Groups Playground</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                The most important Kafka concept. Learn why consumer groups exist, how partitions are assigned, and what happens with idle consumers.
            </p>
        </div>
    )
}

function TabBar({ active, setActive }) {
    const tabs = [
        { id: 'scenario', label: '6 Core Scenarios' },
        { id: 'playground', label: 'Custom Playground' },
        { id: 'multigroup', label: 'Multiple Groups' },
        { id: 'pullloop', label: 'Poll Loop' },
    ]
    return (
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
            {tabs.map(t => (
                <button key={t.id} onClick={() => setActive(t.id)} style={{
                    padding: '9px 18px', border: 'none', cursor: 'pointer',
                    background: 'transparent', color: active === t.id ? '#22c55e' : '#475569',
                    fontSize: 13, fontWeight: active === t.id ? 700 : 400,
                    borderBottom: active === t.id ? '2px solid #22c55e' : '2px solid transparent',
                    marginBottom: '-1px',
                }}>{t.label}</button>
            ))}
        </div>
    )
}

// ── Tab 1: 6 canonical scenarios ─────────────────────────────
function ScenarioExplorer() {
    const [selected, setSelected] = useState('equal')
    const scenario = SCENARIOS.find(s => s.id === selected)

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
            {/* Scenario list */}
            <div>
                {SCENARIOS.map(s => (
                    <button key={s.id} onClick={() => setSelected(s.id)} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 12px', borderRadius: 8, border: 'none',
                        background: selected === s.id ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
                        borderLeft: `2px solid ${selected === s.id ? '#22c55e' : 'transparent'}`,
                        color: selected === s.id ? '#22c55e' : '#64748b',
                        cursor: 'pointer', marginBottom: 4, fontSize: 12,
                    }}>
                        <div style={{ fontWeight: selected === s.id ? 700 : 400, marginBottom: 2 }}>{s.title}</div>
                        <span style={{
                            fontSize: 10, padding: '1px 7px', borderRadius: 10,
                            background: `${s.tagColor}15`, color: s.tagColor,
                        }}>{s.tag}</span>
                    </button>
                ))}
            </div>

            {/* Scenario visualization */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={selected}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                    {/* Insight box */}
                    <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{scenario.title}</h2>
                            <span style={{
                                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                                background: `${scenario.tagColor}18`, color: scenario.tagColor,
                            }}>{scenario.tag}</span>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{scenario.insight}</p>
                    </div>

                    {/* Visual */}
                    <AssignmentVisual partitions={scenario.partitions} consumers={scenario.consumers} />
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

function AssignmentVisual({ partitions, consumers, strategy = 'round-robin' }) {
    const assignment = assignPartitions(partitions, consumers, strategy)
    const totalPartitions = Array.from({ length: partitions }, (_, i) => i)

    return (
        <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#94a3b8' }}>
                {partitions} partitions → {consumers} consumers
            </div>

            {/* Partitions row */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>PARTITIONS</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {totalPartitions.map(p => {
                        const ownerIdx = Object.entries(assignment).find(([, parts]) => parts.includes(p))?.[0]
                        const color = ownerIdx !== undefined ? CONSUMER_COLORS[+ownerIdx % CONSUMER_COLORS.length] : '#334155'
                        return (
                            <motion.div
                                key={p}
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                style={{
                                    width: 56, height: 56, borderRadius: 8, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: `${color}18`, border: `1px solid ${color}40`,
                                }}
                            >
                                <div style={{ fontSize: 10, color: '#475569' }}>P-{p}</div>
                                {ownerIdx !== undefined && (
                                    <div style={{ fontSize: 9, color, marginTop: 2, fontWeight: 700 }}>C-{ownerIdx}</div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* Consumers row */}
            <div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>CONSUMERS</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {Array.from({ length: consumers }, (_, i) => {
                        const myPartitions = assignment[i] || []
                        const isIdle = myPartitions.length === 0
                        const color = CONSUMER_COLORS[i % CONSUMER_COLORS.length]
                        return (
                            <motion.div
                                key={i}
                                animate={{ opacity: isIdle ? 0.5 : 1 }}
                                style={{
                                    background: isIdle ? 'rgba(255,255,255,0.03)' : `${color}12`,
                                    border: `1px solid ${isIdle ? 'rgba(255,255,255,0.06)' : `${color}35`}`,
                                    borderRadius: 10, padding: '10px 14px', minWidth: 100, textAlign: 'center',
                                }}
                            >
                                <div style={{ fontSize: 20, marginBottom: 4 }}>{isIdle ? '😴' : '⚡'}</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: isIdle ? '#334155' : color }}>
                                    Consumer-{i}
                                </div>
                                <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                                    {isIdle ? 'IDLE' : `Partitions: ${myPartitions.join(', ')}`}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <StatChip label="Active" value={Object.values(assignment).filter(a => a.length > 0).length} color="#22c55e" />
                <StatChip label="Idle" value={Object.values(assignment).filter(a => a.length === 0).length} color="#ef4444" />
                <StatChip label="Max partial load" value={`${Math.max(...Object.values(assignment).map(a => a.length))} partitions`} color="#f97316" />
            </div>
        </div>
    )
}

function StatChip({ label, value, color }) {
    return (
        <div style={{
            background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 8,
            padding: '8px 14px', flex: 1, textAlign: 'center',
        }}>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
        </div>
    )
}

// ── Tab 2: Custom Playground ─────────────────────────────────
function ConsumerGroupPlayground() {
    const [numPartitions, setNumPartitions] = useState(4)
    const [numConsumers, setNumConsumers] = useState(3)
    const [strategy, setStrategy] = useState('round-robin')
    const [animating, setAnimating] = useState(false)

    function triggerRebalance() {
        setAnimating(true)
        setTimeout(() => setAnimating(false), 800)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Controls */}
            <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b' }}>Partitions: <strong style={{ color: '#22c55e' }}>{numPartitions}</strong></label>
                        <input type="range" min={1} max={12} value={numPartitions}
                            onChange={e => { setNumPartitions(+e.target.value); triggerRebalance() }}
                            style={{ width: '100%', marginTop: 4 }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b' }}>Consumers: <strong style={{ color: '#22c55e' }}>{numConsumers}</strong></label>
                        <input type="range" min={1} max={12} value={numConsumers}
                            onChange={e => { setNumConsumers(+e.target.value); triggerRebalance() }}
                            style={{ width: '100%', marginTop: 4 }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>Assignor Strategy</label>
                        {['round-robin', 'range'].map(s => (
                            <button key={s} onClick={() => { setStrategy(s); triggerRebalance() }} style={{
                                marginRight: 6, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11,
                                background: strategy === s ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                                color: strategy === s ? '#22c55e' : '#64748b',
                            }}>{s}</button>
                        ))}
                    </div>
                </div>

                {animating && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ marginTop: 12, padding: '8px 14px', background: 'rgba(239,68,68,0.12)', borderRadius: 8, fontSize: 12, color: '#ef4444' }}
                    >
                        🔄 REBALANCING — consumers paused…
                    </motion.div>
                )}
            </div>

            <AssignmentVisual partitions={numPartitions} consumers={numConsumers} strategy={strategy} />

            {/* Teaching notes */}
            <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#94a3b8' }}>💡 Key Rules</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                        'One partition → assigned to exactly ONE consumer per group',
                        'One consumer → can read from MANY partitions',
                        `${numConsumers > numPartitions ? `⚠️ ${numConsumers - numPartitions} consumers are IDLE (consumers > partitions)` : 'No idle consumers ✓'}`,
                        `Max throughput = min(partitions, consumers) = ${Math.min(numPartitions, numConsumers)} active readers`,
                    ].map(r => (
                        <div key={r} style={{ fontSize: 12, color: '#64748b', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                            • {r}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ── Tab 3: Multiple Groups ────────────────────────────────────
function MultiGroupSection() {
    const [groups, setGroups] = useState([
        { id: 'analytics', partitions: 3, consumers: 2, color: '#3b82f6' },
        { id: 'notifications', partitions: 3, consumers: 3, color: '#22c55e' },
    ])

    function addGroup() {
        const colors = ['#a855f7', '#f97316', '#ef4444', '#eab308']
        setGroups(g => [...g, {
            id: `group-${g.length + 1}`, partitions: 3, consumers: 2,
            color: colors[g.length % colors.length],
        }])
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Multiple Consumer Groups</h2>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                    Multiple groups reading the <strong style={{ color: '#e2e8f0' }}>same topic</strong> independently.
                    Each group maintains its own offset — the <strong style={{ color: '#f97316' }}>fan-out</strong> pattern.
                </p>
                <div style={{
                    padding: '12px 16px', background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, fontSize: 13, color: '#93c5fd',
                }}>
                    🔑 Kafka doesn't decide which group gets messages — ALL groups get ALL messages independently.
                    This is fundamentally different from a queue where only one consumer gets each message.
                </div>
            </div>

            {/* Topic */}
            <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>TOPIC: orders (3 partitions)</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {[0, 1, 2].map(p => (
                        <div key={p} style={{
                            flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8, padding: '12px 0', textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 24, marginBottom: 4 }}>📋</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>Partition {p}</div>
                            <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>offset: 1432</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Groups as separate rows */}
            {groups.map((g, gi) => (
                <div key={g.id} className="glass" style={{ borderRadius: 14, padding: 16, borderColor: `${g.color}25` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: g.color }}>group: {g.id}</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>independent offsets per partition</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {Array.from({ length: g.consumers }, (_, ci) => {
                            const myPartitions = assignPartitions(g.partitions, g.consumers)[ci] || []
                            const isIdle = myPartitions.length === 0
                            return (
                                <div key={ci} style={{
                                    flex: 1, background: isIdle ? 'rgba(255,255,255,0.02)' : `${g.color}10`,
                                    border: `1px solid ${isIdle ? 'rgba(255,255,255,0.05)' : `${g.color}25`}`,
                                    borderRadius: 8, padding: 12, textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: 16, marginBottom: 4 }}>{isIdle ? '😴' : '⚡'}</div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: isIdle ? '#334155' : g.color }}>C-{ci}</div>
                                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                                        {isIdle ? 'idle' : myPartitions.map(p => `P${p}`).join(',')}
                                    </div>
                                    {!isIdle && <div style={{ fontSize: 9, color: '#334155', marginTop: 2 }}>offset: ~{100 + ci * 240}</div>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}

            <button onClick={addGroup} style={{
                padding: '10px 20px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'flex-start',
            }}>+ Add Consumer Group</button>
        </div>
    )
}

// ── Tab 4: Poll Loop ──────────────────────────────────────────
function PollLoopVisualizer() {
    const [phase, setPhase] = useState(0)
    const PHASES = ['idle', 'poll()', 'receive batch', 'process', 'commit offsets', 'idle']
    const COLORS = ['#334155', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#334155']

    useEffect(() => {
        const t = setInterval(() => setPhase(p => (p + 1) % PHASES.length), 1500)
        return () => clearInterval(t)
    }, [])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Consumer Poll Loop</h2>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                    Kafka consumers use a <strong style={{ color: '#e2e8f0' }}>pull model</strong> — they actively
                    call <code style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '1px 5px', borderRadius: 4 }}>poll()</code> to
                    fetch messages. The broker never pushes.
                </p>
            </div>

            <div className="glass" style={{ borderRadius: 14, padding: 24, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
                    {PHASES.slice(0, 5).map((p, i) => (
                        <div key={p} style={{ display: 'flex', alignItems: 'center' }}>
                            <motion.div
                                animate={{
                                    background: phase === i ? `${COLORS[i]}25` : 'rgba(255,255,255,0.03)',
                                    borderColor: phase === i ? COLORS[i] : 'rgba(255,255,255,0.08)',
                                    scale: phase === i ? 1.05 : 1,
                                }}
                                style={{
                                    padding: '12px 16px', borderRadius: 10, border: '1px solid',
                                    minWidth: 100, textAlign: 'center',
                                }}
                            >
                                <div style={{ fontSize: 18, marginBottom: 4 }}>
                                    {['💤', '📡', '📨', '⚙️', '✅'][i]}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: phase === i ? COLORS[i] : '#475569' }}>{p}</div>
                            </motion.div>
                            {i < 4 && <div style={{ width: 24, height: 2, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />}
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 20, padding: '12px 20px', background: `${COLORS[phase]}15`, borderRadius: 10, display: 'inline-block' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS[phase] }}>
                        Current: {PHASES[phase]}
                    </div>
                </div>
            </div>

            <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#94a3b8' }}>⚠️ max.poll.interval.ms</div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                    If processing takes longer than <strong style={{ color: '#f97316' }}>max.poll.interval.ms</strong>,
                    the broker assumes the consumer is dead and triggers a rebalance.
                    This is a common source of bugs when processing is slow or batches are too large.
                </p>
            </div>
        </div>
    )
}
