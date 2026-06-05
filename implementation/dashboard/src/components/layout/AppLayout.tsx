import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  Cpu,
  TestTube2,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useProbingStatus } from '@/lib/socket'

const navItems = [
  { path: '/', label: 'Fleet', icon: Activity },
  { path: '/register', label: 'Register', icon: Cpu },
  { path: '/tests', label: 'Tests', icon: TestTube2 },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { active: probingActive, connected } = useProbingStatus()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U'

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Activity className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="font-semibold">MonitoRing</span>
            <span className={`inline-flex h-2 w-2 rounded-full ${!connected ? 'bg-red-500' : probingActive ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`} title={!connected ? 'Disconnected' : probingActive ? 'Probing...' : 'Connected'} />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 px-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                  <span className="text-sm truncate">{user?.name || user?.email}</span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center border-t py-2 text-muted-foreground hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r bg-card transition-all duration-200',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-card border-r">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-semibold">MonitoRing</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
