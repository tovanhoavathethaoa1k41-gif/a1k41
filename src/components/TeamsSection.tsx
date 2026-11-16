import React, { useState } from 'react';
import { Team, Player, Match } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { Users, Award, ChevronRight, X, Activity } from 'lucide-react';
import { normalizeText, getCreditedAssister } from '../utils/statsCalculator';

interface TeamsSectionProps {
  teams: Team[];
  matches: Match[];
}

interface PlayerStatsDetailed {
  goals: { ovr: number; knockout: number; group: number; penalty: number; nonPenalty: number };
  assists: { ovr: number; knockout: number; group: number };
  yellowCards: { ovr: number; knockout: number; group: number };
  redCards: { ovr: number; knockout: number; group: number };
  ga: { ovr: number; knockout: number; group: number };
}

interface PeriodStats { goals: number; assists: number; yellow: number; red: number }

/** Một dòng thống kê theo giai đoạn (Tổng / Knockout / Vòng bảng) - gọn, dễ đọc trên điện thoại. */
const PeriodBlock: React.FC<{
  title: string;
  box: string;
  titleColor: string;
  goalColor: string;
  assistColor: string;
  s: PeriodStats;
}> = ({ title, box, titleColor, goalColor, assistColor, s }) => (
  <div className={`rounded-xl border p-2.5 sm:p-3 ${box}`}>
    <div className={`text-[10px] font-black uppercase tracking-wider mb-2 ${titleColor}`}>{title}</div>
    <div className="grid grid-cols-3 gap-1.5 text-center">
      <div className="rounded-lg bg-black/40 py-1.5 px-1">
        <div className="text-[10px] text-slate-400 leading-tight">Bàn thắng</div>
        <div className={`font-score text-xl leading-none mt-1 font-bold ${goalColor}`}>{s.goals}</div>
      </div>
      <div className="rounded-lg bg-black/40 py-1.5 px-1">
        <div className="text-[10px] text-slate-400 leading-tight">Kiến tạo</div>
        <div className={`font-score text-xl leading-none mt-1 font-bold ${assistColor}`}>{s.assists}</div>
      </div>
      <div className="rounded-lg bg-black/40 py-1.5 px-1">
        <div className="text-[10px] text-slate-400 leading-tight">Thẻ phạt</div>
        <div className="text-sm leading-none mt-1.5 font-bold text-slate-200 whitespace-nowrap">
          🟨{s.yellow} <span className="text-slate-600">·</span> 🟥{s.red}
        </div>
      </div>
    </div>
  </div>
);

export const TeamsSection: React.FC<TeamsSectionProps> = ({ teams = [], matches = [] }) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const selectedTeam = (teams || []).find(t => t?.id === selectedTeamId);

  // Compute detailed player stats with priority breakdown: OVR -> Knockout -> Group -> Penalties
  const getPlayerDetailedStats = (playerName: string): PlayerStatsDetailed => {
    const stats: PlayerStatsDetailed = {
      goals: { ovr: 0, knockout: 0, group: 0, penalty: 0, nonPenalty: 0 },
      assists: { ovr: 0, knockout: 0, group: 0 },
      yellowCards: { ovr: 0, knockout: 0, group: 0 },
      redCards: { ovr: 0, knockout: 0, group: 0 },
      ga: { ovr: 0, knockout: 0, group: 0 }
    };

    if (!playerName || !Array.isArray(matches)) return stats;
    const normPlayer = normalizeText(playerName);

    matches.forEach(m => {
      if (!m || m.status !== 'completed') return;
      const isGroup = m.stage === 'group_a' || m.stage === 'group_b';
      const isKnockout = !isGroup;

      const checkGoals = (goals: any[]) => {
        (goals || []).forEach(g => {
          if (!g) return;
          // Phản lưới nhà: chỉ ghi nhận cho người đá phản, không tính bàn thắng / kiến tạo
          if (g.isOwnGoal) return; // Own Goal không thuộc cầu thủ nào
          if ((g.scorer && normalizeText(g.scorer).includes(normPlayer)) || (g.scorer && normPlayer.includes(normalizeText(g.scorer)))) {
            stats.goals.ovr += 1;
            stats.ga.ovr += 1;
            if (g.isPenalty) {
              stats.goals.penalty += 1;
            } else {
              stats.goals.nonPenalty += 1;
            }
            if (isKnockout) {
              stats.goals.knockout += 1;
              stats.ga.knockout += 1;
            } else {
              stats.goals.group += 1;
              stats.ga.group += 1;
            }
          }
          const creditedAssister = getCreditedAssister(g);
          if (creditedAssister && (normalizeText(creditedAssister).includes(normPlayer) || normPlayer.includes(normalizeText(creditedAssister)))) {
            stats.assists.ovr += 1;
            stats.ga.ovr += 1;
            if (isKnockout) {
              stats.assists.knockout += 1;
              stats.ga.knockout += 1;
            } else {
              stats.assists.group += 1;
              stats.ga.group += 1;
            }
          }
        });
      };

      const checkCards = (cards: any[]) => {
        (cards || []).forEach(c => {
          if (!c || !c.player) return;
          const normCardPlayer = normalizeText(c.player);
          if (normCardPlayer.includes(normPlayer) || normPlayer.includes(normCardPlayer)) {
            if (c.type === 'yellow') {
              stats.yellowCards.ovr += 1;
              if (isKnockout) stats.yellowCards.knockout += 1;
              else stats.yellowCards.group += 1;
            } else if (c.type === 'red') {
              stats.redCards.ovr += 1;
              if (isKnockout) stats.redCards.knockout += 1;
              else stats.redCards.group += 1;
            }
          }
        });
      };

      checkGoals(m.homeGoals);
      checkGoals(m.awayGoals);
      checkCards(m.homeCards || []);
      checkCards(m.awayCards || []);
    });

    return stats;
  };

  // Helper for team's overall tournament match count
  const getTeamTournamentMetrics = (teamId: string) => {
    let totalMatches = 0;
    let gf = 0;
    let ga = 0;

    matches.forEach(m => {
      if (m.status === 'completed' && m.homeScore !== null && m.awayScore !== null) {
        if (m.homeTeamId === teamId) {
          totalMatches++;
          gf += m.homeScore;
          ga += m.awayScore;
        } else if (m.awayTeamId === teamId) {
          totalMatches++;
          gf += m.awayScore;
          ga += m.homeScore;
        }
      }
    });

    return {
      totalMatches,
      totalGoalsFor: gf,
      totalGoalsAgainst: ga,
      avgGf: totalMatches > 0 ? (gf / totalMatches).toFixed(2) : '0.00',
      avgGa: totalMatches > 0 ? (ga / totalMatches).toFixed(2) : '0.00'
    };
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-cyan-500/20 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-cyan-300" />
            <span>Danh Sách Tham Gia</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
            Đội & Tuyển Thủ Thi Đấu
          </h2>
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline">
          Bấm vào từng đội để xem chi tiết thống kê
        </span>
      </div>

      {/* Grid of Team Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(teams || []).map(team => {
          if (!team) return null;
          const isSelected = team.id === selectedTeamId;
          const teamStats = team.stats || { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
          const teamPlayers = Array.isArray(team.players) ? team.players : [];
          const nationalLogo = team.nationalTeam?.logo || '/logos/england.png';
          const nationalName = team.nationalTeam?.name || '';
          const metrics = getTeamTournamentMetrics(team.id);

          return (
            <div
              key={team.id}
              onClick={() => setSelectedTeamId(team.id)}
              className={`group relative rounded-2xl p-5 border transition-all duration-300 cursor-pointer overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-b from-cyan-950/40 to-slate-900 border-cyan-400 shadow-xl shadow-cyan-500/20'
                  : 'bg-gradient-to-b from-[#0b1611]/90 to-[#070e0a]/90 border-cyan-500/20 hover:border-cyan-400/50 hover:bg-[#0c1f16]'
              }`}
            >
              {/* Top Banner: Team Name + Enlarged Logo */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-black/60 border border-cyan-500/20 flex items-center justify-center p-1.5 shadow-md">
                    <img
                      src={nationalLogo}
                      alt={nationalName}
                      className="max-h-full max-w-full object-contain drop-shadow"
                    />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base group-hover:text-cyan-300 transition-colors">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>Bảng {team.group}</span>
                      <span>·</span>
                      <span>{nationalName}</span>
                    </div>
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-black/40 border border-cyan-500/20 group-hover:border-cyan-400/60 group-hover:text-cyan-300 text-slate-400 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Roster list */}
              <div className="space-y-2 mb-4 bg-black/40 p-3.5 rounded-xl border border-cyan-500/10">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                  Tuyển thủ thi đấu
                </div>
                {teamPlayers.length > 0 ? (
                  teamPlayers.map(p => {
                    const stats = getPlayerDetailedStats(p?.name || '');
                    return (
                      <div key={p.id || p.name} className="flex items-center justify-between text-xs py-0.5">
                        <span className="font-semibold text-slate-200">{p.name}</span>
                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          {stats.goals.ovr > 0 && <span className="text-emerald-400">⚽ {stats.goals.ovr}</span>}
                          {stats.assists.ovr > 0 && <span className="text-teal-300">🅰️ {stats.assists.ovr}</span>}
                          {stats.yellowCards.ovr > 0 && <span className="text-amber-400">🟨 {stats.yellowCards.ovr}</span>}
                          {stats.redCards.ovr > 0 && <span className="text-rose-500">🟥 {stats.redCards.ovr}</span>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[11px] text-slate-400 italic">Đang cập nhật danh sách</div>
                )}
              </div>

              {/* Tournament Metrics Strip */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-3 border-t border-cyan-500/10">
                <div className="bg-black/30 py-1.5 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-semibold">Tổng trận</div>
                  <div className="font-bold text-slate-200">{metrics.totalMatches}</div>
                </div>
                <div className="bg-black/30 py-1.5 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-semibold">Bàn thắng</div>
                  <div className="font-bold text-emerald-400">{metrics.totalGoalsFor}</div>
                </div>
                <div className="bg-black/30 py-1.5 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-semibold">TB bàn/trận</div>
                  <div className="font-bold text-cyan-300">{metrics.avgGf}</div>
                </div>
                <div className="bg-black/30 py-1.5 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-semibold">Điểm bảng</div>
                  <div className="font-black text-emerald-400 font-score text-base">{teamStats.points}đ</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Detailed Player & Team Breakdown */}
      {selectedTeam && (
        <div
          onClick={() => setSelectedTeamId(null)}
          className="modal-lock fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl rounded-3xl bg-[#08120c]/95 border border-cyan-500/30 p-6 md:p-8 shadow-2xl max-h-[92dvh] overflow-y-auto overscroll-contain"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedTeamId(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-cyan-500/20">
              <div className="w-16 h-16 rounded-2xl bg-black/80 border border-cyan-500/40 flex items-center justify-center p-2 shadow-xl shrink-0">
                <img
                  src={selectedTeam.nationalTeam?.logo || '/logos/england.png'}
                  alt={selectedTeam.nationalTeam?.name || ''}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">{selectedTeam.name}</h3>
                <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1">
                  <span>Phân Bảng {selectedTeam.group}</span>
                  <span>·</span>
                  <span>Đại diện: {selectedTeam.nationalTeam?.name}</span>
                </div>
              </div>
            </div>

            {/* Team Tournament Stats Overview */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-300" />
                Thống Kê Toàn Đội Giải Đấu
              </h4>
              {(() => {
                const metrics = getTeamTournamentMetrics(selectedTeam.id);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-black/50 border border-cyan-500/10">
                      <div className="text-[11px] text-slate-400">Tổng số trận đã đá</div>
                      <div className="text-xl font-bold text-white mt-0.5">{metrics.totalMatches} trận</div>
                    </div>
                    <div className="p-3 rounded-xl bg-black/50 border border-cyan-500/10">
                      <div className="text-[11px] text-slate-400">Tổng bàn thắng</div>
                      <div className="text-xl font-bold text-emerald-400 mt-0.5">
                        {metrics.totalGoalsFor}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-black/50 border border-cyan-500/10">
                      <div className="text-[11px] text-slate-400">Tổng bàn thua</div>
                      <div className="text-xl font-bold text-rose-400 mt-0.5">
                        {metrics.totalGoalsAgainst}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-black/50 border border-cyan-500/10">
                      <div className="text-[11px] text-slate-400">Điểm vòng bảng</div>
                      <div className="text-xl font-extrabold text-cyan-300 mt-0.5 font-score">
                        {selectedTeam.stats?.points ?? 0} điểm
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Detailed Player Breakdown Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-cyan-300" />
                  Chỉ Số Cầu Thủ
                </h4>
              </div>

              <div className="space-y-4">
                {(selectedTeam.players || []).map(player => {
                  const stats = getPlayerDetailedStats(player?.name || '');

                  return (
                    <div
                      key={player.id || player.name}
                      className="p-3 sm:p-5 rounded-2xl bg-black/60 border border-cyan-500/20 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/10 pb-2">
                        <div className="font-extrabold text-white text-base">
                          {player.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-bold">
                            Tổng G+A: {stats.ga.ovr}
                          </span>
                        </div>
                      </div>

                      {/* Mỗi giai đoạn một dòng (điện thoại) / 3 khối cạnh nhau (màn hình lớn) */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                        <PeriodBlock
                          title="Tổng thể"
                          box="bg-emerald-950/20 border-emerald-500/30"
                          titleColor="text-emerald-400"
                          goalColor="text-emerald-400"
                          assistColor="text-teal-300"
                          s={{ goals: stats.goals.ovr, assists: stats.assists.ovr, yellow: stats.yellowCards.ovr, red: stats.redCards.ovr }}
                        />
                        <PeriodBlock
                          title="Vòng Knockout"
                          box="bg-cyan-950/20 border-cyan-500/30"
                          titleColor="text-cyan-300"
                          goalColor="text-cyan-300"
                          assistColor="text-cyan-300"
                          s={{ goals: stats.goals.knockout, assists: stats.assists.knockout, yellow: stats.yellowCards.knockout, red: stats.redCards.knockout }}
                        />
                        <PeriodBlock
                          title="Vòng Bảng"
                          box="bg-slate-900/60 border-slate-700/60"
                          titleColor="text-slate-300"
                          goalColor="text-slate-200"
                          assistColor="text-slate-200"
                          s={{ goals: stats.goals.group, assists: stats.assists.group, yellow: stats.yellowCards.group, red: stats.redCards.group }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
