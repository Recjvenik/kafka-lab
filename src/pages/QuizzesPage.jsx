import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const QUIZZES = [
    {
        topic: 'Basics',
        questions: [
            {
                q: 'What is the fundamental data structure in Kafka?',
                options: ['Queue', 'Topic', 'Append-only log (partition)', 'Hash table'],
                answer: 2,
                explanation: 'A Kafka partition is an ordered, immutable, append-only log. Messages are assigned offset numbers and never modified in place.',
            },
            {
                q: 'What replaced Apache ZooKeeper in modern Kafka?',
                options: ['etcd', 'Consul', 'KRaft (Kafka Raft)', 'Redis'],
                answer: 2,
                explanation: 'KRaft (Kafka Raft) is Kafka\'s built-in consensus protocol replacing ZooKeeper from Kafka 2.8+. It simplifies deployment and allows 10x more partitions per cluster.',
            },
            {
                q: 'How does a Kafka consumer receive messages?',
                options: ['Broker pushes to consumer', 'Consumer calls poll() to pull', 'WebSocket stream', 'HTTP webhook'],
                answer: 1,
                explanation: 'Kafka uses a pull model. Consumers actively call poll() to fetch messages. The broker never pushes. This gives consumers control over their own throughput.',
            },
        ],
    },
    {
        topic: 'Consumer Groups',
        questions: [
            {
                q: 'You have 3 partitions and 5 consumers in one group. How many consumers are idle?',
                options: ['0', '1', '2', '3'],
                answer: 2,
                explanation: 'Kafka guarantees at most one consumer per partition per group. With 3 partitions and 5 consumers → only 3 consumers get partitions → 2 are idle standby.',
            },
            {
                q: 'What happens when a consumer joins or leaves a consumer group?',
                options: ['Nothing — changes are gradual', 'Only new partitions get reassigned', 'Rebalance: all consumers pause and partitions get reassigned', 'The broker handles it transparently'],
                answer: 2,
                explanation: 'Any membership change triggers a REBALANCE. This is a stop-the-world event: all consumers stop polling, the group coordinator reassigns all partitions, then consumers resume.',
            },
            {
                q: 'How can two consumer groups reading the same topic affect each other?',
                options: ['They can\'t — each group has independent offsets', 'Group A can block Group B', 'The faster group consumes messages before the slower group', 'They share offset tracking'],
                answer: 0,
                explanation: 'Each consumer group maintains its own separate offset per partition. Group A and Group B both receive ALL messages independently — classic fan-out pattern.',
            },
            {
                q: 'What happens to a consumer if its processing takes longer than max.poll.interval.ms?',
                options: ['It is throttled', 'The broker sends fewer messages', 'The broker ejects it from the group and triggers a rebalance', 'Nothing'],
                answer: 2,
                explanation: 'If poll() is not called within max.poll.interval.ms, the broker assumes the consumer is dead and removes it from the group, triggering a rebalance.',
            },
        ],
    },
    {
        topic: 'Advanced',
        questions: [
            {
                q: 'Which acks setting gives maximum durability?',
                options: ['acks=0', 'acks=1', 'acks=all', 'acks=2'],
                answer: 2,
                explanation: 'acks=all (or acks=-1) requires all in-sync replicas (ISR) to acknowledge the write before returning success. Most durable but highest latency.',
            },
            {
                q: 'What is the High Watermark (HWM)?',
                options: ['Peak throughput of a topic', 'Highest offset replicated to ALL ISR members', 'Maximum retention offset', 'Largest message size'],
                answer: 1,
                explanation: 'HWM is the highest offset that has been replicated to ALL in-sync replicas. Consumers can only read up to HWM — ensures consistency even if a leader fails.',
            },
            {
                q: 'What does log compaction do?',
                options: ['Compresses all messages with gzip', 'Deletes messages by time', 'Keeps only the latest value per key, deleting older duplicates', 'Merges small log segments'],
                answer: 2,
                explanation: 'Log compaction keeps the latest value for each key. Older messages with the same key are deleted, keeping the topic as a current-state snapshot. Used for changelogs.',
            },
            {
                q: 'What is a "poison pill" message?',
                options: ['A message that is encrypted', 'A message that always causes consumer processing to fail', 'A message that deletes a key (tombstone)', 'A null-value message'],
                answer: 1,
                explanation: 'A poison pill is a malformed message that always throws an exception during processing. Without handling, the consumer gets stuck on it. Solution: route to a Dead Letter Queue (DLQ).',
            },
        ],
    },
]

export default function QuizzesPage() {
    const [selectedTopic, setSelectedTopic] = useState(0)
    const [currentQ, setCurrentQ] = useState(0)
    const [answered, setAnswered] = useState({}) // questionIdx → chosen option
    const [score, setScore] = useState({ correct: 0, total: 0 })

    const quiz = QUIZZES[selectedTopic]
    const question = quiz.questions[currentQ]
    const questionKey = `${selectedTopic}-${currentQ}`
    const chosen = answered[questionKey]
    const isCorrect = chosen === question.answer

    function handleAnswer(optionIdx) {
        if (questionKey in answered) return // Already answered
        setAnswered(prev => ({ ...prev, [questionKey]: optionIdx }))
        setScore(prev => ({
            correct: prev.correct + (optionIdx === question.answer ? 1 : 0),
            total: prev.total + 1,
        }))
    }

    function reset() {
        setAnswered({})
        setScore({ correct: 0, total: 0 })
        setCurrentQ(0)
    }

    const accuracy = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100)

    return (
        <div style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', background: 'rgba(59,130,246,0.12)', color: '#60a5fa', borderRadius: 20, border: '1px solid rgba(59,130,246,0.2)' }}>Knowledge Test</span>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.5px' }}>Kafka Quizzes</h1>
                <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Test your understanding from beginner to advanced.</p>
            </div>

            {/* Score bar */}
            <div className="glass" style={{ borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>Score: <strong style={{ color: accuracy >= 80 ? '#22c55e' : accuracy >= 50 ? '#eab308' : '#ef4444' }}>{score.correct}/{score.total}</strong> ({accuracy}%)</div>
                <button onClick={reset} style={{
                    padding: '5px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 7, color: '#64748b', cursor: 'pointer', fontSize: 12,
                }}>Reset All</button>
            </div>

            {/* Topic selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {QUIZZES.map((q, i) => (
                    <button key={q.topic} onClick={() => { setSelectedTopic(i); setCurrentQ(0) }} style={{
                        padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12,
                        background: selectedTopic === i ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                        color: selectedTopic === i ? '#60a5fa' : '#475569', fontWeight: selectedTopic === i ? 700 : 400,
                    }}>{q.topic} ({q.questions.length})</button>
                ))}
            </div>

            {/* Question navigation */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {quiz.questions.map((_, i) => {
                    const key = `${selectedTopic}-${i}`
                    const ans = answered[key]
                    const correct = ans === quiz.questions[i].answer
                    return (
                        <button key={i} onClick={() => setCurrentQ(i)} style={{
                            width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: ans !== undefined
                                ? correct ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'
                                : currentQ === i ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
                            color: ans !== undefined ? (correct ? '#4ade80' : '#ef4444') : currentQ === i ? '#60a5fa' : '#64748b',
                            fontSize: 12, fontWeight: 700,
                        }}>{i + 1}</button>
                    )
                })}
            </div>

            {/* Question card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={questionKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="glass" style={{ borderRadius: 16, padding: 28, marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, fontWeight: 700, letterSpacing: '0.5px' }}>
                            QUESTION {currentQ + 1} of {quiz.questions.length} — {quiz.topic.toUpperCase()}
                        </div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, lineHeight: 1.4 }}>{question.q}</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {question.options.map((opt, i) => {
                                const isChosen = chosen === i
                                const isAnswer = i === question.answer
                                const revealed = chosen !== undefined
                                let bg = 'rgba(255,255,255,0.03)'
                                let border = 'rgba(255,255,255,0.08)'
                                let color = '#94a3b8'
                                if (revealed && isAnswer) { bg = 'rgba(34,197,94,0.12)'; border = 'rgba(34,197,94,0.35)'; color = '#4ade80' }
                                else if (revealed && isChosen && !isAnswer) { bg = 'rgba(239,68,68,0.12)'; border = 'rgba(239,68,68,0.35)'; color = '#ef4444' }
                                else if (!revealed && isChosen) { bg = 'rgba(59,130,246,0.12)'; border = 'rgba(59,130,246,0.35)'; color = '#60a5fa' }

                                return (
                                    <motion.button
                                        key={i}
                                        onClick={() => handleAnswer(i)}
                                        whileHover={!revealed ? { scale: 1.01 } : {}}
                                        style={{
                                            padding: '12px 16px', textAlign: 'left', border: `1px solid ${border}`,
                                            borderRadius: 10, cursor: revealed ? 'default' : 'pointer',
                                            background: bg, color, fontSize: 13, fontWeight: isChosen ? 700 : 400,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{ marginRight: 10, fontWeight: 700 }}>{['A', 'B', 'C', 'D'][i]}.</span>
                                        {opt}
                                        {revealed && isAnswer && ' ✓'}
                                        {revealed && isChosen && !isAnswer && ' ✗'}
                                    </motion.button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Explanation */}
                    {chosen !== undefined && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass"
                            style={{
                                borderRadius: 12, padding: 18, marginBottom: 16,
                                borderColor: isCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
                            }}
                        >
                            <div style={{ fontWeight: 700, fontSize: 13, color: isCorrect ? '#4ade80' : '#ef4444', marginBottom: 6 }}>
                                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                            </div>
                            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{question.explanation}</div>
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0} style={{
                    padding: '9px 20px', border: 'none', borderRadius: 8, cursor: currentQ === 0 ? 'default' : 'pointer',
                    background: 'rgba(255,255,255,0.05)', color: currentQ === 0 ? '#334155' : '#94a3b8', fontSize: 12,
                }}>← Previous</button>
                <button
                    onClick={() => currentQ < quiz.questions.length - 1 ? setCurrentQ(q => q + 1) : setSelectedTopic((selectedTopic + 1) % QUIZZES.length)}
                    style={{
                        padding: '9px 20px', border: 'none', borderRadius: 8, cursor: 'pointer',
                        background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: 12, fontWeight: 700,
                    }}>
                    {currentQ < quiz.questions.length - 1 ? 'Next →' : 'Next Topic →'}
                </button>
            </div>
        </div>
    )
}
