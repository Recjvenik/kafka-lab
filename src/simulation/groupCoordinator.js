/**
 * groupCoordinator.js
 * Kafka Group Coordinator simulation.
 *
 * This is the heart of consumer group mechanics:
 *   - Tracks which consumers belong to which group
 *   - Assigns partitions to consumers using different assignor strategies
 *   - Triggers rebalancing when membership changes
 *
 * Junior engineer mental model:
 *   One group coordinator (a special broker) manages group membership.
 *   When membership changes → REBALANCE → all consumers stop → partitions reassigned.
 */

import { Consumer } from './consumerEngine.js';

// ────────────────────────────────────────────────────────────
// ASSIGNOR STRATEGIES
// Different ways partitions are distributed to consumers
// ────────────────────────────────────────────────────────────

/**
 * RANGE ASSIGNOR (default)
 * Divides partitions into contiguous ranges per consumer.
 * Can create imbalance with multiple topics.
 */
function rangeAssignor(partitions, consumers) {
  const result = {};
  consumers.forEach(c => (result[c.id] = []));
  if (consumers.length === 0) return result;

  partitions.forEach((p, i) => {
    const consumerIndex = Math.floor((i * consumers.length) / partitions.length);
    const consumer = consumers[Math.min(consumerIndex, consumers.length - 1)];
    result[consumer.id].push(p);
  });
  return result;
}

/**
 * ROUND-ROBIN ASSIGNOR
 * Distributes partitions one-by-one to each consumer in turn.
 * Best balance but ignores topic boundaries.
 */
function roundRobinAssignor(partitions, consumers) {
  const result = {};
  consumers.forEach(c => (result[c.id] = []));
  if (consumers.length === 0) return result;

  partitions.forEach((p, i) => {
    const consumer = consumers[i % consumers.length];
    result[consumer.id].push(p);
  });
  return result;
}

/**
 * STICKY ASSIGNOR (Kafka 2.4+)
 * Keeps existing assignments where possible to minimize partition movement.
 * This reduces the rebalance storm.
 */
function stickyAssignor(partitions, consumers, previousAssignment = {}) {
  const result = {};
  consumers.forEach(c => (result[c.id] = []));
  if (consumers.length === 0) return result;

  const consumerIds = new Set(consumers.map(c => c.id));
  const reassign = [];

  // Keep sticky assignments for still-alive consumers
  partitions.forEach(p => {
    const prevOwner = Object.keys(previousAssignment).find(cId =>
      consumerIds.has(cId) &&
      previousAssignment[cId]?.some(ap => ap.partitionId === p.partitionId && ap.topicName === p.topicName)
    );
    if (prevOwner) {
      result[prevOwner].push(p);
    } else {
      reassign.push(p);
    }
  });

  // Distribute un-owned partitions to least-loaded consumers
  reassign.forEach((p, i) => {
    const leastLoaded = consumers.reduce((a, b) =>
      result[a.id].length <= result[b.id].length ? a : b
    );
    result[leastLoaded.id].push(p);
  });

  return result;
}

// ────────────────────────────────────────────────────────────
// CONSUMER GROUP
// ────────────────────────────────────────────────────────────
export class ConsumerGroup {
  constructor({
    id,
    topicNames = [],
    assignorStrategy = 'range', // 'range' | 'round-robin' | 'sticky'
  } = {}) {
    this.id = id || `cg-${Math.random().toString(36).slice(2, 6)}`;
    this.topicNames = topicNames;
    this.assignorStrategy = assignorStrategy;
    this.consumers = [];
    this.assignment = {};         // consumerId → [{topicName, partitionId}]
    this.previousAssignment = {}; // for sticky assignor
    this.isRebalancing = false;
    this.rebalanceCount = 0;
    this.rebalanceEvents = [];
    this.color = randomGroupColor();
  }

  /**
   * Add a consumer to the group.
   * Always triggers a rebalance!
   */
  addConsumer(topics, partitionMap) {
    const consumer = new Consumer({ groupId: this.id });
    this.consumers.push(consumer);
    this._rebalance(topics, partitionMap);
    return consumer;
  }

  /**
   * Remove a consumer from the group (leave or crash).
   * Also triggers a rebalance.
   */
  removeConsumer(consumerId, topics, partitionMap) {
    this.consumers = this.consumers.filter(c => c.id !== consumerId);
    this._rebalance(topics, partitionMap);
  }

  /**
   * Crash a specific consumer — keeps it in group until session timeout.
   * Simulated immediately for clarity.
   */
  crashConsumer(consumerId, topics, partitionMap) {
    const c = this.consumers.find(c => c.id === consumerId);
    if (c) {
      c.crash();
      this.removeConsumer(consumerId, topics, partitionMap);
    }
  }

  /**
   * Core rebalance logic.
   * Stop the world → reassign partitions → resume.
   */
  _rebalance(topics, partitionMap) {
    this.isRebalancing = true;
    this.rebalanceCount++;

    // Collect all partitions across all subscribed topics
    const allPartitions = [];
    topics.forEach(topic => {
      if (this.topicNames.includes(topic.name)) {
        topic.partitions.forEach(p => {
          allPartitions.push({ topicName: topic.name, partitionId: p.id });
        });
      }
    });

    const aliveConsumers = this.consumers.filter(c => c.isAlive);

    // Choose assignment strategy
    let newAssignment;
    if (this.assignorStrategy === 'round-robin') {
      newAssignment = roundRobinAssignor(allPartitions, aliveConsumers);
    } else if (this.assignorStrategy === 'sticky') {
      newAssignment = stickyAssignor(allPartitions, aliveConsumers, this.previousAssignment);
    } else {
      newAssignment = rangeAssignor(allPartitions, aliveConsumers);
    }

    this.previousAssignment = newAssignment;
    this.assignment = newAssignment;

    // Inform each consumer of their assigned partitions
    aliveConsumers.forEach(consumer => {
      consumer.assignPartitions(newAssignment[consumer.id] || [], partitionMap);
    });

    this._logRebalance(aliveConsumers, allPartitions);
    this.isRebalancing = false;
  }

  /**
   * Compute partition-to-consumer mapping for visualizer.
   * Returns: { "topicName:partitionId": consumerId }
   */
  getOwnershipMap() {
    const map = {};
    Object.entries(this.assignment).forEach(([consumerId, partitions]) => {
      partitions.forEach(({ topicName, partitionId }) => {
        map[`${topicName}:${partitionId}`] = consumerId;
      });
    });
    return map;
  }

  /**
   * Get idle consumers (assigned 0 partitions, because consumers > partitions).
   * Key Kafka concept: extra consumers sit idle — they are standby capacity.
   */
  get idleConsumers() {
    return this.consumers.filter(c =>
      c.isAlive && (!this.assignment[c.id] || this.assignment[c.id].length === 0)
    );
  }

  get activeConsumers() {
    return this.consumers.filter(c =>
      c.isAlive && this.assignment[c.id]?.length > 0
    );
  }

  /**
   * Calculate lag per consumer — how many messages behind are they?
   */
  getLagReport(partitionMap) {
    return this.consumers.map(consumer => ({
      consumerId: consumer.id,
      totalLag: consumer.assignedPartitions.reduce((sum, { topicName, partitionId }) => {
        const partition = partitionMap?.[`${topicName}:${partitionId}`];
        return sum + consumer.getLag(topicName, partitionId, partition);
      }, 0),
      partitions: consumer.assignedPartitions,
    }));
  }

  _logRebalance(consumers, partitions) {
    this.rebalanceEvents.unshift({
      ts: Date.now(),
      consumerCount: consumers.length,
      partitionCount: partitions.length,
      strategy: this.assignorStrategy,
    });
    if (this.rebalanceEvents.length > 20) this.rebalanceEvents.pop();
  }
}

// ────────────────────────────────────────────────────────────
// GROUP COORDINATOR — manages multiple consumer groups
// ────────────────────────────────────────────────────────────
export class GroupCoordinator {
  constructor() {
    this.groups = new Map(); // groupId → ConsumerGroup
  }

  createGroup(id, topicNames, assignorStrategy = 'range') {
    const group = new ConsumerGroup({ id, topicNames, assignorStrategy });
    this.groups.set(id, group);
    return group;
  }

  getGroup(id) {
    return this.groups.get(id);
  }

  removeGroup(id) {
    this.groups.delete(id);
  }

  getAllGroups() {
    return Array.from(this.groups.values());
  }

  /** Rebalance all groups (called when topic partitions change) */
  rebalanceAll(topics, partitionMap) {
    this.groups.forEach(group => group._rebalance(topics, partitionMap));
  }
}

// Distinct colors for consumer group visualization
const GROUP_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899'];
let colorIdx = 0;
function randomGroupColor() {
  return GROUP_COLORS[colorIdx++ % GROUP_COLORS.length];
}
