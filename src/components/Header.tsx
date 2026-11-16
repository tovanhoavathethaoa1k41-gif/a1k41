import React from 'react';
import { Calendar, Table, GitCommit, Users, BarChart3, Snowflake, Lock, Trophy } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  /** Chỉ truyền khi giao diện Admin được bật; bản công khai không có nút Admin. */
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAdmin
}) => {
  const navTabs = [
    { id: 'matches', label: 'Trận Đấu', icon: Calendar },
    { id: 'standings', label: 'Bảng Xếp Hạng', icon: Table },
    { id: 'knockout', label: 'Vòng Knockout', icon: GitCommit },
    { id: 'teams', label: 'Đội & Cầu Thủ', icon: Users },
    { id: 'stats', label: 'Thống Kê Giải', icon: BarChart3 },
    { id: 'goldenball', label: 'Quả Bóng Vàng', icon: Trophy }
  ];

  return (
    <>
    <header className="relative z-30 w-full bg-[#060e0a]/90">
      {/* Top icy neon hairline */}
      <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 opacity-80" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
          
          {/* Brand & Tournament Identity */}
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.2)] group-hover:scale-105 transition-transform duration-300">
                <img src="/icon-192.png" alt="A1 League" className="w-full h-full object-cover" />
              </div>
              <Snowflake className="w-3.5 h-3.5 text-cyan-300 absolute -top-1 -right-1 animate-spin-slow opacity-80" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider flex items-center gap-2">
                  <span>A1K41</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-teal-200">
                    WINTER CUP
                  </span>
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
            </div>
          </div>

          {/* Nút Admin: chỉ hiện khi giao diện Admin được bật (local / VITE_ENABLE_ADMIN) */}
          {onOpenAdmin && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={onOpenAdmin}
                className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-xs font-bold text-cyan-300 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Mở bảng điều khiển Quản trị viên"
              >
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quản Trị Viên</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Thanh tab: dính ở mép trên khi cuộn (phần logo/tên giải cuộn đi, không chiếm chỗ nội dung) */}
    <div className="sticky top-0 z-40 w-full bg-[#060e0a]/95 backdrop-blur-xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.7)] pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1.5 sm:gap-2 py-2 overflow-x-auto scrollbar-none">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/60 border border-transparent hover:border-cyan-500/20'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
    </>
  );
};
