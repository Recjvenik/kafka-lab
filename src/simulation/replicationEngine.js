/**
 * replicationEngine.js
 * Simulates Kafka's replication protocol:
 *   - Leader/Follower assignment
 *   - ISR (In-Sync Replicas) management
 *   - High watermark advancement
 *   - Leader election on failure
 *
 * Junior mental model:
 *   Every partition has ONE leader, N-1 followers.
 *   Producers write to leader. Followers pull to replicate.
 *   ISR = followers that are caught up within replica.lag.time.max.ms
 */

export class ReplicationManager {
  constructor({ cluster }) {
    this.cluster = cluster;
    this.replicaLagMs = 0; // simulated replication lag
    this.events = [];
  }

  /**
   * Simulate one replication tick:
   *   1. For each alive partition leader, advance HWM
   *   2. Remove slow/dead brokers from ISR
   */
  tick() {
    this.cluster.topics.forEach(topic => {
      topic.partitions.forEach(partition => {
        const leaderAlive = this.cluster.brokers.find(b => b.id === partition.leaderId && b.isAlive);
        if (!leaderAlive) return; // partition is offline

        // Advance HWM: = min offset across all ISR followers
        // Simplified: if all ISR brokers alive, HWM = latest
        const allISRAlive = partition.isrIds.every(id =>
          this.cluster.brokers.find(b => b.id === id && b.isAlive)
        );
        if (allISRAlive) {
          partition.highWatermark = partition.nextOffset - 1;
        } else {
          // HWM stalls — producer writes not visible to consumers yet
          // Only advance to replicated portion
          partition.highWatermark = Math.max(0, partition.nextOffset - 2);
        }

        // Shrink ISR for dead brokers
        const alive = this.cluster.aliveBrokers.map(b => b.id);
        const shrunk = partition.isrIds.filter(id => !alive.includes(id));
        if (shrunk.length > 0) {
          shrunk.forEach(id => this._logEvent('isr-shrink', partition, id));
          partition.isrIds = partition.isrIds.filter(id => alive.includes(id));
        }

        // Re-expand ISR when brokers come back (simplified: immediately)
        partition.replicaIds.forEach(id => {
          if (alive.includes(id) && !partition.isrIds.includes(id)) {
            partition.isrIds.push(id);
            this._logEvent('isr-expand', partition, id);
          }
        });
      });
    });
  }

  /**
   * Kill a broker and trigger leader election for affected partitions.
   */
  killBroker(brokerId) {
    const broker = this.cluster.brokers.find(b => b.id === brokerId);
    if (!broker) return;
    broker.kill();
    this._logEvent('broker-down', null, brokerId);
    this.cluster.handleBrokerFailure(brokerId);
  }

  restartBroker(brokerId) {
    const broker = this.cluster.brokers.find(b => b.id === brokerId);
    if (!broker) return;
    broker.restart();
    this._logEvent('broker-up', null, brokerId);
    // Re-elect leaders for offline partitions & restore ISR
    this.cluster.handleBrokerRestart(brokerId);
    // Advance HWM / rebuild ISR state
    this.tick();
  }

  /** Get under-replicated partitions (ISR < replication factor) */
  getUnderReplicated() {
    const result = [];
    this.cluster.topics.forEach(topic => {
      topic.partitions.forEach(p => {
        if (p.isrIds.length < topic.replicationFactor) {
          result.push({ topicName: topic.name, partitionId: p.id, isrSize: p.isrIds.length, rf: topic.replicationFactor });
        }
      });
    });
    return result;
  }

  /** Compute ISR health score 0–100 */
  get isrHealthScore() {
    let total = 0, healthy = 0;
    this.cluster.topics.forEach(topic => {
      topic.partitions.forEach(p => {
        total++;
        if (p.isrIds.length >= topic.replicationFactor) healthy++;
      });
    });
    return total === 0 ? 100 : Math.round((healthy / total) * 100);
  }

  _logEvent(type, partition, brokerId) {
    this.events.unshift({
      type,
      ts: Date.now(),
      topic: partition?.topicName,
      partitionId: partition?.id,
      brokerId,
    });
    if (this.events.length > 50) this.events.pop();
  }
}
