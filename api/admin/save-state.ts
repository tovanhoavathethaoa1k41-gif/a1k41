/**
 * POST /api/admin/save-state   body: { token, state }
 * Chỉ admin (có token hợp lệ từ /api/admin/login) mới ghi được dữ liệu. Dữ liệu lưu vào Upstash Redis,
 * nên mọi máy khác gọi GET /api/tournament-state sẽ thấy ngay kết quả mới.
 *
 * File này cố ý độc lập (không import file khác trong /api) — xem ghi chú ở tournament-state.ts.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const STATE_KEY = 'a1k41_wintercup:tournament_state';
const MAX_BODY_BYTES = 1_000_000; // Upstash giới hạn ~1MB / request

function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function verifyToken(token: unknown, secret: string): boolean {
  if (typeof token !== 'string') return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = createHmac('sha256', secret).update(`admin:${exp}`).digest('hex');
  return safeEqual(sig, expected);
}

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

async function redisCommand(cfg: { url: string; token: string }, command: (string | number)[]) {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(json.error || `Redis HTTP ${res.status}`);
  return json.result;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    const cfg = redisConfig();
    if (!adminPassword || !cfg) {
      return jsonResponse(
        { success: false, error: 'Server chưa cấu hình ADMIN_PASSWORD hoặc database Redis.' },
        500
      );
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return jsonResponse({ success: false, error: 'Dữ liệu quá lớn.' }, 413);
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ success: false, error: 'Dữ liệu gửi lên không hợp lệ.' }, 400);
    }

    if (!verifyToken(body?.token, adminPassword.trim())) {
      return jsonResponse(
        { success: false, error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' },
        401
      );
    }

    const state = body?.state;
    if (!state || !Array.isArray(state.teams) || !Array.isArray(state.matches)) {
      return jsonResponse({ success: false, error: 'Dữ liệu giải đấu không hợp lệ.' }, 400);
    }

    state.lastUpdated = new Date().toISOString();

    try {
      await redisCommand(cfg, ['SET', STATE_KEY, JSON.stringify(state)]);
      return jsonResponse({
        success: true,
        message: 'Đã lưu và đồng bộ dữ liệu giải đấu thành công!',
        state
      });
    } catch (err) {
      console.error('[save-state] Redis write error:', err);
      return jsonResponse({ success: false, error: 'Không ghi được dữ liệu vào database.' }, 502);
    }
  }
};
