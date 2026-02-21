import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TABS = ['Overview', 'Architecture', 'Feature Comparison', 'Migration Guide']

const FEATURES = [
    { feature: 'External dependency', zk: '🔴 Requires ZooKeeper cluster', kraft: '🟢 None — built into Kafka brokers' },
    { feature: 'Metadata storage', zk: '🔴 ZooKeeper znodes (separate system)', kraft: '🟢 Internal Kafka topic (__cluster_metadata)' },
    { feature: 'Partition limit', zk: '🔴 ~200K partitions per cluster', kraft: '🟢 Millions of partitions per cluster' },
    { feature: 'Startup time', zk: '🔴 Slow (ZK + Kafka must sync)', kraft: '🟢 Instant (single process)' },
    { feature: 'Failover speed', zk: '🟡 Seconds (ZK leader election + Kafka)', kraft: '🟢 Milliseconds (Raft-based election)' },
    { feature: 'Ops complexity', zk: '🔴 Manage 2 systems, 2 sets of configs', kraft: '🟢 Only one system to manage' },
    { feature: 'Security', zk: '🟡 Separate ACL system for ZK', kraft: '🟢 Unified Kafka ACLs only' },
    { feature: 'Monitoring', zk: '🔴 Separate JMX metrics for ZK + Kafka', kraft: '🟢 All metrics from Kafka only' },
    { feature: 'Data consistency', zk: '🟡 Two systems must stay in sync', kraft: '🟢 Single source of truth' },
    { feature: 'Production status', zk: '🟡 Deprecated since Kafka 3.5', kraft: '🟢 GA since Kafka 3.3, default since 4.0' },
]

const KAFKA_COMPONENTS_ZK = [
    { label: 'ZooKeeper Ensemble', sub: 'Stores metadata', color: '#ef4444', x: 180, y: 40 },
    { label: 'Broker 1\n(Controller)', sub: 'Reads from ZK', color: '#f97316', x: 60, y: 160 },
    { label: 'Broker 2', sub: 'Follower', color: '#64748b', x: 200, y: 160 },
    { label: 'Broker 3', sub: 'Follower', color: '#64748b', x: 340, y: 160 },
]

const KAFKA_COMPONENTS_KR = [
    { label: 'KRaft Controller\n(Broker 1)', sub: 'Active controller + Raft leader', color: '#22c55e', x: 60, y: 40 },
    { label: 'KRaft Controller\n(Broker 2)', sub: 'Controller voter', color: '#3b82f6', x: 200, y: 40 },
    { label: 'KRaft Controller\n(Broker 3)', sub: 'Controller voter', color: '#3b82f6', x: 340, y: 40 },
    { label: '__cluster_metadata\ntopic', sub: 'Internal log', color: '#a855f7', x: 200, y: 160 },
]

const MIGRATION_STEPS = [
    {
        version: 'Kafka 2.8+',
        title: 'KRaft Preview Available',
        desc: 'KRaft was introduced as an early-access preview. Not suitable for production.',
        status: 'legacy',
    },
    {
        version: 'Kafka 3.3',
        title: 'KRaft Goes GA',
        desc: 'KRaft is production-ready for new clusters. New deployments should use KRaft.',
        status: 'milestone',
    },
    {
        version: 'Kafka 3.5-3.7',
        title: 'ZooKeeper Deprecated',
        desc: 'ZooKeeper mode is officially deprecated. Migration tooling (kafka-storage.sh) matures.',
        status: 'deprecation',
    },
    {
        version: 'Kafka 4.0+',
        title: 'ZooKeeper Removed',
        desc: 'ZooKeeper support is fully removed. KRaft is the only option. All clusters must migrate.',
        status: 'removed',
    },
]

const MIGRATION_COMMANDS = [
    { step: '1. Generate a new cluster ID', cmd: 'kafka-storage.sh random-uuid' },
    { step: '2. Format storage with KRaft config', cmd: 'kafka-storage.sh format -t <UUID> -c kraft-server.properties' },
    { step: '3. Verify KRaft server properties', cmd: '# kraft-server.properties must have:\nprocess.roles=broker,controller\ncontroller.quorum.voters=1@localhost:9093\nlisteners=PLAINTEXT://:9092,CONTROLLER://:9093' },
    { step: '4. Start broker in KRaft mode', cmd: 'kafka-server-start.sh kraft-server.properties' },
    { step: '5. Verify cluster metadata', cmd: 'kafka-metadata-quorum.sh --bootstrap-server localhost:9092 describe --status' },
]

export default function ZooKeeperKRaftPage() {
    const [activeTab, setActiveTab] = useState(0)

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px',
                    background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                    borderRadius: 20, border: '1px solid rgba(34,197,94,0.2)',
                }}>Module 9: Architecture Deep-Dive</span>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.5px' }}>
                    ZooKeeper vs KRaft
                </h1>
                <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                    Why Kafka's internal architecture was completely rewritten — and what that means for you as a professional.
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
                {TABS.map((tab, i) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(i)}
                        style={{
                            padding: '9px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            background: 'transparent',
                            color: activeTab === i ? '#f1f5f9' : '#475569',
                            borderBottom: activeTab === i ? '2px solid #22c55e' : '2px solid transparent',
                            marginBottom: -1, transition: 'all 0.15s',
                        }}
                    >{tab}</button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    {activeTab === 0 && <Overview />}
                    {activeTab === 1 && <Architecture />}
                    {activeTab === 2 && <FeatureComparison />}
                    {activeTab === 3 && <MigrationGuide />}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

function Overview() {
    return (
        <div>
            {/* The Problem */}
            <div className="glass" style={{ borderRadius: 14, padding: 24, marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#ef4444' }}>🔴 The ZooKeeper Problem</h2>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.8, marginBottom: 12 }}>
                    Apache Kafka originally used Apache ZooKeeper to store cluster metadata — which brokers are alive, which is the leader for each partition, topic configs, ACLs, and more.
                </p>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.8 }}>
                    This created a fundamental architecture problem: <strong style={{ color: '#f1f5f9' }}>you had to manage two separate distributed systems</strong>, each with their own ops burden, and they had to stay perfectly in sync at all times.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                    {
                        title: 'ZooKeeper Pain Points', color: '#ef4444', icon: '🔴', points: [
                            'Two systems to provision, monitor, and upgrade',
                            'ZK has a hard limit of ~2-4MB metadata → ~200K partitions max',
                            'Controller failover takes seconds (ZK leader change + Kafka)',
                            'Separate ZK security config (SASL, DIGEST-MD5) vs Kafka ACLs',
                            'ZK logs and Kafka logs must be backed up separately',
                            'KIP-500 identified 7 fundamental architectural issues',
                        ]
                    },
                    {
                        title: 'KRaft Benefits', color: '#22c55e', icon: '🟢', points: [
                            'Single binary, single process — no external dependency',
                            'Metadata stored as a Kafka topic — same replication guarantees',
                            '10x more partitions: tested at 1M+ partitions per cluster',
                            'Failover in milliseconds via Raft consensus',
                            'Single unified ACL and security model',
                            'Simpler disaster recovery — just restore Kafka data',
                        ]
                    },
                ].map(section => (
                    <div key={section.title} className="glass" style={{ borderRadius: 14, padding: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: section.color, marginBottom: 14 }}>{section.icon} {section.title}</h3>
                        {section.points.map(p => (
                            <div key={p} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 1.6 }}>• {p}</div>
                        ))}
                    </div>
                ))}
            </div>

            {/* KRaft concept */}
            <div className="glass" style={{ borderRadius: 14, padding: 24, borderColor: 'rgba(34,197,94,0.2)' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#22c55e' }}>🟢 What is KRaft?</h2>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.8, marginBottom: 12 }}>
                    KRaft (Kafka Raft) is Kafka's implementation of the <strong style={{ color: '#f1f5f9' }}>Raft consensus algorithm</strong> for metadata management.
                    Instead of relying on ZooKeeper, a small set of Kafka brokers are designated as <strong style={{ color: '#f1f5f9' }}>controllers</strong> that manage metadata via a replicated internal log.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                        { label: 'Active Controller', desc: 'One elected Raft leader that processes all metadata changes', color: '#22c55e' },
                        { label: 'Controller Voters', desc: '2–4 voters that replicate the metadata log for high availability', color: '#3b82f6' },
                        { label: '__cluster_metadata', desc: 'Internal compacted Kafka topic storing the full cluster state', color: '#a855f7' },
                    ].map(c => (
                        <div key={c.label} style={{ background: `${c.color}10`, borderRadius: 10, padding: 14, border: `1px solid ${c.color}25` }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: c.color, marginBottom: 6 }}>{c.label}</div>
                            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>{c.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function Architecture() {
    const [mode, setMode] = useState('zk')
    return (
        <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                {[{ id: 'zk', label: 'ZooKeeper Mode', color: '#ef4444' }, { id: 'kraft', label: 'KRaft Mode', color: '#22c55e' }].map(m => (
                    <button key={m.id} onClick={() => setMode(m.id)} style={{
                        padding: '9px 20px', borderRadius: 8, border: `1px solid ${mode === m.id ? m.color : 'rgba(255,255,255,0.08)'}`,
                        background: mode === m.id ? `${m.color}18` : 'transparent',
                        color: mode === m.id ? m.color : '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}>{m.label}</button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {mode === 'zk' ? (
                        <div className="glass" style={{ borderRadius: 14, padding: 28 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#ef4444' }}>ZooKeeper Architecture</h3>
                            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>Two independent distributed systems that must stay in sync.</p>

                            {/* ZK diagram */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                                {/* ZK Cluster */}
                                <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                                    {['ZK Node 1\n(Leader)', 'ZK Node 2', 'ZK Node 3'].map((n, i) => (
                                        <div key={n} style={{
                                            padding: '10px 18px', borderRadius: 10, textAlign: 'center',
                                            background: i === 0 ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)',
                                            border: `1px solid ${i === 0 ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.15)'}`,
                                            minWidth: 110,
                                        }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? '#ef4444' : '#94a3b8' }}>{n.split('\n')[0]}</div>
                                            {n.includes('\n') && <div style={{ fontSize: 10, color: '#475569' }}>{n.split('\n')[1]}</div>}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>ZooKeeper Ensemble (metadata: topics, leaders, configs)</div>
                                <div style={{ height: 32, width: 1, background: 'rgba(239,68,68,0.3)', dashed: true }} />
                                <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 4 }}>⚠ all brokers watch ZK for state changes</div>
                                {/* Brokers */}
                                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                    {['Broker 1\n(Controller)', 'Broker 2', 'Broker 3'].map((b, i) => (
                                        <div key={b} style={{
                                            padding: '10px 18px', borderRadius: 10, textAlign: 'center',
                                            background: i === 0 ? 'rgba(249,115,22,0.15)' : 'rgba(100,116,139,0.08)',
                                            border: `1px solid ${i === 0 ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                            minWidth: 110,
                                        }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? '#f97316' : '#94a3b8' }}>{b.split('\n')[0]}</div>
                                            {b.includes('\n') && <div style={{ fontSize: 10, color: '#f97316' }}>{b.split('\n')[1]}</div>}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: 10, color: '#475569', marginTop: 8 }}>Kafka Brokers (data plane: topics, partitions, replication)</div>
                            </div>

                            <div style={{ marginTop: 24, padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>⚠ Key Issue: Split Brain Risk</div>
                                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                                    If ZooKeeper and Kafka get out of sync (network partition, ZK leadership change, slow ZK write), the cluster metadata becomes inconsistent. The Controller has to reconcile two separate views of truth.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="glass" style={{ borderRadius: 14, padding: 28 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#22c55e' }}>KRaft Architecture</h3>
                            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>One system. Metadata as a Kafka topic. Raft for consensus.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                                {/* Controllers */}
                                <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                                    {['Controller 1\n(Active/Leader)', 'Controller 2\n(Voter)', 'Controller 3\n(Voter)'].map((n, i) => (
                                        <div key={n} style={{
                                            padding: '10px 18px', borderRadius: 10, textAlign: 'center',
                                            background: i === 0 ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.08)',
                                            border: `1px solid ${i === 0 ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.2)'}`,
                                            minWidth: 130,
                                        }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? '#22c55e' : '#3b82f6' }}>{n.split('\n')[0]}</div>
                                            <div style={{ fontSize: 10, color: i === 0 ? '#16a34a' : '#2563eb' }}>{n.split('\n')[1]}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 4 }}>Raft consensus — quorum-based metadata writes</div>
                                <div style={{ height: 24, width: 1, background: 'rgba(34,197,94,0.3)' }} />
                                {/* metadata topic */}
                                <div style={{
                                    padding: '8px 24px', borderRadius: 10, textAlign: 'center', marginBottom: 4,
                                    background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#a855f7' }}>__cluster_metadata (Kafka topic)</div>
                                    <div style={{ fontSize: 10, color: '#64748b' }}>replicated across controller nodes</div>
                                </div>
                                <div style={{ height: 24, width: 1, background: 'rgba(168,85,247,0.3)' }} />
                                {/* Brokers */}
                                <div style={{ display: 'flex', gap: 12, marginTop: 0 }}>
                                    {['Broker 1', 'Broker 2', 'Broker 3'].map((b) => (
                                        <div key={b} style={{
                                            padding: '10px 18px', borderRadius: 10, textAlign: 'center',
                                            background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(255,255,255,0.08)',
                                            minWidth: 110,
                                        }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{b}</div>
                                            <div style={{ fontSize: 10, color: '#475569' }}>Follower (data)</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: 10, color: '#475569', marginTop: 8 }}>Brokers fetch metadata snapshot from controller, not ZK</div>
                            </div>

                            <div style={{ marginTop: 24, padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>✅ Single Source of Truth</div>
                                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                                    All cluster metadata lives in the <code style={{ color: '#a855f7' }}>__cluster_metadata</code> topic. Controllers replicate it via Raft. Brokers fetch a snapshot on startup and receive incremental updates. There is no split-brain possible — the Raft log <em>is</em> the truth.
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

function FeatureComparison() {
    return (
        <div className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, color: '#475569', fontWeight: 700, width: '26%' }}>Feature</th>
                        <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: '#ef4444', fontWeight: 700 }}>ZooKeeper Mode</th>
                        <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: '#22c55e', fontWeight: 700 }}>KRaft Mode</th>
                    </tr>
                </thead>
                <tbody>
                    {FEATURES.map((row, i) => (
                        <motion.tr
                            key={row.feature}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                        >
                            <td style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>{row.feature}</td>
                            <td style={{ padding: '12px 20px', fontSize: 12, color: '#94a3b8' }}>{row.zk}</td>
                            <td style={{ padding: '12px 20px', fontSize: 12, color: '#94a3b8' }}>{row.kraft}</td>
                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function MigrationGuide() {
    const [openStep, setOpenStep] = useState(null)

    const statusColors = { legacy: '#64748b', milestone: '#22c55e', deprecation: '#eab308', removed: '#ef4444' }

    return (
        <div>
            {/* Timeline */}
            <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#f1f5f9' }}>Version Timeline</h3>
                <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                    {MIGRATION_STEPS.map((step, i) => (
                        <div key={step.version} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                                padding: '12px 14px', borderRadius: 10, textAlign: 'center', width: '90%',
                                background: `${statusColors[step.status]}12`,
                                border: `1px solid ${statusColors[step.status]}30`,
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: statusColors[step.status], marginBottom: 4 }}>{step.version}</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>{step.title}</div>
                                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{step.desc}</div>
                            </div>
                            {i < MIGRATION_STEPS.length - 1 && (
                                <div style={{ fontSize: 16, color: '#334155', padding: '0 4px', alignSelf: 'center', position: 'relative', bottom: 0 }}>→</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Migration Commands */}
            <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#f1f5f9' }}>Migration Commands</h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                    Migrating from ZooKeeper to KRaft on an existing cluster requires the <code style={{ color: '#a855f7' }}>kafka-storage.sh</code> tool (Kafka 3.x).
                    For new deployments (Kafka 4.0+), KRaft is automatic — no extra steps.
                </p>
                {MIGRATION_COMMANDS.map((item, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                        <button
                            onClick={() => setOpenStep(openStep === i ? null : i)}
                            style={{
                                width: '100%', textAlign: 'left', padding: '12px 16px',
                                borderRadius: openStep === i ? '10px 10px 0 0' : 10,
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                color: '#94a3b8', fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                            }}
                        >
                            <span><span style={{ color: '#a855f7', fontWeight: 700 }}>{i + 1}.</span> {item.step}</span>
                            <span style={{ color: '#334155' }}>{openStep === i ? '▲' : '▼'}</span>
                        </button>
                        <AnimatePresence>
                            {openStep === i && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <pre style={{
                                        margin: 0, padding: '14px 18px',
                                        background: 'rgba(0,0,0,0.4)', borderRadius: '0 0 10px 10px',
                                        border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none',
                                        fontSize: 12, color: '#22c55e', lineHeight: 1.8, overflowX: 'auto',
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    }}>{item.cmd}</pre>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* Important note */}
            <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#eab308', marginBottom: 6 }}>⚠ Production Migration Warning</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                    This simulation shows the concept. For actual production migration, refer to the official
                    {' '}<a href="https://kafka.apache.org/documentation/#kraft_migration" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Apache Kafka KRaft Migration Guide</a>.
                    Always test in staging first, take a snapshot of ZK data, and ensure all brokers are on Kafka 3.5+ before migrating.
                </div>
            </div>
        </div>
    )
}
