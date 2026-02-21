import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TOPICS = [
    { id: 'what', title: 'What is Apache Kafka?' },
    { id: 'streaming', title: 'Event Streaming' },
    { id: 'pubsub', title: 'Pub/Sub vs Queue vs Log' },
    { id: 'usecases', title: 'Real-World Use Cases' },
    { id: 'architecture', title: 'Core Architecture' },
    { id: 'kraft', title: 'ZooKeeper vs KRaft' },
]

export default function Learn() {
    const [active, setActive] = useState('what')
    return (
        <div style={{ padding: '40px 48px', maxWidth: 1100, margin: '0 auto' }}>
            <PageHeader
                title="Kafka Basics"
                subtitle="Start here — understand Kafka from the ground up through animations and interactive examples."
                tag="Module 1"
                color="#f97316"
            />
            <div style={{ display: 'flex', gap: 32, marginTop: 32 }}>
                {/* Sidebar nav */}
                <div style={{ minWidth: 200 }}>
                    {TOPICS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActive(t.id)}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '10px 14px', borderRadius: 8, border: 'none',
                                background: active === t.id ? 'rgba(249,115,22,0.12)' : 'transparent',
                                color: active === t.id ? '#f97316' : '#64748b',
                                fontSize: 13, fontWeight: active === t.id ? 600 : 400,
                                cursor: 'pointer', marginBottom: 2,
                                borderLeft: active === t.id ? '2px solid #f97316' : '2px solid transparent',
                            }}
                        >
                            {t.title}
                        </button>
                    ))}
                </div>
                {/* Content panel */}
                <div style={{ flex: 1 }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={active}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {active === 'what' && <WhatIsKafka />}
                            {active === 'streaming' && <EventStreaming />}
                            {active === 'pubsub' && <PubSubVsAll />}
                            {active === 'usecases' && <UseCases />}
                            {active === 'architecture' && <CoreArchitecture />}
                            {active === 'kraft' && <KRaftSection />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

function PageHeader({ title, subtitle, tag, color }) {
    return (
        <div>
            <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                background: `${color}15`, color, borderRadius: 20, border: `1px solid ${color}25`,
            }}>{tag}</span>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 10, letterSpacing: '-0.5px' }}>{title}</h1>
            <p style={{ color: '#64748b', fontSize: 15, maxWidth: 600, marginTop: 6 }}>{subtitle}</p>
        </div>
    )
}

function GlassCard({ children, style }) {
    return (
        <div className="glass" style={{ borderRadius: 14, padding: 24, ...style }}>
            {children}
        </div>
    )
}

function Callout({ color = '#f97316', title, children }) {
    return (
        <div style={{
            background: `${color}10`, border: `1px solid ${color}25`,
            borderRadius: 10, padding: '14px 18px', marginTop: 16,
        }}>
            <div style={{ fontWeight: 700, color, marginBottom: 6, fontSize: 13 }}>💡 {title}</div>
            <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{children}</div>
        </div>
    )
}

// ── Section components ─────────────────────────────────────────

function WhatIsKafka() {
    return (
        <GlassCard>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>What is Apache Kafka?</h2>
            <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: 14 }}>
                Apache Kafka is a <strong style={{ color: '#e2e8f0' }}>distributed event streaming platform</strong>.
                Think of it as a high-throughput, fault-tolerant pipe that connects your services.
            </p>
            <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: 14, marginTop: 12 }}>
                Instead of services calling each other directly (tight coupling), services write{' '}
                <strong style={{ color: '#f97316' }}>events</strong> to Kafka.
                Other services read those events at their own pace. This is <strong style={{ color: '#e2e8f0' }}>decoupled, async communication</strong>.
            </p>

            {/* Animated pipeline */}
            <KafkaPipelineAnimation />

            <Callout title="Key insight">
                Kafka is a <strong>log</strong>, not a queue. Events are stored durably and can be replayed.
                Multiple consumers can read the same data independently.
            </Callout>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
                {[
                    { title: 'High Throughput', desc: 'Millions of events/sec', icon: '⚡' },
                    { title: 'Fault Tolerant', desc: 'Replicated across brokers', icon: '🛡️' },
                    { title: 'Scalable', desc: 'Horizontal scaling via partitions', icon: '📈' },
                ].map(f => (
                    <div key={f.title} style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                        padding: 16, border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{f.title}</div>
                        <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>{f.desc}</div>
                    </div>
                ))}
            </div>
        </GlassCard>
    )
}

function KafkaPipelineAnimation() {
    const [step, setStep] = useState(0)

    const STEPS = [
        { label: 'Producer', color: '#f97316', side: 'left' },
        { label: 'Kafka Broker', color: '#3b82f6', side: 'center' },
        { label: 'Consumer', color: '#22c55e', side: 'right' },
    ]

    return (
        <div style={{ marginTop: 24, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                {STEPS.map((s, i) => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0.6 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.3, repeat: Infinity, repeatDelay: 2, duration: 0.4 }}
                            style={{
                                background: `${s.color}18`,
                                border: `1px solid ${s.color}40`,
                                borderRadius: 10, padding: '12px 20px', textAlign: 'center',
                                minWidth: 100,
                            }}
                        >
                            <div style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.label}</div>
                        </motion.div>
                        {i < 2 && (
                            <div style={{ position: 'relative', width: 80, height: 2, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}>
                                <motion.div
                                    animate={{ x: [0, 68] }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.6 }}
                                    style={{
                                        position: 'absolute', top: -4, left: 0,
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: i === 0 ? '#f97316' : '#3b82f6',
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function EventStreaming() {
    return (
        <GlassCard>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Event Streaming</h2>
            <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: 14 }}>
                An <strong style={{ color: '#e2e8f0' }}>event</strong> is anything that happened:
                "User clicked buy", "Payment succeeded", "Temperature exceeded threshold".
                Events are immutable facts. Once written, they don't change.
            </p>
            <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: 14, marginTop: 12 }}>
                <strong style={{ color: '#e2e8f0' }}>Streaming</strong> = continuous, real-time flow of events.
                Kafka stores them in order and lets you process them in real time OR replay from the past.
            </p>

            <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#94a3b8' }}>Event Log Visualization</h3>
                <AppendOnlyLog />
            </div>

            <Callout color="#3b82f6" title="Game-changing property">
                Kafka's log is <strong>replayable</strong>. A new consumer can read all events from the beginning,
                enabling CDC, event sourcing, and time-travel debugging.
            </Callout>
        </GlassCard>
    )
}

function AppendOnlyLog() {
    const [messages, setMessages] = useState([
        { id: 0, value: 'user.signup', ts: '09:00:01' },
        { id: 1, value: 'order.placed', ts: '09:00:03' },
        { id: 2, value: 'payment.ok', ts: '09:00:04' },
    ])

    function addMessage() {
        const events = ['user.login', 'page.view', 'order.placed', 'payment.failed', 'item.shipped']
        const now = new Date()
        setMessages(prev => [...prev, {
            id: prev.length,
            value: events[Math.floor(Math.random() * events.length)],
            ts: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
        }].slice(-6))
    }

    return (
        <div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
                <AnimatePresence>
                    {messages.map(m => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            style={{
                                minWidth: 120, background: 'rgba(59,130,246,0.1)',
                                border: '1px solid rgba(59,130,246,0.25)',
                                borderRadius: 8, padding: '10px 12px',
                                position: 'relative',
                            }}
                        >
                            <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>offset: {m.id}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#7dd3fc' }}>{m.value}</div>
                            <div style={{ fontSize: 9, color: '#475569', marginTop: 4 }}>{m.ts}</div>
                            <div style={{
                                position: 'absolute', top: 4, right: 6, fontSize: 8,
                                color: '#1d4ed8', background: 'rgba(29,78,216,0.2)', padding: '1px 5px', borderRadius: 4,
                            }}>immutable</div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div style={{
                    minWidth: 100, border: '1px dashed rgba(255,255,255,0.12)',
                    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ color: '#334155', fontSize: 11 }}>next →</span>
                </div>
            </div>
            <button
                onClick={addMessage}
                style={{
                    marginTop: 12, padding: '8px 16px', background: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8,
                    color: '#60a5fa', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                }}
            >
                + Append Event
            </button>
        </div>
    )
}

function PubSubVsAll() {
    const [selected, setSelected] = useState('queue')
    const models = {
        queue: {
            title: 'Message Queue (e.g. RabbitMQ)',
            color: '#a855f7',
            pros: ['Simple', 'Low latency', 'Work distribution'],
            cons: ['Message deleted after consume', 'No replay', 'Tight coupling'],
            desc: 'Messages are consumed once and deleted. Great for task queues, but no replay capability.',
        },
        pubsub: {
            title: 'Pub/Sub (traditional)',
            color: '#3b82f6',
            pros: ['Fan-out delivery', 'Multiple subscribers'],
            cons: ['No ordering', 'No persistence', 'No rewind'],
            desc: 'Publisher sends to a topic; all subscribers get a copy. No storage, no replay.',
        },
        kafka: {
            title: 'Kafka (Distributed Log)',
            color: '#f97316',
            pros: ['Replay events', 'Ordered within partitions', 'Consumer groups', 'Durable storage'],
            cons: ['More complex', 'Higher ops overhead'],
            desc: 'Events stored in an ordered, replicated log. Any consumer group reads at their own pace.',
        },
    }
    const m = models[selected]
    return (
        <GlassCard>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Pub/Sub vs Queue vs Kafka Log</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {Object.keys(models).map(k => (
                    <button
                        key={k}
                        onClick={() => setSelected(k)}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: selected === k ? `${models[k].color}20` : 'rgba(255,255,255,0.04)',
                            color: selected === k ? models[k].color : '#475569',
                            fontWeight: selected === k ? 700 : 400, fontSize: 13,
                            borderBottom: selected === k ? `2px solid ${models[k].color}` : '2px solid transparent',
                        }}
                    >{models[k].title.split(' (')[0]}</button>
                ))}
            </div>
            <AnimatePresence mode="wait">
                <motion.div
                    key={selected}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{m.desc}</p>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>✓ Pros</div>
                            {m.pros.map(p => <div key={p} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>• {p}</div>)}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>✗ Cons</div>
                            {m.cons.map(c => <div key={c} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>• {c}</div>)}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </GlassCard>
    )
}

function UseCases() {
    const cases = [
        { icon: '📦', title: 'Order Processing', desc: 'Decouple order service from inventory, payments, notifications.' },
        { icon: '📊', title: 'Real-time Analytics', desc: 'Stream clickstream, IoT sensor data to dashboards.' },
        { icon: '🏦', title: 'Financial Transactions', desc: 'Fraud detection, payment events with exactly-once semantics.' },
        { icon: '🔄', title: 'CDC (Change Data Capture)', desc: 'Stream DB changes to data warehouse using Debezium.' },
        { icon: '🤖', title: 'ML Feature Pipeline', desc: 'Real-time feature computation for ML models.' },
        { icon: '📡', title: 'Microservices Backbone', desc: 'Async communication between 100s of services.' },
    ]
    return (
        <GlassCard>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Real-World Use Cases</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {cases.map(c => (
                    <motion.div
                        key={c.title}
                        whileHover={{ scale: 1.02 }}
                        style={{
                            background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16,
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{c.title}</div>
                        <div style={{ color: '#475569', fontSize: 12, lineHeight: 1.5 }}>{c.desc}</div>
                    </motion.div>
                ))}
            </div>
        </GlassCard>
    )
}

function CoreArchitecture() {
    return (
        <GlassCard>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Core Architecture</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                Kafka cluster = multiple <strong style={{ color: '#f97316' }}>Brokers</strong>.
                Each broker stores <strong style={{ color: '#3b82f6' }}>Partitions</strong> of one or more{' '}
                <strong style={{ color: '#22c55e' }}>Topics</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                    { term: 'Broker', color: '#f97316', def: 'A Kafka server. Stores partitions, handles producer writes and consumer reads.' },
                    { term: 'Topic', color: '#3b82f6', def: 'A named category/stream. Like a database table, but append-only.' },
                    { term: 'Partition', color: '#22c55e', def: 'Ordered, immutable log. Unit of parallelism in Kafka.' },
                    { term: 'Offset', color: '#a855f7', def: 'Unique position of a message in a partition. Ever-increasing.' },
                    { term: 'Producer', color: '#eab308', def: 'Writes events to topics. Chooses partition via key hash or round-robin.' },
                    { term: 'Consumer Group', color: '#06b6d4', def: 'A set of consumers. Each partition is owned by exactly one member.' },
                ].map(item => (
                    <div key={item.term} style={{
                        background: `${item.color}08`, border: `1px solid ${item.color}20`,
                        borderRadius: 10, padding: 14,
                    }}>
                        <div style={{ fontWeight: 700, color: item.color, fontSize: 14, marginBottom: 4 }}>{item.term}</div>
                        <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>{item.def}</div>
                    </div>
                ))}
            </div>
        </GlassCard>
    )
}

function KRaftSection() {
    return (
        <GlassCard>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>ZooKeeper vs KRaft</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                Old Kafka used <strong style={{ color: '#e2e8f0' }}>Apache ZooKeeper</strong> to manage cluster metadata
                (leader election, config). New Kafka (2.8+) uses <strong style={{ color: '#f97316' }}>KRaft</strong> —
                Kafka Raft — replacing ZooKeeper with an internal consensus protocol.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                    {
                        title: 'ZooKeeper (Legacy)',
                        color: '#ef4444',
                        points: ['Separate ZK cluster required', 'Complex ops', 'Scalability limit ~200k partitions', 'Deprecated in Kafka 3.x'],
                    },
                    {
                        title: 'KRaft (Modern)',
                        color: '#22c55e',
                        points: ['Built-in consensus (Raft protocol)', 'Simpler deployment', '10x more partitions per cluster', 'Default since Kafka 3.3'],
                    },
                ].map(s => (
                    <div key={s.title} style={{
                        background: `${s.color}08`, border: `1px solid ${s.color}25`,
                        borderRadius: 10, padding: 16,
                    }}>
                        <div style={{ fontWeight: 700, color: s.color, marginBottom: 10 }}>{s.title}</div>
                        {s.points.map(p => <div key={p} style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>• {p}</div>)}
                    </div>
                ))}
            </div>
            <Callout color="#22c55e" title="Bottom line">
                Use KRaft for all new Kafka deployments. ZooKeeper will be fully removed in a future version.
            </Callout>
        </GlassCard>
    )
}
