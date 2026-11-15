import React, { useState } from 'react';
import { Match, Team, Podium } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { MatchDetailModal } from './MatchDetailModal';
import { calculateKnockoutAggregate, getLeg2AggregateDisplay } from '../utils/statsCalculator';
import { Trophy, GitCommit } from 'lucide-react';

interface KnockoutSectionProps {
  matches: Match[];
  teams: Team[];
  podium: Podium;
}

export const KnockoutSection: React.FC<KnockoutSectionProps> = ({ matches, teams, podium }) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const getTeam = (id: string) => teams.find(t => t.id === id);

  const getTeamLabel = (id: string) => {
    const t = getTeam(id);
    if (t) return t.name;
    if (id === 'nhat_a') return 'Nhất Bảng A';
    if (id === 'nhi_a') return 'Nhì Bảng A';
    if (id === 'nhat_b') return 'Nhất Bảng B';
    if (id === 'nhi_b') return 'Nhì Bảng B';
    if (id === 'thang_bk1') return 'Thắng Bán Kết 1';
    if (id === 'thang_bk2') return 'Thắng Bán Kết 2';
    if (id === 'thua_bk1') return 'Thua Bán Kết 1';
    if (id === 'thua_bk2') return 'Thua Bán Kết 2';
    return 'Chờ xác định';
  };

  // 2-leg pairs
  const semi1Matches = matches.filter(m => m.pairId === 'semi_1');
  const semi2Matches = matches.filter(m => m.pairId === 'semi_2');
  const finalMatches = matches.filter(m => m.pairId === 'final');
  const thirdPlaceMatches = matches.filter(m => m.pairId === 'third_place');

  const renderTwoLegTie = (title: string, subtitle: string, tieMatches: Match[], badgeColor: string) => {
    const leg1 = tieMatches.find(m => m.leg === 1);
    const leg2 = tieMatches.find(m => m.leg === 2);

    if (!leg1 || !leg2) return null;

    const agg = calculateKnockoutAggregate(leg1, leg2);
    const leg2AggDisplay = getLeg2AggregateDisplay(leg1, leg2);

    const renderLegCard = (match: Match, isLeg2: boolean) => {
      const isCompleted = match.status === 'completed' && match.homeScore !== null && match.awayScore !== null;
      const homeTeam = getTeam(match.homeTeamId);
      const awayTeam = getTeam(match.awayTeamId);

      return (
        <div
          onClick={() => setSelectedMatch(match)}
          className="p-3.5 sm:p-5 rounded-2xl bg-black/60 border border-cyan-500/15 hover:border-cyan-400/40 transition-all shadow-lg shadow-black/40 space-y-3 sm:space-y-4 cursor-pointer"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/10">
            <span className="font-extrabold text-cyan-400 text-xs uppercase tracking-wider">
              {isLeg2 ? 'Trận Lượt Về' : 'Trận Lượt Đi'}
            </span>
          </div>

          {/* 3-Column Pitch Presentation: Home (5) - Score/VS (2) - Away (5) */}
          {/* YÊU CẦU: Logo ở trên, tên đội ở dưới, tên đội và logo căn giữa */}
          <div className="grid grid-cols-12 items-center gap-2">
            {/* Home Team: Logo ở trên, tên đội ở dưới, căn giữa */}
            <div className="col-span-5 flex items-center justify-center">
              <TeamBadge
                team={homeTeam}
                placeholderName={getTeamLabel(match.homeTeamId)}
                layout="vertical"
                size="md"
              />
            </div>

            {/* Central Axis: Tỉ số hoặc VS + Chi tiết */}
            <div className="col-span-2 flex flex-col items-center justify-center">
              {isCompleted ? (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-black/80 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-emerald-500/40 shadow-inner">
                  <span className="font-score text-xl sm:text-3xl font-black text-emerald-400 text-glow">
                    {match.homeScore}
                  </span>
                  <span className="text-xs font-bold text-slate-500">-</span>
                  <span className="font-score text-xl sm:text-3xl font-black text-emerald-400 text-glow">
                    {match.awayScore}
                  </span>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 font-bold text-xs tracking-widest">
                  VS
                </div>
              )}

              {/* Loạt sút luân lưu (Penalty): ẨN CHI TIẾT NGOÀI MÀN HÌNH CHÍNH, chỉ hiển thị tỷ số gọn gàng */}
              {match.homePenalties !== undefined && match.homePenalties !== null && (
                <span className="text-[11px] text-amber-300 mt-1 font-mono font-bold whitespace-nowrap px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 shadow-sm">
                  (Pen: {match.homePenalties} - {match.awayPenalties})
                </span>
              )}

              {/* Lượt về: Tổng 2 lượt (Aggregate) nhỏ ngay bên dưới */}
              {isLeg2 && leg2AggDisplay && (
                <div className="mt-1 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-[9px] sm:text-[10px] font-bold text-cyan-300 whitespace-nowrap">
                  {leg2AggDisplay}
                </div>
              )}
            </div>

            {/* Away Team: Logo ở trên, tên đội ở dưới, căn giữa */}
            <div className="col-span-5 flex items-center justify-center">
              <TeamBadge
                team={awayTeam}
                placeholderName={getTeamLabel(match.awayTeamId)}
                layout="vertical"
                size="md"
              />
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="rounded-2xl bg-gradient-to-b from-[#0b1611]/90 to-[#070e0a]/90 border border-cyan-500/20 shadow-xl shadow-black/40 p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/10">
          <div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${badgeColor}`}>
              {subtitle}
            </span>
            <h3 className="text-lg md:text-xl font-black text-white">{title}</h3>
          </div>
          <div className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-cyan-300 font-bold">
            Thể thức 2 lượt
          </div>
        </div>

        {/* Leg 1 & Leg 2 Match Cards */}
        {renderLegCard(leg1, false)}
        {renderLegCard(leg2, true)}

        {/* Aggregate Overall Box */}
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              Tổng tỉ số sau 2 lượt trận
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {agg?.isCompleted ? (
                <span>
                  Đội thắng:{' '}
                  <span className="font-bold text-emerald-400">
                    {getTeamLabel(agg.winnerId || '')}
                  </span>
                </span>
              ) : (
                'Chưa hoàn tất cả 2 lượt trận'
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Font Teko (font-score) không có chữ "ổ" tiếng Việt -> chữ "Tổng" dùng font thường, chỉ số mới dùng font-score */}
            <span className="inline-flex items-baseline gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-300 font-black">
              <span className="text-xs md:text-sm font-bold">Tổng:</span>
              <span className="font-score text-base md:text-lg">
                {agg ? `${agg.team1Score} - ${agg.team2Score}` : '-'}
              </span>
              {agg && agg.team1Penalties !== null && agg.team1Penalties !== undefined && agg.team2Penalties !== null && agg.team2Penalties !== undefined && (
                <span className="text-xs md:text-sm font-bold text-amber-300">
                  (Pen: <span className="font-score text-base md:text-lg">{agg.team1Penalties} - {agg.team2Penalties}</span>)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const selectedHomeTeam = selectedMatch ? getTeam(selectedMatch.homeTeamId) : undefined;
  const selectedAwayTeam = selectedMatch ? getTeam(selectedMatch.awayTeamId) : undefined;

  return (
    <section className="space-y-8">
      {/* Title */}
      <div className="pb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <GitCommit className="w-3.5 h-3.5 text-cyan-300" />
          <span>Vòng Đấu Loại Trực Tiếp 2 Lượt Trận</span>
        </div>
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
          Sơ Đồ Knockout & Chung Kết
        </h2>
      </div>

      {/* Podium Results - Vinh Danh Giải Đấu */}
      {/* YÊU CẦU: Đá xong giải thì cập nhật vào phần vinh danh giải đấu, logo ở trên, tên đội ở dưới, căn giữa */}
      {(podium.champion || podium.runnerUp || podium.thirdPlace) && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-cyan-950/30 border border-amber-500/30 p-5 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-white">Vinh Danh Giải Đấu</h3>
              <p className="text-xs text-slate-400">Thứ hạng chung cuộc A1K41 Winter Cup</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Champion */}
            {(() => {
              const champTeam = teams.find(t => t.name.toLowerCase() === podium.champion?.toLowerCase() || t.id === podium.champion);
              return (
                <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 to-transparent border border-amber-500/40 text-center flex flex-col items-center justify-between min-h-[170px]">
                  <div>
                    <div className="text-3xl mb-1">🥇</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">VÔ ĐỊCH</div>
                  </div>
                  <div className="my-2 w-full flex justify-center">
                    <TeamBadge
                      team={champTeam}
                      placeholderName={podium.champion || 'Chờ Chung kết'}
                      layout="vertical"
                      size="md"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Runner-Up */}
            {(() => {
              const runnerTeam = teams.find(t => t.name.toLowerCase() === podium.runnerUp?.toLowerCase() || t.id === podium.runnerUp);
              return (
                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-300/10 to-transparent border border-slate-400/30 text-center flex flex-col items-center justify-between min-h-[170px]">
                  <div>
                    <div className="text-3xl mb-1">🥈</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">Á QUÂN</div>
                  </div>
                  <div className="my-2 w-full flex justify-center">
                    <TeamBadge
                      team={runnerTeam}
                      placeholderName={podium.runnerUp || 'Chờ Chung kết'}
                      layout="vertical"
                      size="md"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Third Place */}
            {(() => {
              const thirdTeam = teams.find(t => t.name.toLowerCase() === podium.thirdPlace?.toLowerCase() || t.id === podium.thirdPlace);
              return (
                <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-700/15 to-transparent border border-amber-700/30 text-center flex flex-col items-center justify-between min-h-[170px]">
                  <div>
                    <div className="text-3xl mb-1">🥉</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">HẠNG BA</div>
                  </div>
                  <div className="my-2 w-full flex justify-center">
                    <TeamBadge
                      team={thirdTeam}
                      placeholderName={podium.thirdPlace || 'Chờ Tranh Hạng Ba'}
                      layout="vertical"
                      size="md"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Fourth Place */}
            {(() => {
              const fourthTeam = teams.find(t => t.name.toLowerCase() === podium.fourthPlace?.toLowerCase() || t.id === podium.fourthPlace);
              return (
                <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-900/15 to-transparent border border-cyan-800/30 text-center flex flex-col items-center justify-between min-h-[170px]">
                  <div>
                    <div className="text-3xl mb-1">🎖️</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">HẠNG TƯ</div>
                  </div>
                  <div className="my-2 w-full flex justify-center">
                    <TeamBadge
                      team={fourthTeam}
                      placeholderName={podium.fourthPlace || 'Chờ Tranh Hạng Ba'}
                      layout="vertical"
                      size="md"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Grid of Knockout Ties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Semi-Final 1 */}
        {renderTwoLegTie('Bán Kết 1', 'Bán Kết · 2 Lượt', semi1Matches, 'text-cyan-400')}

        {/* Semi-Final 2 */}
        {renderTwoLegTie('Bán Kết 2', 'Bán Kết · 2 Lượt', semi2Matches, 'text-cyan-400')}

        {/* Third Place Playoff */}
        {renderTwoLegTie('Tranh Hạng Ba', 'Tranh Hạng 3 & 4 · 2 Lượt', thirdPlaceMatches, 'text-amber-500')}

        {/* Final */}
        {renderTwoLegTie('Chung Kết Vô Địch', 'Trận Chung Kết · 2 Lượt', finalMatches, 'text-emerald-400')}
      </div>

      {/* Match Detail Modal */}
      <MatchDetailModal
        match={selectedMatch}
        homeTeam={selectedHomeTeam}
        awayTeam={selectedAwayTeam}
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
      />
    </section>
  );
};
