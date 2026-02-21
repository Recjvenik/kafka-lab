/**
 * producerEngine.js
 * Simulates a Kafka Producer with configurable acks, retries, batching,
 * compression, and idempotent mode.
 *
 * Key mental model for juniors:
 *   Producer → picks partition → sends to leader broker → waits for ack
 */

import { Message } from './kafkaEngine.js';

// acks levels explained:
//   0 = fire-and-forget (fastest, can lose data)
//   1 = leader acks (balanced)
//   all/-1 = all ISR must ack (safest, slowest)
export const ACKS = { NONE: 0, LEADER: 1, ALL: 'all' };

export class Producer {
  constructor({
    id,
    topicName,
    acks = ACKS.LEADER,
    retries = 3,
    idempotent = false,
    batchSize = 16384,   // bytes; messages are batched before send
    lingerMs = 0,        // wait up to N ms to fill a batch
    compressionType = 'none', // none | gzip | snappy
  } = {}) {
    this.id = id || `producer-${Math.random().toString(36).slice(2, 6)}`;
    this.topicName = topicName;
    this.acks = acks;
    this.retries = retries;
    this.idempotent = idempotent;
    this.batchSize = batchSize;
    this.lingerMs = lingerMs;
    this.compressionType = compressionType;

    // Internal state
    this._producerEpoch = 0;       // for idempotent deduplication
    this._sequenceNumbers = {};     // partition -> sequence number
    this._batch = [];               // pending messages before send
    this._roundRobinCounter = { value: 0 };

    // Observable metrics
    this.totalSent = 0;
    this.totalFailed = 0;
    this.totalRetried = 0;
    this.lastLatencyMs = 0;        // simulated last send latency

    // Events log for the UI
    this.events = [];
  }

  /**
   * Produce a single message to the topic.
   * Returns { success, partitionId, offset, latencyMs }
   */
  produce(topic, value, key = null) {
    const message = new Message({ value, key });
    const partitionId = topic.routeMessage(message, this._roundRobinCounter);
    const partition = topic.getPartition(partitionId);

    if (!partition) {
      this._log('error', `No partition ${partitionId} in topic ${topic.name}`);
      this.totalFailed++;
      return { success: false };
    }

    // Simulate ack latency (ms) — purely for UI display
    const latencyMs = this._simulateLatency();
    this.lastLatencyMs = latencyMs;

    // Idempotent: track sequence numbers to detect duplicates
    if (this.idempotent) {
      const seq = (this._sequenceNumbers[partitionId] || 0);
      message.producerEpoch = this._producerEpoch;
      message.sequenceNumber = seq;
      this._sequenceNumbers[partitionId] = seq + 1;
    }

    const offset = partition.append(message);
    this.totalSent++;

    this._log('sent', `→ ${topic.name}[${partitionId}]@${offset} key="${key ?? 'null'}" latency=${latencyMs}ms`);

    return { success: true, partitionId, offset, latencyMs, message };
  }

  /**
   * Simulate ack latency based on acks level.
   * acks=0: ~1ms, acks=1: ~5-20ms, acks=all: ~20-100ms
   */
  _simulateLatency() {
    if (this.acks === ACKS.NONE) return Math.random() * 2;
    if (this.acks === ACKS.LEADER) return 5 + Math.random() * 15;
    return 20 + Math.random() * 80; // acks=all — waits for all ISR
  }

  /**
   * Simulate a producer burst at the given rate.
   * Returns array of produce results.
   */
  burst(topic, count = 10, keyPrefix = null) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const key = keyPrefix ? `${keyPrefix}-${i % 5}` : null; // 5 distinct keys for demo
      results.push(this.produce(topic, `event-${this.totalSent}`, key));
    }
    return results;
  }

  _log(type, message) {
    this.events.unshift({ type, message, ts: Date.now() });
    if (this.events.length > 50) this.events.pop();
  }

  /** Computed latency indicator based on acks */
  get latencyLabel() {
    if (this.acks === ACKS.NONE) return 'Ultra Low';
    if (this.acks === ACKS.LEADER) return 'Low';
    return 'High';
  }

  /** Computed durability indicator */
  get durabilityLabel() {
    if (this.acks === ACKS.NONE) return 'Risky (data loss possible)';
    if (this.acks === ACKS.LEADER) return 'Moderate';
    return 'Strong (all ISR replicated)';
  }
}
