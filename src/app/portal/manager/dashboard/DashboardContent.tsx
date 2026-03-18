"use client";

import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import { TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const statusBarData = [
  { name: "Open", value: 12, color: "#3b82f6" },
  { name: "In Review", value: 8, color: "#eab308" },
  { name: "Pending", value: 4, color: "#a855f7" },
  { name: "Answered", value: 6, color: "#22c55e" },
  { name: "Closed", value: 17, color: "#334155" },
];

const typeData = [
  { name: "Bug", value: 28, color: "#f87171" },
  { name: "Change", value: 9, color: "#c084fc" },
  { name: "Question", value: 7, color: "#06b6d4" },
  { name: "Feature", value: 3, color: "#facc15" },
];

const volumeData = [
  { day: "Mar 3", tickets: 2 },
  { day: "Mar 4", tickets: 5 },
  { day: "Mar 5", tickets: 3 },
  { day: "Mar 6", tickets: 4 },
  { day: "Mar 7", tickets: 2 },
  { day: "Mar 8", tickets: 1 },
  { day: "Mar 9", tickets: 0 },
  { day: "Mar 10", tickets: 6 },
  { day: "Mar 11", tickets: 8 },
  { day: "Mar 12", tickets: 4 },
  { day: "Mar 13", tickets: 5 },
  { day: "Mar 14", tickets: 3 },
  { day: "Mar 15", tickets: 7 },
  { day: "Mar 16", tickets: 4 },
];

const topSubmitters = [
  { name: "Alex Johnson", tickets: 14, open: 3, closed: 8 },
  { name: "Maria Santos", tickets: 11, open: 4, closed: 6 },
  { name: "David Kim", tickets: 9, open: 3, closed: 5 },
  { name: "Lisa Chen", tickets: 8, open: 1, closed: 6 },
  { name: "Tom Williams", tickets: 5, open: 1, closed: 4 },
];

const bigStats = [
  { label: "Total Tickets", value: "47", icon: TrendingUp, color: "#06b6d4", sub: "this sprint" },
  { label: "Open", value: "12", icon: AlertTriangle, color: "#3b82f6", sub: "need attention" },
  { label: "Resolved", value: "31", icon: CheckCircle2, color: "#22c55e", sub: "65% resolution rate" },
  { label: "Overdue", value: "4", icon: Clock, color: "#f87171", sub: ">24h no response" },
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1a1a22',
    border: '1px solid #1e1e2a',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '12px',
  },
};

export default function ManagerDashboardContent() {
  const slaPercent = 87;

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">UAT Overview</h1>
        </div>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Sprint 3 · March 3 – March 17, 2025
        </p>
      </div>

      {/* Big stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {bigStats.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="rounded-xl p-5 border"
            style={{ backgroundColor: '#141418', borderColor: '#1e1e2a' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#475569' }}>{label.toUpperCase()}</span>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color }}>{value}</div>
            <div className="text-xs" style={{ color: '#475569' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* SLA health */}
      <div className="rounded-xl p-5 border mb-6"
        style={{ backgroundColor: '#141418', borderColor: '#1e1e2a' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">SLA Health</h3>
          <span className="text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
            {slaPercent}% compliant
          </span>
        </div>
        <div className="relative">
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#1e1e2a' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${slaPercent}%`,
                background: 'linear-gradient(90deg, #06b6d4, #22c55e)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: '#475569' }}>
            <span>87% of tickets responded within SLA (24h)</span>
            <span>4 tickets overdue</span>
          </div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-5 gap-6 mb-6">
        {/* Bar chart - by status */}
        <div className="col-span-3 rounded-xl p-5 border"
          style={{ backgroundColor: '#141418', borderColor: '#1e1e2a' }}>
          <h3 className="text-sm font-semibold mb-4">Tickets by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusBarData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusBarData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart - by type */}
        <div className="col-span-2 rounded-xl p-5 border"
          style={{ backgroundColor: '#141418', borderColor: '#1e1e2a' }}>
          <h3 className="text-sm font-semibold mb-4">Tickets by Type</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {typeData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span style={{ color: '#94a3b8' }}>{name}</span>
                </div>
                <span style={{ color: '#64748b' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Line chart - volume */}
      <div className="rounded-xl p-5 border mb-6"
        style={{ backgroundColor: '#141418', borderColor: '#1e1e2a' }}>
        <h3 className="text-sm font-semibold mb-4">Submission Volume — Last 14 Days</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={volumeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Line
              type="monotone"
              dataKey="tickets"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={{ fill: '#06b6d4', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#06b6d4' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top submitters */}
      <div className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: '#141418', borderColor: '#1e1e2a' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#1e1e2a' }}>
          <h3 className="text-sm font-semibold">Top Submitters</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #1e1e2a' }}>
              {['User', 'Total', 'Open', 'Resolved', 'Activity'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium"
                  style={{ color: '#475569' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topSubmitters.map((user, i) => (
              <tr key={user.name}
                style={{ borderBottom: i < topSubmitters.length - 1 ? '1px solid #1a1a22' : 'none' }}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm font-semibold" style={{ color: '#06b6d4' }}>{user.tickets}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm" style={{ color: '#60a5fa' }}>{user.open}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm" style={{ color: '#4ade80' }}>{user.closed}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-1">
                    {Array.from({ length: 10 }, (_, idx) => (
                      <div key={idx}
                        className="w-2 h-5 rounded-sm"
                        style={{
                          backgroundColor: idx < Math.round(user.tickets / 2) ? '#06b6d4' : '#1e1e2a',
                          opacity: idx < Math.round(user.tickets / 2) ? 0.4 + (idx * 0.06) : 1,
                        }}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
