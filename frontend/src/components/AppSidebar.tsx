import { useNavigate } from 'react-router-dom'
import { House, BarChart2, Bell, Settings } from 'lucide-react'
import { cn } from '../lib/utils'

export type NavItem = 'home' | 'usage' | 'notifications' | 'settings'

interface AppSidebarProps {
  activeNav: NavItem
  onNavChange: (nav: NavItem) => void
}

interface NavButtonProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full transition',
        active
          ? 'bg-orange-500/15 text-orange-400'
          : 'text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300',
      )}
    >
      {icon}
    </button>
  )
}

export function AppSidebar({ activeNav, onNavChange }: AppSidebarProps) {
  const navigate = useNavigate()

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center justify-between border-r border-white/[0.07] bg-[#09090b] py-5">
      {/* Top section */}
      <div className="flex flex-col items-center gap-6">
        {/* App logomark */}
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/90 shadow-md shadow-orange-500/30">
          <span className="text-xs font-bold text-white">K</span>
        </div>

        {/* Nav buttons */}
        <div className="flex flex-col items-center gap-2">
          <NavButton
            icon={<House size={20} />}
            label="Home"
            active={activeNav === 'home'}
            onClick={() => {
              onNavChange('home')
              navigate('/')
            }}
          />
          <NavButton
            icon={<BarChart2 size={20} />}
            label="Usage"
            active={activeNav === 'usage'}
            onClick={() => onNavChange(activeNav === 'usage' ? 'home' : 'usage')}
          />
          <NavButton
            icon={<Bell size={20} />}
            label="Notifications"
            active={activeNav === 'notifications'}
            onClick={() => onNavChange('notifications')}
          />
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-3">
        <NavButton
          icon={<Settings size={20} />}
          label="Settings"
          active={activeNav === 'settings'}
          onClick={() => onNavChange('settings')}
        />
        {/* User avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-xs font-bold text-white">
          U
        </div>
      </div>
    </aside>
  )
}
