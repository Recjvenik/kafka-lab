import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKafkaStore } from '../state/kafkaStore'
import { Plus, Trash2, RefreshCw } from 'lucide-react'

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899', '#84cc16', '#fb7185']

export default function Visualizer() {
    const { cluster, createTopic, killBroker, restartBroker, addBroker, _rev } = useKafkaStore()
    const [topicName, setTopicName] = useState('events')
    const [numPartitions, setNumPartitions] = useState(4)
    const [replicationFactor, setReplicationFactor] = useState(2)
    const [selectedTopic, setSelectedTopic] = useState(null)
    const [routingKey, setRoutingKey] = useState('')
    const [routingMode, setRoutingMode] = useState('round-robin')

    const topics = Array.from(cluster.topics?.values?.() || [])

    function handleCreate() {
        if (!topicName) return
        createTopic(topicName, numPartitions, replicationFactor)
        setSelectedTopic(topicName)
        setTopicName('')
    }

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
            <PageHeader title="Topics & Partitions Visualizer" tag="Module 2" color="#3b82f6"
                subtitle="Create topics, set partitions, observe leader assignment across brokers." />

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, marginTop: 28 }}>
                {/* Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <ControlPanel
                        topicName={topicName} setTopicName={setTopicName}
                        numPartitions={numPartitions} setNumPartitions={setNumPartitions}
                        replicationFactor={replicationFactor} setReplicationFactor={setReplicationFactor}
                        onCreateTopic={handleCreate}
                        brokerCount={cluster.brokers?.length || 0}
                        onAddBroker={addBroker}
                    />
                    {/* Topic list */}
                    <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#94a3b8' }}>Topics ({topics.length})</div>
                        {topics.length === 0 && <div style={{ color: '#334155', fontSize: 12 }}>No topics yet</div>}
                        {topics.map(t => (
                            <button
                                key={t.name}
                                onClick={() => setSelectedTopic(t.name)}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '8px 10px', borderRadius: 8, border: 'none',
                                    background: selectedTopic === t.name ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
                                    color: selectedTopic === t.name ? '#60a5fa' : '#64748b',
                                    cursor: 'pointer', fontSize: 12, marginBottom: 4, fontWeight: 500,
                                }}
                            >
                                📋 {t.name} ({t.numPartitions}p / RF:{t.replicationFactor})
                            </button>
                        ))}
                    </div>

                    {/* Routing simulator */}
                    <RoutingSimulator
                        topics={topics} selectedTopic={selectedTopic}
                        routingKey={routingKey} setRoutingKey={setRoutingKey}
                        routingMode={routingMode} setRoutingMode={setRoutingMode}
                    />
                </div>

                {/* Visualization */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <BrokerGrid cluster={cluster} killBroker={killBroker} restartBroker={restartBroker} />
                    {selectedTopic && (
                        <PartitionView
                            topic={topics.find(t => t.name === selectedTopic)}
                            cluster={cluster}
                            routingKey={routingKey}
                            routingMode={routingMode}
                        />
                    )}
                    {!selectedTopic && (
                        <div className="glass" style={{ borderRadius: 14, padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
                            <div style={{ color: '#475569', fontSize: 14 }}>Create a topic and select it to see partition distribution</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function PageHeader({ title, tag, color, subtitle }) {
    return (
        <div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', background: `${color}15`, color, borderRadius: 20, border: `1px solid ${color}25` }}>{tag}</span>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.5px' }}>{title}</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{subtitle}</p>
        </div>
    )
}

function ControlPanel({ topicName, setTopicName, numPartitions, setNumPartitions, replicationFactor, setReplicationFactor, onCreateTopic, brokerCount, onAddBroker }) {
    return (
        <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: '#94a3b8' }}>Create Topic</div>
            <input
                value={topicName}
                onChange={e => setTopicName(e.target.value)}
                placeholder="topic-name"
                style={{
                    width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0',
                    fontSize: 13, marginBottom: 12, boxSizing: 'border-box',
                }}
            />
            <label style={{ fontSize: 12, color: '#64748b' }}>Partitions: <strong style={{ color: '#3b82f6' }}>{numPartitions}</strong></label>
            <input type="range" min={1} max={20} value={numPartitions}
                onChange={e => setNumPartitions(+e.target.value)}
                style={{ width: '100%', marginBottom: 12, marginTop: 4 }} />
            <label style={{ fontSize: 12, color: '#64748b' }}>Replication Factor: <strong style={{ color: '#22c55e' }}>{Math.min(replicationFactor, brokerCount || 1)}</strong></label>
            <input type="range" min={1} max={Math.min(5, brokerCount || 1)} value={replicationFactor}
                onChange={e => setReplicationFactor(+e.target.value)}
                style={{ width: '100%', marginBottom: 14, marginTop: 4 }} />
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onCreateTopic} style={{
                    flex: 1, padding: '9px 0', background: 'rgba(59,130,246,0.2)',
                    border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#60a5fa',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}>Create Topic</button>
                <button onClick={onAddBroker} style={{
                    padding: '9px 12px', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#64748b',
                    cursor: 'pointer', fontSize: 12,
                }}>+ Broker</button>
            </div>
        </div>
    )
}

function BrokerGrid({ cluster, killBroker, restartBroker }) {
    const brokers = cluster.brokers || []
    return (
        <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#94a3b8' }}>
                Brokers ({brokers.filter(b => b.isAlive).length}/{brokers.length} alive)
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {brokers.map(b => (
                    <motion.div
                        key={b.id}
                        animate={{ scale: b.isAlive ? 1 : 0.95, opacity: b.isAlive ? 1 : 0.5 }}
                        style={{
                            background: b.isAlive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                            border: `1px solid ${b.isAlive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            borderRadius: 10, padding: '12px 14px', minWidth: 100, textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 20, marginBottom: 4 }}>🖥️</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: b.isAlive ? '#4ade80' : '#ef4444' }}>
                            broker-{b.id}
                        </div>
                        <div style={{ fontSize: 10, color: '#475569', marginBottom: 8 }}>
                            {b.partitionCount || 0} partitions
                        </div>
                        <button
                            onClick={() => b.isAlive ? killBroker(b.id) : restartBroker(b.id)}
                            style={{
                                padding: '3px 8px', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 10,
                                background: b.isAlive ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
                                color: b.isAlive ? '#ef4444' : '#4ade80',
                            }}
                        >
                            {b.isAlive ? 'Kill' : 'Restart'}
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

function PartitionView({ topic, cluster, routingKey, routingMode }) {
    if (!topic) return null
    const brokers = cluster.brokers || []
    const partitions = topic.partitions || []

    return (
        <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#94a3b8' }}>
                Topic: <span style={{ color: '#60a5fa' }}>{topic.name}</span> — {partitions.length} partitions
            </div>

            {/* Partition rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {partitions.map(p => {
                    const leaderBroker = brokers.find(b => b.id === p.leaderId)
                    const isHighlighted = routingKey && routingMode === 'key' &&
                        (routingKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % partitions.length === p.id

                    return (
                        <motion.div
                            key={p.id}
                            animate={{ borderColor: isHighlighted ? '#f97316' : 'rgba(255,255,255,0.08)' }}
                            style={{
                                background: isHighlighted ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${isHighlighted ? '#f97316' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: 10, padding: '10px 14px',
                                display: 'flex', alignItems: 'center', gap: 14,
                            }}
                        >
                            <div style={{ minWidth: 60, fontSize: 12, color: '#64748b' }}>P-{p.id}</div>
                            {/* ISR replicas */}
                            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                                {p.replicaIds?.map(rid => {
                                    const broker = brokers.find(b => b.id === rid)
                                    const isLeader = rid === p.leaderId
                                    const inISR = p.isrIds?.includes(rid)
                                    return (
                                        <div key={rid} style={{
                                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                            background: isLeader ? 'rgba(249,115,22,0.15)' : inISR ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                            border: `1px solid ${isLeader ? 'rgba(249,115,22,0.3)' : inISR ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                            color: isLeader ? '#f97316' : inISR ? '#4ade80' : '#ef4444',
                                            opacity: broker?.isAlive ? 1 : 0.4,
                                        }}>
                                            {isLeader ? '★ ' : ''}broker-{rid}
                                        </div>
                                    )
                                })}
                            </div>
                            <div style={{ fontSize: 11, color: '#334155' }}>
                                {p.log?.length || 0} msgs
                            </div>
                            {isHighlighted && (
                                <div style={{ fontSize: 10, color: '#f97316', fontWeight: 700 }}>← routed here</div>
                            )}
                        </motion.div>
                    )
                })}
            </div>

            <div style={{ marginTop: 12, fontSize: 11, color: '#334155' }}>
                ★ = Leader &nbsp;|&nbsp; green = ISR follower &nbsp;|&nbsp; red = out-of-sync
            </div>
        </div>
    )
}

function RoutingSimulator({ topics, selectedTopic, routingKey, setRoutingKey, routingMode, setRoutingMode }) {
    const topic = topics.find(t => t.name === selectedTopic)
    let targetPartition = null
    if (topic && routingMode === 'key' && routingKey) {
        const hash = routingKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
        targetPartition = hash % topic.partitions.length
    }
    return (
        <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#94a3b8' }}>Partition Routing</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {['round-robin', 'key'].map(m => (
                    <button key={m} onClick={() => setRoutingMode(m)} style={{
                        padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11,
                        background: routingMode === m ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.04)',
                        color: routingMode === m ? '#f97316' : '#64748b', fontWeight: routingMode === m ? 700 : 400,
                    }}>{m}</button>
                ))}
            </div>
            {routingMode === 'key' && (
                <input
                    value={routingKey} onChange={e => setRoutingKey(e.target.value)}
                    placeholder="message key (e.g. user-123)"
                    style={{
                        width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
                        color: '#e2e8f0', fontSize: 12, boxSizing: 'border-box',
                    }}
                />
            )}
            {topic && routingMode === 'key' && routingKey && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(249,115,22,0.1)', borderRadius: 8, fontSize: 12, color: '#f97316' }}>
                    → Partition {targetPartition} (hash("{routingKey}") % {topic.partitions.length})
                </div>
            )}
            {routingMode === 'round-robin' && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#475569' }}>
                    Keyless messages distributed in round-robin across all {topic?.partitions?.length || '?'} partitions.
                </div>
            )}
        </div>
    )
}
