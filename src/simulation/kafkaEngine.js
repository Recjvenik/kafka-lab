/**
 * kafkaEngine.js
 * Core Kafka simulation primitives: Broker, Topic, Partition, Message, MessageLog
 * These are the foundational building blocks for the entire simulation.
 */

// ────────────────────────────────────────────────────────────
// MESSAGE — a single event/record flowing through Kafka
// ────────────────────────────────────────────────────────────
export class Message {
  constructor({ id, key = null, value, timestamp = Date.now(), size = 1 }) {
    this.id = id || `msg-${Math.random().toString(36).slice(2, 8)}`;
    this.key = key;          // null = round-robin; string = key-based routing
    this.value = value;
    this.timestamp = timestamp;
    this.size = size;        // simulated size in KB
    this.offset = null;      // assigned when written to partition
    this.partitionId = null; // assigned during routing
  }
}

// ────────────────────────────────────────────────────────────
// PARTITION — append-only log within a topic
// Each partition is owned by exactly one broker (leader)
// and replicated to others (followers).
// ────────────────────────────────────────────────────────────
export class Partition {
  constructor({ id, topicName, leaderId, replicaIds = [] }) {
    this.id = id;                  // numeric index within the topic
    this.topicName = topicName;
    this.leaderId = leaderId;      // broker ID that handles reads/writes
    this.replicaIds = replicaIds;  // all replica broker IDs (includes leader)
    this.isrIds = [...replicaIds]; // In-Sync Replicas (starts fully replicated)
    this.log = [];                 // ordered array of Message objects
    this.nextOffset = 0;           // next offset to assign
    this.highWatermark = 0;        // highest offset that is replicated to all ISR
  }

  /**
   * Append a message to the partition log.
   * Returns the assigned offset.
   */
  append(message) {
    message.offset = this.nextOffset++;
    message.partitionId = this.id;
    this.log.push(message);
    // Keep log bounded for visualizer (last 200 messages)
    if (this.log.length > 200) this.log.shift();
    return message.offset;
  }

  /** Latest committed offset */
  get latestOffset() {
    return this.nextOffset - 1;
  }

  /** Messages visible to consumers (up to HWM) */
  get committedMessages() {
    return this.log.filter(m => m.offset <= this.highWatermark);
  }
}

// ────────────────────────────────────────────────────────────
// TOPIC — logical channel with N partitions
// ────────────────────────────────────────────────────────────
export class Topic {
  constructor({ name, numPartitions = 1, replicationFactor = 1, brokers = [] }) {
    this.name = name;
    this.numPartitions = numPartitions;
    this.replicationFactor = replicationFactor;
    this.partitions = [];
    this._createPartitions(brokers);
  }

  _createPartitions(brokers) {
    this.partitions = [];
    for (let i = 0; i < this.numPartitions; i++) {
      const brokerCount = brokers.length;
      if (brokerCount === 0) {
        this.partitions.push(new Partition({ id: i, topicName: this.name, leaderId: 0, replicaIds: [0] }));
        continue;
      }
      const leaderId = brokers[i % brokerCount].id;
      // Spread replicas across brokers starting from leader index
      const replicaIds = Array.from({ length: Math.min(this.replicationFactor, brokerCount) }, (_, j) =>
        brokers[(i + j) % brokerCount].id
      );
      this.partitions.push(new Partition({ id: i, topicName: this.name, leaderId, replicaIds }));
    }
  }

  /**
   * Route a message to the correct partition.
   * Key-based: hash(key) % numPartitions
   * Keyless: round-robin
   */
  routeMessage(message, roundRobinCounter = { value: 0 }) {
    if (message.key !== null && message.key !== undefined && message.key !== '') {
      // Deterministic hash for ordering guarantees
      const hash = message.key.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return hash % this.partitions.length;
    }
    // Round-robin for keyless messages
    const idx = roundRobinCounter.value % this.partitions.length;
    roundRobinCounter.value++;
    return idx;
  }

  getPartition(id) {
    return this.partitions.find(p => p.id === id);
  }

  get totalMessages() {
    // Use nextOffset (real cumulative offset) — log.length is capped at 200 per partition
    return this.partitions.reduce((sum, p) => sum + (p.nextOffset ?? p.log.length), 0);
  }

  get totalOffsets() {
    return this.partitions.reduce((sum, p) => sum + p.nextOffset, 0);
  }
}

// ────────────────────────────────────────────────────────────
// BROKER — a Kafka server node
// ────────────────────────────────────────────────────────────
export class Broker {
  constructor({ id, host = `broker-${id}`, port = 9092 + id }) {
    this.id = id;
    this.host = host;
    this.port = port;
    this.isAlive = true;
    this.load = 0;            // simulated CPU/IO load 0–100
    this.diskUsage = 0;       // simulated disk usage in MB
    this.partitionCount = 0;  // how many partitions this broker leads
  }

  /** Simulate broker failure */
  kill() {
    this.isAlive = false;
  }

  /** Simulate broker recovery */
  restart() {
    this.isAlive = true;
    this.load = 0;
  }
}

// ────────────────────────────────────────────────────────────
// CLUSTER — collection of brokers (the whole Kafka deployment)
// ────────────────────────────────────────────────────────────
export class Cluster {
  constructor({ brokerCount = 3 } = {}) {
    this.brokers = Array.from({ length: brokerCount }, (_, i) => new Broker({ id: i }));
    this.topics = new Map(); // topicName -> Topic
    this.controllerId = 0;   // broker that manages leader elections
  }

  addBroker() {
    const id = this.brokers.length;
    this.brokers.push(new Broker({ id }));
    return id;
  }

  removeBroker(id) {
    const broker = this.brokers.find(b => b.id === id);
    if (broker) broker.kill();
  }

  get aliveBrokers() {
    return this.brokers.filter(b => b.isAlive);
  }

  createTopic(name, numPartitions, replicationFactor) {
    const topic = new Topic({
      name,
      numPartitions,
      replicationFactor,
      brokers: this.aliveBrokers,
    });
    this.topics.set(name, topic);
    this._updateBrokerPartitionCounts();
    return topic;
  }

  getTopic(name) {
    return this.topics.get(name);
  }

  _updateBrokerPartitionCounts() {
    this.brokers.forEach(b => (b.partitionCount = 0));
    this.topics.forEach(topic => {
      topic.partitions.forEach(p => {
        const broker = this.brokers.find(b => b.id === p.leaderId);
        if (broker) broker.partitionCount++;
      });
    });
  }

  /**
   * Elect a new leader when a broker dies.
   * Picks the first alive ISR member.
   */
  electLeader(partition) {
    const aliveIds = this.aliveBrokers.map(b => b.id);
    const aliveISR = partition.isrIds.filter(id => aliveIds.includes(id));
    if (aliveISR.length > 0) {
      // Pick first alive ISR member as leader (already the leader = no change, that's fine)
      partition.leaderId = aliveISR[0];
      return partition.leaderId;
    }
    // No alive ISR member: partition goes offline
    partition.leaderId = -1;
    return -1;
  }

  /** Run leader re-election for all partitions after broker failure */
  handleBrokerFailure(brokerId) {
    // Update controller if it was the dead broker
    if (this.controllerId === brokerId) {
      const nextAlive = this.aliveBrokers.find(b => b.id !== brokerId);
      this.controllerId = nextAlive ? nextAlive.id : -1; // -1 = no controller (full outage)
    }
    this.topics.forEach(topic => {
      topic.partitions.forEach(partition => {
        if (partition.leaderId === brokerId) {
          this.electLeader(partition);
        }
        // Shrink ISR
        partition.isrIds = partition.isrIds.filter(id => id !== brokerId);
      });
    });
    this._updateBrokerPartitionCounts();
  }

  /**
   * Called when a broker comes back online.
   * Re-elects leaders for any partition that went offline (leaderId === -1),
   * re-expands ISR for the restarted broker, and restores the controller if needed.
   */
  handleBrokerRestart(brokerId) {
    const aliveIds = this.aliveBrokers.map(b => b.id);

    // Restore controller if there is none
    if (this.controllerId === -1 || !aliveIds.includes(this.controllerId)) {
      this.controllerId = brokerId;
    }

    this.topics.forEach(topic => {
      topic.partitions.forEach(partition => {
        // Re-elect for offline partitions
        if (partition.leaderId === -1) {
          this.electLeader(partition);
        }
        // Re-expand ISR: restarted broker rejoins if it was an original replica
        if (partition.replicaIds.includes(brokerId) && !partition.isrIds.includes(brokerId)) {
          partition.isrIds.push(brokerId);
        }
      });
    });
    this._updateBrokerPartitionCounts();
  }
}
