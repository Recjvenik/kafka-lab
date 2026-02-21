import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    BookOpen, Layers, Zap, Users, GitBranch, Cpu, Play, BarChart2,
    HelpCircle, Home, ChevronRight, Activity
} from 'lucide-react'

const NAV_ITEMS = [
    { path: '/', label: 'Home', icon: Home, desc: 'Dashboard' },
    { path: '/learn', label: 'Basics', icon: BookOpen, desc: 'What is Kafka?' },
    { path: '/visualizer', label: 'Topics & Partitions', icon: Layers, desc: 'Visual topology' },
    { path: '/producer', label: 'Producer Lab', icon: Zap, desc: 'Simulate producers' },
    { path: '/consumers', label: 'Consumer Groups', icon: Users, desc: 'Group playground' },
    { path: '/scenarios', label: 'Scenarios', icon: GitBranch, desc: 'Offsets & rebalancing' },
    { path: '/advanced', label: 'Advanced', icon: Cpu, desc: 'ISR, Storage, EOS' },
    { path: '/playground', label: 'Playground', icon: Play, desc: 'Full sandbox' },
    { path: '/compare', label: 'Kafka vs Others', icon: BarChart2, desc: 'Comparison' },
    { path: '/quizzes', label: 'Quizzes', icon: HelpCircle, desc: 'Test knowledge' },
]

export default function Layout() {
    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <main style={{
                flex: 1,
                overflowY: 'auto',
                background: 'var(--bg-primary)',
                position: 'relative',
            }}>
                <Outlet />
            </main>
        </div>
    )
}

function Sidebar() {
    return (
        <nav style={{
            width: 220,
            minWidth: 220,
            background: 'rgba(10,10,18,0.97)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 0',
            overflowY: 'auto',
        }}>
            {/* Logo */}
            <div style={{ padding: '0 20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #f97316, #fb923c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 16px rgba(249,115,22,0.4)',
                    }}>
                        <Activity size={16} color="white" />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>KafkaLab</div>
                        <div style={{ fontSize: 10, color: '#475569' }}>Interactive Learning</div>
                    </div>
                </div>
            </div>

            {/* Nav items */}
            <div style={{ flex: 1 }}>
                {NAV_ITEMS.map(item => (
                    <SidebarItem key={item.path} {...item} />
                ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: '#334155' }}>Apache Kafka simulator</div>
                <div style={{ fontSize: 11, color: '#1e293b', marginTop: 2 }}>v1.0 · browser-only</div>
            </div>
        </nav>
    )
}

function SidebarItem({ path, label, icon: Icon, desc }) {
    return (
        <NavLink
            to={path}
            end={path === '/'}
            style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 20px',
                textDecoration: 'none',
                color: isActive ? '#f97316' : '#64748b',
                background: isActive ? 'rgba(249,115,22,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid #f97316' : '2px solid transparent',
                transition: 'all 0.15s',
                cursor: 'pointer',
            })}
        >
            <Icon size={15} strokeWidth={1.8} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        </NavLink>
    )
}
