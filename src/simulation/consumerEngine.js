/**
 * consumerEngine.js
 * Simulates a Kafka Consumer with pull-based poll loop, offset tracking,
 * fetch configuration, and lag monitoring.
 *
 * Mental model for juniors:
 *   Consumer PULLS from broker (not pushed to!) → reads from offset → commits position
 */

export const OFFSET_RESET = { EARLIEST: 'earliest', LATEST: 'latest', NONE: 'none' };
export const DELIVERY = { AT_MOST_ONCE: 'at-most-once', AT_LEAST_ONCE: 'at-least-once', EXACTLY_ONCE: 'exactly-once' };

export class Consumer {
  constructor({
    id,
    groupId,
    autoOffsetReset = OFFSET_RESET.LATEST,
    maxPollRecords = 500,        // max records per poll()
    fetchMinBytes = 1,           // wait until at least this many bytes available
    maxPollIntervalMs = 300000,  // if poll() not called in this window → leave group
    enableAutoCommit = true,
    autoCommitIntervalMs = 5000,
    deliverySemantics = DELIVERY.AT_LEAST_ONCE,
  } = {}) {
    this.id = id || `consumer-${Math.random().toString(36).slice(2, 6)}`;
    this.groupId = groupId;
    this.autoOffsetReset = autoOffsetReset;
    this.maxPollRecords = maxPollRecords;
    this.fetchMinBytes = fetchMinBytes;
    this.maxPollIntervalMs = maxPollIntervalMs;
    this.enableAutoCommit = enableAutoCommit;
    this.autoCommitIntervalMs = autoCommitIntervalMs;
    this.deliverySemantics = deliverySemantics;

    // Internal state
    this.assignedPartitions = [];  // list of { topicName, partitionId }
    this.currentOffsets = {};       // "topicName:partitionId" → current offset position
    this.committedOffsets = {};     // offsets actually committed to __consumer_offsets
    this.isAlive = true;
    this.isPaused = false;
    this.isSlow = false;           // triggers slow consumer detection

    // Metrics
    this.totalPolled = 0;
    this.totalCommitted = 0;
    this.lastPollTime = Date.now();
    this.events = [];

    // Status
    this.status = 'idle'; // idle | polling | processing | committing | crashed
  }

  /**
   * Assign partitions to this consumer (called by group coordinator during rebalance).
   * Uses auto.offset.reset to determine starting position.
   */
  assignPartitions(assignments, partitionMap) {
    this.assignedPartitions = assignments;
    assignments.forEach(({ topicName, partitionId }) => {
      const key = `${topicName}:${partitionId}`;
      if (!(key in this.currentOffsets)) {
        // Determine starting offset based on auto.offset.reset
        const partition = partitionMap?.[key];
        if (this.autoOffsetReset === OFFSET_RESET.EARLIEST) {
          this.currentOffsets[key] = 0;
        } else if (this.autoOffsetReset === OFFSET_RESET.LATEST) {
          this.currentOffsets[key] = partition?.nextOffset ?? 0;
        } else {
          // NONE: throw if no committed offset (simulated as latest)
          this.currentOffsets[key] = partition?.nextOffset ?? 0;
        }
      }
    });
    this.status = 'idle';
  }

  /**
   * Simulates poll() — fetches next batch of messages from assigned partitions.
   * Returns array of { topicName, partitionId, messages }
   */
  poll(partitionMap) {
    if (!this.isAlive || this.isPaused) return [];
    this.lastPollTime = Date.now();
    this.status = 'polling';

    const results = [];
    let recordsFetched = 0;

    for (const { topicName, partitionId } of this.assignedPartitions) {
      if (recordsFetched >= this.maxPollRecords) break;
      const key = `${topicName}:${partitionId}`;
      const partition = partitionMap?.[key];
      if (!partition) continue;

      const currentOffset = this.currentOffsets[key] ?? 0;
      const available = partition.log.filter(m => m.offset >= currentOffset);
      const batch = available.slice(0, this.maxPollRecords - recordsFetched);

      if (batch.length > 0) {
        results.push({ topicName, partitionId, messages: batch });
        recordsFetched += batch.length;

        // Advance current offset (uncommitted)
        this.currentOffsets[key] = batch[batch.length - 1].offset + 1;
        this.totalPolled += batch.length;
      }
    }

    this.status = results.length > 0 ? 'processing' : 'idle';

    // Auto-commit after processing if enabled
    if (this.enableAutoCommit && results.length > 0) {
      this.commit();
    }

    this._log('poll', `Polled ${recordsFetched} records`);
    return results;
  }

  /**
   * Commit current offsets → persisted to __consumer_offsets topic (simulated).
   * Important: with at-least-once, we commit AFTER processing.
   * With at-most-once, we commit BEFORE processing (risky!).
   */
  commit() {
    Object.assign(this.committedOffsets, this.currentOffsets);
    this.totalCommitted++;
    this.status = 'committing';
    setTimeout(() => { if (this.status === 'committing') this.status = 'idle'; }, 100);
    this._log('commit', 'Offsets committed');
  }

  /** Simulate consumer crash */
  crash() {
    this.isAlive = false;
    this.status = 'crashed';
    this._log('error', 'Consumer crashed!');
  }

  /** Simulate consumer recovery */
  recover() {
    this.isAlive = true;
    this.status = 'idle';
    this._log('info', 'Consumer recovered');
  }

  /**
   * Calculate lag for a given partition.
   * Lag = partition.latestOffset - committed_offset
   */
  getLag(topicName, partitionId, partition) {
    const key = `${topicName}:${partitionId}`;
    const committed = this.committedOffsets[key] ?? 0;
    return Math.max(0, (partition?.nextOffset ?? 0) - committed);
  }

  get totalLag() {
    return Object.keys(this.currentOffsets).reduce((sum, key) => {
      const committed = this.committedOffsets[key] ?? 0;
      const current = this.currentOffsets[key] ?? 0;
      return sum + Math.max(0, current - committed);
    }, 0);
  }

  _log(type, message) {
    this.events.unshift({ type, message, ts: Date.now() });
    if (this.events.length > 30) this.events.pop();
  }
}
