/**
 * GET /api/tournament-state
 * Trả về dữ liệu giải đấu hiện tại (ai cũng xem được). Dữ liệu nằm trong Upstash Redis.
 *
 * Lưu ý: file này CỐ Ý viết độc lập (không import từ file khác trong /api)
 * vì Vercel đóng gói từng function riêng, import chéo file dễ gây lỗi lúc chạy.
 */

const STATE_KEY = 'a1k41_wintercup:tournament_state';

function redisConfig() {
  // Vercel Marketplace (Upstash) tự thêm KV_REST_API_*; tự tạo trên Upstash thì dùng UPSTASH_REDIS_REST_*
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

function jsonResponse(body: unknown, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl }
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const cfg = redisConfig();
    if (!cfg) {
      return jsonResponse(
        { success: false, error: 'Chưa kết nối database Redis (thiếu KV_REST_API_URL / KV_REST_API_TOKEN).' },
        500
      );
    }

    try {
      const raw = await redisCommand(cfg, ['GET', STATE_KEY]);
      const state = raw ? JSON.parse(raw) : null;
      // Cache 3 giây ở CDN của Vercel: hàng trăm người xem cùng lúc chỉ tốn ~1 lượt gọi Redis / 3 giây,
      // mà vẫn đủ "trực tiếp". Trình duyệt thì không cache (max-age=0).
      return jsonResponse(
        { success: true, hasState: !!state, state },
        200,
        'public, max-age=0, s-maxage=3'
      );
    } catch (err) {
      console.error('[tournament-state] Redis read error:', err);
      return jsonResponse({ success: false, error: 'Không đọc được dữ liệu từ database.' }, 502);
    }
  }
};
