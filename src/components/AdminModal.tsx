import React, { useState, useEffect, useRef } from 'react';
import {
  TournamentState,
  saveServerTournamentState,
  saveTournamentState,
  loginAdmin,
  getAdminToken,
  logoutAdmin,
  resetTournamentScoresAndStandings,
  fetchServerHealth,
  ServerHealth,
  AUTH_EXPIRED_EVENT
} from '../services/sheetSync';
import { Team, GoalDetail, CardDetail, Player, PenaltyShootoutRound } from '../types/tournament';
import { recalculateAllStats, isPenaltyShootoutEligible } from '../utils/statsCalculator';
import {
  Lock,
  Unlock,
  X,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Users,
  Calendar,
  Eye,
  EyeOff,
  Flame,
  Shield,
  Target,
  AlertTriangle,
  Loader2,
  Check
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentState: TournamentState;
  onStateUpdated: (newState: TournamentState) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

type Side = 'home' | 'away';
type GoalType = 'open' | 'penalty' | 'own';
type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

/* ------------------------------------------------------------------ */
/*  Thành phần nhỏ dùng chung: logo đội (thay cho tên đội)             */
/* ------------------------------------------------------------------ */

// Nhãn ngắn cho các đội chưa xác định (chờ hết vòng bảng / bán kết)
const PLACEHOLDER_SHORT: Record<string, string> = {
  nhat_a: '1A',
  nhi_a: '2A',
  nhat_b: '1B',
  nhi_b: '2B',
  thang_bk1: 'T-BK1',
  thang_bk2: 'T-BK2',
  thua_bk1: 'B-BK1',
  thua_bk2: 'B-BK2'
};

const LOGO_BOX: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'w-6 h-6 p-0.5 rounded-md',
  sm: 'w-9 h-9 p-1 rounded-lg',
  md: 'w-12 h-12 p-1 rounded-xl',
  lg: 'w-16 h-16 p-1.5 rounded-2xl'
};

interface AdminTeamLogoProps {
  team: Team | undefined;
  teamId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const AdminTeamLogo: React.FC<AdminTeamLogoProps> = ({ team, teamId, size = 'md' }) => {
  const box = LOGO_BOX[size];
  if (!team) {
    return (
      <div
        className={`${box} shrink-0 bg-slate-900/80 border border-dashed border-cyan-500/40 flex items-center justify-center text-[9px] font-black text-cyan-300/80 leading-none`}
        title="Chưa xác định đội"
      >
        {PLACEHOLDER_SHORT[teamId] || '?'}
      </div>
    );
  }
  return (
    <div
      className={`${box} shrink-0 bg-black/50 border border-cyan-500/25 flex items-center justify-center`}
      title={team.name}
    >
      <img
        src={team.nationalTeam?.logo}
        alt={team.name}
        className="max-w-full max-h-full object-contain"
        loading="lazy"
      />
    </div>
  );
};

interface TeamToggleProps {
  value: Side;
  onChange: (v: Side) => void;
  homeTeam: Team | undefined;
  awayTeam: Team | undefined;
  homeId: string;
  awayId: string;
}

// Hai nút chọn đội bằng logo (thay cho dropdown tên đội)
const TeamToggle: React.FC<TeamToggleProps> = ({ value, onChange, homeTeam, awayTeam, homeId, awayId }) => (
  <div className="grid grid-cols-2 gap-2">
    {(['home', 'away'] as Side[]).map(side => {
      const active = value === side;
      return (
        <button
          key={side}
          type="button"
          onClick={() => onChange(side)}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl border-2 transition-all cursor-pointer ${
            active
              ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_14px_rgba(52,211,153,0.25)]'
              : 'border-slate-700 bg-slate-900/60 opacity-60 hover:opacity-100'
          }`}
          title={side === 'home' ? 'Đội nhà' : 'Đội khách'}
        >
          <AdminTeamLogo
            team={side === 'home' ? homeTeam : awayTeam}
            teamId={side === 'home' ? homeId : awayId}
            size="md"
          />
          <span className={`text-[10px] font-black uppercase ${active ? 'text-emerald-300' : 'text-slate-500'}`}>
            {side === 'home' ? 'Nhà' : 'Khách'}
          </span>
        </button>
      );
    })}
  </div>
);

const ServerBanner: React.FC<{ health: ServerHealth | null }> = ({ health }) => {
  if (!health || health.ok) return null;
  return (
    <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-100 space-y-1 shrink-0">
      <div className="flex items-center gap-1.5 font-black text-rose-300">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Máy chủ chưa sẵn sàng — tỉ số sẽ KHÔNG lưu được cho các máy khác</span>
      </div>
      <ul className="list-disc pl-5 space-y-0.5 text-rose-200/90">
        {health.problems.map(pr => (
          <li key={pr}>{pr}</li>
        ))}
      </ul>
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  tournamentState,
  onStateUpdated,
  showToast
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [showPasswordMask, setShowPasswordMask] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Bản sao dữ liệu đang chỉnh sửa. Dùng thêm ref để nhiều thao tác bấm liên tiếp không ghi đè nhau.
  const [editState, setEditState] = useState<TournamentState>(tournamentState);
  const editStateRef = useRef<TournamentState>(tournamentState);

  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [activeAdminTab, setActiveAdminTab] = useState<'matches' | 'teams' | 'reset'>('matches');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isWiping, setIsWiping] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Danh sách cầu thủ
  const [selectedRosterTeamId, setSelectedRosterTeamId] = useState<string>('');
  const [newPlayerName, setNewPlayerName] = useState<string>('');

  // Form thêm bàn thắng
  const [newGoalTeam, setNewGoalTeam] = useState<Side>('home'); // đội ĐƯỢC HƯỞNG bàn thắng
  const [newGoalType, setNewGoalType] = useState<GoalType>('open');
  const [newGoalScorer, setNewGoalScorer] = useState<string>('');
  const [newGoalMinute, setNewGoalMinute] = useState<string>('15');
  const [newGoalAssister, setNewGoalAssister] = useState<string>('');

  // Form thêm thẻ phạt
  const [newCardTeam, setNewCardTeam] = useState<Side>('home');
  const [newCardPlayer, setNewCardPlayer] = useState<string>('');
  const [newCardMinute, setNewCardMinute] = useState<string>('30');
  const [newCardType, setNewCardType] = useState<'yellow' | 'red'>('yellow');

  // Phiên đăng nhập hết hạn (token 24h) -> quay lại form đăng nhập
  useEffect(() => {
    const onAuthExpired = () => {
      setIsAuthenticated(false);
      setSyncStatus('error');
      showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để lưu tỉ số.', 'error');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const copy = JSON.parse(JSON.stringify(tournamentState)) as TournamentState;
    editStateRef.current = copy;
    setEditState(copy);
    setSyncStatus('idle');

    if (getAdminToken()) setIsAuthenticated(true);
    if (copy.matches.length > 0 && !copy.matches.some(m => m.id === selectedMatchId)) {
      setSelectedMatchId(copy.matches[0].id);
    }
    if (copy.teams.length > 0 && !copy.teams.some(t => t.id === selectedRosterTeamId)) {
      setSelectedRosterTeamId(copy.teams[0].id);
    }

    let cancelled = false;
    fetchServerHealth().then(h => {
      if (!cancelled) setHealth(h);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMatch = editState.matches.find(m => m.id === selectedMatchId);
  const homeTeam = currentMatch ? editState.teams.find(t => t.id === currentMatch.homeTeamId) : undefined;
  const awayTeam = currentMatch ? editState.teams.find(t => t.id === currentMatch.awayTeamId) : undefined;
  const homeId = currentMatch?.homeTeamId || '';
  const awayId = currentMatch?.awayTeamId || '';

  // ----- Form bàn thắng -----
  // Own Goal: cộng 1 bàn cho đội được chọn, không gắn với cầu thủ nào.
  // Phạt đền: KHÔNG có kiến tạo. Cầu thủ ghi bàn KHÔNG được là người kiến tạo cho chính bàn đó.
  const isOwnGoal = newGoalType === 'own';
  const isPenaltyGoal = newGoalType === 'penalty';
  const canHaveAssist = !isOwnGoal && !isPenaltyGoal;
  const scorerTeam = newGoalTeam === 'home' ? homeTeam : awayTeam;
  const scorerOptions = scorerTeam?.players || [];
  const assisterOptions = (scorerTeam?.players || []).filter(p => p.name !== newGoalScorer);

  // ----- Form thẻ phạt -----
  const cardTeamPlayers = (newCardTeam === 'home' ? homeTeam : awayTeam)?.players || [];

  const activeRosterTeam = editState.teams.find(t => t.id === selectedRosterTeamId);
  const isShootoutEligible = currentMatch ? isPenaltyShootoutEligible(currentMatch, editState.matches) : false;

  /* ---------------- Đăng nhập / đăng xuất ---------------- */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      setLoginError('Vui lòng nhập mật khẩu quản trị.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await loginAdmin(trimmed);
      if (res.success) {
        setIsAuthenticated(true);
        setPassword('');
        showToast('Đăng nhập Quản trị viên thành công!');
        fetchServerHealth().then(setHealth);
      } else {
        setLoginError(res.message || 'Mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Lỗi đăng nhập.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
    setPassword('');
    showToast('Đã đăng xuất khỏi tài khoản Quản trị viên.');
  };

  /* ---------------- Lưu dữ liệu ---------------- */

  const buildFinalState = (base: TournamentState): TournamentState => {
    const teams = JSON.parse(JSON.stringify(base.teams));
    const matches = JSON.parse(JSON.stringify(base.matches));
    const podium = JSON.parse(JSON.stringify(base.podium));
    recalculateAllStats(teams, matches, podium);
    return { ...base, teams, matches, podium, lastUpdated: new Date().toISOString() };
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    setSyncStatus('saving');
    try {
      const finalState = buildFinalState(editStateRef.current);
      const ok = await saveServerTournamentState(finalState);
      if (ok) {
        editStateRef.current = finalState;
        setEditState(finalState);
        onStateUpdated(finalState);
        saveTournamentState(finalState);
        setSyncStatus('saved');
        showToast('Đã lưu & đồng bộ dữ liệu toàn hệ thống realtime thành công!');
        onClose();
      } else {
        setSyncStatus('error');
        showToast('Lỗi khi lưu dữ liệu lên máy chủ.', 'error');
      }
    } catch (err: any) {
      setSyncStatus('error');
      showToast(err.message || 'Lỗi khi lưu dữ liệu.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Cập nhật bản nháp (chưa gửi server) - dùng cho danh sách cầu thủ
  const updateDraft = (updater: (prev: TournamentState) => TournamentState) => {
    const next = updater(editStateRef.current);
    if (next === editStateRef.current) return;
    editStateRef.current = next;
    setEditState(next);
  };

  // Cập nhật + gửi lên server NGAY (tỉ số, bàn thắng, thẻ phạt, luân lưu)
  const commitTournamentUpdate = (updater: (prev: TournamentState) => TournamentState) => {
    const next = updater(editStateRef.current);
    if (next === editStateRef.current) return;

    const finalState = buildFinalState(next);
    editStateRef.current = finalState;
    setEditState(finalState);

    onStateUpdated(finalState); // 1. cập nhật giao diện chính
    saveTournamentState(finalState); // 2. lưu localStorage

    setSyncStatus('saving'); // 3. đồng bộ máy chủ
    saveServerTournamentState(finalState)
      .then(ok => {
        setSyncStatus(ok ? 'saved' : 'error');
        if (!ok) {
          showToast('⚠ CHƯA lưu được lên máy chủ — các máy khác chưa thấy thay đổi này. Kiểm tra mạng / đăng nhập lại.', 'error');
        }
      })
      .catch(() => {
        setSyncStatus('error');
        showToast('⚠ Lỗi kết nối khi lưu lên máy chủ.', 'error');
      });
  };

  const updateSelectedMatch = (mutate: (m: TournamentState['matches'][number]) => void) => {
    commitTournamentUpdate(prev => {
      const matches = [...prev.matches];
      const idx = matches.findIndex(m => m.id === selectedMatchId);
      if (idx === -1) return prev;
      const target = { ...matches[idx] };
      mutate(target);
      matches[idx] = target;
      return { ...prev, matches };
    });
  };

  const executeResetScoresAndStandings = async () => {
    setIsWiping(true);
    try {
      const resetState = await resetTournamentScoresAndStandings(editStateRef.current);
      editStateRef.current = resetState;
      setEditState(resetState);
      onStateUpdated(resetState);
      setShowResetConfirm(false);
      showToast('Đã đặt lại tất cả tỷ số về 0-0 và làm trắng Bảng xếp hạng thành công!');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi đặt lại kết quả.', 'error');
    } finally {
      setIsWiping(false);
    }
  };

  /* ---------------- Bàn thắng ---------------- */

  const normMinute = (raw: string): string | undefined => {
    const v = raw.trim();
    if (!v) return undefined;
    return v.includes("'") ? v : `${v}'`;
  };

  const handleAddGoal = () => {
    if (!currentMatch) return;
    // Own Goal: không cần chọn cầu thủ. Đội đang chọn là đội ĐƯỢC CỘNG 1 BÀN.
    if (!isOwnGoal && !newGoalScorer) {
      showToast('Vui lòng chọn cầu thủ ghi bàn từ danh sách.', 'error');
      return;
    }

    const goalObj: GoalDetail = {
      id: `g_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      scorer: isOwnGoal ? 'Own Goal' : newGoalScorer,
      minute: normMinute(newGoalMinute),
      assister: canHaveAssist && newGoalAssister && newGoalAssister !== newGoalScorer ? newGoalAssister : undefined,
      isPenalty: isPenaltyGoal
    };
    if (isOwnGoal) goalObj.isOwnGoal = true;

    const side = newGoalTeam;
    updateSelectedMatch(target => {
      if (side === 'home') {
        target.homeGoals = [...(target.homeGoals || []), goalObj];
        target.homeScore = (target.homeScore || 0) + 1;
        if (target.awayScore === null) target.awayScore = 0;
      } else {
        target.awayGoals = [...(target.awayGoals || []), goalObj];
        target.awayScore = (target.awayScore || 0) + 1;
        if (target.homeScore === null) target.homeScore = 0;
      }
      target.status = 'completed';
      target.statusText = 'Đã đấu';
    });

    const scorerName = newGoalScorer;
    setNewGoalScorer('');
    setNewGoalAssister('');
    showToast(
      isOwnGoal
        ? 'Đã ghi nhận Own Goal và cộng 1 bàn cho đội được chọn.'
        : `Đã ghi nhận và lưu bàn thắng của ${scorerName}!`
    );
  };

  const handleRemoveGoal = (goalId: string, side: Side) => {
    updateSelectedMatch(target => {
      const list = (side === 'home' ? target.homeGoals : target.awayGoals) || [];
      const remaining = list.filter(g => g.id !== goalId);
      if (side === 'home') {
        target.homeGoals = remaining;
        target.homeScore = Math.max(0, (target.homeScore || 1) - 1);
      } else {
        target.awayGoals = remaining;
        target.awayScore = Math.max(0, (target.awayScore || 1) - 1);
      }
    });
  };

  /* ---------------- Thẻ phạt ---------------- */

  const handleAddCard = () => {
    if (!currentMatch) return;
    if (!newCardPlayer) {
      showToast('Vui lòng chọn cầu thủ bị phạt từ danh sách.', 'error');
      return;
    }

    const cardObj: CardDetail = {
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      player: newCardPlayer,
      minute: normMinute(newCardMinute),
      type: newCardType
    };

    const side = newCardTeam;
    updateSelectedMatch(target => {
      if (side === 'home') target.homeCards = [...(target.homeCards || []), cardObj];
      else target.awayCards = [...(target.awayCards || []), cardObj];
    });

    const playerName = newCardPlayer;
    setNewCardPlayer('');
    showToast(`Đã ghi nhận ${newCardType === 'yellow' ? 'thẻ vàng' : 'thẻ đỏ'} cho ${playerName}!`);
  };

  const handleRemoveCard = (cardId: string, side: Side) => {
    updateSelectedMatch(target => {
      if (side === 'home') target.homeCards = (target.homeCards || []).filter(c => c.id !== cardId);
      else target.awayCards = (target.awayCards || []).filter(c => c.id !== cardId);
    });
  };

  /* ---------------- Tỉ số ---------------- */

  const handleScoreChange = (side: Side, val: string) => {
    const parsed = val === '' ? null : Math.max(0, parseInt(val, 10) || 0);
    updateSelectedMatch(target => {
      if (side === 'home') target.homeScore = parsed;
      else target.awayScore = parsed;
      if (target.homeScore !== null && target.awayScore !== null) {
        target.status = 'completed';
        target.statusText = 'Đã đấu';
      }
    });
  };

  /* ---------------- Luân lưu ---------------- */

  const recountPenalties = (m: TournamentState['matches'][number], shootout: PenaltyShootoutRound[]) => {
    m.penaltyShootout = shootout;
    m.homePenalties = shootout.filter(r => r.homeScored).length;
    m.awayPenalties = shootout.filter(r => r.awayScored).length;
  };

  const handleAddShootoutRound = () => {
    if (!currentMatch) return;
    updateSelectedMatch(target => {
      const current = target.penaltyShootout || [];
      const newRound: PenaltyShootoutRound = {
        round: current.length + 1,
        homeShooter: homeTeam?.players[0]?.name || '',
        homeScored: true,
        awayShooter: awayTeam?.players[0]?.name || '',
        awayScored: true
      };
      recountPenalties(target, [...current, newRound]);
    });
  };

  const handleUpdateShootoutRound = (roundIdx: number, updates: Partial<PenaltyShootoutRound>) => {
    updateSelectedMatch(target => {
      const shootout = [...(target.penaltyShootout || [])];
      if (!shootout[roundIdx]) return;
      shootout[roundIdx] = { ...shootout[roundIdx], ...updates };
      recountPenalties(target, shootout);
    });
  };

  const handleRemoveShootoutRound = (roundIdx: number) => {
    updateSelectedMatch(target => {
      let shootout = [...(target.penaltyShootout || [])];
      shootout.splice(roundIdx, 1);
      shootout = shootout.map((r, i) => ({ ...r, round: i + 1 }));
      recountPenalties(target, shootout);
    });
  };

  /* ---------------- Danh sách cầu thủ ---------------- */

  const handleAddPlayerToTeam = () => {
    if (!newPlayerName.trim()) {
      showToast('Vui lòng nhập tên cầu thủ mới.', 'error');
      return;
    }

    updateDraft(prev => {
      const teams = [...prev.teams];
      const teamIdx = teams.findIndex(t => t.id === selectedRosterTeamId);
      if (teamIdx === -1) return prev;

      const targetTeam = { ...teams[teamIdx] };
      const newPlayer: Player = {
        id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: newPlayerName.trim(),
        teamId: selectedRosterTeamId,
        goals: 0,
        assists: 0,
        matchesPlayed: 0,
      };

      targetTeam.players = [...targetTeam.players, newPlayer];
      teams[teamIdx] = targetTeam;
      return { ...prev, teams };
    });

    setNewPlayerName('');
    showToast('Đã thêm cầu thủ. Nhớ bấm "Lưu & Xuất Bản" để các máy khác thấy.');
  };

  const handleRemovePlayerFromTeam = (playerId: string) => {
    updateDraft(prev => {
      const teams = [...prev.teams];
      const teamIdx = teams.findIndex(t => t.id === selectedRosterTeamId);
      if (teamIdx === -1) return prev;

      const targetTeam = { ...teams[teamIdx] };
      targetTeam.players = targetTeam.players.filter(p => p.id !== playerId);
      teams[teamIdx] = targetTeam;
      return { ...prev, teams };
    });
    showToast('Đã xóa cầu thủ. Nhớ bấm "Lưu & Xuất Bản" để các máy khác thấy.');
  };

  /* ---------------- Giao diện ---------------- */

  const selectCls =
    'w-full min-w-0 px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-white focus:outline-none focus:border-cyan-400';

  const scoreInputCls =
    'w-14 sm:w-20 h-14 sm:h-16 text-center font-score text-3xl sm:text-4xl font-black bg-slate-900 border-2 border-cyan-500/40 rounded-2xl text-emerald-400 focus:outline-none focus:border-cyan-400 shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  const renderScoreControls = (side: Side) => {
    const value = side === 'home' ? currentMatch?.homeScore : currentMatch?.awayScore;
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleScoreChange(side, String(Math.max(0, (value || 0) - 1)))}
          className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-lg flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 transition-all shrink-0"
          title="Giảm 1 bàn"
        >
          −
        </button>
        <input
          type="number"
          min="0"
          value={value ?? ''}
          onChange={e => handleScoreChange(side, e.target.value)}
          placeholder="0"
          className={scoreInputCls}
        />
        <button
          type="button"
          onClick={() => handleScoreChange(side, String((value || 0) + 1))}
          className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-lg flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 transition-all shrink-0"
          title="Tăng 1 bàn"
        >
          +
        </button>
      </div>
    );
  };

  const renderGoalList = (side: Side) => {
    const goals = (side === 'home' ? currentMatch?.homeGoals : currentMatch?.awayGoals) || [];
    return (
      <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/10 space-y-2 min-w-0">
        <AdminTeamLogo
          team={side === 'home' ? homeTeam : awayTeam}
          teamId={side === 'home' ? homeId : awayId}
          size="xs"
        />
        {goals.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic">Chưa có bàn thắng</div>
        ) : (
          goals.map(g => (
            <div key={g.id} className="flex items-start justify-between gap-2 text-xs py-1 border-b border-slate-800">
              <div className="min-w-0 break-words">
                <span className="font-bold text-white">{g.isOwnGoal ? '🥅 Own Goal' : `⚽ ${g.scorer}`}</span>
                {g.minute && <span className="text-cyan-400 ml-1.5 font-mono">{g.minute}</span>}
                {g.isPenalty && <span className="text-[10px] text-amber-300 ml-1 font-semibold">Pen</span>}
                {g.assister && <div className="text-[10px] text-slate-400">🅰️ KT: {g.assister}</div>}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveGoal(g.id, side)}
                className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                title="Xóa bàn thắng này"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderCardList = (side: Side) => {
    const cards = (side === 'home' ? currentMatch?.homeCards : currentMatch?.awayCards) || [];
    return (
      <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/10 space-y-2 min-w-0">
        <AdminTeamLogo
          team={side === 'home' ? homeTeam : awayTeam}
          teamId={side === 'home' ? homeId : awayId}
          size="xs"
        />
        {cards.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic">Không có thẻ phạt</div>
        ) : (
          cards.map(c => (
            <div key={c.id} className="flex items-start justify-between gap-2 text-xs py-1 border-b border-slate-800">
              <span className="min-w-0 break-words">
                {c.type === 'yellow' ? '🟨' : '🟥'} {c.player} {c.minute && `(${c.minute})`}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveCard(c.id, side)}
                className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                title="Xóa thẻ này"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    );
  };

  // Một dòng trận đấu: chỉ logo + tỉ số (không hiện tên đội)
  const renderMatchLine = (m: TournamentState['matches'][number], logoSize: 'xs' | 'sm') => {
    const hT = editState.teams.find(t => t.id === m.homeTeamId);
    const aT = editState.teams.find(t => t.id === m.awayTeamId);
    return (
      <div className="flex items-center justify-between gap-1.5">
        <AdminTeamLogo team={hT} teamId={m.homeTeamId} size={logoSize} />
        <span className="font-score text-base text-emerald-400 whitespace-nowrap">
          {m.homeScore !== null && m.awayScore !== null ? `${m.homeScore} - ${m.awayScore}` : 'vs'}
        </span>
        <AdminTeamLogo team={aT} teamId={m.awayTeamId} size={logoSize} />
      </div>
    );
  };

  const goalTypeButtons: { id: GoalType; label: string; active: string }[] = [
    { id: 'open', label: '⚽ Bóng sống', active: 'bg-cyan-500/20 border-cyan-400 text-cyan-200' },
    { id: 'penalty', label: '🎯 Penalty', active: 'bg-amber-500/20 border-amber-400 text-amber-200' },
    { id: 'own', label: '🥅 Own Goal', active: 'bg-rose-500/20 border-rose-400 text-rose-200' }
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-4xl rounded-3xl bg-[#09140d]/95 border border-cyan-500/40 shadow-2xl flex flex-col max-h-[94dvh] overflow-hidden ${
          isAuthenticated ? 'h-[94dvh]' : ''
        }`}
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-emerald-950/80 via-slate-950 to-cyan-950/80 border-b border-cyan-500/20 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              {isAuthenticated ? <Unlock className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>Quản Trị Viên</span>
                {isAuthenticated && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                    Đã Xác Thực
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 truncate">Chỉnh tỉ số & sự kiện — lưu ngay lên máy chủ</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg bg-black/40 border border-rose-500/20 cursor-pointer transition-colors"
              >
                Đăng xuất
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. MÀN HÌNH ĐĂNG NHẬP */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-12 text-center w-full max-w-md mx-auto my-auto overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-black text-white mb-2">Đăng Nhập Quản Trị</h4>
            <p className="text-xs text-slate-400 mb-5">
              Nhập mật khẩu quản trị viên để mở quyền chỉnh sửa tỉ số.
            </p>

            {health && !health.ok && (
              <div className="mb-4 text-left p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-100 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Máy chủ chưa cấu hình xong</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-rose-200/90">
                  {health.problems.map(pr => (
                    <li key={pr}>{pr}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  type={showPasswordMask ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-black/70 border border-cyan-500/30 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500 font-mono text-center tracking-widest"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordMask(!showPasswordMask)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 p-1 cursor-pointer transition-colors"
                  title={showPasswordMask ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPasswordMask ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {loginError && <p className="text-xs text-rose-400 mt-2 font-medium">{loginError}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? 'Đang xác thực...' : 'Đăng Nhập'}
              </button>
            </form>
          </div>
        ) : (
          /* 2. BẢNG ĐIỀU KHIỂN ADMIN */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ServerBanner health={health} />

            {/* Thanh tab */}
            <div className="px-3 sm:px-6 py-2 bg-black/40 border-b border-cyan-500/10 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {[
                  { id: 'matches' as const, label: 'Trận & Sự Kiện', icon: Calendar, danger: false },
                  { id: 'teams' as const, label: 'Cầu Thủ', icon: Users, danger: false },
                  { id: 'reset' as const, label: 'Đặt Lại', icon: RotateCcw, danger: true }
                ].map(tab => {
                  const Icon = tab.icon;
                  const active = activeAdminTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveAdminTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        active
                          ? tab.danger
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${tab.danger ? 'text-rose-400' : ''}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Trạng thái đồng bộ */}
                <span
                  className={`hidden sm:flex items-center gap-1 text-[11px] font-bold whitespace-nowrap ${
                    syncStatus === 'saved'
                      ? 'text-emerald-400'
                      : syncStatus === 'saving'
                      ? 'text-cyan-300'
                      : syncStatus === 'error'
                      ? 'text-rose-400'
                      : 'text-slate-500'
                  }`}
                >
                  {syncStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {syncStatus === 'saved' && <Check className="w-3.5 h-3.5" />}
                  {syncStatus === 'error' && <AlertTriangle className="w-3.5 h-3.5" />}
                  {syncStatus === 'saving' && 'Đang lưu...'}
                  {syncStatus === 'saved' && 'Đã lưu lên máy chủ'}
                  {syncStatus === 'error' && 'Lưu thất bại'}
                  {syncStatus === 'idle' && 'Tự động lưu'}
                </span>

                <button
                  type="button"
                  onClick={handleSaveToDatabase}
                  disabled={isSaving}
                  className="px-3 sm:px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Đang Lưu...' : 'Lưu & Xuất Bản'}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: TRẬN ĐẤU */}
            {activeAdminTab === 'matches' && (
              <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
                {/* Mobile: dải chọn trận bằng logo (kéo ngang) */}
                <div className="block md:hidden p-2 bg-black/60 border-b border-cyan-500/20 shrink-0">
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {editState.matches.map(m => {
                      const isSelected = m.id === selectedMatchId;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMatchId(m.id)}
                          className={`shrink-0 w-[132px] text-left p-2 rounded-xl text-[10px] transition-all cursor-pointer flex flex-col gap-1 border ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400/60'
                              : 'bg-slate-900/50 border-slate-800'
                          }`}
                        >
                          <span className="font-extrabold text-cyan-300 truncate">{m.matchCode}</span>
                          {renderMatchLine(m, 'xs')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop: danh sách trận bên trái */}
                <div
                  className="hidden md:block w-60 bg-black/50 border-r border-cyan-500/10 overflow-y-auto p-3 space-y-1.5 shrink-0"
                  style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Chọn trận đấu
                  </div>
                  {editState.matches.map(m => {
                    const isSelected = m.id === selectedMatchId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMatchId(m.id)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all cursor-pointer flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-cyan-500/20 border border-cyan-400/50 text-white shadow-sm'
                            : 'bg-slate-900/40 hover:bg-slate-900/80 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 min-w-0">
                          <span className="font-extrabold text-cyan-300 truncate">{m.matchCode}</span>
                          <span
                            className={`shrink-0 ${
                              m.status === 'completed' ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            {m.statusText}
                          </span>
                        </div>
                        {renderMatchLine(m, 'sm')}
                      </button>
                    );
                  })}
                </div>

                {/* Bên phải: chi tiết trận */}
                <div
                  className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-6 space-y-5"
                  style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
                >
                  {currentMatch ? (
                    <>
                      {/* Thẻ tỉ số: logo ở trên, ô nhập tỉ số ở dưới từng đội */}
                      <div className="p-3 sm:p-5 rounded-2xl bg-black/60 border border-cyan-500/20 space-y-4 shadow-lg">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-400 border-b border-cyan-500/10 pb-3">
                          <span className="font-bold text-cyan-300 truncate">
                            {currentMatch.matchCode} · {currentMatch.stageLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
                          <div className="flex flex-col items-center gap-2 min-w-0">
                            <AdminTeamLogo team={homeTeam} teamId={homeId} size="lg" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Đội nhà</span>
                            {renderScoreControls('home')}
                          </div>

                          <span className="text-slate-500 font-black text-2xl pt-5 sm:pt-6">-</span>

                          <div className="flex flex-col items-center gap-2 min-w-0">
                            <AdminTeamLogo team={awayTeam} teamId={awayId} size="lg" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Đội khách</span>
                            {renderScoreControls('away')}
                          </div>
                        </div>

                        {(!homeTeam || !awayTeam) && (
                          <div className="text-[11px] text-amber-300 bg-amber-950/30 border border-amber-500/30 rounded-lg px-3 py-2">
                            Trận này chưa xác định đủ 2 đội (chờ kết thúc vòng trước). Danh sách cầu thủ sẽ có sau khi đội được xác định.
                          </div>
                        )}
                      </div>

                      {/* Luân lưu */}
                      {isShootoutEligible ? (
                        <div className="p-3 sm:p-5 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Target className="w-4 h-4 text-amber-400 shrink-0" />
                              <h4 className="font-black text-sm text-amber-300">Luân Lưu 11m (tổng 2 lượt hòa)</h4>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddShootoutRound}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm lượt</span>
                            </button>
                          </div>

                          {(currentMatch.penaltyShootout || []).length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 italic bg-black/40 rounded-xl border border-dashed border-amber-500/20">
                              Chưa có lượt sút nào. Bấm "Thêm lượt" để nhập kết quả luân lưu từng lượt.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {(currentMatch.penaltyShootout || []).map((round, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="p-2.5 rounded-xl bg-black/60 border border-cyan-500/20 space-y-2 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-amber-400">Lượt {round.round}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveShootoutRound(rIdx)}
                                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                                      title="Xóa lượt sút này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {/* Đội nhà */}
                                    <div className="flex items-center gap-2 min-w-0">
                                      <AdminTeamLogo team={homeTeam} teamId={homeId} size="xs" />
                                      <select
                                        value={round.homeShooter || ''}
                                        onChange={e => handleUpdateShootoutRound(rIdx, { homeShooter: e.target.value })}
                                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                                      >
                                        {homeTeam?.players.map(p => (
                                          <option key={p.id} value={p.name}>
                                            {p.name}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateShootoutRound(rIdx, { homeScored: !round.homeScored })}
                                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                                          round.homeScored
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                        }`}
                                      >
                                        {round.homeScored ? 'Vào ⚽' : 'Hỏng ❌'}
                                      </button>
                                    </div>

                                    {/* Đội khách */}
                                    <div className="flex items-center gap-2 min-w-0">
                                      <AdminTeamLogo team={awayTeam} teamId={awayId} size="xs" />
                                      <select
                                        value={round.awayShooter || ''}
                                        onChange={e => handleUpdateShootoutRound(rIdx, { awayShooter: e.target.value })}
                                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                                      >
                                        {awayTeam?.players.map(p => (
                                          <option key={p.id} value={p.name}>
                                            {p.name}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateShootoutRound(rIdx, { awayScored: !round.awayScored })}
                                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                                          round.awayScored
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                        }`}
                                      >
                                        {round.awayScored ? 'Vào ⚽' : 'Hỏng ❌'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              <div className="text-right text-xs font-mono font-bold text-amber-300 pt-1">
                                Tỉ số luân lưu: {currentMatch.homePenalties ?? 0} - {currentMatch.awayPenalties ?? 0}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* THÊM BÀN THẮNG */}
                      <div className="p-3 sm:p-5 rounded-2xl bg-black/60 border border-cyan-500/20 space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          <Flame className="w-4 h-4" />
                          <span>Thêm Bàn Thắng</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] text-slate-400 font-semibold">
                            {isOwnGoal ? 'Đội được cộng bàn (Own Goal)' : 'Đội ghi bàn'}
                          </label>
                          <TeamToggle
                            value={newGoalTeam}
                            onChange={v => {
                              setNewGoalTeam(v);
                              setNewGoalScorer('');
                              setNewGoalAssister('');
                            }}
                            homeTeam={homeTeam}
                            awayTeam={awayTeam}
                            homeId={homeId}
                            awayId={awayId}
                          />
                        </div>

                        {/* Loại bàn thắng */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] text-slate-400 font-semibold">Loại bàn thắng</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {goalTypeButtons.map(b => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setNewGoalType(b.id);
                                  setNewGoalScorer('');
                                  setNewGoalAssister('');
                                }}
                                className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                                  newGoalType === b.id
                                    ? b.active
                                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                {b.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {isOwnGoal && (
                          <div className="text-[11px] text-rose-200 bg-rose-950/30 border border-rose-500/30 rounded-lg px-3 py-2 leading-relaxed">
                            Own Goal <strong>cộng 1 bàn cho đội đang chọn</strong>, không cần chọn cầu thủ và không tính bàn thắng/kiến tạo cho
                            cầu thủ nào. Ngoài trang chủ chỉ hiện chữ <strong>Own Goal</strong>. Xóa được như bàn thắng thường.
                          </div>
                        )}

                        {isPenaltyGoal && (
                          <div className="text-[11px] text-amber-200 bg-amber-950/30 border border-amber-500/30 rounded-lg px-3 py-2 leading-relaxed">
                            Penalty <strong>không có kiến tạo</strong>.
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          {!isOwnGoal && (
                          <div className="min-w-0">
                            <label className="flex items-center gap-1.5 text-slate-400 mb-1 font-semibold">
                              <span>Cầu thủ ghi bàn</span>
                            </label>
                            <select
                              value={newGoalScorer}
                              onChange={e => {
                                setNewGoalScorer(e.target.value);
                                // Người ghi bàn không thể là người kiến tạo cho chính bàn đó
                                if (e.target.value === newGoalAssister) setNewGoalAssister('');
                              }}
                              className={selectCls}
                            >
                              <option value="">-- Chọn cầu thủ --</option>
                              {scorerOptions.map(p => (
                                <option key={p.id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          )}

                          <div className="min-w-0">
                            <label className="block text-slate-400 mb-1 font-semibold">Phút (VD: 15, 45+1)</label>
                            <input
                              type="text"
                              value={newGoalMinute}
                              onChange={e => setNewGoalMinute(e.target.value)}
                              placeholder="15, 45+1, 90+2..."
                              className={`${selectCls} font-mono`}
                            />
                          </div>

                          {canHaveAssist && (
                            <div className="min-w-0">
                              <label className="block text-slate-400 mb-1 font-semibold">Kiến tạo (nếu có)</label>
                              <select
                                value={newGoalAssister}
                                onChange={e => setNewGoalAssister(e.target.value)}
                                className={selectCls}
                              >
                                <option value="">(Không có kiến tạo)</option>
                                {assisterOptions.map(p => (
                                  <option key={p.id} value={p.name}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleAddGoal}
                          className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isOwnGoal ? 'Ghi nhận Own Goal (+1 bàn cho đội đã chọn)' : 'Ghi nhận bàn thắng & cập nhật tỉ số'}</span>
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {renderGoalList('home')}
                          {renderGoalList('away')}
                        </div>
                      </div>

                      {/* THÊM THẺ PHẠT */}
                      <div className="p-3 sm:p-5 rounded-2xl bg-black/60 border border-cyan-500/20 space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                          <Shield className="w-4 h-4" />
                          <span>Thêm Thẻ Phạt</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] text-slate-400 font-semibold">Đội bị phạt</label>
                          <TeamToggle
                            value={newCardTeam}
                            onChange={v => {
                              setNewCardTeam(v);
                              setNewCardPlayer('');
                            }}
                            homeTeam={homeTeam}
                            awayTeam={awayTeam}
                            homeId={homeId}
                            awayId={awayId}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="min-w-0">
                            <label className="block text-slate-400 mb-1 font-semibold">Cầu thủ</label>
                            <select
                              value={newCardPlayer}
                              onChange={e => setNewCardPlayer(e.target.value)}
                              className={selectCls}
                            >
                              <option value="">-- Chọn cầu thủ --</option>
                              {cardTeamPlayers.map(p => (
                                <option key={p.id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="min-w-0">
                            <label className="block text-slate-400 mb-1 font-semibold">Phút</label>
                            <input
                              type="text"
                              value={newCardMinute}
                              onChange={e => setNewCardMinute(e.target.value)}
                              placeholder="35, 90+3..."
                              className={`${selectCls} font-mono`}
                            />
                          </div>

                          <div className="min-w-0">
                            <label className="block text-slate-400 mb-1 font-semibold">Loại thẻ</label>
                            <select
                              value={newCardType}
                              onChange={e => setNewCardType(e.target.value as 'yellow' | 'red')}
                              className={selectCls}
                            >
                              <option value="yellow">Thẻ vàng</option>
                              <option value="red">Thẻ đỏ</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddCard}
                          className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ghi nhận thẻ phạt</span>
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {renderCardList('home')}
                          {renderCardList('away')}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* TAB 2: DANH SÁCH CẦU THỦ */}
            {activeAdminTab === 'teams' && (
              <div className="flex-1 min-h-0 p-3 sm:p-6 overflow-y-auto space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Chọn đội bóng</label>
                  <div className="flex flex-wrap gap-2">
                    {editState.teams.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedRosterTeamId(t.id)}
                        className={`p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                          t.id === selectedRosterTeamId
                            ? 'border-emerald-400 bg-emerald-500/15'
                            : 'border-slate-700 bg-slate-900/60 opacity-60 hover:opacity-100'
                        }`}
                        title={t.name}
                      >
                        <AdminTeamLogo team={t} teamId={t.id} size="md" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 sm:p-5 rounded-2xl bg-black/60 border border-cyan-500/20 space-y-4">
                  <h4 className="text-sm font-black text-white flex items-center gap-2 min-w-0">
                    <AdminTeamLogo team={activeRosterTeam} teamId={selectedRosterTeamId} size="sm" />
                    <span className="truncate">{activeRosterTeam?.name}</span>
                  </h4>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={e => setNewPlayerName(e.target.value)}
                      placeholder="Nhập họ và tên cầu thủ mới..."
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddPlayerToTeam}
                      className="px-3 sm:px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {activeRosterTeam?.players.map(p => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-slate-900/60 border border-cyan-500/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-bold text-white min-w-0 break-words">{p.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePlayerFromTeam(p.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                          title="Xóa cầu thủ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Thay đổi danh sách cầu thủ chỉ được gửi lên máy chủ khi bấm <strong>Lưu & Xuất Bản</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: ĐẶT LẠI */}
            {activeAdminTab === 'reset' && (
              <div
                className="flex-1 min-h-0 p-4 md:p-10 overflow-y-auto"
                style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              >
                <div className="max-w-2xl mx-auto p-5 rounded-3xl bg-amber-950/20 border border-amber-500/40 space-y-4 shadow-xl">
                  <div className="flex items-start gap-3 text-amber-400">
                    <RotateCcw className="w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-base font-black">Đặt lại kết quả về 0 - 0</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Xóa tỉ số tất cả các trận (về <strong>Chưa đấu</strong>), toàn bộ bàn thắng, Own Goal, thẻ phạt, luân lưu
                        và làm trắng bảng xếp hạng.
                      </p>
                      <p className="text-xs text-emerald-400 font-semibold mt-1">
                        ✓ Giữ nguyên danh sách đội và cầu thủ hiện tại.
                      </p>
                    </div>
                  </div>

                  {!showResetConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full py-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Đặt lại kết quả về 0 - 0</span>
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/60 space-y-3">
                      <p className="text-xs text-amber-200 font-bold leading-relaxed">
                        Bạn chắc chắn muốn đặt lại tất cả tỉ số về 0-0? Thao tác này không hoàn tác được.
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={executeResetScoresAndStandings}
                          disabled={isWiping}
                          className="flex-1 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs cursor-pointer hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                          {isWiping ? 'Đang xử lý...' : 'Xác nhận đặt lại'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(false)}
                          className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-800"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
