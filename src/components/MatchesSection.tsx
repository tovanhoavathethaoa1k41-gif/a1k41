import React, { useState } from 'react';
import { Match, Team, GoalDetail } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { MatchDetailModal } from './MatchDetailModal';
import { getLeg2AggregateDisplay, sortMatchesByCanonicalOrder, getCreditedAssister } from '../utils/statsCalculator';
import { Filter, Zap } from 'lucide-react';

interface MatchesSectionProps {
  matches: Match[];
  teams: Team[];
}

export const MatchesSection: React.FC<MatchesSectionProps> = ({ matches, teams }) => {
  const [filter, setFilter] = useState<string>('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const getTeam = (teamId: string) => teams.find(t => t.id === teamId);

  const filterOptions = [
    { id: 'all', label: 'Tất Cả' },
    { id: 'group_a', label: 'Bảng A' },
    { id: 'group_b', label: 'Bảng B' },
    { id: 'semi', label: 'Bán Kết' },
    { id: 'third_place', label: 'Tranh Hạng 3' },
    { id: 'final', label: 'Chung Kết' }
  ];

  // Canonical sort order
  const filteredMatches = sortMatchesByCanonicalOrder(
    matches.filter(m => {
      if (filter === 'all') return true;
      return m.stage === filter;
    })
  );

  const getPlaceholderLabel = (id: string) => {
    if (id === 'nhat_a') return 'Nhất Bảng A';
    if (id === 'nhi_a') return 'Nhì Bảng A';
    if (id === 'nhat_b') return 'Nhất Bảng B';
    if (id === 'nhi_b') return 'Nhì Bảng B';
    if (id === 'thang_bk1') return 'Thắng Bán Kết 1';
    if (id === 'thang_bk2') return 'Thắng Bán Kết 2';
    if (id === 'thua_bk1') return 'Thua Bán Kết 1';
    if (id === 'thua_bk2') return 'Thua Bán Kết 2';
    return 'Chờ kết quả';
  };

  // Helper to find Leg 1 for an aggregate pair
  const getLeg1ForLeg2 = (match: Match): Match | undefined => {
    if (match.leg !== 2 || !match.pairId) return undefined;
    return matches.find(m => m.pairId === match.pairId && m.leg === 1);
  };

  const selectedHomeTeam = selectedMatch ? getTeam(selectedMatch.homeTeamId) : undefined;
  const selectedAwayTeam = selectedMatch ? getTeam(selectedMatch.awayTeamId) : undefined;
  const selectedLeg1 = selectedMatch ? getLeg1ForLeg2(selectedMatch) : undefined;
  const selectedAggregateDisplay = selectedMatch && selectedMatch.leg === 2 ? getLeg2AggregateDisplay(selectedLeg1, selectedMatch) : null;

  return (
    <section className="space-y-6">
      {/* Section Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-cyan-300" />
            <span>Lịch Thi Đấu & Tỉ Số Trực Tuyến</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
            Các Trận Đấu
          </h2>
        </div>

        {/* Filter Bar with smooth scroll */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-cyan-500/20 overflow-x-auto scrollbar-none shadow-md">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 shrink-0" />
          {filterOptions.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === opt.id
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Match Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredMatches.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-dashed border-cyan-500/20">
            Không có trận đấu nào trong mục này.
          </div>
        ) : (
          filteredMatches.map(match => {
            const homeTeam = getTeam(match.homeTeamId);
            const awayTeam = getTeam(match.awayTeamId);
            const isCompleted = match.status === 'completed';
            const leg1 = getLeg1ForLeg2(match);
            const leg2AggregateDisplay = match.leg === 2 ? getLeg2AggregateDisplay(leg1, match) : null;

            return (
              <div
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className="group relative rounded-2xl bg-gradient-to-b from-[#0b1611]/90 to-[#070e0a]/90 border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300 shadow-xl shadow-black/40 overflow-hidden cursor-pointer"
              >
                {/* Top Info Header */}
                <div className="px-5 py-2.5 bg-black/50 border-b border-cyan-500/10 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-cyan-300 tracking-wider">
                      {match.matchCode}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{match.stageLabel}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {match.statusText}
                    </span>
                  </div>
                </div>

                {/* Scoreboard Block - Logo ở trên, Tên đội ở dưới, căn giữa */}
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-12 items-center gap-2 sm:gap-4">
                    
                    {/* Home Team: Logo ở trên, tên đội ở dưới, căn giữa */}
                    <div className="col-span-5 flex items-center justify-center">
                      <TeamBadge
                        team={homeTeam}
                        placeholderName={getPlaceholderLabel(match.homeTeamId)}
                        layout="vertical"
                        size="md"
                      />
                    </div>

                    {/* Central Axis: Tỉ số hoặc VS + Nút xem chi tiết làm trục phân cách cân đối */}
                    <div className="col-span-2 flex flex-col items-center justify-center">
                      {isCompleted ? (
                        <div className="flex items-center gap-2 bg-black/80 px-3.5 py-1.5 rounded-xl border border-emerald-500/40 shadow-inner">
                          <span className="font-score text-2xl sm:text-4xl font-black text-emerald-400 text-glow">
                            {match.homeScore}
                          </span>
                          <span className="text-xs font-bold text-slate-500">-</span>
                          <span className="font-score text-2xl sm:text-4xl font-black text-emerald-400 text-glow">
                            {match.awayScore}
                          </span>
                        </div>
                      ) : (
                        <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 font-bold text-xs sm:text-sm tracking-widest">
                          VS
                        </div>
                      )}

                      {/* Loạt sút luân lưu (Penalty): Chỉ hiển thị tỷ số tóm tắt gọn gàng, TUYỆT ĐỐI KHÔNG hiển thị chi tiết người sút */}
                      {match.homePenalties !== undefined && match.homePenalties !== null && (
                        <span className="text-[11px] text-amber-300 mt-1 font-mono font-bold whitespace-nowrap px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 shadow-sm">
                          (Pen: {match.homePenalties} - {match.awayPenalties})
                        </span>
                      )}

                      {/* Trận lượt về: Tổng 2 lượt (Aggregate) nằm ngay bên dưới tỉ số */}
                      {leg2AggregateDisplay && (
                        <div className="mt-1 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-[9px] sm:text-[10px] font-bold text-cyan-300 whitespace-nowrap">
                          {leg2AggregateDisplay}
                        </div>
                      )}
                    </div>

                    {/* Away Team: Logo ở trên, tên đội ở dưới, căn giữa */}
                    <div className="col-span-5 flex items-center justify-center">
                      <TeamBadge
                        team={awayTeam}
                        placeholderName={getPlaceholderLabel(match.awayTeamId)}
                        layout="vertical"
                        size="md"
                      />
                    </div>
                  </div>

                  {/* Goal Scorers & Assists Breakdown - Perfectly Symmetric Left & Right */}
                  <div className="mt-5 pt-4 border-t border-cyan-500/10 grid grid-cols-2 gap-4 text-xs">
                    
                    {/* Home Team Events (Left-aligned) */}
                    <div className="space-y-2 text-left">
                      <div className="font-bold text-emerald-400 text-[11px] uppercase tracking-wide border-b border-cyan-500/10 pb-1">
                        {homeTeam?.name || 'Đội nhà'}
                      </div>
                      {(match.homeGoals || []).length === 0 ? (
                        <div className="text-slate-500 italic text-[11px]">
                          {isCompleted ? 'Không có bàn thắng' : 'Chờ thi đấu'}
                        </div>
                      ) : (
                        (match.homeGoals || []).map(g => {
                          const assister = getCreditedAssister(g);
                          return (
                            <div key={g.id} className="space-y-0.5">
                              {/* Dòng 1: Cầu thủ ghi bàn kèm số phút (Own Goal: chỉ hiện chữ "Own Goal") */}
                              <div className="flex items-center gap-1.5 font-bold text-slate-100">
                                <span className="text-emerald-400 shrink-0">{g.isOwnGoal ? '🥅' : '⚽'}</span>
                                <span className={g.isOwnGoal ? 'text-rose-300' : undefined}>
                                  {g.isOwnGoal ? 'Own Goal' : g.scorer}
                                </span>
                                {g.minute && (
                                  <span className="text-cyan-300 font-mono text-[11px]">
                                    {g.minute.includes("'") ? g.minute : `${g.minute}'`}
                                  </span>
                                )}
                                {g.isPenalty && !g.isOwnGoal && (
                                  <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                    Pen
                                  </span>
                                )}
                              </div>
                              {/* Dòng 2: Cầu thủ kiến tạo (không có với phạt đền / Own Goal) */}
                              {assister && (
                                <div className="ml-5 text-[11px] text-slate-300 flex items-center gap-1">
                                  <span className="text-teal-400">🅰️</span>
                                  <span>Kiến tạo: <span className="text-cyan-200 font-semibold">{assister}</span></span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Away Team Events (Right-aligned) */}
                    <div className="space-y-2 text-right">
                      <div className="font-bold text-cyan-300 text-[11px] uppercase tracking-wide border-b border-cyan-500/10 pb-1">
                        {awayTeam?.name || 'Đội khách'}
                      </div>
                      {(match.awayGoals || []).length === 0 ? (
                        <div className="text-slate-500 italic text-[11px]">
                          {isCompleted ? 'Không có bàn thắng' : 'Chờ thi đấu'}
                        </div>
                      ) : (
                        (match.awayGoals || []).map(g => {
                          const assister = getCreditedAssister(g);
                          return (
                            <div key={g.id} className="space-y-0.5">
                              {/* Dòng 1: Cầu thủ ghi bàn kèm số phút (Own Goal: chỉ hiện chữ "Own Goal") */}
                              <div className="flex items-center justify-end gap-1.5 font-bold text-slate-100">
                                {g.isPenalty && !g.isOwnGoal && (
                                  <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                    Pen
                                  </span>
                                )}
                                {g.minute && (
                                  <span className="text-cyan-300 font-mono text-[11px]">
                                    {g.minute.includes("'") ? g.minute : `${g.minute}'`}
                                  </span>
                                )}
                                <span className={g.isOwnGoal ? 'text-rose-300' : undefined}>
                                  {g.isOwnGoal ? 'Own Goal' : g.scorer}
                                </span>
                                <span className="text-emerald-400 shrink-0">{g.isOwnGoal ? '🥅' : '⚽'}</span>
                              </div>
                              {/* Dòng 2: Cầu thủ kiến tạo (không có với phạt đền / Own Goal) */}
                              {assister && (
                                <div className="mr-5 text-[11px] text-slate-300 flex items-center justify-end gap-1">
                                  <span><span className="text-cyan-200 font-semibold">{assister}</span> :Kiến tạo</span>
                                  <span className="text-teal-400">🅰️</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Match Detail & Vertical Timeline Modal */}
      <MatchDetailModal
        match={selectedMatch}
        homeTeam={selectedHomeTeam}
        awayTeam={selectedAwayTeam}
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        aggregateDisplay={selectedAggregateDisplay}
      />
    </section>
  );
};
