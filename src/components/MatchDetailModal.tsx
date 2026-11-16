import React from 'react';
import { Match, Team, GoalDetail, CardDetail, PenaltyShootoutRound } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { getCreditedAssister } from '../utils/statsCalculator';
import { X, Clock, ChevronUp, Target, Trophy } from 'lucide-react';

interface MatchDetailModalProps {
  match: Match | null;
  homeTeam: Team | undefined;
  awayTeam: Team | undefined;
  isOpen: boolean;
  onClose: () => void;
  aggregateDisplay?: string | null;
}

interface TimelineEvent {
  id: string;
  minuteRaw: string;
  minuteNum: number;
  side: 'home' | 'away';
  type: 'goal' | 'yellow' | 'red';
  primaryText: string;
  secondaryText?: string;
  isPenalty?: boolean;
  isOwnGoal?: boolean;
}

function parseMinute(minStr?: string): number {
  if (!minStr) return 0;
  const cleaned = minStr.replace("'", '').trim();
  if (cleaned.includes('+')) {
    const parts = cleaned.split('+');
    return (parseFloat(parts[0]) || 0) + (parseFloat(parts[1]) || 0) * 0.1;
  }
  return parseFloat(cleaned) || 0;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  homeTeam,
  awayTeam,
  isOpen,
  onClose,
  aggregateDisplay
}) => {
  if (!isOpen || !match) return null;

  // Build combined events list
  const events: TimelineEvent[] = [];

  // Home Goals
  (match.homeGoals || []).forEach(g => {
    const minNum = parseMinute(g.minute);
    events.push({
      id: g.id || `hg_${Math.random()}`,
      minuteRaw: g.minute ? (g.minute.includes("'") ? g.minute : `${g.minute}'`) : "--'",
      minuteNum: minNum,
      side: 'home',
      type: 'goal',
      primaryText: g.isOwnGoal ? 'Own Goal' : g.scorer,
      secondaryText: getCreditedAssister(g) ? `Kiến tạo: ${getCreditedAssister(g)}` : undefined,
      isPenalty: g.isPenalty,
      isOwnGoal: g.isOwnGoal
    });
  });

  // Away Goals
  (match.awayGoals || []).forEach(g => {
    const minNum = parseMinute(g.minute);
    events.push({
      id: g.id || `ag_${Math.random()}`,
      minuteRaw: g.minute ? (g.minute.includes("'") ? g.minute : `${g.minute}'`) : "--'",
      minuteNum: minNum,
      side: 'away',
      type: 'goal',
      primaryText: g.isOwnGoal ? 'Own Goal' : g.scorer,
      secondaryText: getCreditedAssister(g) ? `Kiến tạo: ${getCreditedAssister(g)}` : undefined,
      isPenalty: g.isPenalty,
      isOwnGoal: g.isOwnGoal
    });
  });

  // Home Cards
  (match.homeCards || []).forEach(c => {
    const minNum = parseMinute(c.minute);
    events.push({
      id: c.id || `hc_${Math.random()}`,
      minuteRaw: c.minute ? (c.minute.includes("'") ? c.minute : `${c.minute}'`) : "--'",
      minuteNum: minNum,
      side: 'home',
      type: c.type,
      primaryText: c.player,
      secondaryText: c.type === 'yellow' ? 'Thẻ vàng' : 'Thẻ đỏ trực tiếp'
    });
  });

  // Away Cards
  (match.awayCards || []).forEach(c => {
    const minNum = parseMinute(c.minute);
    events.push({
      id: c.id || `ac_${Math.random()}`,
      minuteRaw: c.minute ? (c.minute.includes("'") ? c.minute : `${c.minute}'`) : "--'",
      minuteNum: minNum,
      side: 'away',
      type: c.type,
      primaryText: c.player,
      secondaryText: c.type === 'yellow' ? 'Thẻ vàng' : 'Thẻ đỏ trực tiếp'
    });
  });

  // Order: User requested "thời gian chạy từ dưới lên trên (phút 0 ở dưới cùng, phút lớn hơn ở trên)"
  // So descending minuteNum puts larger minutes at index 0 (top) and smallest minutes at the bottom
  events.sort((a, b) => b.minuteNum - a.minuteNum);

  const isCompleted = match.status === 'completed';
  const hasShootout = (match.penaltyShootout || []).length > 0;

  return (
    <div
      onClick={onClose}
      className="modal-lock fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-3xl bg-[#08120c]/95 border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.15)] flex flex-col max-h-[92dvh] overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-emerald-950/60 via-slate-950/90 to-cyan-950/60 border-b border-cyan-500/20 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold uppercase tracking-wider">
              <span>{match.matchCode}</span>
              <span>·</span>
              <span>{match.stageLabel}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              Chi Tiết Trận Đấu
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Banner - Logo ở trên, Tên đội ở dưới, căn giữa */}
        <div className="px-6 py-4 bg-black/50 border-b border-cyan-500/10 shrink-0">
          <div className="grid grid-cols-7 items-center">
            {/* Home Team: Logo ở trên, tên đội ở dưới, căn giữa */}
            <div className="col-span-3 flex items-center justify-center text-center">
              <TeamBadge
                team={homeTeam}
                layout="vertical"
                size="md"
              />
            </div>

            {/* Score in Center */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              {isCompleted ? (
                <div className="flex items-center gap-2 bg-black/80 px-3 py-1 rounded-xl border border-emerald-500/40 shadow-inner">
                  <span className="font-score text-2xl sm:text-3xl font-black text-emerald-400">
                    {match.homeScore}
                  </span>
                  <span className="text-slate-500 font-bold text-xs">-</span>
                  <span className="font-score text-2xl sm:text-3xl font-black text-emerald-400">
                    {match.awayScore}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-black px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-400">
                  VS
                </span>
              )}

              {/* Penalties if any */}
              {match.homePenalties !== undefined && match.homePenalties !== null && (
                <span className="text-[11px] font-mono text-amber-300 mt-1 font-bold whitespace-nowrap px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
                  (Pen: {match.homePenalties} - {match.awayPenalties})
                </span>
              )}

              {/* Aggregate Display if knockout leg 2 */}
              {aggregateDisplay && (
                <span className="text-[10px] font-bold text-cyan-300 mt-0.5 whitespace-nowrap">
                  {aggregateDisplay}
                </span>
              )}
            </div>

            {/* Away Team: Logo ở trên, tên đội ở dưới, căn giữa */}
            <div className="col-span-3 flex items-center justify-center text-center">
              <TeamBadge
                team={awayTeam}
                layout="vertical"
                size="md"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Timeline Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {events.length === 0 && !hasShootout ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                <Clock className="w-7 h-7" />
              </div>
              <p className="text-slate-300 font-bold text-sm">Chưa có sự kiện nào được ghi nhận</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Bàn thắng, kiến tạo, thẻ phạt và loạt sút luân lưu sẽ hiển thị trực quan tại đây.
              </p>
            </div>
          ) : (
            <div className="relative max-w-xl mx-auto py-6">
              {/* Central Vertical Spine */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[3px] bg-gradient-to-t from-emerald-500/30 via-cyan-400/60 to-emerald-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]" />

              {/* SECTION: PENALTY SHOOTOUT (At the very top of timeline) */}
              {hasShootout && (
                <div className="relative mb-8 pb-6 border-b border-dashed border-amber-500/30">
                  <div className="relative flex justify-center mb-6">
                    <div className="px-4 py-1.5 rounded-full bg-slate-950 border border-amber-400/60 text-xs font-black uppercase tracking-wider text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] z-10 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-amber-400" />
                      <span>Loạt Sút Luân Lưu 11m (Pen: {match.homePenalties} - {match.awayPenalties})</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* YÊU CẦU: Loạt sút luân lưu thì hiển thị loạt sút thứ 5 trên cùng timeline */}
                    {[...(match.penaltyShootout || [])]
                      .sort((a, b) => b.round - a.round)
                      .map((round, rIdx) => (
                      <div key={round.round || rIdx} className="relative flex items-center">
                        {/* Home Kicker (Left) */}
                        <div className="w-1/2 pr-6 flex justify-end">
                          <div className="relative group max-w-[220px] text-right">
                            <div className="absolute top-1/2 -right-6 w-6 h-[2px] bg-amber-400/80 -translate-y-1/2" />
                            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900/90 border border-amber-500/40 shadow-md">
                              <div className="font-bold text-xs text-white truncate">{round.homeShooter || 'Cầu thủ'}</div>
                              <div className="text-[11px] font-black mt-0.5">
                                {round.homeScored ? (
                                  <span className="text-emerald-400">⚽ Vào</span>
                                ) : (
                                  <span className="text-rose-400">❌ Không vào</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Central Round Number Badge */}
                        <div className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center text-[11px] font-black text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-mono">
                            #{round.round}
                          </div>
                        </div>

                        {/* Away Kicker (Right) */}
                        <div className="w-1/2 pl-6 flex justify-start">
                          <div className="relative group max-w-[220px] text-left">
                            <div className="absolute top-1/2 -left-6 w-6 h-[2px] bg-amber-400/80 -translate-y-1/2" />
                            <div className="p-2.5 rounded-2xl bg-gradient-to-l from-amber-950/40 to-slate-900/90 border border-amber-500/40 shadow-md">
                              <div className="font-bold text-xs text-white truncate">{round.awayShooter || 'Cầu thủ'}</div>
                              <div className="text-[11px] font-black mt-0.5">
                                {round.awayScored ? (
                                  <span className="text-emerald-400">⚽ Vào</span>
                                ) : (
                                  <span className="text-rose-400">❌ Không vào</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Time / Top Marker for Regular/Extra time */}
              <div className="relative flex justify-center mb-6">
                <div className="px-3.5 py-1 rounded-full bg-slate-950 border border-cyan-400/50 text-[11px] font-black uppercase tracking-wider text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)] z-10">
                  🏁 Hết Giờ Thi Đấu (Bù giờ / Hiệp phụ)
                </div>
              </div>

              {/* Events List (Sorted descending, so bottom is earliest minute) */}
              <div className="space-y-8">
                {events.map((ev) => {
                  const isHome = ev.side === 'home';

                  return (
                    <div key={ev.id} className="relative flex items-center">
                      
                      {/* Left Side (Home Team Branch) */}
                      <div className="w-1/2 pr-6 flex justify-end">
                        {isHome ? (
                          <div className="relative group max-w-[240px] text-right">
                            {/* Branch connector line */}
                            <div className="absolute top-1/2 -right-6 w-6 h-[2px] bg-emerald-400/80 -translate-y-1/2 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />

                            {/* Card Box */}
                            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900/90 border border-emerald-500/40 shadow-lg shadow-black/40 hover:border-emerald-400 transition-all">
                              <div className="flex items-center justify-end gap-1.5 font-black text-sm text-white">
                                <span>{ev.primaryText}</span>
                                {ev.type === 'goal' && <span className="text-emerald-400">⚽</span>}
                                {ev.type === 'yellow' && <span className="text-amber-400">🟨</span>}
                                {ev.type === 'red' && <span className="text-rose-500">🟥</span>}
                              </div>

                              {ev.isPenalty && (
                                <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                                  Penalty
                                </div>
                              )}

                              {ev.secondaryText && (
                                <div className="mt-1 text-[11px] text-slate-300 font-medium">
                                  {ev.secondaryText.startsWith('Kiến tạo') ? (
                                    <span className="flex items-center justify-end gap-1 text-teal-300">
                                      <span>{ev.secondaryText}</span>
                                      <span>🅰️</span>
                                    </span>
                                  ) : (
                                    <span className="text-amber-300/90">{ev.secondaryText}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Central Minute Badge on Spine */}
                      <div className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                        <div className="px-2.5 py-1 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center text-xs font-black text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.5)] font-mono whitespace-nowrap">
                          {ev.minuteRaw}
                        </div>
                      </div>

                      {/* Right Side (Away Team Branch) */}
                      <div className="w-1/2 pl-6 flex justify-start">
                        {!isHome ? (
                          <div className="relative group max-w-[240px] text-left">
                            {/* Branch connector line */}
                            <div className="absolute top-1/2 -left-6 w-6 h-[2px] bg-cyan-400/80 -translate-y-1/2 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />

                            {/* Card Box */}
                            <div className="p-3 rounded-2xl bg-gradient-to-l from-cyan-950/40 to-slate-900/90 border border-cyan-500/40 shadow-lg shadow-black/40 hover:border-cyan-400 transition-all">
                              <div className="flex items-center justify-start gap-1.5 font-black text-sm text-white">
                                {ev.type === 'goal' && <span className="text-emerald-400">⚽</span>}
                                {ev.type === 'yellow' && <span className="text-amber-400">🟨</span>}
                                {ev.type === 'red' && <span className="text-rose-500">🟥</span>}
                                <span>{ev.primaryText}</span>
                              </div>

                              {ev.isPenalty && (
                                <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                                  Penalty
                                </div>
                              )}

                              {ev.secondaryText && (
                                <div className="mt-1 text-[11px] text-slate-300 font-medium">
                                  {ev.secondaryText.startsWith('Kiến tạo') ? (
                                    <span className="flex items-center justify-start gap-1 text-cyan-300">
                                      <span>🅰️</span>
                                      <span>{ev.secondaryText}</span>
                                    </span>
                                  ) : (
                                    <span className="text-amber-300/90">{ev.secondaryText}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Bottom Marker: Kickoff (0') */}
              <div className="relative flex justify-center mt-6">
                <div className="px-3.5 py-1 rounded-full bg-slate-950 border border-emerald-400/50 text-[11px] font-black uppercase tracking-wider text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)] z-10">
                  ⚽ Bắt Đầu Trận Đấu (0')
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
