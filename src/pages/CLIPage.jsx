import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Copy, CheckCheck, Terminal } from 'lucide-react'

const CATEGORIES = [
    { id: 'all', label: 'All Commands' },
    { id: 'topics', label: 'Topics' },
    { id: 'producer', label: 'Producer' },
    { id: 'consumer', label: 'Consumer' },
    { id: 'groups', label: 'Consumer Groups' },
    { id: 'cluster', label: 'Cluster & Brokers' },
    { id: 'config', label: 'Configs' },
    { id: 'acl', label: 'Security & ACLs' },
    { id: 'kraft', label: 'KRaft' },
]

const COMMANDS = [
    // ── TOPICS ──
    {
        cat: 'topics', title: 'Create a Topic',
        cmd: `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create \\
  --topic my-topic \\
  --partitions 6 \\
  --replication-factor 3`,
        tip: 'Rule of thumb: partitions = (target throughput) / (throughput per partition). Start with 6–12 for most use cases. Replication factor should equal your ISR min.insync.replicas + 1.',
        flags: ['--partitions', '--replication-factor', '--config retention.ms=86400000']
    },
    {
        cat: 'topics', title: 'List All Topics',
        cmd: `kafka-topics.sh --bootstrap-server localhost:9092 --list`,
        tip: 'Add --exclude-internal to hide __consumer_offsets and __cluster_metadata topics.',
        flags: ['--exclude-internal']
    },
    {
        cat: 'topics', title: 'Describe a Topic (Partitions, Leaders, ISR)',
        cmd: `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe \\
  --topic my-topic`,
        tip: 'Look at the ISR column. If ISR < replication-factor, a replica is out of sync — check broker health immediately.',
        flags: []
    },
    {
        cat: 'topics', title: 'Delete a Topic',
        cmd: `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --delete \\
  --topic my-topic`,
        tip: 'delete.topic.enable must be true in server.properties. Deletion is async — the topic goes into a "marked for deletion" state first.',
        flags: []
    },
    {
        cat: 'topics', title: 'Increase Partition Count',
        cmd: `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --alter \\
  --topic my-topic \\
  --partitions 12`,
        tip: 'You can ONLY increase partition count, never decrease. Increasing partitions will break ordering guarantees for keyed messages — existing keys may route to different partitions.',
        flags: []
    },
    {
        cat: 'topics', title: 'List Under-Replicated Partitions',
        cmd: `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe \\
  --under-replicated-partitions`,
        tip: 'Run this in your monitoring scripts. Under-replicated partitions mean a broker is lagging — you risk data loss if the leader dies.',
        flags: ['--unavailable-partitions', '--under-min-isr-partitions']
    },
    {
        cat: 'topics', title: 'Reassign Partitions (Leader Rebalance)',
        cmd: `# Generate assignment plan
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\
  --topics-to-move-json-file topics.json \\
  --broker-list "1,2,3" --generate

# Execute the plan
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\
  --reassignment-json-file reassignment.json --execute

# Verify progress
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\
  --reassignment-json-file reassignment.json --verify`,
        tip: 'Use --throttle to limit replication bandwidth during reassignment in production. Without it, it can saturate your network.',
        flags: ['--throttle 50000000']
    },

    // ── PRODUCER ──
    {
        cat: 'producer', title: 'Console Producer (Quick Test)',
        cmd: `kafka-console-producer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic my-topic`,
        tip: 'Type messages and press Enter to send. Ctrl+C to exit. For scripting, pipe stdin: echo "hello" | kafka-console-producer.sh ...',
        flags: []
    },
    {
        cat: 'producer', title: 'Producer with Key:Value Messages',
        cmd: `kafka-console-producer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic my-topic \\
  --property "parse.key=true" \\
  --property "key.separator=:"`,
        tip: 'Input format: key:value — e.g., user123:{"event":"login"}. Keys route to the same partition consistently (hash partitioning), guaranteeing ordering per key.',
        flags: []
    },
    {
        cat: 'producer', title: 'Producer Performance Test',
        cmd: `kafka-producer-perf-test.sh \\
  --topic my-topic \\
  --num-records 1000000 \\
  --record-size 1024 \\
  --throughput -1 \\
  --producer-props bootstrap.servers=localhost:9092 \\
    acks=all batch.size=65536 linger.ms=5`,
        tip: '--throughput -1 means unlimited. Use --throughput 10000 to rate-limit to 10K msg/s for controlled benchmarks.',
        flags: ['--throughput', '--record-size', '--acks']
    },

    // ── CONSUMER ──
    {
        cat: 'consumer', title: 'Console Consumer (From Latest)',
        cmd: `kafka-console-consumer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic my-topic`,
        tip: 'By default reads from the latest offset (only new messages). Use --from-beginning to replay all.',
        flags: []
    },
    {
        cat: 'consumer', title: 'Consume From Beginning',
        cmd: `kafka-console-consumer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic my-topic \\
  --from-beginning`,
        tip: 'This is equivalent to auto.offset.reset=earliest. The consumer will read every message currently retained in the topic.',
        flags: []
    },
    {
        cat: 'consumer', title: 'Consume with Keys Visible',
        cmd: `kafka-console-consumer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic my-topic \\
  --from-beginning \\
  --property print.key=true \\
  --property key.separator=" → "`,
        tip: 'Essential for debugging keyed topics — confirms messages with the same key are going to the same partition.',
        flags: ['--property print.partition=true', '--property print.offset=true', '--property print.timestamp=true']
    },
    {
        cat: 'consumer', title: 'Consume Specific Partition & Offset',
        cmd: `kafka-console-consumer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic my-topic \\
  --partition 2 \\
  --offset 100`,
        tip: 'Use this to debug a specific partition when investigating a data issue. --offset can also be "earliest" or "latest".',
        flags: []
    },
    {
        cat: 'consumer', title: 'Consumer Performance Test',
        cmd: `kafka-consumer-perf-test.sh \\
  --bootstrap-server localhost:9092 \\
  --topic my-topic \\
  --messages 1000000 \\
  --group perf-test-group`,
        tip: 'Outputs MB/s, msg/s, and latency. Compare consumer throughput against producer to identify bottlenecks.',
        flags: []
    },

    // ── CONSUMER GROUPS ──
    {
        cat: 'groups', title: 'List All Consumer Groups',
        cmd: `kafka-consumer-groups.sh \\
  --bootstrap-server localhost:9092 \\
  --list`,
        tip: 'Returns every group that has committed offsets. Includes inactive groups.',
        flags: []
    },
    {
        cat: 'groups', title: 'Describe a Group (Lag, Assignment)',
        cmd: `kafka-consumer-groups.sh \\
  --bootstrap-server localhost:9092 \\
  --describe \\
  --group my-consumer-group`,
        tip: 'The LAG column is the key metric. LAG = Latest Offset - Committed Offset. Growing lag = consumer is falling behind. Check consumer CPU, processing time, or poll interval.',
        flags: []
    },
    {
        cat: 'groups', title: 'Reset Offsets — To Earliest (Full Replay)',
        cmd: `kafka-consumer-groups.sh \\
  --bootstrap-server localhost:9092 \\
  --group my-consumer-group \\
  --topic my-topic \\
  --reset-offsets \\
  --to-earliest \\
  --execute`,
        tip: 'All consumers in the group MUST be stopped before resetting offsets. Run without --execute first to preview. This will replay all retained messages.',
        flags: ['--to-latest', '--to-datetime 2024-01-01T00:00:00Z', '--by-duration PT1H', '--shift-by -1000']
    },
    {
        cat: 'groups', title: 'Reset Offsets — By Time (Point-in-Time Recovery)',
        cmd: `kafka-consumer-groups.sh \\
  --bootstrap-server localhost:9092 \\
  --group my-consumer-group \\
  --topic my-topic \\
  --reset-offsets \\
  --to-datetime "2024-06-15T14:30:00.000" \\
  --execute`,
        tip: 'Extremely powerful for incident recovery. Replay from "before the bad deploy at 2pm". Requires log.message.timestamp.type=CreateTime.',
        flags: []
    },
    {
        cat: 'groups', title: 'Delete a Consumer Group',
        cmd: `kafka-consumer-groups.sh \\
  --bootstrap-server localhost:9092 \\
  --delete \\
  --group my-consumer-group`,
        tip: 'Only works if the group has no active members. Used to clean up stale groups from retired services.',
        flags: []
    },

    // ── CLUSTER ──
    {
        cat: 'cluster', title: 'List All Brokers',
        cmd: `kafka-broker-api-versions.sh \\
  --bootstrap-server localhost:9092`,
        tip: 'Lists each broker with its API version support. A quick way to check if all brokers are alive and at the same API level.',
        flags: []
    },
    {
        cat: 'cluster', title: 'Describe Cluster (Leader, Controller)',
        cmd: `kafka-metadata-quorum.sh \\
  --bootstrap-server localhost:9092 \\
  describe --status`,
        tip: 'KRaft only. Shows which controller is the active Raft leader, the current epoch, and the lag of follower controllers.',
        flags: ['--replication']
    },
    {
        cat: 'cluster', title: 'Preferred Leader Election',
        cmd: `kafka-leader-election.sh \\
  --bootstrap-server localhost:9092 \\
  --election-type preferred \\
  --all-topic-partitions`,
        tip: 'After broker restarts, partitions may not rebalance leaders automatically. Run this to force preferred leader election and restore even load distribution.',
        flags: []
    },
    {
        cat: 'cluster', title: 'Dump Log Segments (Debug Messages on Disk)',
        cmd: `kafka-dump-log.sh \\
  --files /var/kafka-logs/my-topic-0/00000000000000000000.log \\
  --print-data-log`,
        tip: 'Reads raw log segments from disk. Useful for debugging corrupt messages, analyzing compaction, or confirming retention behavior without a live consumer.',
        flags: ['--deep-iteration', '--index-sanity-check']
    },
    {
        cat: 'cluster', title: 'Get High Watermark (HWM) for a Topic',
        cmd: `kafka-get-offsets.sh \\
  --bootstrap-server localhost:9092 \\
  --topic my-topic`,
        tip: 'Returns the latest available offset per partition. Subtract consumer group committed offset to calculate lag manually.',
        flags: ['--time -1  # latest', '--time -2  # earliest']
    },

    // ── CONFIG ──
    {
        cat: 'config', title: 'Describe Topic Config',
        cmd: `kafka-configs.sh \\
  --bootstrap-server localhost:9092 \\
  --entity-type topics \\
  --entity-name my-topic \\
  --describe`,
        tip: 'Shows overrides only. Anything not listed uses the broker default from server.properties.',
        flags: []
    },
    {
        cat: 'config', title: 'Change Topic Retention',
        cmd: `kafka-configs.sh \\
  --bootstrap-server localhost:9092 \\
  --entity-type topics \\
  --entity-name my-topic \\
  --alter \\
  --add-config retention.ms=3600000`,
        tip: 'retention.ms=3600000 = 1 hour. -1 = retain forever. This is a live config change — no restart required. Combine with retention.bytes for size-based limits.',
        flags: ['retention.bytes=1073741824', 'cleanup.policy=compact', 'max.message.bytes=10485760']
    },
    {
        cat: 'config', title: 'Enable Log Compaction on a Topic',
        cmd: `kafka-configs.sh \\
  --bootstrap-server localhost:9092 \\
  --entity-type topics \\
  --entity-name my-topic \\
  --alter \\
  --add-config "cleanup.policy=compact,delete"`,
        tip: 'Using "compact,delete" keeps both behaviors: compaction removes old key duplicates, delete enforces time/size retention. Use this for changelog topics.',
        flags: []
    },
    {
        cat: 'config', title: 'Describe Broker Config',
        cmd: `kafka-configs.sh \\
  --bootstrap-server localhost:9092 \\
  --entity-type brokers \\
  --entity-name 1 \\
  --describe`,
        tip: 'Shows dynamic broker configs (set via kafka-configs, not server.properties). Useful for auditing changes made without server restarts.',
        flags: []
    },
    {
        cat: 'config', title: 'Throttle Replication Bandwidth',
        cmd: `kafka-configs.sh \\
  --bootstrap-server localhost:9092 \\
  --entity-type brokers \\
  --entity-name 1 \\
  --alter \\
  --add-config "leader.replication.throttled.rate=10485760,follower.replication.throttled.rate=10485760"`,
        tip: 'Set to 10MB/s. Essential during partition reassignment in production. Always unset the throttle after reassignment completes.',
        flags: []
    },

    // ── ACL ──
    {
        cat: 'acl', title: 'Add ACL — Allow Producer',
        cmd: `kafka-acls.sh \\
  --bootstrap-server localhost:9092 \\
  --add \\
  --allow-principal User:service-a \\
  --operation WRITE \\
  --topic my-topic`,
        tip: 'Principal format is User:CN=name for SSL/mTLS. Requires authorizer.class.name=kafka.security.authorizer.AclAuthorizer in server.properties.',
        flags: []
    },
    {
        cat: 'acl', title: 'Add ACL — Allow Consumer Group',
        cmd: `kafka-acls.sh \\
  --bootstrap-server localhost:9092 \\
  --add \\
  --allow-principal User:service-b \\
  --operation READ \\
  --topic my-topic \\
  --group my-consumer-group`,
        tip: 'Consumers need both READ on the topic AND READ on the consumer group. Forgetting the group ACL is a common gotcha.',
        flags: []
    },
    {
        cat: 'acl', title: 'List All ACLs',
        cmd: `kafka-acls.sh \\
  --bootstrap-server localhost:9092 \\
  --list`,
        tip: 'Filter by topic: --topic my-topic. Filter by principal: --allow-principal User:service-a.',
        flags: []
    },

    // ── KRAFT ──
    {
        cat: 'kraft', title: 'Generate a New Cluster UUID',
        cmd: `kafka-storage.sh random-uuid`,
        tip: 'Required for new KRaft cluster initialization. The UUID uniquely identifies this cluster and is embedded in all log segments.',
        flags: []
    },
    {
        cat: 'kraft', title: 'Format Storage (New KRaft Cluster)',
        cmd: `kafka-storage.sh format \\
  --config /etc/kafka/kraft/server.properties \\
  --cluster-id $(kafka-storage.sh random-uuid)`,
        tip: 'Must be run on every controller and broker node. If you skip a node, the broker will refuse to start and log "not formatted" errors.',
        flags: []
    },
    {
        cat: 'kraft', title: 'Check KRaft Metadata Quorum Status',
        cmd: `kafka-metadata-quorum.sh \\
  --bootstrap-server localhost:9092 \\
  describe --status`,
        tip: 'Shows LeaderId, LeaderEpoch, HighWatermark, and CurrentVoters. Monitor CurrentLag on voters in prod — should be near 0.',
        flags: []
    },
    {
        cat: 'kraft', title: 'Describe KRaft Replication (Voter Lag)',
        cmd: `kafka-metadata-quorum.sh \\
  --bootstrap-server localhost:9092 \\
  describe --replication`,
        tip: 'Watch the Lag column per voter. Growing lag means a controller node is having trouble keeping up with metadata writes.',
        flags: []
    },
    {
        cat: 'kraft', title: 'Dump Cluster Metadata Log',
        cmd: `kafka-dump-log.sh \\
  --cluster-metadata-decoder \\
  --files /var/kafka-logs/__cluster_metadata-0/00000000000000000000.log`,
        tip: 'Prints all metadata records: topic creations, partition assignments, ISR changes, config updates. Invaluable for debugging cluster state issues.',
        flags: []
    },
]

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false)
    function handleCopy() {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }
    return (
        <button
            onClick={handleCopy}
            title="Copy to clipboard"
            style={{
                padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                color: copied ? '#4ade80' : '#475569', cursor: 'pointer', fontSize: 11,
                display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                flexShrink: 0,
            }}
        >
            {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
        </button>
    )
}

export default function CLIPage() {
    const [query, setQuery] = useState('')
    const [category, setCategory] = useState('all')
    const [openCmd, setOpenCmd] = useState(null)

    const filtered = useMemo(() => {
        return COMMANDS.filter(c => {
            const matchesCat = category === 'all' || c.cat === category
            const matchesQuery = query.trim() === '' || (
                c.title.toLowerCase().includes(query.toLowerCase()) ||
                c.cmd.toLowerCase().includes(query.toLowerCase()) ||
                c.tip.toLowerCase().includes(query.toLowerCase())
            )
            return matchesCat && matchesQuery
        })
    }, [query, category])

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px',
                    background: 'rgba(234,179,8,0.12)', color: '#eab308',
                    borderRadius: 20, border: '1px solid rgba(234,179,8,0.2)',
                }}>Module 10: CLI Reference</span>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.5px' }}>
                    Kafka CLI Commands
                </h1>
                <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                    {COMMANDS.length} production-grade commands with expert tips. Click a command to expand and copy.
                </p>
            </div>

            {/* Search */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: 18,
            }}>
                <Search size={15} color="#475569" />
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search commands, flags, concepts…"
                    style={{
                        background: 'none', border: 'none', outline: 'none', flex: 1,
                        fontSize: 13, color: '#f1f5f9',
                    }}
                />
                {query && (
                    <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>×</button>
                )}
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        style={{
                            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                            background: category === cat.id ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.04)',
                            color: category === cat.id ? '#eab308' : '#475569',
                            transition: 'all 0.15s',
                        }}
                    >{cat.label} {category === cat.id && <span style={{ opacity: 0.7 }}>({filtered.length})</span>}</button>
                ))}
            </div>

            {/* Commands list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.length === 0 && (
                    <div className="glass" style={{ borderRadius: 12, padding: 32, textAlign: 'center', color: '#475569', fontSize: 13 }}>
                        No commands match "{query}". Try a different search term.
                    </div>
                )}
                {filtered.map((cmd, i) => {
                    const key = `${cmd.cat}-${i}`
                    const isOpen = openCmd === key
                    return (
                        <div key={key}>
                            <button
                                onClick={() => setOpenCmd(isOpen ? null : key)}
                                style={{
                                    width: '100%', textAlign: 'left',
                                    padding: '13px 18px',
                                    borderRadius: isOpen ? '12px 12px 0 0' : 12,
                                    background: isOpen ? 'rgba(234,179,8,0.06)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isOpen ? 'rgba(234,179,8,0.25)' : 'rgba(255,255,255,0.07)'}`,
                                    color: '#f1f5f9', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Terminal size={14} color={isOpen ? '#eab308' : '#475569'} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: isOpen ? '#f1f5f9' : '#94a3b8' }}>{cmd.title}</div>
                                        <div style={{ fontSize: 11, color: '#334155', marginTop: 2, fontFamily: 'monospace' }}>
                                            {cmd.cmd.split('\n')[0].slice(0, 60)}{cmd.cmd.length > 60 ? '…' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                        background: 'rgba(255,255,255,0.05)', color: '#475569',
                                    }}>{CATEGORIES.find(c => c.id === cmd.cat)?.label}</span>
                                    <span style={{ color: '#334155', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                                </div>
                            </button>

                            <AnimatePresence>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        {/* Command block */}
                                        <div style={{
                                            background: 'rgba(0,0,0,0.5)', padding: '14px 18px',
                                            borderLeft: '1px solid rgba(234,179,8,0.25)',
                                            borderRight: '1px solid rgba(234,179,8,0.25)',
                                            position: 'relative',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                                                <CopyButton text={cmd.cmd} />
                                            </div>
                                            <pre style={{
                                                margin: 0, fontSize: 12, color: '#22c55e', lineHeight: 1.8,
                                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                                                overflowX: 'auto', whiteSpace: 'pre',
                                            }}>{cmd.cmd}</pre>
                                        </div>

                                        {/* Pro tip */}
                                        <div style={{
                                            padding: '14px 18px',
                                            background: 'rgba(234,179,8,0.04)',
                                            borderLeft: '1px solid rgba(234,179,8,0.25)',
                                            borderRight: '1px solid rgba(234,179,8,0.25)',
                                            borderTop: '1px solid rgba(255,255,255,0.04)',
                                        }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#eab308', marginBottom: 5 }}>💡 Pro Tip</div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>{cmd.tip}</div>
                                        </div>

                                        {/* Common flags */}
                                        {cmd.flags.length > 0 && (
                                            <div style={{
                                                padding: '12px 18px',
                                                background: 'rgba(0,0,0,0.3)',
                                                borderLeft: '1px solid rgba(234,179,8,0.25)',
                                                borderRight: '1px solid rgba(234,179,8,0.25)',
                                                borderBottom: '1px solid rgba(234,179,8,0.25)',
                                                borderTop: '1px solid rgba(255,255,255,0.03)',
                                                borderRadius: '0 0 12px 12px',
                                            }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Related Flags</div>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    {cmd.flags.map(f => (
                                                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <code style={{
                                                                fontSize: 11, color: '#a855f7', padding: '3px 8px',
                                                                background: 'rgba(168,85,247,0.08)', borderRadius: 6,
                                                                border: '1px solid rgba(168,85,247,0.15)',
                                                                fontFamily: 'monospace',
                                                            }}>{f}</code>
                                                            <CopyButton text={f} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {cmd.flags.length === 0 && (
                                            <div style={{
                                                height: 8,
                                                borderLeft: '1px solid rgba(234,179,8,0.25)',
                                                borderRight: '1px solid rgba(234,179,8,0.25)',
                                                borderBottom: '1px solid rgba(234,179,8,0.25)',
                                                borderRadius: '0 0 12px 12px',
                                                background: 'rgba(0,0,0,0.2)',
                                            }} />
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
