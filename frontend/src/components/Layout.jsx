import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, Calendar, History, Zap } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/targets', icon: Target, label: 'Targets' },
    { path: '/schedules', icon: Calendar, label: 'Schedules' },
    { path: '/activity', icon: History, label: 'Activities' },
    { path: '/runs', icon: History, label: 'Run History' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">API Scheduler</h1>
              <p className="text-xs text-slate-500 font-medium">Smart automation</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`} />
                <span className="font-semibold text-sm">{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Version</p>
                <p className="text-sm font-bold text-slate-700 mt-0.5">v1.0.0</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-600">✓</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
