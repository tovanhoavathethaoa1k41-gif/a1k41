import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './components/Header';
import { MatchesSection } from './components/MatchesSection';
import { StandingsSection } from './components/StandingsSection';
import { KnockoutSection } from './components/KnockoutSection';
import { TeamsSection } from './components/TeamsSection';
import { StatsSection } from './components/StatsSection';
import { AdminModal } from './components/AdminModal';
import { SnowfallOverlay } from './components/SnowfallOverlay';
import { GoldenDustOverlay } from './components/GoldenDustOverlay';
import { GoldenBallSection } from './components/GoldenBallSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  getStoredState,
  saveTournamentState,
  fetchServerTournamentState,
  TournamentState
} from './services/sheetSync';
import { CheckCircle2, AlertCircle, Trophy, Lock, Activity } from 'lucide-react';

/**
 * Trang web công khai KHÔNG có lối vào Admin (không nút bấm, không đường link #admin).
 * Chỉ khi chạy local (npm run dev) hoặc build riêng với biến VITE_ENABLE_ADMIN=true thì mới có giao diện Admin.
 * Khi tắt, toàn bộ mã giao diện Admin cũng không được đóng gói vào bản build.
 */
const ADMIN_UI_ENABLED: boolean =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN === 'true';

export default function App() {
  const [tournamentState, setTournamentState] = useState<TournamentState>(getStoredState);
  const [activeTab, setActiveTab] = useState<string>('matches');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(
    () => ADMIN_UI_ENABLED && typeof window !== 'undefined' && window.location.hash.toLowerCase() === '#admin'
  );
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync from backend server on load and via realtime interval
  useEffect(() => {
    const syncState = () => {
      if (isAdminModalOpen) return;
      // Tab đang ẩn (người xem chuyển app / tắt màn hình) thì không cần gọi server
      if (document.visibilityState === 'hidden') return;
      fetchServerTournamentState().then(serverState => {
        if (serverState) {
          // Chỉ cập nhật giao diện khi dữ liệu thực sự thay đổi (tránh render lại & nhấp nháy mỗi 5 giây)
          setTournamentState(prev =>
            JSON.stringify(prev) === JSON.stringify(serverState) ? prev : serverState
          );
        }
      });
    };

    // Initial sync
    syncState();

    // Realtime polling every 5s so all clients stay synchronized without resetting
    const interval = setInterval(syncState, 5000);

    // Refresh immediately when window comes into focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAdminModalOpen]);

  useEffect(() => {
    saveTournamentState(tournamentState);
  }, [tournamentState]);

  // Chỉ khi giao diện Admin được bật: gõ /#admin trên thanh địa chỉ sẽ mở bảng quản trị
  useEffect(() => {
    if (!ADMIN_UI_ENABLED) return;
    const onHashChange = () => {
      if (window.location.hash.toLowerCase() === '#admin') setIsAdminModalOpen(true);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const closeAdminModal = () => {
    setIsAdminModalOpen(false);
    if (window.location.hash.toLowerCase() === '#admin') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const isGold = activeTab === 'goldenball';

  // Nền đen cho cả trang khi ở tab Quả Bóng Vàng (kể cả vùng kéo quá mép trên điện thoại)
  useEffect(() => {
    document.body.classList.toggle('theme-gold-body', isGold);
    return () => document.body.classList.remove('theme-gold-body');
  }, [isGold]);

  const handleStateUpdated = (newState: TournamentState) => {
    setTournamentState(newState);
  };

  return (
    <div className={`relative min-h-dvh text-slate-100 flex flex-col pitch-pattern overflow-x-clip selection:bg-cyan-500 selection:text-black ${
        isGold ? 'theme-gold bg-black' : 'bg-[#060b08]'
      }`}>
      {/* Subtle Winter Atmosphere */}
      {isGold ? <GoldenDustOverlay /> : <SnowfallOverlay />}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-black/95 border border-cyan-400/50 shadow-2xl backdrop-blur-md animate-bounce-in">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold text-white">
            {toastMessage.text}
          </span>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdmin={ADMIN_UI_ENABLED ? () => setIsAdminModalOpen(true) : undefined}
      />

      {/* Main Container */}
      <main className="relative z-20 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            {activeTab === 'matches' && (
              <motion.div
                key="tab-matches"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <MatchesSection matches={tournamentState.matches} teams={tournamentState.teams} />
              </motion.div>
            )}

            {activeTab === 'standings' && (
              <motion.div
                key="tab-standings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <StandingsSection teams={tournamentState.teams} matches={tournamentState.matches} />
              </motion.div>
            )}

            {activeTab === 'knockout' && (
              <motion.div
                key="tab-knockout"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <KnockoutSection
                  matches={tournamentState.matches}
                  teams={tournamentState.teams}
                  podium={tournamentState.podium}
                />
              </motion.div>
            )}

            {activeTab === 'teams' && (
              <motion.div
                key="tab-teams"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <TeamsSection teams={tournamentState.teams} matches={tournamentState.matches} />
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                key="tab-stats"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <StatsSection teams={tournamentState.teams} matches={tournamentState.matches} />
              </motion.div>
            )}

            {activeTab === 'goldenball' && (
              <motion.div
                key="tab-goldenball"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <GoldenBallSection
                  teams={tournamentState.teams}
                  podium={tournamentState.podium}
                  candidates={tournamentState.goldenBall || []}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* Admin Mode Modal (chỉ có khi bật giao diện Admin) */}
      {ADMIN_UI_ENABLED && (
        <AdminModal
          isOpen={isAdminModalOpen}
          onClose={closeAdminModal}
          tournamentState={tournamentState}
          onStateUpdated={handleStateUpdated}
          showToast={showToast}
        />
      )}

      {/* Clean, Compact Footer */}
      <footer className="relative z-20 mt-12 border-t border-cyan-500/20 bg-black/80 py-5 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span className="font-extrabold text-white">A1K41 WINTER CUP</span>
            <span>·</span>
            <span>Hệ thống tỉ số & giải đấu trực tuyến</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Realtime</span>
            </span>
            {ADMIN_UI_ENABLED && (
              <>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 hover:text-white transition-all cursor-pointer text-xs font-semibold"
                  title="Đăng nhập Quản trị viên"
                >
                  <Lock className="w-3 h-3 text-cyan-400" />
                  <span>Admin</span>
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
