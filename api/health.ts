/**
 * GET /api/health
 * Trang chẩn đoán: cho biết backend trên Vercel đã cấu hình đủ chưa.
 * KHÔNG trả về bất kỳ giá trị bí mật nào (chỉ true/false).
 *
 * Mở thử: https://<ten-mien-cua-ban>/api/health
 *   { "adminPasswordSet": true, "redisConfigured": true, "redisReachable": true }  -> mọi thứ ổn
 *
 * File này cố ý độc lập (không import file khác trong /api) — xem ghi chú ở tournament-state.ts.
 */

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const adminPasswordSet = !!(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim());
    const cfg = redisConfig();

    let redisReachable = false;
    if (cfg) {
      try {
        const res = await fetch(cfg.url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(['PING'])
        });
        const json: any = await res.json().catch(() => ({}));
        redisReachable = res.ok && !json.error;
      } catch {
        redisReachable = false;
      }
    }

    return jsonResponse({
      success: true,
      adminPasswordSet,
      redisConfigured: !!cfg,
      redisReachable
    });
  }
};
