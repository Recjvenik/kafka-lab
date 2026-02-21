import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKafkaStore } from '../state/kafkaStore'

// ─── colour palette shared across all sub-components ─────────────────────────
const C = {
    cyan: '#06b6d4',
    green: '#22c55e',
    orange: '#f97316',
    purple: '#a855f7',
    red: '#ef4444',
    yellow: '#eab308',
    slate: '#94a3b8',
    dim: '#475569',
    dimmer: '#334155',
}

// ─── guided steps definition ─────────────────────────────────────────────────
const STEPS = [
    {
        id: 1,
        emoji: '🏗️',
        title: 'Your cluster is ready',
        detail: '3 brokers are running. Topics "orders" (3 partitions) and "payments" (2 partitions) exist. Each partition has a leader broker highlighted in orange.',
        color: C.green,
    },
    {
        id: 2,
        emoji: '📤',
        title: 'Produce some messages',
        detail: 'Click "Send Burst" to push messages into the "orders" topic. Watch the animated dots travel from the Producer into the correct partition based on the message key (or round-robin if no key).',
        color: C.yellow,
    },
    {
        id: 3,
        emoji: '👥',
        title: 'Watch consumers read',
        detail: 'Consumer group "group-alpha" has 2 consumers. Each partition is owned by exactly one consumer. Consumers poll their partitions and advance their offset. Lag = messages produced minus messages consumed.',
        color: C.cyan,
    },
    {
        id: 4,
        emoji: '💥',
        title: 'Break something!',
        detail: 'Kill a broker. Kafka automatically elects a new leader from the ISR (In-Sync Replicas). Add more consumers—if you have MORE consumers than partitions, the extras sit idle.',
        color: C.red,
    },
]

// ─── main component ───────────────────────────────────────────────────────────
export default function PlaygroundPage() {
    const {
        cluster, coordinator,
        createTopic, addBroker, killBroker, restartBroker,
        addConsumer, removeConsumer, createGroup, removeGroup,
        produceMessages, toggleSimulation, isSimulationRunning,
        selectedTopic, selectTopic,
        _rev,
    } = useKafkaStore()

    const [activeStep, setActiveStep] = useState(1)
    const [msgKey, setMsgKey] = useState('')
    const [msgRate, setMsgRate] = useState(3)
    const [newTopicName, setNewTopicName] = useState('events')
    const [newTopicParts, setNewTopicParts] = useState(3)
    const [particles, setParticles] = useState([])
    const [eventLog, setEventLog] = useState([
        { id: 0, ts: new Date().toLocaleTimeString(), type: 'info', text: 'Cluster is healthy. 3 brokers online.' },
        { id: 1, ts: new Date().toLocaleTimeString(), type: 'info', text: 'Topics "orders" (3p) and "payments" (2p) created.' },
        { id: 2, ts: new Date().toLocaleTimeString(), type: 'success', text: 'Consumer group "group-alpha" joined with 2 consumers.' },
    ])
    const intervalRef = useRef(null)
    const logIdRef = useRef(3)

    const topics = Array.from(cluster.topics?.values?.() || [])
    const groups = coordinator.getAllGroups?.() || []
    const brokers = cluster.brokers || []
    const selectedTopicObj = topics.find(t => t.name === selectedTopic)

    // ── helpers ─────────────────────────────────────────────────────────────────
    const addEvent = useCallback((type, text) => {
        setEventLog(prev => [{
            id: logIdRef.current++,
            ts: new Date().toLocaleTimeString(),
            type, // 'info' | 'success' | 'warn' | 'error'
            text,
        }, ...prev].slice(0, 50))
    }, [])

    // ── simulation loop ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (isSimulationRunning) {
            intervalRef.current = setInterval(() => {
                const key = msgKey || null
                produceMessages(msgRate, key)
                // spawn visual particles
                setParticles(prev => {
                    const newOnes = Array.from({ length: Math.min(msgRate, 5) }, (_, i) => ({
                        id: `${Date.now()}-${i}`,
                        pid: i % Math.max((selectedTopicObj?.partitions?.length || 3), 1),
                    }))
                    setTimeout(() => {
                        setParticles(p => p.filter(x => !newOnes.find(n => n.id === x.id)))
                    }, 900)
                    return [...prev, ...newOnes]
                })
            }, 1000)
        } else {
            clearInterval(intervalRef.current)
        }
        return () => clearInterval(intervalRef.current)
    }, [isSimulationRunning, msgRate, msgKey, selectedTopicObj, produceMessages])

    // ── wrapped actions that also log events ────────────────────────────────────
    function handleSendBurst() {
        const key = msgKey || null
        produceMessages(msgRate, key)
        addEvent('success', `Sent ${msgRate} message(s) to "${selectedTopic}"${key ? ` with key="${key}"` : ' (round-robin)'}`)
        setActiveStep(s => Math.max(s, 2))
        // Spawn particles
        setParticles(prev => {
            const newOnes = Array.from({ length: Math.min(msgRate, 6) }, (_, i) => ({
                id: `burst-${Date.now()}-${i}`,
                pid: i % Math.max((selectedTopicObj?.partitions?.length || 3), 1),
            }))
            setTimeout(() => setParticles(p => p.filter(x => !newOnes.find(n => n.id === x.id))), 900)
            return [...prev, ...newOnes]
        })
    }

    function handleCreateTopic() {
        if (!newTopicName.trim()) return
        createTopic(newTopicName.trim(), newTopicParts, Math.min(2, brokers.filter(b => b.isAlive).length))
        selectTopic(newTopicName.trim())
        addEvent('success', `Topic "${newTopicName}" created with ${newTopicParts} partition(s).`)
    }

    function handleKillBroker(id) {
        killBroker(id)
        addEvent('error', `Broker-${id} killed! Leader election triggered on affected partitions.`)
        setActiveStep(s => Math.max(s, 4))
    }

    function handleRestartBroker(id) {
        restartBroker(id)
        addEvent('success', `Broker-${id} restarted. Rejoining ISR...`)
    }

    function handleAddConsumer(groupId) {
        addConsumer(groupId)
        const group = coordinator.getGroup(groupId)
        const partCount = selectedTopicObj?.partitions?.length || 0
        const consCount = (group?.consumers?.length || 0)
        if (consCount > partCount) {
            addEvent('warn', `Consumer added to "${groupId}" — but ${consCount} consumers > ${partCount} partitions. Extra consumer is IDLE (standby only).`)
        } else {
            addEvent('success', `Consumer added to "${groupId}". Rebalancing partitions...`)
        }
        setActiveStep(s => Math.max(s, 3))
    }

    function handleAddGroup() {
        const id = `group-${groups.length + 1}`
        createGroup(id, topics.map(t => t.name), 'round-robin')
        addEvent('info', `New consumer group "${id}" created. It reads ALL the same messages independently — this is the fan-out pattern!`)
    }

    function handleToggleSim() {
        toggleSimulation()
        if (!isSimulationRunning) {
            addEvent('info', `Auto-produce started at ${msgRate} msg/s.`)
            setActiveStep(s => Math.max(s, 2))
        } else {
            addEvent('warn', 'Auto-produce stopped.')
        }
    }

    return (
        <div style={{ minHeight: '100vh', padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

            {/* ── page header ── */}
            <div style={{ marginBottom: 20 }}>
                <span style={tagStyle(C.cyan)}>Module 7 — Full Sandbox</span>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 8, letterSpacing: '-0.5px', marginBottom: 2 }}>
                    Kafka Playground
                </h1>
                <p style={{ color: C.dim, fontSize: 13 }}>
                    A live Kafka cluster you can poke, break, and experiment with. Follow the steps on the left.
                </p>
            </div>

            {/* ── top topic selector ── */}
            <TopicBar topics={topics} selectedTopic={selectedTopic} selectTopic={t => { selectTopic(t); addEvent('info', `Switched view to topic "${t}"`) }} />

            {/* ── main 3-column layout ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr 240px', gap: 16, marginTop: 16, alignItems: 'start' }}>

                {/* ── LEFT: Guided Steps + Controls ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Guided Steps */}
                    <div className="glass" style={{ borderRadius: 14, padding: 14 }}>
                        <div style={sectionLabel}>📚 Guided Steps</div>
                        {STEPS.map(step => (
                            <button key={step.id} onClick={() => setActiveStep(step.id)} style={{
                                width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                                border: `1px solid ${activeStep === step.id ? step.color + '40' : 'rgba(255,255,255,0.05)'}`,
                                background: activeStep === step.id ? step.color + '12' : 'transparent',
                                cursor: 'pointer', marginBottom: 6, transition: 'all 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 16 }}>{step.emoji}</span>
                                    <span style={{ fontSize: 12, fontWeight: activeStep === step.id ? 700 : 500, color: activeStep === step.id ? step.color : C.slate }}>
                                        Step {step.id}: {step.title}
                                    </span>
                                </div>
                                <AnimatePresence>
                                    {activeStep === step.id && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            style={{ fontSize: 11, color: C.dim, marginTop: 8, lineHeight: 1.6, overflow: 'hidden' }}>
                                            {step.detail}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>
                        ))}
                    </div>

                    {/* Produce Controls */}
                    <div className="glass" style={{ borderRadius: 14, padding: 14 }}>
                        <div style={sectionLabel}>📤 Produce Messages</div>
                        <div style={{ fontSize: 11, color: C.dim, marginBottom: 10, lineHeight: 1.5 }}>
                            Message key → same partition always.<br />No key → round-robin across partitions.
                        </div>
                        <input
                            placeholder="key (empty = round-robin)"
                            value={msgKey}
                            onChange={e => setMsgKey(e.target.value)}
                            style={inputStyle}
                        />
                        <SliderRow label="Messages per burst" value={msgRate} min={1} max={15} color={C.yellow} onChange={setMsgRate} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <button onClick={handleSendBurst} style={{ ...actionBtn(C.yellow), flex: 1 }}>Send Burst</button>
                            <button onClick={handleToggleSim} style={{ ...actionBtn(isSimulationRunning ? C.red : C.cyan), flex: 1 }}>
                                {isSimulationRunning ? '⏹ Stop' : '▶ Auto'}
                            </button>
                        </div>
                    </div>

                    {/* Broker Controls */}
                    <div className="glass" style={{ borderRadius: 14, padding: 14 }}>
                        <div style={sectionLabel}>🖥️ Brokers</div>
                        <div style={{ fontSize: 11, color: C.dim, marginBottom: 10, lineHeight: 1.5 }}>
                            Kill a broker to trigger leader re-election. Kafka picks the next ISR replica.
                        </div>
                        {brokers.map(b => (
                            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.isAlive ? C.green : C.red }} />
                                    <span style={{ fontSize: 12, color: b.isAlive ? '#e2e8f0' : C.dim }}>broker-{b.id}</span>
                                    {b.partitionCount > 0 && <span style={{ fontSize: 9, color: C.dim }}>{b.partitionCount}p</span>}
                                </div>
                                <button
                                    onClick={() => b.isAlive ? handleKillBroker(b.id) : handleRestartBroker(b.id)}
                                    style={{
                                        padding: '2px 8px', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 10,
                                        background: b.isAlive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                                        color: b.isAlive ? C.red : C.green
                                    }}>
                                    {b.isAlive ? 'Kill' : 'Restart'}
                                </button>
                            </div>
                        ))}
                        <button onClick={() => { addBroker(); addEvent('success', `Broker-${brokers.length} added to cluster.`) }}
                            style={{ ...actionBtn(C.slate), width: '100%', marginTop: 4 }}>+ Add Broker</button>
                    </div>

                    {/* Create Topic */}
                    <div className="glass" style={{ borderRadius: 14, padding: 14 }}>
                        <div style={sectionLabel}>📋 New Topic</div>
                        <input placeholder="topic name" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} style={inputStyle} />
                        <SliderRow label="Partitions" value={newTopicParts} min={1} max={12} color={C.purple} onChange={setNewTopicParts} />
                        <button onClick={handleCreateTopic} style={{ ...actionBtn(C.purple), width: '100%', marginTop: 4 }}>Create Topic</button>
                    </div>
                </div>

                {/* ── CENTER: Main Flow Diagram ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Cluster Health Bar */}
                    <ClusterHealthBar brokers={brokers} groups={groups} topics={topics} />

                    {/* Flow Diagram */}
                    <FlowDiagram
                        topic={selectedTopicObj}
                        groups={groups}
                        brokers={brokers}
                        particles={particles}
                        onAddConsumer={handleAddConsumer}
                        onRemoveConsumer={removeConsumer}
                        addEvent={addEvent}
                        setActiveStep={setActiveStep}
                    />

                    {/* Consumer Groups panel */}
                    <ConsumerGroupsPanel
                        groups={groups}
                        topics={topics}
                        onAddConsumer={handleAddConsumer}
                        onRemoveConsumer={removeConsumer}
                        onRemoveGroup={id => { removeGroup(id); addEvent('warn', `Consumer group "${id}" dissolved.`) }}
                        onAddGroup={handleAddGroup}
                    />
                </div>

                {/* ── RIGHT: Live Event Log ── */}
                <div className="glass" style={{ borderRadius: 14, padding: 14, position: 'sticky', top: 20 }}>
                    <div style={{ ...sectionLabel, marginBottom: 12 }}>📡 Live Event Log</div>
                    <div style={{ fontSize: 11, color: C.dim, marginBottom: 10 }}>
                        Plain-English events from your cluster:
                    </div>
                    <div style={{ maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <AnimatePresence>
                            {eventLog.map(ev => (
                                <motion.div key={ev.id}
                                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                    style={{
                                        padding: '8px 10px', borderRadius: 8, fontSize: 11, lineHeight: 1.5,
                                        background: {
                                            info: 'rgba(6,182,212,0.07)',
                                            success: 'rgba(34,197,94,0.07)',
                                            warn: 'rgba(234,179,8,0.07)',
                                            error: 'rgba(239,68,68,0.07)',
                                        }[ev.type],
                                        borderLeft: `2px solid ${{ info: C.cyan, success: C.green, warn: C.yellow, error: C.red }[ev.type]
                                            }`,
                                    }}>
                                    <div style={{ color: C.dimmer, fontSize: 9, marginBottom: 2 }}>{ev.ts}</div>
                                    <div style={{ color: { info: C.cyan, success: '#86efac', warn: '#fde68a', error: '#fca5a5' }[ev.type] }}>
                                        {ev.text}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                    {eventLog.length > 5 && (
                        <button onClick={() => setEventLog([])}
                            style={{
                                marginTop: 10, width: '100%', padding: '5px 0', background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: C.dim, cursor: 'pointer', fontSize: 10
                            }}>
                            Clear log
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Cluster Health Bar ───────────────────────────────────────────────────────
function ClusterHealthBar({ brokers, groups, topics }) {
    const alive = brokers.filter(b => b.isAlive).length
    const totalPartitions = topics.reduce((s, t) => s + t.partitions.length, 0)
    const totalMessages = topics.reduce((s, t) => s + t.totalMessages, 0)
    const totalConsumers = groups.reduce((s, g) => s + g.consumers.length, 0)

    const stats = [
        { label: 'Brokers', value: `${alive}/${brokers.length}`, color: alive === brokers.length ? C.green : C.red, tip: 'Online / Total' },
        { label: 'Topics', value: topics.length, color: C.purple, tip: 'Active topics' },
        { label: 'Partitions', value: totalPartitions, color: C.cyan, tip: 'Total partition slots' },
        { label: 'Consumers', value: totalConsumers, color: C.yellow, tip: 'Across all groups' },
        { label: 'Messages', value: totalMessages, color: C.orange, tip: 'In partition logs' },
    ]

    return (
        <div className="glass" style={{ borderRadius: 14, padding: '10px 16px', display: 'flex', gap: 0, justifyContent: 'space-around' }}>
            {stats.map((s, i) => (
                <div key={s.label} style={{
                    textAlign: 'center', padding: '4px 16px',
                    borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>{s.label}</div>
                </div>
            ))}
        </div>
    )
}

// ─── Main Flow Diagram ────────────────────────────────────────────────────────
// Shows:  [Producer] --→ [Partitions P0 P1 P2...] --→ [Consumers]
function FlowDiagram({ topic, groups, brokers, particles, onAddConsumer, onRemoveConsumer, addEvent, setActiveStep }) {
    const partitions = topic?.partitions || []
    const topicName = topic?.name || 'orders'

    // Build ownership map: partitionId → [{groupId, consumerId, color}]
    const ownership = {}
    groups.forEach(g => {
        const map = g.getOwnershipMap?.() || {}
        Object.entries(map).forEach(([key, consumerId]) => {
            const [tName, pid] = key.split(':')
            if (tName !== topicName) return
            if (!ownership[pid]) ownership[pid] = []
            ownership[pid].push({ groupId: g.id, consumerId, color: g.color })
        })
    })

    // Unique consumers visible in the current topic across all groups
    const allConsumers = groups.flatMap(g =>
        g.consumers.filter(c => c.isAlive).map(c => ({
            ...c,
            groupId: g.id,
            groupColor: g.color,
            assignedPartitions: (g.assignment?.[c.id] || []).filter(a => a.topicName === topicName),
        }))
    )

    return (
        <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                    <span style={tagStyle(C.purple)}>Topic: {topicName}</span>
                    <span style={{ fontSize: 11, color: C.dim, marginLeft: 10 }}>
                        {partitions.length} partitions · RF:{topic?.replicationFactor || 2}
                    </span>
                </div>
                <span style={{ fontSize: 11, color: C.dim }}>
                    Each partition assigned to at most <strong style={{ color: C.cyan }}>one consumer</strong> per group
                </span>
            </div>

            {/* 3-zone row: Producer | Partitions | Consumers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative', minHeight: 200 }}>

                {/* Producer Zone */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
                    <div style={{
                        background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)',
                        borderRadius: 12, padding: '14px 16px', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>📤</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.yellow }}>Producer</div>
                        <div style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>writes here</div>
                    </div>
                    <div style={{ fontSize: 9, color: C.dim, marginTop: 6, textAlign: 'center', maxWidth: 80 }}>
                        Routes by key hash or round-robin
                    </div>
                </div>

                {/* Arrow left */}
                <ArrowWithParticles particles={particles} direction="right" />

                {/* Partitions Zone */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
                    <div style={{ fontSize: 10, color: C.slate, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
                        PARTITIONS (append-only log)
                    </div>
                    {partitions.length === 0 ? (
                        <div style={{ color: C.dimmer, textAlign: 'center', fontSize: 12, padding: 20 }}>
                            No topic selected
                        </div>
                    ) : partitions.map(p => {
                        const broker = brokers.find(b => b.id === p.leaderId)
                        const owners = ownership[p.id] || []
                        const isActive = particles.some(pt => pt.pid === p.id)
                        return (
                            <motion.div key={p.id}
                                animate={{
                                    boxShadow: isActive ? `0 0 12px ${C.yellow}50` : '0 0 0px transparent',
                                    borderColor: isActive ? C.yellow : 'rgba(255,255,255,0.08)',
                                }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 10, padding: '8px 12px',
                                    display: 'flex', alignItems: 'center', gap: 10, position: 'relative',
                                }}>
                                {/* Partition label */}
                                <div style={{ minWidth: 28, fontSize: 11, fontWeight: 700, color: C.slate }}>P-{p.id}</div>

                                {/* Leader badge */}
                                <div style={{
                                    fontSize: 9, padding: '2px 6px', borderRadius: 5, fontWeight: 600,
                                    background: broker?.isAlive !== false ? 'rgba(249,115,22,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: broker?.isAlive !== false ? C.orange : C.red,
                                    border: `1px solid ${broker?.isAlive !== false ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                }}>
                                    {broker?.isAlive !== false ? `★ B-${p.leaderId}` : `⚠ B-${p.leaderId} DOWN`}
                                </div>

                                {/* ISR dots */}
                                <div style={{ display: 'flex', gap: 3 }}>
                                    {p.isrIds?.map(rid => (
                                        <div key={rid} title={`broker-${rid} (ISR)`} style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: rid === p.leaderId ? C.orange : C.green,
                                            opacity: brokers.find(b => b.id === rid)?.isAlive ? 1 : 0.3,
                                        }} />
                                    ))}
                                </div>

                                {/* Offset counter */}
                                <div style={{ fontSize: 10, color: C.dimmer, marginLeft: 'auto' }}>
                                    {p.log?.length || 0} msgs
                                </div>

                                {/* Consumer owner dots */}
                                {owners.length > 0 && (
                                    <div style={{ display: 'flex', gap: 3, marginLeft: 4 }} title="Consumer(s) assigned to this partition">
                                        {owners.map(o => (
                                            <div key={o.consumerId} style={{
                                                width: 10, height: 10, borderRadius: '50%', background: o.color,
                                                border: '1px solid rgba(0,0,0,0.3)',
                                            }} title={`${o.groupId} → ${o.consumerId}`} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )
                    })}

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 14, fontSize: 9, color: C.dimmer, marginTop: 4, justifyContent: 'center' }}>
                        <span>🟠 Leader broker</span>
                        <span>🟢 ISR follower</span>
                        <span>🔵 Consumer (coloured by group)</span>
                    </div>
                </div>

                {/* Arrow right */}
                <ArrowWithParticles particles={[]} direction="right" />

                {/* Consumers Zone */}
                <div style={{ minWidth: 140, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 10, color: C.slate, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
                        CONSUMERS (pull model)
                    </div>
                    {allConsumers.length === 0 ? (
                        <div style={{ color: C.dimmer, fontSize: 11, textAlign: 'center', padding: 10 }}>No consumers</div>
                    ) : allConsumers.map(c => (
                        <div key={c.id} style={{
                            padding: '7px 10px', borderRadius: 8,
                            background: `${c.groupColor}12`,
                            border: `1px solid ${c.groupColor}30`,
                            fontSize: 11,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: c.groupColor, fontWeight: 700 }}>{c.id.slice(0, 10)}</span>
                                {c.assignedPartitions.length === 0 && (
                                    <span style={{ fontSize: 9, color: C.yellow, background: 'rgba(234,179,8,0.12)', padding: '1px 5px', borderRadius: 4 }}>
                                        IDLE
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>
                                {c.assignedPartitions.length === 0
                                    ? 'No partitions — sitting idle'
                                    : `Partition(s): ${c.assignedPartitions.map(a => `P-${a.partitionId}`).join(', ')}`}
                            </div>
                        </div>
                    ))}
                    {allConsumers.length === 0 && (
                        <div style={{ fontSize: 10, color: C.dim, textAlign: 'center', lineHeight: 1.5 }}>
                            Add a consumer group below to start consuming
                        </div>
                    )}
                </div>
            </div>

            {/* Concept callout */}
            <div style={{
                marginTop: 16, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)',
                fontSize: 11, color: C.slate, lineHeight: 1.6,
            }}>
                💡 <strong style={{ color: C.cyan }}>Key Rule:</strong> One partition → at most one consumer per group at a time.
                If you have <strong>more consumers than partitions</strong>, extras sit <span style={{ color: C.yellow }}>IDLE</span> (they become active only if another consumer crashes).
            </div>
        </div>
    )
}

// ─── Arrow with animated particle dots ───────────────────────────────────────
function ArrowWithParticles({ particles }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: 50, flexShrink: 0 }}>
            <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)', position: 'relative', overflow: 'visible' }}>
                {particles.slice(0, 3).map((pt, i) => (
                    <motion.div key={pt.id}
                        initial={{ left: 0, opacity: 1 }}
                        animate={{ left: '100%', opacity: 0 }}
                        transition={{ duration: 0.7, delay: i * 0.15 }}
                        style={{
                            position: 'absolute', top: -3, width: 7, height: 7, borderRadius: '50%',
                            background: C.yellow, boxShadow: `0 0 6px ${C.yellow}`,
                        }} />
                ))}
                <div style={{ position: 'absolute', right: -4, top: -3, color: 'rgba(255,255,255,0.15)', fontSize: 10 }}>▶</div>
            </div>
        </div>
    )
}

// ─── Consumer Groups management panel ────────────────────────────────────────
function ConsumerGroupsPanel({ groups, topics, onAddConsumer, onRemoveConsumer, onRemoveGroup, onAddGroup }) {
    return (
        <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={sectionLabel}>👥 Consumer Groups</div>
                <button onClick={onAddGroup} style={{ ...actionBtn(C.green), padding: '4px 12px', fontSize: 11 }}>
                    + New Group
                </button>
            </div>

            <div style={{ fontSize: 11, color: C.dim, marginBottom: 12, lineHeight: 1.6 }}>
                Each group reads <strong style={{ color: C.cyan }}>all messages</strong> independently (fan-out).
                Multiple groups don't share consumption — they each get their own copy of every message.
            </div>

            {groups.length === 0 && (
                <div style={{ color: C.dimmer, fontSize: 12, textAlign: 'center', padding: 20 }}>No groups yet</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {groups.map(g => (
                    <div key={g.id} style={{
                        background: `${g.color}08`, border: `1px solid ${g.color}25`, borderRadius: 12, padding: 12,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: g.color }}>{g.id}</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => onAddConsumer(g.id)} title="Add consumer" style={tinyBtn(C.green)}>+C</button>
                                <button onClick={() => onRemoveGroup(g.id)} title="Remove group" style={tinyBtn(C.red)}>✕</button>
                            </div>
                        </div>

                        {/* Consumer list */}
                        {g.consumers.map(c => (
                            <div key={c.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '4px 6px', borderRadius: 6, marginBottom: 3,
                                background: 'rgba(255,255,255,0.02)',
                            }}>
                                <div>
                                    <span style={{ fontSize: 10, color: c.isAlive ? '#e2e8f0' : C.red }}>
                                        {c.isAlive ? '●' : '●'} {c.id.slice(0, 12)}
                                    </span>
                                    {(!g.assignment?.[c.id] || g.assignment[c.id].length === 0) && (
                                        <span style={{ fontSize: 9, color: C.yellow, marginLeft: 4 }}>idle</span>
                                    )}
                                </div>
                                <button onClick={() => onRemoveConsumer(g.id, c.id)} style={tinyBtn(C.red)} title="Remove consumer">–</button>
                            </div>
                        ))}

                        {g.consumers.length === 0 && (
                            <div style={{ fontSize: 10, color: C.dimmer }}>No consumers yet</div>
                        )}

                        <div style={{ marginTop: 6, fontSize: 9, color: C.dim }}>
                            Strategy: <span style={{ color: g.color }}>{g.assignorStrategy}</span>
                            &nbsp;·&nbsp;{g.rebalanceCount} rebalances
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Topic selector bar ───────────────────────────────────────────────────────
function TopicBar({ topics, selectedTopic, selectTopic }) {
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: C.dim, marginRight: 4 }}>Viewing topic:</span>
            {topics.map(t => (
                <button key={t.name} onClick={() => selectTopic(t.name)} style={{
                    padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
                    background: selectedTopic === t.name ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                    color: selectedTopic === t.name ? '#c084fc' : C.dim,
                    fontWeight: selectedTopic === t.name ? 700 : 400,
                    border: `1px solid ${selectedTopic === t.name ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.15s',
                }}>
                    {t.name} <span style={{ fontSize: 10, opacity: 0.7 }}>({t.numPartitions}p)</span>
                </button>
            ))}
        </div>
    )
}

// ─── Reusable primitives ──────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, color, onChange }) {
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 2 }}>
                {label}: <strong style={{ color }}>{value}</strong>
            </div>
            <input type="range" min={min} max={max} value={value} onChange={e => onChange(+e.target.value)}
                style={{ width: '100%' }} />
        </div>
    )
}

const sectionLabel = {
    fontSize: 11, fontWeight: 700, color: C.slate,
    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10,
}

const inputStyle = {
    width: '100%', padding: '6px 10px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#e2e8f0',
    fontSize: 12, marginBottom: 8, boxSizing: 'border-box',
}

function tagStyle(color) {
    return {
        display: 'inline-block', fontSize: 11, fontWeight: 700,
        padding: '2px 10px', background: `${color}15`, color,
        borderRadius: 20, border: `1px solid ${color}25`,
    }
}

function actionBtn(color) {
    return {
        padding: '7px 0', background: `${color}18`, border: `1px solid ${color}30`,
        borderRadius: 8, color, cursor: 'pointer', fontSize: 11, fontWeight: 700,
        transition: 'all 0.15s',
    }
}

function tinyBtn(color) {
    return {
        padding: '2px 6px', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 10,
        background: `${color}20`, color,
    }
}
