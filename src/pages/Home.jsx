import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, Layers, Zap, Users, GitBranch, Cpu, Play, BarChart2, ArrowRight, Activity, GitCompare, Terminal, HelpCircle } from 'lucide-react'

const MODULES = [
    {
        path: '/learn',
        icon: BookOpen,
        title: 'Module 1: Kafka Basics',
        desc: 'What is Kafka, event streaming, pub/sub vs queue vs log. Start here.',
        color: '#f97316',
        tag: 'Beginner',
    },
    {
        path: '/visualizer',
        icon: Layers,
        title: 'Module 2: Topics & Partitions',
        desc: 'Create topics, set partitions, see leader assignment and partition distribution.',
        color: '#3b82f6',
        tag: 'Interactive',
    },
    {
        path: '/producer',
        icon: Zap,
        title: 'Module 3: Producer Lab',
        desc: 'Simulate producers with acks=0/1/all, keyed routing, retries, batching.',
        color: '#eab308',
        tag: 'Simulator',
    },
    {
        path: '/consumers',
        icon: Users,
        title: 'Module 4: Consumer Groups',
        desc: 'The most important module. Configure partitions, consumers, groups. See idle consumers, lag, rebalancing.',
        color: '#22c55e',
        tag: 'Critical',
    },
    {
        path: '/scenarios',
        icon: GitBranch,
        title: 'Module 5: Scenarios',
        desc: 'Offset behavior, reset policies, rebalancing, delivery semantics, ordering guarantees.',
        color: '#a855f7',
        tag: 'Deep Dive',
    },
    {
        path: '/advanced',
        icon: Cpu,
        title: 'Module 6: Advanced Topics',
        desc: 'ISR, replication, storage internals, exactly-once, performance tuning, failure scenarios.',
        color: '#ef4444',
        tag: 'Advanced',
    },
    {
        path: '/playground',
        icon: Play,
        title: 'Module 7: Full Playground',
        desc: 'Open sandbox: configure everything, watch live message flow with real-time metrics.',
        color: '#06b6d4',
        tag: 'Sandbox',
    },
    {
        path: '/compare',
        icon: BarChart2,
        title: 'Module 8: Kafka vs Others',
        desc: 'Compare Kafka with RabbitMQ, SQS, Pulsar — ordering, throughput, replayability.',
        color: '#f43f5e',
        tag: 'Comparison',
    },
    {
        path: '/zookeeper-kraft',
        icon: GitCompare,
        title: 'Module 9: ZooKeeper vs KRaft',
        desc: 'Understand why Kafka removed ZooKeeper, how KRaft works, and how to migrate.',
        color: '#22c55e',
        tag: 'Architecture',
    },
    {
        path: '/cli',
        icon: Terminal,
        title: 'Module 10: CLI Reference',
        desc: '36 production-grade CLI commands with expert tips, flags, and copy-to-clipboard.',
        color: '#eab308',
        tag: 'Pro Reference',
    },
    {
        path: '/quizzes',
        icon: HelpCircle,
        title: 'Module 11: Quizzes',
        desc: 'Test your knowledge from basics to advanced Kafka internals.',
        color: '#60a5fa',
        tag: 'Knowledge',
    },
]

const STATS = [
    { label: 'Modules', value: '11' },
    { label: 'Simulations', value: '20+' },
    { label: 'Concepts', value: '50+' },
    { label: 'Interactive Labs', value: '15' },
]

export default function Home() {
    return (
        <div style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto' }}>
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ marginBottom: 48 }}
            >
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
                    borderRadius: 20, padding: '4px 12px', marginBottom: 20,
                }}>
                    <Activity size={12} color="#f97316" />
                    <span style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>Interactive Learning System</span>
                </div>

                <h1 style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 16, lineHeight: 1.1 }}>
                    Apache Kafka
                    <br />
                    <span className="gradient-text">from Zero to Expert</span>
                </h1>

                <p style={{ fontSize: 18, color: '#64748b', maxWidth: 560, lineHeight: 1.6, marginBottom: 32 }}>
                    Learn Kafka through interactive simulations — not documentation.
                    Experiment with topics, partitions, consumer groups, and real-world scenarios in your browser.
                </p>

                <div style={{ display: 'flex', gap: 12 }}>
                    <Link to="/learn" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: '#f97316', color: 'white', padding: '12px 24px',
                        borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14,
                        boxShadow: '0 0 24px rgba(249,115,22,0.35)',
                        transition: 'all 0.2s',
                    }}>
                        Start Learning <ArrowRight size={16} />
                    </Link>
                    <Link to="/consumers" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '12px 24px', borderRadius: 10,
                        textDecoration: 'none', fontWeight: 600, fontSize: 14,
                    }}>
                        Consumer Groups Playground
                    </Link>
                </div>
            </motion.div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
                {STATS.map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="glass"
                        style={{ borderRadius: 12, padding: '16px 24px', textAlign: 'center', flex: 1 }}
                    >
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#f97316' }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{s.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Module grid */}
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#94a3b8' }}>
                Learning Modules
            </h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
            }}>
                {MODULES.map((mod, i) => (
                    <ModuleCard key={mod.path} {...mod} delay={i * 0.05} />
                ))}
            </div>

            {/* Concept pill cloud */}
            <div style={{ marginTop: 48 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#94a3b8' }}>
                    Concepts Covered
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CONCEPTS.map(c => (
                        <span key={c} style={{
                            fontSize: 12, padding: '4px 12px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 20, color: '#64748b',
                        }}>{c}</span>
                    ))}
                </div>
            </div>
        </div>
    )
}

function ModuleCard({ path, icon: Icon, title, desc, color, tag, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
        >
            <Link to={path} style={{ textDecoration: 'none' }}>
                <div className="glass glass-hover" style={{
                    borderRadius: 14, padding: 20, cursor: 'pointer',
                    borderColor: 'rgba(255,255,255,0.06)',
                    transition: 'all 0.2s',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: `${color}18`,
                            border: `1px solid ${color}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Icon size={18} color={color} />
                        </div>
                        <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 10, background: `${color}15`, color,
                        }}>{tag}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{desc}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, color }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>Explore</span>
                        <ArrowRight size={12} />
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}

const CONCEPTS = [
    'Broker', 'Topic', 'Partition', 'Offset', 'Consumer Group', 'Rebalancing',
    'ISR', 'Leader Election', 'acks=0/1/all', 'Idempotent Producer', 'At-Least-Once',
    'Exactly-Once', 'Log Compaction', 'Retention Policy', 'Consumer Lag', 'High Watermark',
    'KRaft', 'ZooKeeper', 'Sticky Assignor', 'Round-Robin Assignor', 'DLQ Pattern',
    'Outbox Pattern', 'Schema Registry', 'CDC', 'Stream Processing', 'Throughput',
    'Latency Percentiles', 'Poison Pill', 'Backpressure', 'Hot Partitions',
]
