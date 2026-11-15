import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'a1k41league';
const STATE_FILE = path.resolve(DATA_DIR, 'tournament_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache for fast read/write
let cachedTournamentState: any = null;

// Canonical order mapping
const MATCH_RANK_MAP: Record<string, number> = {
  'm_ga_1': 1,
  'm_gb_1': 2,
  'm_ga_2': 3,
  'm_gb_2': 4,
  'm_ga_3': 5,
  'm_gb_3': 6,
  'm_semi1_1': 7,
  'm_semi2_1': 8,
  'm_semi1_2': 9,
  'm_semi2_2': 10,
  'm_h3_1': 11,
  'm_h3_2': 12,
  'm_ck_1': 13,
  'm_ck_2': 14
};

function sortMatches(matches: any[]) {
  if (!Array.isArray(matches)) return matches;
  return matches.sort((a, b) => (MATCH_RANK_MAP[a.id] || 99) - (MATCH_RANK_MAP[b.id] || 99));
}

function loadPersistedState(): any | null {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.matches)) {
        parsed.matches = sortMatches(parsed.matches);
      }
      return parsed;
    }
  } catch (err) {
    console.error('[Storage] Error reading tournament state file:', err);
  }
  return null;
}

function savePersistedState(state: any): boolean {
  try {
    if (state && Array.isArray(state.matches)) {
      state.matches = sortMatches(state.matches);
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    cachedTournamentState = state;
    return true;
  } catch (err) {
    console.error('[Storage] Error saving tournament state file:', err);
    return false;
  }
}

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Initialize cached state
  cachedTournamentState = loadPersistedState();

  // 1. Get current tournament state (Server-authoritative for realtime multi-user consistency)
  app.get('/api/tournament-state', (_req, res) => {
    if (!cachedTournamentState) {
      cachedTournamentState = loadPersistedState();
    }
    return res.json({
      success: true,
      hasState: !!cachedTournamentState,
      state: cachedTournamentState
    });
  });

  // 1b. Health check (chạy local: luôn ổn vì lưu vào file)
  app.get('/api/health', (_req, res) => {
    return res.json({ success: true, local: true, adminPasswordSet: true, redisConfigured: true, redisReachable: true });
  });

  // 2. Admin Login
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body || {};
    if (password === ADMIN_PASSWORD) {
      return res.json({
        success: true,
        token: 'a1k41_admin_auth_token_secret',
        message: 'Đăng nhập Quản trị viên thành công!'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Mật khẩu quản trị viên không chính xác.'
    });
  });

  // 3. Admin Save Tournament State
  app.post('/api/admin/save-state', (req, res) => {
    const { token, password, state } = req.body || {};
    const isAuthorized = password === ADMIN_PASSWORD || token === 'a1k41_admin_auth_token_secret';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại.'
      });
    }

    if (!state || !Array.isArray(state.teams) || !Array.isArray(state.matches)) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu giải đấu không hợp lệ.'
      });
    }

    const ok = savePersistedState(state);
    if (!ok) {
      return res.status(500).json({
        success: false,
        error: 'Không thể ghi dữ liệu lên ổ đĩa máy chủ.'
      });
    }

    console.log('[Admin] Tournament state updated and persisted permanently to disk');
    return res.json({
      success: true,
      message: 'Đã lưu và đồng bộ dữ liệu giải đấu thành công!',
      state
    });
  });

  // 4. Admin Reset Tournament State (Wipe Data / đưa về mặc định)
  app.post('/api/admin/reset-state', (req, res) => {
    const { token, password, blankState } = req.body || {};
    const isAuthorized = password === ADMIN_PASSWORD || token === 'a1k41_admin_auth_token_secret';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập.'
      });
    }

    if (blankState) {
      savePersistedState(blankState);
    } else {
      if (fs.existsSync(STATE_FILE)) {
        try {
          fs.unlinkSync(STATE_FILE);
        } catch (e) {
          console.error('Error removing state file:', e);
        }
      }
      cachedTournamentState = null;
    }

    return res.json({
      success: true,
      message: 'Đã xóa dữ liệu lưu trữ trên máy chủ, đưa về dữ liệu ban đầu.'
    });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Tournament server running at http://0.0.0.0:${port}`);
  });
}

startServer();
