import React, { useState } from 'react';
import { Match, Team, Podium } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { MatchDetailModal } from './MatchDetailModal';
import { calculateKnockoutAggregate } from '../utils/statsCalculator';
import { Trophy, GitCommit, X, ChevronRight } from 'lucide-react';

interface KnockoutSectionProps {
  matches: Match[];
  teams: Team[];
  podium: Podium;
}

export const KnockoutSection: React.FC<KnockoutSectionProps> = ({ matches, teams, podium }) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  // Cặp đấu đang được mở để chọn lượt đi / lượt về
  const [openTie, setOpenTie] = useState<{ title: string; legs: Match[] } | null>(null);

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

  /** Thẻ gọn trong sơ đồ: hiện tổng tỉ số 2 lượt, bấm để chọn xem lượt đi / lượt về. */
  const renderTieNode = (title: string, tieMatches: Match[], accent: string, highlight = false) => {
    const leg1 = tieMatches.find(m => m.leg === 1);
    const leg2 = tieMatches.find(m => m.leg === 2);
    if (!leg1 || !leg2) return null;

    const agg = calculateKnockoutAggregate(leg1, leg2);
    const anyPlayed = [leg1, leg2].some(
      m => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
    );
    const team1Id = leg1.homeTeamId;
    const team2Id = leg1.awayTeamId;
    const hasPens =
      !!agg &&
      agg.team1Penalties !== null && agg.team1Penalties !== undefined &&
      agg.team2Penalties !== null && agg.team2Penalties !== undefined;

    const row = (teamId: string, score: number | undefined, pen: number | null | undefined) => {
      const isWinner = !!agg?.isCompleted && agg.winnerId === teamId;
      return (
        <div className="flex items-center justify-between gap-2 py-1.5">
          <div className={`min-w-0 flex-1 ${isWinner ? '' : agg?.isCompleted ? 'opacity-60' : ''}`}>
            <TeamBadge
              team={getTeam(teamId)}
              placeholderName={getTeamLabel(teamId)}
              layout="horizontal"
              align="left"
              logoPosition="left"
              size="sm"
            />
          </div>
          <div className="flex items-baseline gap-1 shrink-0">
            <span className={`font-score text-2xl font-black leading-none ${isWinner ? 'text-emerald-400 text-glow' : 'text-slate-200'}`}>
              {anyPlayed && score !== undefined ? score : '-'}
            </span>
            {hasPens && pen !== null && pen !== undefined && (
              <span className="text-[10px] font-bold text-amber-300">({pen})</span>
            )}
          </div>
        </div>
      );
    };

    return (
      <button
        type="button"
        onClick={() => setOpenTie({ title, legs: [leg1, leg2] })}
        className={`w-full text-left rounded-2xl bg-gradient-to-b from-[#0b1611]/95 to-[#070e0a]/95 border p-3 shadow-lg shadow-black/40 transition-all cursor-pointer hover:border-cyan-400/60 ${
          highlight ? 'border-emerald-500/50' : 'border-cyan-500/25'
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-cyan-500/10">
          <span className={`text-[11px] font-black uppercase tracking-wider ${accent}`}>{title}</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
            Tổng 2 lượt <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        {row(team1Id, agg?.team1Score, agg?.team1Penalties)}
        {row(team2Id, agg?.team2Score, agg?.team2Penalties)}
      </button>
    );
  };

  /** Cửa sổ nhỏ để chọn xem trận lượt đi hoặc lượt về. */
  const renderTiePicker = () => {
    if (!openTie) return null;
    const [leg1, leg2] = openTie.legs;
    const legButton = (m: Match, label: string) => {
      const played = m.status === 'completed' && m.homeScore !== null && m.awayScore !== null;
      return (
        <button
          type="button"
          key={m.id}
          onClick={() => {
            setOpenTie(null);
            setSelectedMatch(m);
          }}
          className="w-full p-3 rounded-xl bg-black/60 border border-cyan-500/20 hover:border-cyan-400/60 transition-all cursor-pointer text-left"
        >
          <div className="text-[11px] font-black uppercase tracking-wider text-cyan-400 mb-2">{label}</div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <TeamBadge team={getTeam(m.homeTeamId)} placeholderName={getTeamLabel(m.homeTeamId)} layout="horizontal" align="left" logoPosition="left" size="sm" />
            </div>
            <div className="shrink-0 px-2.5 py-1 rounded-lg bg-black/80 border border-emerald-500/30 font-score text-xl font-black text-emerald-400">
              {played ? `${m.homeScore} - ${m.awayScore}` : 'VS'}
            </div>
            <div className="min-w-0 flex-1">
              <TeamBadge team={getTeam(m.awayTeamId)} placeholderName={getTeamLabel(m.awayTeamId)} layout="horizontal" align="right" logoPosition="right" size="sm" />
            </div>
          </div>
          {m.homePenalties !== undefined && m.homePenalties !== null && (
            <div className="text-center text-[11px] font-bold text-amber-300 mt-1.5">
              (Pen: {m.homePenalties} - {m.awayPenalties})
            </div>
          )}
          <div className="text-[10px] text-slate-500 mt-1.5 text-center">Bấm để xem chi tiết trận</div>
        </button>
      );
    };

    return (
      <div
        className="modal-lock fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        onClick={() => setOpenTie(null)}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-[#08120c] border border-cyan-500/30 p-4 sm:p-5 space-y-3 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white">{openTie.title}</h3>
            <button
              type="button"
              onClick={() => setOpenTie(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {legButton(leg1, 'Trận Lượt Đi')}
          {legButton(leg2, 'Trận Lượt Về')}
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

      {/* Sơ đồ nhánh đấu: Bán kết -> Chung kết, Tranh hạng ba bên dưới. Vuốt ngang nếu màn hình hẹp */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="min-w-[560px] space-y-6">
          <div className="grid grid-cols-[1fr_36px_1fr] items-stretch">
            {/* Cột Bán kết */}
            <div className="flex flex-col justify-around gap-4">
              {renderTieNode('Bán Kết 1', semi1Matches, 'text-cyan-400')}
              {renderTieNode('Bán Kết 2', semi2Matches, 'text-cyan-400')}
            </div>

            {/* Đường nối nhánh */}
            <div className="relative" aria-hidden="true">
              <div className="absolute top-1/4 left-0 w-1/2 border-t-2 border-cyan-500/40" />
              <div className="absolute top-3/4 left-0 w-1/2 border-t-2 border-cyan-500/40" />
              <div className="absolute top-1/4 bottom-1/4 left-1/2 border-l-2 border-cyan-500/40" />
              <div className="absolute top-1/2 left-1/2 right-0 border-t-2 border-cyan-500/40" />
            </div>

            {/* Cột Chung kết */}
            <div className="flex flex-col justify-center">
              {renderTieNode('Chung Kết', finalMatches, 'text-emerald-400', true)}
            </div>
          </div>

          {/* Tranh hạng ba: cùng cột với Chung kết */}
          <div className="grid grid-cols-[1fr_36px_1fr] items-start">
            <div className="flex items-center text-[11px] font-bold uppercase tracking-wider text-slate-500 pt-3">
              Hai đội thua bán kết đấu tranh hạng ba
            </div>
            <div />
            <div>{renderTieNode('Tranh Hạng Ba', thirdPlaceMatches, 'text-amber-500')}</div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        Bấm vào một cặp đấu để chọn xem trận lượt đi hoặc lượt về.
      </p>

      {renderTiePicker()}

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
