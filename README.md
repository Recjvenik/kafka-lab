# 🎡 Kafka Interactive Learning Playground

An immersive, production-quality React application designed to teach Apache Kafka concepts from beginner to expert levels through interactive visualisations and live simulations.

![Playground Redesign](https://img.shields.io/badge/Kafka-Playground-06b6d4?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-3b82f6?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-7-a855f7?style=for-the-badge&logo=vite)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-ff69b4?style=for-the-badge)

---

## 🚀 Key Features

### 📡 Guided Playground
- **Story-driven learning**: Follow a 4-step guided flow from cluster setup to breaking high-availability.
- **Annotated Flow Diagram**: Visualise message routing from **Producer → Partitions → Consumer Groups**.
- **Live Event Log**: Get plain-English updates on exactly what is happening inside your cluster (e.g., "Leader election triggered").

### 🏗️ Simulation Engines
- **Kafka Engine**: Full cluster simulation with Brokers, Topics, and Partitions.
- **Producer Engine**: Supports `acks` (0/1/all), batching, key-based routing, and idempotency.
- **Consumer Engine**: Pull-based model with offset tracking and lag calculation.
- **Group Coordinator**: Real-time partition assignment using **Range, Round-Robin, and Sticky** assignors.
- **Replication Manager**: ISR (In-Sync Replicas) management and automatic leader re-election.

### 📚 Learning Modules
| Module | Focus |
|---|---|
| **Kafka Basics** | Event logs, Pub-Sub vs Queue, ZooKeeper vs KRaft. |
| **Topics & Partitions** | Visualise partition distribution and broker leadership. |
| **Producer Simulator** | Tradeoffs between latency and durability (acks). |
| **Consumer Groups** | Group dynamics, fan-out patterns, and idle consumer behavior. |
| **Scenarios Lab** | Rebalancing, offset reset strategies, and delivery semantics. |
| **Advanced** | Log compaction, performance tuning, and 20+ real-world concepts. |

---

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Visualisation**: [Recharts](https://recharts.org/)
- **Styling**: Vanilla CSS (Modern Glassmorphism Design)

---

## 🏃 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/kafka-lab.git
   cd kafka-lab
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

---

## 🧪 Documentation & Walkthroughs

A detailed **technical walkthrough** is available in the repository which covers the implementation details of all simulation engines and teaching modules.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ to make Kafka simple and fun.*
