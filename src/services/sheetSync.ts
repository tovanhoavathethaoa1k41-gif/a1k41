import { Team, Match, Podium, GoalDetail, CardDetail, PenaltyShootoutRound, GoldenBallCandidate } from '../types/tournament';
import { INITIAL_TEAMS, INITIAL_MATCHES, INITIAL_PODIUM } from '../data/initialData';
import { recalculateAllStats, sortMatchesByCanonicalOrder } from '../utils/statsCalculator';

export interface TournamentState {
  teams: Team[];
  matches: Match[];
  podium: Podium;
  goldenBall?: GoldenBallCandidate[]; // danh sách đề cử Quả Bóng Vàng + số phiếu
  lastUpdated?: string;
}

const STORAGE_KEY = 'a1_winter_cup_tournament_state_v10';
const ADMIN_TOKEN_KEY = 'a1_winter_cup_admin_token';

/**
 * Creates a completely blank tournament state (All scores null, 0 stats, unplayed)
 */
export function createBlankTournamentState(): TournamentState {
  const freshTeams = JSON.parse(JSON.stringify(INITIAL_TEAMS)) as Team[];
  const freshMatches = sortMatchesByCanonicalOrder(JSON.parse(JSON.stringify(INITIAL_MATCHES))) as Match[];

  freshMatches.forEach(m => {
    m.homeScore = null;
    m.awayScore = null;
    m.homePenalties = null;
    m.awayPenalties = null;
    m.penaltyShootout = [];
    m.status = 'upcoming';
    m.statusText = 'Chưa đấu';
    m.homeGoals = [];
    m.awayGoals = [];
    m.homeCards = [];
    m.awayCards = [];
  });

  const blankPodium: Podium = {
    champion: 'Chờ Chung kết',
    runnerUp: 'Chờ Chung kết',
    thirdPlace: 'Chờ Tranh Hạng Ba',
    fourthPlace: 'Chờ Tranh Hạng Ba',
    fifthPlace: []
  };

  recalculateAllStats(freshTeams, freshMatches, blankPodium);

  return {
    teams: freshTeams,
    matches: freshMatches,
    podium: blankPodium
  };
}

/**
 * Sự kiện phát ra khi phiên đăng nhập admin hết hạn (để AdminModal hiện lại form đăng nhập)
 */
export const AUTH_EXPIRED_EVENT = 'a1k41-admin-auth-expired';

// ---- Theo dõi việc lưu lên server, để tránh polling ghi đè dữ liệu admin vừa sửa ----
const SYNC_GRACE_MS = 6000; // CDN có thể cache GET tối đa ~3s, nên đợi thêm một chút sau khi lưu
let pendingState: TournamentState | null = null;
let activeFlush: Promise<boolean> | null = null;
let lastSaveFinishedAt = 0;

/**
 * True nếu đang có thay đổi chưa gửi xong / vừa mới gửi xong -> KHÔNG nên nhận dữ liệu từ server lúc này
 */
export function isServerSaveBusy(): boolean {
  return pendingState !== null || activeFlush !== null || Date.now() - lastSaveFinishedAt < SYNC_GRACE_MS;
}

/**
 * Fetches state from the server database (Upstash Redis qua Vercel Function)
 */
export async function fetchServerTournamentState(): Promise<TournamentState | null> {
  if (isServerSaveBusy()) return null;
  try {
    const res = await fetch('/api/tournament-state', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      // Có thể admin vừa bấm lưu trong lúc đang chờ phản hồi -> bỏ kết quả cũ này
      if (isServerSaveBusy()) return null;

      // Server chưa có dữ liệu nào (mới deploy, admin chưa lưu lần nào) -> hiển thị giải trắng, KHÔNG hiện tỉ số mẫu
      if (data.success && !data.hasState) {
        return createBlankTournamentState();
      }

      if (data.success && data.hasState && data.state) {
        if (Array.isArray(data.state.matches)) {
          data.state.matches = sortMatchesByCanonicalOrder(data.state.matches);
        }
        if (Array.isArray(data.state.teams)) {
          data.state.teams.forEach((t: Team) => {
            if (t.id === 'dat_bao_dnc') {
              t.name = 'DAT BAO DNC';
            }
          });
        }
        recalculateAllStats(data.state.teams, data.state.matches, data.state.podium);
        saveTournamentState(data.state);
        return data.state;
      }
    }
  } catch (err) {
    console.warn('[Storage] Could not fetch server state:', err);
  }
  return null;
}

async function postStateToServer(state: TournamentState): Promise<boolean> {
  const adminToken = getAdminToken();
  if (!adminToken) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    return false;
  }
  try {
    const res = await fetch('/api/admin/save-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: adminToken, state })
    });
    if (res.status === 401 || res.status === 403) {
      logoutAdmin();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      return false;
    }
    if (res.ok) {
      const json = await res.json();
      return !!json.success;
    }
    console.error('[Storage] Server refused save:', res.status);
  } catch (err) {
    console.error('[Storage] Error saving state to server:', err);
  }
  return false;
}

async function flushSaveQueue(): Promise<boolean> {
  let ok = true;
  try {
    // Luôn gửi bản MỚI NHẤT; các thay đổi dồn lại trong lúc đang gửi sẽ được gộp thành 1 lần gửi tiếp theo.
    // Nhờ vậy các request không bao giờ chạy song song và ghi đè nhau sai thứ tự.
    while (pendingState) {
      const next = pendingState;
      pendingState = null;
      ok = await postStateToServer(next);
    }
  } finally {
    activeFlush = null;
    lastSaveFinishedAt = Date.now();
  }
  return ok;
}

/**
 * Lưu state lên server (xếp hàng + gộp). Trả về true nếu bản mới nhất đã lưu thành công.
 * Tham số token giữ lại cho tương thích, token thật được lấy từ lúc đăng nhập.
 */
export function saveServerTournamentState(state: TournamentState, _token?: string): Promise<boolean> {
  pendingState = state;
  if (!activeFlush) {
    activeFlush = flushSaveQueue();
  }
  return activeFlush;
}

/**
 * Kiểm tra "sức khỏe" của backend trên Vercel (gọi /api/health).
 * Dùng để báo lỗi rõ ràng khi chưa đặt ADMIN_PASSWORD hoặc chưa kết nối Redis,
 * thay vì để admin bấm lưu mà không biết vì sao các máy khác không thấy.
 */
export interface ServerHealth {
  ok: boolean;
  problems: string[];
}

export async function fetchServerHealth(): Promise<ServerHealth> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return {
        ok: false,
        problems: [
          'Không gọi được API của máy chủ (/api/health). Có thể thư mục "api" chưa được deploy lên Vercel, hoặc dự án đang bị bật Deployment Protection.'
        ]
      };
    }
    const data = await res.json();
    const problems: string[] = [];
    if (data.local) {
      // Chạy local (npm run dev): lưu vào file, không cần Redis
      return { ok: true, problems };
    }
    if (!data.adminPasswordSet) {
      problems.push('Chưa đặt biến môi trường ADMIN_PASSWORD trên Vercel (hoặc đặt xong nhưng chưa Redeploy).');
    }
    if (!data.redisConfigured) {
      problems.push('Chưa kết nối database Upstash Redis (thiếu KV_REST_API_URL / KV_REST_API_TOKEN).');
    } else if (!data.redisReachable) {
      problems.push('Đã có biến Redis nhưng không kết nối được tới database. Kiểm tra lại URL / Token.');
    }
    return { ok: problems.length === 0, problems };
  } catch {
    return { ok: false, problems: ['Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'] };
  }
}

/**
 * Admin login: mật khẩu được kiểm tra ở SERVER (biến môi trường ADMIN_PASSWORD), không còn nằm trong code web.
 */
export async function loginAdmin(password: string): Promise<{ success: boolean; message?: string; token?: string }> {
  const trimmed = (password || '').trim();
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: trimmed })
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success && json.token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, json.token);
      return { success: true, token: json.token, message: json.message || 'Đăng nhập Quản trị viên thành công!' };
    }
    return { success: false, message: json.error || 'Mật khẩu quản trị viên không chính xác.' };
  } catch (err) {
    return { success: false, message: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' };
  }
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function logoutAdmin() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

/**
 * Đặt lại tỷ số và bảng xếp hạng về 0:
 * - Chỉ xóa tỷ số, bàn thắng, thẻ phạt, loạt luân lưu
 * - Đưa bảng xếp hạng về trắng (0 trận, 0 điểm)
 * - GIỮ NGUYÊN danh sách đội bóng và cầu thủ hiện tại (KHÔNG khôi phục dữ liệu mẫu ban đầu)
 */
export async function resetTournamentScoresAndStandings(currentState?: TournamentState): Promise<TournamentState> {
  const activeState = currentState || getStoredState();
  const teams = JSON.parse(JSON.stringify(activeState.teams)) as Team[];
  const matches = sortMatchesByCanonicalOrder(JSON.parse(JSON.stringify(activeState.matches))) as Match[];

  // Reset toàn bộ kết quả trận đấu về 'Chưa đấu'
  matches.forEach(m => {
    m.homeScore = null;
    m.awayScore = null;
    m.homePenalties = null;
    m.awayPenalties = null;
    m.penaltyShootout = [];
    m.status = 'upcoming';
    m.statusText = 'Chưa đấu';
    m.homeGoals = [];
    m.awayGoals = [];
    m.homeCards = [];
    m.awayCards = [];
  });

  // Reset toàn bộ chỉ số đội bóng về 0
  teams.forEach(t => {
    t.stats = {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      totalMatchesAll: 0,
      totalGoalsFor: 0,
      totalGoalsAgainst: 0,
      avgGoalsFor: 0,
      avgGoalsAgainst: 0
    };
    if (Array.isArray(t.players)) {
      t.players.forEach(p => {
        p.goals = 0;
        p.assists = 0;
        p.yellowCards = 0;
        p.redCards = 0;
        p.matchesPlayed = 0;
        p.breakdown = {
          goals: { ovr: 0, knockout: 0, group: 0, penalty: 0, nonPenalty: 0 },
          assists: { ovr: 0, knockout: 0, group: 0 },
          yellowCards: { ovr: 0, knockout: 0, group: 0 },
          redCards: { ovr: 0, knockout: 0, group: 0 },
          ga: { ovr: 0, knockout: 0, group: 0 }
        };
      });
    }
  });

  const resetPodium: Podium = {
    champion: 'Chờ Chung kết',
    runnerUp: 'Chờ Chung kết',
    thirdPlace: 'Chờ Tranh Hạng Ba',
    fourthPlace: 'Chờ Tranh Hạng Ba',
    fifthPlace: []
  };

  recalculateAllStats(teams, matches, resetPodium);

  const resetState: TournamentState = {
    teams,
    matches,
    podium: resetPodium,
    goldenBall: activeState.goldenBall,
    lastUpdated: new Date().toISOString()
  };

  saveTournamentState(resetState);

  const saved = await saveServerTournamentState(resetState);
  if (!saved) {
    throw new Error('Đã đặt lại trên máy này nhưng KHÔNG lưu được lên máy chủ — các máy khác chưa thấy. Hãy đăng nhập lại và thử lại.');
  }

  return resetState;
}

/**
 * Xóa HẾT TẤT CẢ DỮ LIỆU: Đưa toàn bộ giải đấu về số 0 (Tất cả trận Chưa đấu, tỉ số null, điểm số 0)
 */
export async function wipeAllTournamentData(currentState?: TournamentState): Promise<TournamentState> {
  return resetTournamentScoresAndStandings(currentState);
}

/**
 * Khôi phục về dữ liệu mẫu ban đầu của giải
 */
export async function resetToDefaultData(): Promise<TournamentState> {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.clear();

  const freshTeams = JSON.parse(JSON.stringify(INITIAL_TEAMS));
  const freshMatches = sortMatchesByCanonicalOrder(JSON.parse(JSON.stringify(INITIAL_MATCHES)));
  const freshPodium = JSON.parse(JSON.stringify(INITIAL_PODIUM));
  recalculateAllStats(freshTeams, freshMatches, freshPodium);

  const freshState: TournamentState = {
    teams: freshTeams,
    matches: freshMatches,
    podium: freshPodium
  };

  saveTournamentState(freshState);
  const saved = await saveServerTournamentState(freshState);
  if (!saved) {
    throw new Error('Không lưu được dữ liệu mẫu lên máy chủ. Hãy đăng nhập lại và thử lại.');
  }
  return freshState;
}

export function getStoredState(): TournamentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.teams) && Array.isArray(parsed.matches) && parsed.teams.length >= 6) {
        // Sanitize matches
        parsed.matches.forEach((m: any) => {
          if (!Array.isArray(m.homeGoals)) m.homeGoals = [];
          if (!Array.isArray(m.awayGoals)) m.awayGoals = [];
          if (!Array.isArray(m.homeCards)) m.homeCards = [];
          if (!Array.isArray(m.awayCards)) m.awayCards = [];
          if (!Array.isArray(m.penaltyShootout)) m.penaltyShootout = [];
        });

        // Always ensure canonical order
        parsed.matches = sortMatchesByCanonicalOrder(parsed.matches);

        // Sanitize teams and ensure DAT BAO DNC name
        parsed.teams.forEach((t: any) => {
          if (t.id === 'dat_bao_dnc') {
            t.name = 'DAT BAO DNC';
          }
          if (!Array.isArray(t.players)) {
            const initial = INITIAL_TEAMS.find(it => it.id === t.id);
            t.players = initial ? initial.players : [];
          }
          if (!t.stats) {
            t.stats = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
          }
        });

        if (!parsed.podium) {
          parsed.podium = JSON.parse(JSON.stringify(INITIAL_PODIUM));
        }

        recalculateAllStats(parsed.teams, parsed.matches, parsed.podium);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored tournament state, resetting to initial:', err);
  }

  // Người xem mới (chưa có dữ liệu lưu trong máy): bắt đầu bằng giải TRẮNG, không phải tỉ số mẫu,
  // để không bao giờ hiện tỉ số giả trong lúc đang tải dữ liệu thật từ server.
  return createBlankTournamentState();
}

export function saveTournamentState(state: TournamentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save tournament state:', err);
  }
}
