/**
 * kafkaStore.js
 * Central Zustand store for all Kafka simulation state.
 *
 * ⚠️ KEY RULE: NEVER spread class instances into state.
 *   Doing `set({ cluster: { ...cluster } })` copies only own properties,
 *   destroying prototype methods (createTopic, addBroker, etc.).
 *
 *   Instead: mutate the instance directly, then increment `_rev` to
 *   force React to re-render — the engines stay as live class instances.
 */

import { create } from 'zustand';
import { Cluster } from '../simulation/kafkaEngine.js';
import { Producer, ACKS } from '../simulation/producerEngine.js';
import { GroupCoordinator } from '../simulation/groupCoordinator.js';
import { ReplicationManager } from '../simulation/replicationEngine.js';

// ────────────────────────────────────────────────────────────
// INITIAL STATE helpers
// ────────────────────────────────────────────────────────────

function buildInitialCluster() {
  const cluster = new Cluster({ brokerCount: 3 });
  cluster.createTopic('orders', 3, 2);
  cluster.createTopic('payments', 2, 2);
  return cluster;
}

function buildPartitionMap(cluster) {
  const map = {};
  cluster.topics.forEach(topic => {
    topic.partitions.forEach(p => {
      map[`${topic.name}:${p.id}`] = p;
    });
  });
  return map;
}

// ────────────────────────────────────────────────────────────
// STORE
// ────────────────────────────────────────────────────────────

export const useKafkaStore = create((set, get) => {
  // These are live class instances — NEVER SPREAD THEM
  const cluster = buildInitialCluster();
  const coordinator = new GroupCoordinator();
  const replicationMgr = new ReplicationManager({ cluster });

  // Create a default consumer group with 2 consumers on 'orders' topic
  const partitionMap = buildPartitionMap(cluster);
  const defaultGroup = coordinator.createGroup('group-alpha', ['orders'], 'round-robin');
  defaultGroup.addConsumer(Array.from(cluster.topics.values()), partitionMap);
  defaultGroup.addConsumer(Array.from(cluster.topics.values()), partitionMap);

  // Default producer
  const defaultProducer = new Producer({ topicName: 'orders', acks: ACKS.LEADER });

  return {
    // ── Live engine references (kept as real class instances) ─
    cluster,
    coordinator,
    replicationMgr,
    producers: [defaultProducer],

    // ── Derived / serialisable state ──────────────────────────
    partitionMap,
    selectedTopic: 'orders',
    selectedGroupId: 'group-alpha',
    isSimulationRunning: false,
    simulationSpeed: 1,
    tickCount: 0,
    _rev: 0,                  // bump this to force re-renders

    // ── Message particles for animation ───────────────────────
    messageParticles: [],

    // ── Metrics history (last 60 ticks) ───────────────────────
    metricsHistory: [],

    // ── Rebalance log ─────────────────────────────────────────
    rebalanceLog: [],

    // ────────────────────────────────────────────────────────────
    // ACTIONS  — mutate the engine, then bump _rev
    // ────────────────────────────────────────────────────────────

    /** Force a re-render without any structural change */
    _bump: () => set(s => ({ _rev: s._rev + 1 })),

    /** Create a new topic */
    createTopic: (name, numPartitions, replicationFactor) => {
      const { cluster, coordinator } = get();
      cluster.createTopic(name, numPartitions, replicationFactor);
      const pm = buildPartitionMap(cluster);
      // Subscribe all existing groups to the new topic so they rebalance correctly
      coordinator.getAllGroups().forEach(group => {
        if (!group.topicNames.includes(name)) {
          group.topicNames.push(name);
        }
      });
      coordinator.rebalanceAll(Array.from(cluster.topics.values()), pm);
      set(s => ({ partitionMap: pm, _rev: s._rev + 1 }));
    },

    /** Set active topic for visualizers — also subscribe all groups and rebalance */
    selectTopic: (name) => {
      const { cluster, coordinator, partitionMap } = get();
      // Make sure all groups are subscribed to this topic so they show correct assignments
      coordinator.getAllGroups().forEach(group => {
        if (!group.topicNames.includes(name)) {
          group.topicNames.push(name);
        }
      });
      coordinator.rebalanceAll(Array.from(cluster.topics.values()), partitionMap);
      set(s => ({ selectedTopic: name, _rev: s._rev + 1 }));
    },

    /** Add a broker to the cluster */
    addBroker: () => {
      const { cluster } = get();
      cluster.addBroker();
      set(s => ({ _rev: s._rev + 1 }));
    },

    /** Kill a broker (triggers leader election) */
    killBroker: (id) => {
      const { replicationMgr, cluster, coordinator, partitionMap } = get();
      replicationMgr.killBroker(id);
      coordinator.rebalanceAll(Array.from(cluster.topics.values()), partitionMap);
      set(s => ({ _rev: s._rev + 1 }));
    },

    /** Restart a downed broker */
    restartBroker: (id) => {
      const { replicationMgr, cluster, coordinator, partitionMap } = get();
      replicationMgr.restartBroker(id);
      // Rebalance consumers — they may now have access to newly-elected leaders
      coordinator.rebalanceAll(Array.from(cluster.topics.values()), partitionMap);
      set(s => ({ _rev: s._rev + 1 }));
    },

    /** Add consumer to a group */
    addConsumer: (groupId) => {
      const { coordinator, cluster, partitionMap } = get();
      const group = coordinator.getGroup(groupId);
      if (!group) return;
      group.addConsumer(Array.from(cluster.topics.values()), partitionMap);
      set(s => ({ _rev: s._rev + 1 }));
    },

    /** Remove a consumer from a group */
    removeConsumer: (groupId, consumerId) => {
      const { coordinator, cluster, partitionMap } = get();
      const group = coordinator.getGroup(groupId);
      if (!group) return;
      group.removeConsumer(consumerId, Array.from(cluster.topics.values()), partitionMap);
      set(s => ({ _rev: s._rev + 1 }));
    },

    /** Crash a consumer */
    crashConsumer: (groupId, consumerId) => {
      const { coordinator, cluster, partitionMap } = get();
      const group = coordinator.getGroup(groupId);
      if (!group) return;
      group.crashConsumer(consumerId, Array.from(cluster.topics.values()), partitionMap);
      set(s => ({ _rev: s._rev + 1 }));
    },

    /** Create a new consumer group */
    createGroup: (id, topicNames, strategy) => {
      const { coordinator, cluster, partitionMap } = get();
      // Guard: don't create duplicate groups
      if (coordinator.getGroup(id)) {
        const uniqueId = `${id}-${Date.now()}`;
        const group = coordinator.createGroup(uniqueId, topicNames, strategy);
        group.addConsumer(Array.from(cluster.topics.values()), partitionMap);
        set(s => ({ _rev: s._rev + 1 }));
        return group;
      }
      const group = coordinator.createGroup(id, topicNames, strategy);
      group.addConsumer(Array.from(cluster.topics.values()), partitionMap);
      set(s => ({ _rev: s._rev + 1 }));
      return group;
    },

    /** Remove a consumer group */
    removeGroup: (id) => {
      const { coordinator } = get();
      coordinator.removeGroup(id);
      set(s => ({ _rev: s._rev + 1 }));
    },

    /** Change assignor strategy for a group */
    setAssignorStrategy: (groupId, strategy) => {
      const { coordinator, cluster, partitionMap } = get();
      const group = coordinator.getGroup(groupId);
      if (!group) return;
      group.assignorStrategy = strategy;
      group._rebalance(Array.from(cluster.topics.values()), partitionMap);
      set(s => ({ _rev: s._rev + 1 }));
    },

    /** Produce N messages to the selected topic */
    produceMessages: (count = 5, key = null) => {
      const { producers, cluster, selectedTopic } = get();
      const producer = producers[0];
      const topic = cluster.topics.get(selectedTopic);
      if (!topic) return;

      const newParticles = [];
      for (let i = 0; i < count; i++) {
        const result = producer.produce(topic, `event-${Date.now()}-${i}`, key);
        if (result.success) {
          newParticles.push({
            id: `p-${Date.now()}-${i}`,
            partitionId: result.partitionId,
            topicName: selectedTopic,
            ts: Date.now() + i * 50,
          });
        }
      }

      // Particles auto-clear after 1.5s
      set(s => ({ messageParticles: [...s.messageParticles, ...newParticles], _rev: s._rev + 1 }));
      setTimeout(() => {
        set(s => ({
          messageParticles: s.messageParticles.filter(p => !newParticles.find(np => np.id === p.id))
        }));
      }, 1500);
    },

    /** Update producer config */
    setProducerConfig: (config) => {
      const { producers } = get();
      Object.assign(producers[0], config);
      set(s => ({ _rev: s._rev + 1 }));
    },

    /** Single simulation tick */
    tick: () => {
      const { cluster, replicationMgr, producers, coordinator, partitionMap, metricsHistory, tickCount } = get();
      replicationMgr.tick();

      // Collect metrics snapshot
      const totalMessages = Array.from(cluster.topics.values()).reduce((s, t) => s + t.totalMessages, 0);
      const totalLag = coordinator.getAllGroups().reduce((s, g) => {
        return s + g.getLagReport(partitionMap).reduce((gs, r) => gs + r.totalLag, 0);
      }, 0);
      const metric = {
        tick: tickCount,
        throughput: producers[0]?.totalSent ?? 0,
        lag: totalLag,
        rebalances: coordinator.getAllGroups().reduce((s, g) => s + g.rebalanceCount, 0),
        isrHealth: replicationMgr.isrHealthScore,
      };

      const newHistory = [...metricsHistory, metric].slice(-60);
      set(s => ({ tickCount: s.tickCount + 1, metricsHistory: newHistory, _rev: s._rev + 1 }));
    },

    /** Start/stop simulation loop */
    toggleSimulation: () => {
      const { isSimulationRunning } = get();
      set({ isSimulationRunning: !isSimulationRunning });
    },
  };
});
