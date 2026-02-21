import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TABS = [
    { id: 'replication', label: 'Replication & ISR' },
    { id: 'storage', label: 'Storage Internals' },
    { id: 'perf', label: 'Performance Tuning' },
    { id: 'failure', label: 'Failure Scenarios' },
    { id: 'eos', label: 'Exactly-Once (EOS)' },
    { id: 'concepts', label: 'Real-World Concepts' },
]

export default function AdvancedPage() {
    const [active, setActive] = useState('replication')
    return (
        <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: 20, border: '1px solid rgba(239,68,68,0.2)' }}>Modules 8–9</span>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.5px' }}>Advanced Topics</h1>
                <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>ISR, storage internals, performance tuning, failure scenarios, exactly-once semantics, and real-world patterns.</p>
            </div>
            <TabBar tabs={TABS} active={active} setActive={setActive} color="#ef4444" />
            <AnimatePresence mode="wait">
                <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    {active === 'replication' && <ReplicationSection />}
                    {active === 'storage' && <StorageSection />}
                    {active === 'perf' && <PerfSection />}
                    {active === 'failure' && <FailureSection />}
                    {active === 'eos' && <EOSSection />}
                    {active === 'concepts' && <ConceptsSection />}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

function TabBar({ tabs, active, setActive, color }) {
    return (
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
            {tabs.map(t => (
                <button key={t.id} onClick={() => setActive(t.id)} style={{
                    padding: '9px 14px', border: 'none', cursor: 'pointer', background: 'transparent',
                    color: active === t.id ? color : '#475569', fontSize: 12, fontWeight: active === t.id ? 700 : 400,
                    borderBottom: active === t.id ? `2px solid ${color}` : '2px solid transparent', marginBottom: '-1px',
                }}>{t.label}</button>
            ))}
        </div>
    )
}

function GlassCard({ children, style }) {
    return <div className="glass" style={{ borderRadius: 14, padding: 20, ...style }}>{children}</div>
}

// ── Replication & ISR ───────────────────────────────────────
function ReplicationSection() {
    const [killed, setKilled] = useState(null)
    const brokers = [0, 1, 2]
    const isAlive = b => b !== killed
    const leader = killed === 0 ? 1 : 0
    const isr = brokers.filter(b => isAlive(b))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Replication & ISR</h2>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                    Each partition has one <strong style={{ color: '#f97316' }}>leader</strong> and N-1 <strong style={{ color: '#3b82f6' }}>followers</strong>.
                    Followers replicate from the leader. <strong style={{ color: '#22c55e' }}>ISR</strong> = In-Sync Replicas —
                    followers within <code style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>replica.lag.time.max.ms</code>.
                </p>
            </GlassCard>

            <GlassCard>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: '#94a3b8' }}>Interactive: Kill a Broker</div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    {brokers.map(b => (
                        <motion.div key={b} animate={{ opacity: isAlive(b) ? 1 : 0.35 }} style={{
                            flex: 1, background: isAlive(b) ? (b === leader ? 'rgba(249,115,22,0.12)' : 'rgba(59,130,246,0.08)') : 'rgba(239,68,68,0.06)',
                            border: `1px solid ${isAlive(b) ? (b === leader ? 'rgba(249,115,22,0.35)' : 'rgba(59,130,246,0.2)') : 'rgba(239,68,68,0.2)'}`,
                            borderRadius: 12, padding: '14px 10px', textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 24, marginBottom: 6 }}>{isAlive(b) ? '🖥️' : '💀'}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: isAlive(b) ? (b === leader ? '#f97316' : '#60a5fa') : '#ef4444' }}>
                                broker-{b}
                            </div>
                            <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
                                {!isAlive(b) ? 'DEAD' : b === leader ? '★ LEADER' : isr.includes(b) ? 'ISR Follower' : 'Out of sync'}
                            </div>
                            {isAlive(b) && (
                                <button onClick={() => setKilled(b)} style={{
                                    marginTop: 8, padding: '3px 8px', border: 'none', borderRadius: 6, cursor: 'pointer',
                                    background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 10,
                                }}>Kill</button>
                            )}
                            {!isAlive(b) && (
                                <button onClick={() => setKilled(null)} style={{
                                    marginTop: 8, padding: '3px 8px', border: 'none', borderRadius: 6, cursor: 'pointer',
                                    background: 'rgba(34,197,94,0.2)', color: '#4ade80', fontSize: 10,
                                }}>Restart</button>
                            )}
                        </motion.div>
                    ))}
                </div>
                <div style={{ padding: '10px 14px', background: killed !== null ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', borderRadius: 10, fontSize: 12 }}>
                    {killed !== null
                        ? `⚡ Leader election: broker-${leader} elected as new leader. ISR: [${isr.join(', ')}]`
                        : '✓ All brokers healthy. RF=3, ISR=[0,1,2], HWM=latest offset.'
                    }
                </div>
            </GlassCard>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                    { term: 'High Watermark (HWM)', def: 'Highest offset replicated to ALL ISR. Consumers only see messages up to HWM.' },
                    { term: 'Under-Replicated Partitions', def: 'ISR.size < replication.factor. Broker alert fired. Risk of data loss on failure.' },
                    { term: 'min.insync.replicas', def: 'Minimum ISR count needed for producer writes (when acks=all). Below this → producer exception.' },
                    { term: 'unclean.leader.election', def: 'Allow out-of-ISR replica to become leader. False = safer; True = higher availability, potential loss.' },
                ].map(item => (
                    <GlassCard key={item.term} style={{ padding: 14 }}>
                        <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 13, marginBottom: 4 }}>{item.term}</div>
                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{item.def}</div>
                    </GlassCard>
                ))}
            </div>
        </div>
    )
}

// ── Storage Internals ────────────────────────────────────────
function StorageSection() {
    const [compaction, setCompaction] = useState(false)
    const [retentionMs, setRetentionMs] = useState(168)

    const msgs = [
        { offset: 0, key: 'k1', value: 'price=10', tombstone: false },
        { offset: 1, key: 'k2', value: 'name=Alice', tombstone: false },
        { offset: 2, key: 'k1', value: 'price=15', tombstone: false },
        { offset: 3, key: 'k3', value: 'status=ok', tombstone: false },
        { offset: 4, key: 'k1', value: 'null (tombstone)', tombstone: true },
        { offset: 5, key: 'k2', value: 'name=Bob', tombstone: false },
    ]

    // With compaction: keep only latest per key (except tombstones delete the key)
    const compacted = compaction ? (() => {
        const seen = {}
        msgs.forEach(m => { seen[m.key] = m })
        return Object.values(seen).filter(m => !m.tombstone)
    })() : msgs

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Kafka Storage Internals</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    {[
                        { title: 'Log Segments', desc: 'Partitions stored as rolling files on disk. New segment created when size/time limit reached.', icon: '📁' },
                        { title: 'Retention by Time/Size', desc: 'Messages deleted after log.retention.ms or log.retention.bytes exceeded.', icon: '🕐' },
                        { title: 'Log Compaction', desc: 'Keeps latest value per key. Older duplicates removed. Used for changelogs.', icon: '🗜️' },
                        { title: 'Tombstone Messages', desc: 'null-value message signals deletion in compacted topics. Key gets deleted from log.', icon: '🪦' },
                    ].map(item => (
                        <div key={item.title} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{item.desc}</div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>Log Compaction Demo</div>
                    <button onClick={() => setCompaction(!compaction)} style={{
                        padding: '6px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                        background: compaction ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                        color: compaction ? '#4ade80' : '#64748b', fontWeight: 700,
                    }}>{compaction ? 'Compaction ON' : 'Compaction OFF'}</button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(compaction ? compacted : msgs).map(m => (
                        <motion.div
                            key={m.offset}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                background: m.tombstone ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${m.tombstone ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: 8, padding: '10px 12px', minWidth: 100,
                            }}
                        >
                            <div style={{ fontSize: 10, color: '#334155' }}>@{m.offset}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginTop: 2 }}>{m.key}</div>
                            <div style={{ fontSize: 10, color: m.tombstone ? '#ef4444' : '#64748b', marginTop: 2 }}>{m.value}</div>
                        </motion.div>
                    ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>
                    {compaction ? `Compacted: ${compacted.length}/${msgs.length} messages kept (latest per key, tombstones remove keys)` : 'Raw log: all messages visible'}
                </div>
            </GlassCard>
        </div>
    )
}

// ── Performance Tuning ───────────────────────────────────────
function PerfSection() {
    const [batchSize, setBatchSize] = useState(16384)
    const [lingerMs, setLingerMs] = useState(5)
    const [fetchMin, setFetchMin] = useState(1)
    const [maxPoll, setMaxPoll] = useState(500)

    const throughput = Math.round((batchSize / 16384 * 70 + lingerMs * 3) * (maxPoll / 100))
    const latency = Math.round(lingerMs + (batchSize / 1024) * 0.5 + fetchMin * 2)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Performance Tuning Playground</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316', marginBottom: 12 }}>Producer Settings</div>
                        <Slider label="batch.size" value={batchSize} min={1024} max={1048576} step={1024} onChange={setBatchSize}
                            format={v => `${(v / 1024).toFixed(0)}KB`} color="#f97316" />
                        <Slider label="linger.ms" value={lingerMs} min={0} max={100} onChange={setLingerMs}
                            format={v => `${v}ms`} color="#f97316" />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', marginBottom: 12 }}>Consumer Settings</div>
                        <Slider label="fetch.min.bytes" value={fetchMin} min={1} max={1024} onChange={setFetchMin}
                            format={v => `${v}B`} color="#3b82f6" />
                        <Slider label="max.poll.records" value={maxPoll} min={1} max={2000} onChange={setMaxPoll}
                            format={v => `${v}`} color="#3b82f6" />
                    </div>
                </div>
            </GlassCard>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <GlassCard style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>ESTIMATED THROUGHPUT</div>
                    <motion.div key={throughput} animate={{ scale: [1.1, 1] }} style={{ fontSize: 36, fontWeight: 800, color: '#22c55e' }}>
                        {Math.min(throughput, 999)}K
                    </motion.div>
                    <div style={{ fontSize: 11, color: '#334155' }}>messages/sec</div>
                </GlassCard>
                <GlassCard style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>ESTIMATED LATENCY</div>
                    <motion.div key={latency} animate={{ scale: [1.1, 1] }} style={{ fontSize: 36, fontWeight: 800, color: '#f97316' }}>
                        {Math.min(latency, 999)}
                    </motion.div>
                    <div style={{ fontSize: 11, color: '#334155' }}>ms p99</div>
                </GlassCard>
            </div>
        </div>
    )
}

function Slider({ label, value, min, max, step = 1, onChange, format, color }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                {label}: <strong style={{ color }}>{format(value)}</strong>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(+e.target.value)} style={{ width: '100%' }} />
        </div>
    )
}

// ── Failure Scenarios ────────────────────────────────────────
function FailureSection() {
    const [active, setActive] = useState(null)
    const scenarios = [
        { id: 'broker-crash', title: 'Broker Crash', icon: '💥', color: '#ef4444', impact: 'Leader election for affected partitions. ISR shrink. Brief unavailability.' },
        { id: 'consumer-lag', title: 'Consumer Lag Spike', icon: '📈', color: '#eab308', impact: 'Producers outpace consumers. Lag grows. Risk of retention expiry (data loss).' },
        { id: 'slow-consumer', title: 'Slow Consumer', icon: '🐌', color: '#f97316', impact: 'If processing > max.poll.interval.ms → broker ejects consumer → rebalance.' },
        { id: 'poison-pill', title: 'Poison Pill Message', icon: '☠️', color: '#a855f7', impact: 'Message that always fails processing → consumer stuck → route to DLQ.' },
        { id: 'hot-partition', title: 'Hot Partition Skew', icon: '🌡️', color: '#ef4444', impact: 'All keys hash to same partition → single consumer overwhelmed → throughput limited.' },
        { id: 'network-partition', title: 'Network Partition', icon: '⚡', color: '#3b82f6', impact: 'Brokers split-brain. ISR shrinks. Producers waiting for acks time out.' },
    ]
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Failure Scenarios Lab</h2>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>Click a scenario to understand its impact and resolution.</p>
            </GlassCard>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {scenarios.map(s => (
                    <motion.div
                        key={s.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setActive(active === s.id ? null : s.id)}
                        style={{
                            background: active === s.id ? `${s.color}12` : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${active === s.id ? `${s.color}35` : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: 12, padding: 16, cursor: 'pointer',
                        }}
                    >
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: active === s.id ? s.color : '#e2e8f0', marginBottom: 6 }}>{s.title}</div>
                        <AnimatePresence>
                            {active === s.id && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{s.impact}</div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

// ── EOS ──────────────────────────────────────────────────────
function EOSSection() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Exactly-Once Semantics (EOS)</h2>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                    Kafka's EOS guarantees that each message is delivered and processed exactly once, even across failures.
                    Built on two pillars: <strong style={{ color: '#22c55e' }}>Idempotent Producer</strong> + <strong style={{ color: '#3b82f6' }}>Transactions</strong>.
                </p>
            </GlassCard>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                    { title: 'Idempotent Producer', color: '#22c55e', items: ['enable.idempotence=true', 'Assigns Producer ID (PID)', 'Sequence numbers per partition', 'Broker deduplicates retries'] },
                    { title: 'Transactions API', color: '#3b82f6', items: ['beginTransaction()', 'Send across multiple partitions', 'commitTransaction() or abort()', 'Atomic read-process-write'] },
                    { title: 'Transaction Timeline', color: '#a855f7', items: ['1. Producer registers PID', '2. begin → produce → commit', '3. Consumers in read_committed mode', '4. Only see committed transactions'] },
                    { title: 'EOS Limitations', color: '#ef4444', items: ['Higher latency (~2x)', 'Complex error handling', 'Single-cluster only', 'Not for external side-effects'] },
                ].map(s => (
                    <GlassCard key={s.title} style={{ padding: 16 }}>
                        <div style={{ fontWeight: 700, color: s.color, fontSize: 13, marginBottom: 10 }}>{s.title}</div>
                        {s.items.map(item => (
                            <div key={item} style={{ fontSize: 12, color: '#64748b', marginBottom: 5 }}>• {item}</div>
                        ))}
                    </GlassCard>
                ))}
            </div>
        </div>
    )
}

// ── 20 Real-World Concepts ───────────────────────────────────
const CONCEPTS = [
    { id: 1, title: 'Consumer Lag Monitoring', icon: '📊', tag: 'Observability', color: '#3b82f6', desc: 'Lag = uncommitted offset gap. Alert when growing. Use kafka-consumer-groups tool or Prometheus.' },
    { id: 2, title: 'Backpressure', icon: '🛑', tag: 'Reliability', color: '#ef4444', desc: 'When consumers fall behind. Slow consumers block partition. Downstream creates pressure upstream.' },
    { id: 3, title: 'Slow Consumer Detection', icon: '🐌', tag: 'Observability', color: '#eab308', desc: 'max.poll.interval.ms exceeded → group rebalance. Monitor via consumer_lag and rebalance_rate.' },
    { id: 4, title: 'Hot Partitions / Skew', icon: '🌡️', tag: 'Performance', color: '#ef4444', desc: 'Poor key distribution → one partition gets all traffic. Leads to throughput bottleneck.' },
    { id: 5, title: 'Throughput vs Latency', icon: '⚖️', tag: 'Tradeoffs', color: '#a855f7', desc: 'Higher batch.size/linger.ms = more throughput, more latency. Tune based on SLA.' },
    { id: 6, title: 'Kafka as Commit Log', icon: '📋', tag: 'Pattern', color: '#22c55e', desc: 'Events as source of truth. Derive state by replaying log. Foundation of event sourcing.' },
    { id: 7, title: 'Replayability', icon: '⏮️', tag: 'Pattern', color: '#22c55e', desc: 'Reset consumer group to earliest → replay all events. New services can backfill from day 1.' },
    { id: 8, title: 'Dead Letter Queue (DLQ)', icon: '☠️', tag: 'Pattern', color: '#ef4444', desc: 'Failed messages routed to DLQ topic for inspection. Prevents consumer getting stuck on poison pills.' },
    { id: 9, title: 'Retry Topics Pattern', icon: '🔄', tag: 'Pattern', color: '#f97316', desc: 'On failure: route to retry-1 → retry-2 → DLQ with exponential backoff between topics.' },
    { id: 10, title: 'Outbox Pattern', icon: '📤', tag: 'Pattern', color: '#3b82f6', desc: 'Write to DB + outbox table in one transaction. CDC reads outbox → produces to Kafka.' },
    { id: 11, title: 'CDC with Kafka', icon: '🔗', tag: 'Integration', color: '#06b6d4', desc: 'Debezium reads DB binlog → publishes row changes to Kafka. Zero-impact capture.' },
    { id: 12, title: 'Stream Processing', icon: '🌊', tag: 'Ecosystem', color: '#3b82f6', desc: 'Kafka Streams (embedded Java) or Apache Flink for stateful transformations on event streams.' },
    { id: 13, title: 'Schema Evolution (Avro)', icon: '🧬', tag: 'Design', color: '#a855f7', desc: 'Schema Registry enforces contracts. Backward/forward compatible schema changes. Avro is compact binary.' },
    { id: 14, title: 'Message Keys Importance', icon: '🔑', tag: 'Core', color: '#f97316', desc: 'Key determines partition. Same key = same partition = ordering guaranteed for that entity.' },
    { id: 15, title: 'Data Locality', icon: '🗺️', tag: 'Performance', color: '#22c55e', desc: 'Processing assigned to same broker that holds partition data. Reduces network I/O.' },
    { id: 16, title: 'Retention vs Compaction', icon: '📁', tag: 'Storage', color: '#eab308', desc: 'Retention: delete by time/size. Compaction: keep latest per key. Compaction for state, retention for streams.' },
    { id: 17, title: 'max.poll.interval.ms Failures', icon: '⏱️', tag: 'Reliability', color: '#ef4444', desc: 'Processing a huge batch takes too long → broker thinks consumer died → rebalance → duplicate processing.' },
    { id: 18, title: 'Poison Pill Messages', icon: '🧪', tag: 'Reliability', color: '#a855f7', desc: 'Malformed message that always causes consumer exception and blocks partition forever. Must be handled via DLQ.' },
    { id: 19, title: 'Multi-tenant Kafka', icon: '🏢', tag: 'Operations', color: '#06b6d4', desc: 'Namespace isolation with topic prefixes, ACLs, quotas per tenant. Separate clusters for strong isolation.' },
    { id: 20, title: 'Batch vs Real-time', icon: '🕐', tag: 'Architecture', color: '#3b82f6', desc: 'Kafka bridges both worlds. micro-batch via max.poll.records; real-time via low linger.ms + per-event processing.' },
]

function ConceptsSection() {
    const [selected, setSelected] = useState(null)
    const selectedConcept = CONCEPTS.find(c => c.id === selected)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>20 Real-World Kafka Concepts</h2>
                <p style={{ color: '#64748b', fontSize: 13 }}>Click any concept to read the explanation.</p>
            </GlassCard>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {CONCEPTS.map(c => (
                    <motion.div
                        key={c.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelected(selected === c.id ? null : c.id)}
                        style={{
                            background: selected === c.id ? `${c.color}12` : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${selected === c.id ? `${c.color}30` : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                        }}
                    >
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 16 }}>{c.icon}</span>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: selected === c.id ? c.color : '#94a3b8', lineHeight: 1.3 }}>{c.title}</div>
                                <span style={{ fontSize: 9, padding: '1px 5px', background: `${c.color}15`, color: c.color, borderRadius: 8, marginTop: 3, display: 'inline-block' }}>{c.tag}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
            <AnimatePresence>
                {selectedConcept && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <GlassCard style={{ borderColor: `${selectedConcept.color}25` }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 32 }}>{selectedConcept.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 700, color: selectedConcept.color, fontSize: 16, marginBottom: 4 }}>{selectedConcept.title}</div>
                                    <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>{selectedConcept.desc}</div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
