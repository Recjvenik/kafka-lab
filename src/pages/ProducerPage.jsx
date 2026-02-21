import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useKafkaStore } from '../state/kafkaStore'

const ACKS_INFO = {
    0: { label: 'acks=0', color: '#ef4444', latency: '1-3ms', durability: 'None (fire-and-forget)', risk: 'High' },
    1: { label: 'acks=1', color: '#eab308', latency: '5-20ms', durability: 'Leader only', risk: 'Medium' },
    all: { label: 'acks=all', color: '#22c55e', latency: '20-100ms', durability: 'All ISR replicas', risk: 'Low' },
}

export default function ProducerPage() {
    const { cluster, selectedTopic, produceMessages, setProducerConfig, producers, _rev } = useKafkaStore()
    const producer = producers?.[0]

    const [acks, setAcks] = useState(1)
    const [idempotent, setIdempotent] = useState(false)
    const [messageRate, setMessageRate] = useState(3)
    const [keyMode, setKeyMode] = useState(false)
    const [sending, setSending] = useState(false)
    const [latencyData, setLatencyData] = useState([])
    const [particles, setParticles] = useState([])
    const [batchSize, setBatchSize] = useState(16384)
    const [lingerMs, setLingerMs] = useState(0)
    const [sendCount, setSendCount] = useState(0)
    const intervalRef = useRef(null)
    const sendBurstRef = useRef(null)  // always points to latest sendBurst

    const topic = cluster.topics?.get?.(selectedTopic)
    const partitions = topic?.partitions || []
    const acksInfo = ACKS_INFO[acks]

    function sendBurst() {
        const key = keyMode ? `user-${Math.floor(Math.random() * 5)}` : null
        produceMessages(messageRate, key)
        setSendCount(c => c + messageRate)

        // Simulate latency data point — uses current acks via closure
        const jitter = Math.random() * 0.4 - 0.2
        const baseLatency = acks === 0 ? 2 : acks === 1 ? 12 : 55
        const latency = +(baseLatency * (1 + jitter)).toFixed(1)
        setLatencyData(prev => [...prev, { t: prev.length, latency }].slice(-30))

        // Particle animation
        const newParticles = Array.from({ length: messageRate }, (_, i) => ({
            id: `${Date.now()}-${i}`,
            partitionId: Math.floor(Math.random() * Math.max(partitions.length, 1)),
            key,
        }))
        setParticles(p => [...p, ...newParticles])
        setTimeout(() => {
            setParticles(p => p.filter(x => !newParticles.find(np => np.id === x.id)))
        }, 1200)
    }

    // Keep the ref always pointing to the latest sendBurst (fixes stale closure in interval)
    sendBurstRef.current = sendBurst

    useEffect(() => {
        setProducerConfig?.({ acks, idempotent, batchSize, lingerMs })
        // Clear latency history when acks mode changes so the chart reflects
        // the new latency profile immediately rather than blending old values
        setLatencyData([])
    }, [acks, idempotent, batchSize, lingerMs])

    function toggleContinuous() {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            setSending(false)
        } else {
            setSending(true)
            // Use ref so the interval always calls the latest sendBurst,
            // picking up current acks/messageRate/keyMode/partitions
            intervalRef.current = setInterval(() => sendBurstRef.current(), 1000)
        }
    }

    useEffect(() => () => clearInterval(intervalRef.current), [])

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
            <PageHeader title="Producer Simulator" tag="Module 3" color="#eab308"
                subtitle="Configure acks, retries, keyed routing. Watch messages flow to partitions with latency tradeoffs." />

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, marginTop: 28 }}>
                {/* Config panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* acks selector */}
                    <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#94a3b8' }}>Acknowledgment (acks)</div>
                        {Object.entries(ACKS_INFO).map(([k, v]) => (
                            <button key={k} onClick={() => setAcks(k === 'all' ? 'all' : +k)} style={{
                                display: 'block', width: '100%', textAlign: 'left', marginBottom: 6,
                                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: acks.toString() === k ? `${v.color}18` : 'rgba(255,255,255,0.03)',
                                borderLeft: `2px solid ${acks.toString() === k ? v.color : 'transparent'}`,
                                color: acks.toString() === k ? v.color : '#475569', fontSize: 12, fontWeight: acks.toString() === k ? 700 : 400,
                            }}>
                                <strong>{v.label}</strong> — {v.latency}
                            </button>
                        ))}
                    </div>

                    {/* Settings */}
                    <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#94a3b8' }}>Settings</div>

                        <Label>Message rate: <strong style={{ color: '#eab308' }}>{messageRate}/s</strong></Label>
                        <input type="range" min={1} max={20} value={messageRate} onChange={e => setMessageRate(+e.target.value)}
                            style={{ width: '100%', marginBottom: 12 }} />

                        <Label>batch.size: <strong style={{ color: '#eab308' }}>{batchSize.toLocaleString()} B</strong></Label>
                        <input type="range" min={1024} max={1048576} step={1024} value={batchSize}
                            onChange={e => setBatchSize(+e.target.value)} style={{ width: '100%', marginBottom: 12 }} />

                        <Label>linger.ms: <strong style={{ color: '#eab308' }}>{lingerMs}ms</strong></Label>
                        <input type="range" min={0} max={100} value={lingerMs}
                            onChange={e => setLingerMs(+e.target.value)} style={{ width: '100%', marginBottom: 12 }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Key-based routing</span>
                            <Toggle value={keyMode} onChange={setKeyMode} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Idempotent producer</span>
                            <Toggle value={idempotent} onChange={setIdempotent} />
                        </div>
                    </div>

                    {/* Send buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={sendBurst} style={{
                            flex: 1, padding: '10px 0', background: 'rgba(234,179,8,0.2)',
                            border: '1px solid rgba(234,179,8,0.4)', borderRadius: 8,
                            color: '#eab308', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        }}>Send Burst</button>
                        <button onClick={toggleContinuous} style={{
                            flex: 1, padding: '10px 0',
                            background: sending ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${sending ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: 8, color: sending ? '#ef4444' : '#64748b',
                            cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        }}>{sending ? 'Stop' : 'Auto Send'}</button>
                    </div>
                </div>

                {/* Visualization */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Durability panel */}
                    <DurabilityPanel acksInfo={acksInfo} idempotent={idempotent} sendCount={sendCount} />

                    {/* Partition flow */}
                    <PartitionFlow partitions={partitions} particles={particles} />

                    {/* Latency chart */}
                    <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#94a3b8' }}>Latency History</div>
                        {latencyData.length === 0
                            ? <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: 20 }}>Send messages to see latency</div>
                            : <ResponsiveContainer width="100%" height={140}>
                                <LineChart data={latencyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="t" hide />
                                    <YAxis domain={[0, 120]} tick={{ fill: '#475569', fontSize: 10 }} unit="ms" />
                                    <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                    <Line type="monotone" dataKey="latency" stroke={acksInfo.color} dot={false} strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

function DurabilityPanel({ acksInfo, idempotent, sendCount }) {
    return (
        <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#94a3b8' }}>Latency vs Durability Tradeoff</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                    { label: 'Latency', value: acksInfo.latency, color: acksInfo.color },
                    { label: 'Durability', value: acksInfo.durability, color: acksInfo.color },
                    { label: 'Data Loss Risk', value: acksInfo.risk, color: acksInfo.risk === 'High' ? '#ef4444' : acksInfo.risk === 'Medium' ? '#eab308' : '#22c55e' },
                    { label: 'Idempotent', value: idempotent ? 'Yes (No dupes)' : 'No', color: idempotent ? '#22c55e' : '#475569' },
                ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.value}</div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#475569' }}>Total sent: <strong style={{ color: '#e2e8f0' }}>{sendCount}</strong></div>
        </div>
    )
}

function PartitionFlow({ partitions, particles }) {
    const displayPartitions = partitions.length > 0 ? partitions : [{ id: 0 }, { id: 1 }, { id: 2 }]
    return (
        <div className="glass" style={{ borderRadius: 14, padding: 16, minHeight: 160 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#94a3b8' }}>Message Flow → Partitions</div>
            <div style={{ display: 'flex', gap: 12, position: 'relative', alignItems: 'flex-end', paddingTop: 40 }}>
                {/* Producer box */}
                <div style={{
                    position: 'absolute', top: 0, left: 0,
                    background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)',
                    borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#eab308', fontWeight: 700,
                }}>Producer</div>

                {displayPartitions.slice(0, 8).map(p => {
                    const arriving = particles.filter(pt => pt.partitionId === p.id)
                    return (
                        <div key={p.id} style={{ flex: 1, position: 'relative' }}>
                            {arriving.map(pt => (
                                <motion.div
                                    key={pt.id}
                                    initial={{ opacity: 1, y: -30, scale: 1 }}
                                    animate={{ opacity: 0, y: 30, scale: 0.8 }}
                                    transition={{ duration: 0.9 }}
                                    style={{
                                        position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)',
                                        width: 12, height: 12, borderRadius: '50%',
                                        background: pt.key ? '#f97316' : '#eab308',
                                        boxShadow: `0 0 8px ${pt.key ? '#f97316' : '#eab308'}`,
                                    }}
                                />
                            ))}
                            <div style={{
                                background: arriving.length > 0 ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${arriving.length > 0 ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: 8, padding: '10px 6px', textAlign: 'center',
                                transition: 'all 0.2s',
                            }}>
                                <div style={{ fontSize: 11, color: '#475569' }}>P-{p.id}</div>
                                <div style={{ fontSize: 10, color: '#334155', marginTop: 4 }}>{p.nextOffset ?? p.log?.length ?? 0} msgs</div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function Toggle({ value, onChange }) {
    return (
        <div
            onClick={() => onChange(!value)}
            style={{
                width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                background: value ? '#f97316' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s',
            }}
        >
            <motion.div
                animate={{ x: value ? 18 : 2 }}
                transition={{ duration: 0.15 }}
                style={{
                    position: 'absolute', top: 2, width: 16, height: 16,
                    borderRadius: '50%', background: '#fff',
                }}
            />
        </div>
    )
}

function Label({ children }) {
    return <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{children}</div>
}

function PageHeader({ title, subtitle, tag, color }) {
    return (
        <div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', background: `${color}15`, color, borderRadius: 20, border: `1px solid ${color}25` }}>{tag}</span>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.5px' }}>{title}</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{subtitle}</p>
        </div>
    )
}
