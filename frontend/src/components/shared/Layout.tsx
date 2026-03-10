import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Droplets, Map, BarChart3, Wrench, Bell, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useWaterStore } from '../../store/useWaterStore'
import clsx from 'clsx'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: BarChart3 },
  { path: '/map', label: 'Map', icon: Map },
  { path: '/maintenance', label: 'Maintenance', icon: Wrench },
  { path: '/alerts', label: 'Alerts', icon: Bell },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { alerts, user, logout } = useWaterStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const unresolvedCritical = alerts.filter((a) => !a.resolved && a.severity === 'critical').length

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-navy-800 border-r border-navy-700 flex flex-col',
          'transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-navy-700">
          <Droplets className="text-teal-500 w-8 h-8" />
          <div>
            <h1 className="font-heading font-bold text-lg text-white leading-tight">AquaWatch</h1>
            <p className="text-xs text-muted">Africa Water Monitor</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                location.pathname === path
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'text-muted hover:bg-navy-700 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {label === 'Alerts' && unresolvedCritical > 0 && (
                <span className="ml-auto bg-danger-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {unresolvedCritical}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {user && (
          <div className="p-4 border-t border-navy-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 text-sm font-semibold">
                {user.full_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                <p className="text-xs text-muted capitalize">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-navy-800 border-b border-navy-700 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-muted hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <Droplets className="text-teal-500 w-6 h-6" />
          <span className="font-heading font-bold text-white">AquaWatch Africa</span>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
