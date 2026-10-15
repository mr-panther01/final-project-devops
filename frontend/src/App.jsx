import React, { useState, useEffect } from 'react'
import { 
  CheckCircle2, Clock, AlertTriangle, Flame, Plus, Trash2, 
  Search, RefreshCw, Layers, ShieldCheck, Activity, Terminal
} from 'lucide-react'

export default function App() {
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({ total: 0, todo: 0, in_progress: 0, done: 0, by_priority: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [backendHealth, setBackendHealth] = useState('checking')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM'
  })

  const fetchTasks = async () => {
    try {
      setLoading(true)
      let url = '/api/tasks'
      const params = new URLSearchParams()
      if (filterStatus !== 'ALL') params.append('status', filterStatus)
      if (searchQuery) params.append('search', searchQuery)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      setTasks(data)
      setError(null)
    } catch (err) {
      console.error("Failed to fetch tasks", err)
      setError("Unable to connect to backend API.")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/tasks/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error("Failed to fetch stats", err)
    }
  }

  const checkHealth = async () => {
    try {
      const res = await fetch('/health')
      if (res.ok) setBackendHealth('healthy')
      else setBackendHealth('unhealthy')
    } catch {
      setBackendHealth('offline')
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchStats()
    checkHealth()
  }, [filterStatus, searchQuery])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setShowModal(false)
        setFormData({ title: '', description: '', status: 'TODO', priority: 'MEDIUM' })
        fetchTasks()
        fetchStats()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        fetchTasks()
        fetchStats()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchTasks()
        fetchStats()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">T</div>
          <span>TaskBoard Cloud</span>
        </div>

        <nav className="nav-menu">
          <div className="nav-item active">
            <Layers size={18} />
            <span>Workspace</span>
          </div>
          <a href="/docs" target="_blank" rel="noreferrer" className="nav-item">
            <Terminal size={18} />
            <span>Swagger API</span>
          </a>
          <a href="/metrics" target="_blank" rel="noreferrer" className="nav-item">
            <Activity size={18} />
            <span>Prometheus</span>
          </a>
        </nav>

        {/* Pipeline & Health Status */}
        <div className="pipeline-widget">
          <div className="pipeline-header">
            <span>DevOps Pipeline</span>
            <ShieldCheck size={14} color="#34d399" />
          </div>
          <div className="pipeline-badge">
            <span className="pipeline-dot" style={{
              background: backendHealth === 'healthy' ? '#10b981' : '#f43f5e',
              boxShadow: backendHealth === 'healthy' ? '0 0 10px #10b981' : '0 0 10px #f43f5e'
            }}></span>
            <span>API: {backendHealth.toUpperCase()}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-navbar">
          <div className="search-bar">
            <Search size={16} color="#6b7280" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="top-actions">
            <button className="icon-btn" onClick={() => { fetchTasks(); fetchStats(); checkHealth(); }} title="Refresh data">
              <RefreshCw size={18} />
            </button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              <span>Create Task</span>
            </button>
          </div>
        </header>

        <div className="page-body">
          {/* KPI Summary Cards */}
          <section className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Total Tasks</div>
              <div className="kpi-value">{stats.total}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">In Progress</div>
              <div className="kpi-value" style={{ color: '#60a5fa' }}>{stats.in_progress}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Completed</div>
              <div className="kpi-value" style={{ color: '#34d399' }}>{stats.done}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">High / Critical</div>
              <div className="kpi-value" style={{ color: '#f87171' }}>
                {(stats.by_priority?.HIGH || 0) + (stats.by_priority?.CRITICAL || 0)}
              </div>
            </div>
          </section>

          {/* Filter Bar */}
          <div className="controls-bar">
            <div className="filter-group">
              {['ALL', 'TODO', 'IN_PROGRESS', 'DONE'].map((st) => (
                <button 
                  key={st}
                  className={`pill-btn ${filterStatus === st ? 'active' : ''}`}
                  onClick={() => setFilterStatus(st)}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '8px' }}>
              {error} Ensure FastAPI backend is running on port 8000.
            </div>
          )}

          {/* Tasks Table */}
          <div className="content-card">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Title & Description</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: '#9ca3af' }}>
                      {loading ? 'Loading tasks...' : 'No tasks found. Click "+ Create Task" to get started.'}
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                          {task.description || 'No description provided'}
                        </div>
                      </td>
                      <td>
                        <select 
                          value={task.status} 
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            color: '#e5e7eb',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="TODO" style={{ background: '#1f2937' }}>TODO</option>
                          <option value="IN_PROGRESS" style={{ background: '#1f2937' }}>IN PROGRESS</option>
                          <option value="DONE" style={{ background: '#1f2937' }}>DONE</option>
                        </select>
                      </td>
                      <td>
                        <span className={`badge badge-${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="icon-btn delete" 
                            onClick={() => handleDelete(task.id)}
                            title="Delete task"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal for creating task */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Create New Task</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Configure AWS VPC" 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Description</label>
                <textarea 
                  rows={3}
                  placeholder="Task details and scope..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
