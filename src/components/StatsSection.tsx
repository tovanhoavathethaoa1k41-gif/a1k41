import React, { useState } from 'react';
import { Team, Match } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { Flame, Award, Target, Zap, ShieldAlert, Shield } from 'lucide-react';
import { normalizeText, getCreditedAssister } from '../utils/statsCalculator';

interface StatsSectionProps {
  teams: Team[];
  matches: Match[];
}

interface ProcessedPlayerStat {
  name: string;
  teamId: string;
  team: Team | undefined;
  goals: { ovr: number; knockout: number; group: number; penalty: number; nonPenalty: number };
  assists: { ovr: number; knockout: number; group: number };
  yellowCards: { ovr: number; knockout: number; group: number };
  redCards: { ovr: number; knockout: number; group: number };
  ga: { ovr: number; knockout: number; group: number };
}

export const StatsSection: React.FC<StatsSectionProps> = ({ teams, matches }) => {
  const [activeTab, setActiveTab] = useState<'team_attack' | 'team_defense' | 'scorers' | 'assists' | 'cards'>('team_attack');

  // Compute player stats accurately from matches
  const playerMap = new Map<string, ProcessedPlayerStat>();

  // Prepopulate from team rosters
  teams.forEach(t => {
    t.players.forEach(p => {
      const norm = normalizeText(p.name);
      playerMap.set(norm, {
        name: p.name,
        teamId: t.id,
        team: t,
        goals: { ovr: 0, knockout: 0, group: 0, penalty: 0, nonPenalty: 0 },
        assists: { ovr: 0, knockout: 0, group: 0 },
        yellowCards: { ovr: 0, knockout: 0, group: 0 },
        redCards: { ovr: 0, knockout: 0, group: 0 },
        ga: { ovr: 0, knockout: 0, group: 0 }
      });
    });
  });

  // Calculate from match events
  matches.forEach(m => {
    if (m.status !== 'completed') return;
    const isGroup = m.stage === 'group_a' || m.stage === 'group_b';
    const isKnockout = !isGroup;

    const processGoalList = (goals: any[], defaultTeamId: string) => {
      (goals || []).forEach(g => {
        if (g.isOwnGoal) return; // Own Goal: không tính cho cầu thủ nào
        if (!g.scorer) return;
        const normScorer = normalizeText(g.scorer);

        let p = playerMap.get(normScorer);
        if (!p) {
          p = {
            name: g.scorer,
            teamId: defaultTeamId,
            team: teams.find(t => t.id === defaultTeamId),
            goals: { ovr: 0, knockout: 0, group: 0, penalty: 0, nonPenalty: 0 },
            assists: { ovr: 0, knockout: 0, group: 0 },
            yellowCards: { ovr: 0, knockout: 0, group: 0 },
            redCards: { ovr: 0, knockout: 0, group: 0 },
            ga: { ovr: 0, knockout: 0, group: 0 }
          };
          playerMap.set(normScorer, p);
        }

        p.goals.ovr += 1;
        p.ga.ovr += 1;

        if (g.isPenalty) {
          p.goals.penalty += 1;
        } else {
          p.goals.nonPenalty += 1;
        }

        if (isKnockout) {
          p.goals.knockout += 1;
          p.ga.knockout += 1;
        } else {
          p.goals.group += 1;
          p.ga.group += 1;
        }

        const creditedAssister = getCreditedAssister(g);
        if (creditedAssister) {
          const normAssister = normalizeText(creditedAssister);
          let ap = playerMap.get(normAssister);
          if (!ap) {
            ap = {
              name: creditedAssister,
              teamId: defaultTeamId,
              team: teams.find(t => t.id === defaultTeamId),
              goals: { ovr: 0, knockout: 0, group: 0, penalty: 0, nonPenalty: 0 },
              assists: { ovr: 0, knockout: 0, group: 0 },
              yellowCards: { ovr: 0, knockout: 0, group: 0 },
              redCards: { ovr: 0, knockout: 0, group: 0 },
              ga: { ovr: 0, knockout: 0, group: 0 }
            };
            playerMap.set(normAssister, ap);
          }

          ap.assists.ovr += 1;
          ap.ga.ovr += 1;
          if (isKnockout) {
            ap.assists.knockout += 1;
            ap.ga.knockout += 1;
          } else {
            ap.assists.group += 1;
            ap.ga.group += 1;
          }
        }
      });
    };

    const processCardList = (cards: any[], defaultTeamId: string) => {
      (cards || []).forEach(c => {
        if (!c.player) return;
        const normPlayer = normalizeText(c.player);
        let p = playerMap.get(normPlayer);
        if (!p) {
          p = {
            name: c.player,
            teamId: defaultTeamId,
            team: teams.find(t => t.id === defaultTeamId),
            goals: { ovr: 0, knockout: 0, group: 0, penalty: 0, nonPenalty: 0 },
            assists: { ovr: 0, knockout: 0, group: 0 },
            yellowCards: { ovr: 0, knockout: 0, group: 0 },
            redCards: { ovr: 0, knockout: 0, group: 0 },
            ga: { ovr: 0, knockout: 0, group: 0 }
          };
          playerMap.set(normPlayer, p);
        }

        if (c.type === 'yellow') {
          p.yellowCards.ovr += 1;
          if (isKnockout) p.yellowCards.knockout += 1;
          else p.yellowCards.group += 1;
        } else if (c.type === 'red') {
          p.redCards.ovr += 1;
          if (isKnockout) p.redCards.knockout += 1;
          else p.redCards.group += 1;
        }
      });
    };

    processGoalList(m.homeGoals || [], m.homeTeamId);
    processGoalList(m.awayGoals || [], m.awayTeamId);
    processCardList(m.homeCards || [], m.homeTeamId);
    processCardList(m.awayCards || [], m.awayTeamId);
  });

  const allPlayers = Array.from(playerMap.values());

  // Top Scorers: Priority OVR -> Knockout -> Group -> Penalties
  const topScorers = [...allPlayers]
    .filter(p => p.goals.ovr > 0)
    .sort((a, b) => {
      if (b.goals.ovr !== a.goals.ovr) return b.goals.ovr - a.goals.ovr;
      // Bằng tổng bàn thắng: cầu thủ có ÍT penalty hơn xếp trên (xét ngầm, không ghi chú trên web)
      if (a.goals.penalty !== b.goals.penalty) return a.goals.penalty - b.goals.penalty;
      if (b.goals.knockout !== a.goals.knockout) return b.goals.knockout - a.goals.knockout;
      return b.goals.group - a.goals.group;
    });

  // Top Assists: Priority OVR -> Knockout -> Group
  const topAssists = [...allPlayers]
    .filter(p => p.assists.ovr > 0)
    .sort((a, b) => {
      if (b.assists.ovr !== a.assists.ovr) return b.assists.ovr - a.assists.ovr;
      if (b.assists.knockout !== a.assists.knockout) return b.assists.knockout - a.assists.knockout;
      return b.assists.group - a.assists.group;
    });

  // Top Cards: Red Cards -> Yellow Cards
  const topCards = [...allPlayers]
    .filter(p => p.yellowCards.ovr > 0 || p.redCards.ovr > 0)
    .sort((a, b) => {
      // Thẻ đỏ = 2 thẻ vàng, nhiều thẻ nhất xếp trên cùng
      const pa = a.yellowCards.ovr + 2 * a.redCards.ovr;
      const pb = b.yellowCards.ovr + 2 * b.redCards.ovr;
      if (pb !== pa) return pb - pa;
      return b.redCards.ovr - a.redCards.ovr;
    });

  interface TeamStatRow {
    team: Team;
    totalMatches: number;
    totalGoalsFor: number;
    totalGoalsAgainst: number;
    avgGoalsFor: number;
    avgGoalsAgainst: number;
  }

  const teamStatRows: TeamStatRow[] = teams.map(t => {
    let matchesCount = 0;
    let gf = 0;
    let ga = 0;

    matches.forEach(m => {
      if (m.status === 'completed' && m.homeScore !== null && m.awayScore !== null) {
        if (m.homeTeamId === t.id) {
          matchesCount++;
          gf += m.homeScore;
          ga += m.awayScore;
        } else if (m.awayTeamId === t.id) {
          matchesCount++;
          gf += m.awayScore;
          ga += m.homeScore;
        }
      }
    });

    return {
      team: t,
      totalMatches: matchesCount,
      totalGoalsFor: gf,
      totalGoalsAgainst: ga,
      avgGoalsFor: matchesCount > 0 ? Number((gf / matchesCount).toFixed(2)) : 0,
      avgGoalsAgainst: matchesCount > 0 ? Number((ga / matchesCount).toFixed(2)) : 0
    };
  });

  const teamsMostGoals = [...teamStatRows].sort((a, b) => {
    if (b.totalGoalsFor !== a.totalGoalsFor) return b.totalGoalsFor - a.totalGoalsFor;
    return b.avgGoalsFor - a.avgGoalsFor;
  });

  const teamsMostConceded = [...teamStatRows].sort((a, b) => {
    if (b.totalGoalsAgainst !== a.totalGoalsAgainst) return b.totalGoalsAgainst - a.totalGoalsAgainst;
    return b.avgGoalsAgainst - a.avgGoalsAgainst;
  });

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <Award className="w-3.5 h-3.5 text-cyan-300" />
          <span>Bảng Xếp Hạng Thống Kê & Vinh Danh</span>
        </div>
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
          Thống Kê Giải Đấu
        </h2>
      </div>

      {/* Tabs with zero parenthesis and zero Top 1-6 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('team_attack')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'team_attack'
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-cyan-500/20'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Đội Ghi Nhiều Bàn Nhất</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team_defense')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'team_defense'
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-cyan-500/20'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Đội Thủng Lưới Nhiều Nhất</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scorers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'scorers'
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-cyan-500/20'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Vua Phá Lưới</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assists')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'assists'
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-cyan-500/20'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Vua Kiến Tạo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cards')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'cards'
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-cyan-500/20'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Thẻ Phạt</span>
        </button>
      </div>

      {/* CONTENT AREA */}
      {/* 1. BẢNG 1: ĐỘI GHI NHIỀU BÀN THẮNG NHẤT */}
      {activeTab === 'team_attack' && (
        <div className="rounded-2xl bg-[#08120c]/90 border border-cyan-500/20 overflow-hidden shadow-2xl">
          <div className="p-5 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border-b border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                <Flame className="w-5 h-5 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">Bảng 1: Các Đội Ghi Nhiều Bàn Thắng Nhất Giải</h3>
                <p className="text-xs text-slate-400">Xếp hạng tấn công trên toàn bộ giải đấu</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-300 px-3 py-1 bg-black/60 rounded-xl border border-cyan-500/20">
              Tổng số bàn thắng & Trung bình
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/60 text-slate-400 font-bold border-b border-cyan-500/10">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Hạng</th>
                  <th className="py-3 px-4">Đội bóng</th>
                  <th className="py-3 px-4 text-center">Tổng số trận</th>
                  <th className="py-3 px-4 text-center font-black text-emerald-400">Tổng bàn thắng</th>
                  <th className="py-3 px-4 text-center font-mono">Bàn thắng TB / trận</th>
                  <th className="py-3 px-4 text-center text-slate-400">Hiệu số tổng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10">
                {teamsMostGoals.map((row, idx) => (
                  <tr key={row.team.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 text-center font-black">
                      {idx === 0 && <span className="text-amber-400 text-sm">🥇 1</span>}
                      {idx === 1 && <span className="text-slate-300 text-sm">🥈 2</span>}
                      {idx === 2 && <span className="text-amber-600 text-sm">🥉 3</span>}
                      {idx > 2 && <span className="text-slate-400">{idx + 1}</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <TeamBadge team={row.team} size="sm" logoPosition="right" />
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                      {row.totalMatches} trận
                    </td>
                    <td className="py-3.5 px-4 text-center font-score text-xl font-black text-emerald-400">
                      {row.totalGoalsFor}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-extrabold text-cyan-300 text-sm">
                      {row.avgGoalsFor.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {row.totalGoalsFor - row.totalGoalsAgainst > 0 ? `+${row.totalGoalsFor - row.totalGoalsAgainst}` : row.totalGoalsFor - row.totalGoalsAgainst}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. BẢNG 2: ĐỘI THỦNG LƯỚI NHIỀU NHẤT */}
      {activeTab === 'team_defense' && (
        <div className="rounded-2xl bg-[#08120c]/90 border border-cyan-500/20 overflow-hidden shadow-2xl">
          <div className="p-5 bg-gradient-to-r from-rose-950/40 to-slate-950/60 border-b border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-5 h-5 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">Bảng 2: Các Đội Thủng Lưới Nhiều Nhất Giải</h3>
                <p className="text-xs text-slate-400">Xếp hạng bàn thua trên toàn bộ giải đấu</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400 px-3 py-1 bg-black/60 rounded-xl border border-rose-500/20">
              Tổng số bàn thua & Trung bình
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/60 text-slate-400 font-bold border-b border-cyan-500/10">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Hạng</th>
                  <th className="py-3 px-4">Đội bóng</th>
                  <th className="py-3 px-4 text-center">Tổng số trận</th>
                  <th className="py-3 px-4 text-center font-black text-rose-400">Tổng bàn thua</th>
                  <th className="py-3 px-4 text-center font-mono">Bàn thua TB / trận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10">
                {teamsMostConceded.map((row, idx) => (
                  <tr key={row.team.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 text-center font-black">
                      {idx === 0 && <span className="text-rose-400 text-sm">1</span>}
                      {idx > 0 && <span className="text-slate-400">{idx + 1}</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <TeamBadge team={row.team} size="sm" logoPosition="right" />
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                      {row.totalMatches} trận
                    </td>
                    <td className="py-3.5 px-4 text-center font-score text-xl font-black text-rose-400">
                      {row.totalGoalsAgainst}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-extrabold text-amber-300 text-sm">
                      {row.avgGoalsAgainst.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. VUA PHÁ LƯỚI: WITH NEW COLUMN NON-PENALTY GOALS & NO PARENTHESES */}
      {activeTab === 'scorers' && (
        <div className="rounded-2xl bg-[#08120c]/90 border border-cyan-500/20 overflow-hidden shadow-2xl">
          <div className="p-5 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border-b border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                <Target className="w-5 h-5 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">Vua Phá Lưới</h3>
                <p className="text-xs text-slate-400">Danh sách các cầu thủ ghi bàn hàng đầu của giải đấu</p>
              </div>
            </div>
            <div className="text-[11px] font-bold text-cyan-300 px-3 py-1 bg-black/60 rounded-xl border border-cyan-500/20 self-start sm:self-auto">
              Chỉ số xếp hạng chính thức
            </div>
          </div>

          {topScorers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Chưa có bàn thắng nào được ghi nhận.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/60 text-slate-400 font-bold border-b border-cyan-500/10">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Hạng</th>
                    <th className="py-3 px-4">Cầu thủ</th>
                    <th className="py-3 px-4">Đội bóng</th>
                    <th className="py-3 px-4 text-center font-black text-emerald-400">Tổng bàn thắng</th>
                    <th className="py-3 px-4 text-center font-bold text-cyan-300">Vòng Knockout</th>
                    <th className="py-3 px-4 text-center font-bold text-slate-300">Vòng Bảng</th>
                    <th className="py-3 px-4 text-center font-bold text-teal-300">Penalty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {topScorers.map((p, idx) => (
                    <tr key={p.name} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-black">
                        {idx === 0 && <span className="text-amber-400 text-sm">🥇 1</span>}
                        {idx === 1 && <span className="text-slate-300 text-sm">🥈 2</span>}
                        {idx === 2 && <span className="text-amber-600 text-sm">🥉 3</span>}
                        {idx > 2 && <span className="text-slate-400">{idx + 1}</span>}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <TeamBadge team={p.team} size="sm" logoPosition="right" />
                      </td>
                      <td className="py-3.5 px-4 text-center font-score text-2xl font-black text-emerald-400">
                        {p.goals.ovr}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-cyan-300 text-sm">
                        {p.goals.knockout}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300 text-sm">
                        {p.goals.group}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-extrabold text-teal-300 text-sm">
                        {p.goals.penalty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. VUA KIẾN TẠO: NO PARENTHESES */}
      {activeTab === 'assists' && (
        <div className="rounded-2xl bg-[#08120c]/90 border border-cyan-500/20 overflow-hidden shadow-2xl">
          <div className="p-5 bg-gradient-to-r from-teal-950/40 to-cyan-950/40 border-b border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                <Zap className="w-5 h-5 drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">Vua Kiến Tạo</h3>
                <p className="text-xs text-slate-400">Danh sách các cầu thủ kiến tạo hàng đầu của giải đấu</p>
              </div>
            </div>
            <div className="text-[11px] font-bold text-cyan-300 px-3 py-1 bg-black/60 rounded-xl border border-cyan-500/20 self-start sm:self-auto">
              Chỉ số xếp hạng chính thức
            </div>
          </div>

          {topAssists.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Chưa có kiến tạo nào được ghi nhận.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/60 text-slate-400 font-bold border-b border-cyan-500/10">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Hạng</th>
                    <th className="py-3 px-4">Cầu thủ</th>
                    <th className="py-3 px-4">Đội bóng</th>
                    <th className="py-3 px-4 text-center font-black text-teal-300">Tổng kiến tạo</th>
                    <th className="py-3 px-4 text-center font-bold text-cyan-300">Vòng Knockout</th>
                    <th className="py-3 px-4 text-center font-bold text-slate-300">Vòng Bảng</th>
                    <th className="py-3 px-4 text-center font-bold text-emerald-400">Tổng G+A</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {topAssists.map((p, idx) => (
                    <tr key={p.name} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-black">
                        {idx === 0 && <span className="text-amber-400 text-sm">🥇 1</span>}
                        {idx === 1 && <span className="text-slate-300 text-sm">🥈 2</span>}
                        {idx === 2 && <span className="text-amber-600 text-sm">🥉 3</span>}
                        {idx > 2 && <span className="text-slate-400">{idx + 1}</span>}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <TeamBadge team={p.team} size="sm" logoPosition="right" />
                      </td>
                      <td className="py-3.5 px-4 text-center font-score text-2xl font-black text-teal-300">
                        {p.assists.ovr}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-cyan-300 text-sm">
                        {p.assists.knockout}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300 text-sm">
                        {p.assists.group}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-extrabold text-emerald-400 text-sm">
                        {p.ga.ovr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. THẺ PHẠT */}
      {activeTab === 'cards' && (
        <div className="rounded-2xl bg-[#08120c]/90 border border-cyan-500/20 overflow-hidden shadow-2xl">
          <div className="p-5 bg-gradient-to-r from-amber-950/40 to-rose-950/40 border-b border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">Thống Kê Thẻ Phạt</h3>
                <p className="text-xs text-slate-400">Xếp theo số thẻ nhiều nhất, thẻ đỏ tính bằng 2 thẻ vàng</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 px-3 py-1 bg-black/60 rounded-xl border border-amber-500/20">
              Thẻ vàng & Thẻ đỏ
            </span>
          </div>

          {topCards.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Chưa có cầu thủ nào nhận thẻ phạt trong giải đấu. Tinh thần Fairplay tuyệt vời!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/60 text-slate-400 font-bold border-b border-cyan-500/10">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Hạng</th>
                    <th className="py-3 px-4">Cầu thủ</th>
                    <th className="py-3 px-4">Đội bóng</th>
                    <th className="py-3 px-4 text-center font-bold text-amber-400">Thẻ vàng</th>
                    <th className="py-3 px-4 text-center font-bold text-rose-500">Thẻ đỏ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {topCards.map((p, idx) => (
                    <tr key={p.name} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-black">
                        <span className="text-slate-400">{idx + 1}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <TeamBadge team={p.team} size="sm" logoPosition="right" />
                      </td>
                      <td className="py-3.5 px-4 text-center font-score text-xl font-black text-amber-400">
                        {p.yellowCards.ovr}
                      </td>
                      <td className="py-3.5 px-4 text-center font-score text-xl font-black text-rose-500">
                        {p.redCards.ovr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
