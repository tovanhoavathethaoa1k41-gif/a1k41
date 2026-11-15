import React, { useState } from 'react';
import { Team, Match } from '../types/tournament';
import { getGroupStandings } from '../utils/statsCalculator';
import { TeamBadge } from './TeamBadge';
import { Trophy, Award, CheckCircle2, Info } from 'lucide-react';

interface StandingsSectionProps {
  teams: Team[];
  matches: Match[];
}

export const StandingsSection: React.FC<StandingsSectionProps> = ({ teams, matches }) => {
  const [activeGroup, setActiveGroup] = useState<'ALL' | 'A' | 'B'>('ALL');

  const standingsA = getGroupStandings(teams, 'A', matches);
  const standingsB = getGroupStandings(teams, 'B', matches);

  const getTeam = (teamId: string) => teams.find(t => t.id === teamId);

  const renderTable = (groupName: 'A' | 'B', standings: ReturnType<typeof getGroupStandings>) => (
    <div className="rounded-2xl bg-gradient-to-b from-[#0b1611]/90 to-[#070e0a]/90 border border-cyan-500/20 shadow-xl overflow-hidden">
      {/* Table Header */}
      <div className="px-5 py-4 bg-black/40 border-b border-cyan-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-300 text-sm">
            {groupName}
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">BẢNG {groupName}</h3>
            <p className="text-[11px] text-slate-400">3 Đội • Vòng tròn 1 lượt • Top 2 vào Bán kết</p>
          </div>
        </div>

        <span className="text-xs text-cyan-300/90 font-medium hidden sm:inline-flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-cyan-300" />
          Tiêu chí: Điểm → HS → BT
        </span>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="border-b border-cyan-500/10 bg-cyan-950/20 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-3 text-center w-12">Hạng</th>
              <th className="py-3 px-4">Đội bóng</th>
              <th className="py-3 px-2 text-center" title="Số trận đã đấu">ST</th>
              <th className="py-3 px-2 text-center" title="Thắng">T</th>
              <th className="py-3 px-2 text-center" title="Hòa">H</th>
              <th className="py-3 px-2 text-center" title="Bại">B</th>
              <th className="py-3 px-2 text-center" title="Bàn thắng">BT</th>
              <th className="py-3 px-2 text-center" title="Bàn bại">BB</th>
              <th className="py-3 px-2 text-center" title="Hiệu số">HS</th>
              <th className="py-3 px-3 text-center font-bold text-emerald-400" title="Điểm số">Điểm</th>
              <th className="py-3 px-4 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-500/10">
            {standings.map((row, idx) => {
              const team = getTeam(row.teamId);
              const isTop2 = idx < 2;

              return (
                <tr
                  key={row.teamId}
                  className={`group transition-all duration-200 cursor-default ${
                    isTop2
                      ? 'bg-emerald-950/10 hover:bg-emerald-900/25'
                      : 'hover:bg-slate-900/60'
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3.5 px-3 text-center font-extrabold">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black ${
                        idx === 0
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : idx === 1
                          ? 'bg-slate-300/20 text-slate-300 border border-slate-300/40'
                          : 'text-slate-500'
                      }`}
                    >
                      {idx === 0 ? '1' : idx === 1 ? '2' : '3'}
                    </span>
                  </td>

                  {/* Team */}
                  <td className="py-3.5 px-4">
                    <TeamBadge team={team} size="sm" logoPosition="right" />
                  </td>

                  {/* Stats */}
                  <td className="py-3.5 px-2 text-center text-slate-300 font-medium">{row.played}</td>
                  <td className="py-3.5 px-2 text-center text-emerald-400 font-semibold">{row.won}</td>
                  <td className="py-3.5 px-2 text-center text-slate-400 font-medium">{row.drawn}</td>
                  <td className="py-3.5 px-2 text-center text-rose-400/80 font-medium">{row.lost}</td>
                  <td className="py-3.5 px-2 text-center text-slate-300">{row.goalsFor}</td>
                  <td className="py-3.5 px-2 text-center text-slate-400">{row.goalsAgainst}</td>
                  <td className="py-3.5 px-2 text-center font-mono font-bold">
                    <span className={row.goalDifference > 0 ? 'text-emerald-400' : row.goalDifference < 0 ? 'text-rose-400' : 'text-slate-400'}>
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-400 text-sm md:text-base font-score">
                    {row.points}
                  </td>

                  {/* Qualification Status */}
                  <td className="py-3.5 px-4 text-center">
                    {row.played > 0 && isTop2 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Vào Bán kết
                      </span>
                    ) : row.played > 0 ? (
                      <span className="text-[11px] text-slate-500 font-medium">
                        Dừng bước
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Chờ thi đấu
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-cyan-300" />
            <span>Xếp Hạng Giải Đấu</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
            Bảng Xếp Hạng Chính Thức
          </h2>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-cyan-500/20">
          <button
            type="button"
            onClick={() => setActiveGroup('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeGroup === 'ALL'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tất cả bảng
          </button>
          <button
            type="button"
            onClick={() => setActiveGroup('A')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeGroup === 'A'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bảng A
          </button>
          <button
            type="button"
            onClick={() => setActiveGroup('B')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeGroup === 'B'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bảng B
          </button>
        </div>
      </div>

      {/* Rules Banner */}
      <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-cyan-300">Thể thức tính điểm: </span>
          Thắng = 3 điểm · Hòa = 1 điểm · Thua = 0 điểm. Xếp hạng ưu tiên theo: Điểm số → Hiệu số bàn thắng (HS) → Tổng bàn thắng (BT). 
          Hai đội dẫn đầu mỗi bảng (Nhất & Nhì) giành quyền vào vòng Bán kết.
        </div>
      </div>

      {/* Standings Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(activeGroup === 'ALL' || activeGroup === 'A') && (
          <div className={activeGroup === 'A' ? 'lg:col-span-2' : ''}>
            {renderTable('A', standingsA)}
          </div>
        )}
        {(activeGroup === 'ALL' || activeGroup === 'B') && (
          <div className={activeGroup === 'B' ? 'lg:col-span-2' : ''}>
            {renderTable('B', standingsB)}
          </div>
        )}
      </div>
    </section>
  );
};
