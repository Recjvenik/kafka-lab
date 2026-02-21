import { motion } from 'framer-motion'

const SYSTEMS = ['Kafka', 'RabbitMQ', 'Amazon SQS', 'Apache Pulsar']

const COMPARE_DATA = [
    {
        category: 'Model',
        kafka: 'Distributed Log',
        rabbitmq: 'Message Queue (AMQP)',
        sqs: 'Managed Queue',
        pulsar: 'Distributed Log (Segment-based)',
    },
    {
        category: 'Throughput',
        kafka: '🟢 Millions/sec',
        rabbitmq: '🟡 100K–1M/sec',
        sqs: '🟡 Thousands/sec',
        pulsar: '🟢 Millions/sec',
    },
    {
        category: 'Ordering',
        kafka: '🟢 Per partition',
        rabbitmq: '🟡 Per queue (single consumer)',
        sqs: '🔴 Standard: no ordering',
        pulsar: '🟢 Per partition',
    },
    {
        category: 'Replayability',
        kafka: '🟢 Full replay (offset reset)',
        rabbitmq: '🔴 Deleted after consume',
        sqs: '🔴 Deleted after consume',
        pulsar: '🟢 Full replay',
    },
    {
        category: 'Consumer Scaling',
        kafka: '🟢 Add consumers to group',
        rabbitmq: '🟢 Multiple consumers per queue',
        sqs: '🟢 Horizontal scaling',
        pulsar: '🟢 Subscription types',
    },
    {
        category: 'Exactly-Once',
        kafka: '🟢 Yes (transactions)',
        rabbitmq: '🟡 Partial (publisher confirms)',
        sqs: '🟡 FIFO queues only',
        pulsar: '🟢 Yes',
    },
    {
        category: 'Retention',
        kafka: '🟢 Time or size (configurable)',
        rabbitmq: '🔴 Until consumed',
        sqs: '🟡 Max 14 days',
        pulsar: '🟢 Tiered storage (S3 etc.)',
    },
    {
        category: 'Multi-tenant',
        kafka: '🟡 ACLs + quotas',
        rabbitmq: '🟢 Virtual hosts',
        sqs: '🟡 Per-account isolation',
        pulsar: '🟢 Native namespace isolation',
    },
    {
        category: 'Ops Complexity',
        kafka: '🟡 Moderate (KRaft removes ZK)',
        rabbitmq: '🟢 Simple',
        sqs: '🟢 Zero (managed)',
        pulsar: '🔴 Complex (BookKeeper + Pulsar)',
    },
    {
        category: 'Best For',
        kafka: '🟢 Event streaming, CDC, replayable events',
        rabbitmq: '🟢 Task queues, RPC, low-latency',
        sqs: '🟢 Simple AWS-integrated queuing',
        pulsar: '🟢 Multi-tenant, geo-replication',
    },
]

const COLORS = { kafka: '#f97316', rabbitmq: '#22c55e', sqs: '#eab308', pulsar: '#a855f7' }

export default function ComparePage() {
    return (
        <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', background: 'rgba(244,63,94,0.12)', color: '#f43f5e', borderRadius: 20, border: '1px solid rgba(244,63,94,0.2)' }}>Module 8: Comparison</span>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.5px' }}>Kafka vs Other Systems</h1>
                <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>How Kafka compares to RabbitMQ, Amazon SQS, and Apache Pulsar across key dimensions.</p>
            </div>

            {/* System header chips */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {SYSTEMS.map(s => {
                    const key = s.split(' ').pop().toLowerCase()
                    const color = COLORS[s === 'Amazon SQS' ? 'sqs' : s.toLowerCase().split(' ')[0]]
                    return (
                        <div key={s} style={{
                            flex: 1, padding: '14px 16px', borderRadius: 12, textAlign: 'center',
                            background: `${color}12`, border: `1px solid ${color}25`,
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color }}>{s}</div>
                        </div>
                    )
                })}
            </div>

            {/* Comparison table */}
            <div className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#475569', fontWeight: 700, width: 150 }}>Feature</th>
                            {SYSTEMS.map(s => {
                                const color = COLORS[s === 'Amazon SQS' ? 'sqs' : s.toLowerCase().split(' ')[0]]
                                return (
                                    <th key={s} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color, fontWeight: 700 }}>{s}</th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {COMPARE_DATA.map((row, i) => (
                            <motion.tr
                                key={row.category}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                }}
                            >
                                <td style={{ padding: '11px 16px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>{row.category}</td>
                                <td style={{ padding: '11px 16px', fontSize: 12, color: '#94a3b8' }}>{row.kafka}</td>
                                <td style={{ padding: '11px 16px', fontSize: 12, color: '#94a3b8' }}>{row.rabbitmq}</td>
                                <td style={{ padding: '11px 16px', fontSize: 12, color: '#94a3b8' }}>{row.sqs}</td>
                                <td style={{ padding: '11px 16px', fontSize: 12, color: '#94a3b8' }}>{row.pulsar}</td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Decision guide */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
                {[
                    { system: 'Choose Kafka when…', color: '#f97316', points: ['Event replay needed', 'Multiple consumers need same data', 'High throughput (>100K msg/s)', 'Event sourcing / CDC'] },
                    { system: 'Choose RabbitMQ when…', color: '#22c55e', points: ['Task queues / work queues', 'Complex routing rules', 'Low-latency delivery', 'Existing AMQP ecosystem'] },
                    { system: 'Choose SQS when…', color: '#eab308', points: ['Simple AWS-integrated jobs', 'No ops overhead needed', 'Cost-sensitive workloads', 'Standard decoupling'] },
                    { system: 'Choose Pulsar when…', color: '#a855f7', points: ['Multi-tenant SaaS needed', 'Geo-replication required', 'Tiered storage (S3 offload)', 'Mixed queue + stream needs'] },
                ].map(item => (
                    <div key={item.system} className="glass glass-hover" style={{ borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: item.color, marginBottom: 10 }}>{item.system}</div>
                        {item.points.map(p => <div key={p} style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>• {p}</div>)}
                    </div>
                ))}
            </div>
        </div>
    )
}
