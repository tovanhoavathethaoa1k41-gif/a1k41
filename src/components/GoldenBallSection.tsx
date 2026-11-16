import React from 'react';
import { Team, Podium, GoldenBallCandidate } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { Trophy } from 'lucide-react';

interface GoldenBallSectionProps {
  teams: Team[];
  podium: Podium;
  candidates: GoldenBallCandidate[];
}

const sameTeam = (team: Team, ref: string | undefined) => {
  if (!ref) return false;
  return team.id === ref || team.name.toLowerCase() === ref.toLowerCase();
};

/** Vị trí chung cuộc của đội dựa trên bục podium của giải. */
export function getFinalPosition(team: Team | undefined, podium: Podium): string {
  if (!team) return 'Chưa xác định';
  if (sameTeam(team, podium.champion)) return 'Vô Địch';
  if (sameTeam(team, podium.runnerUp)) return 'Á Quân';
  if (sameTeam(team, podium.thirdPlace)) return 'Hạng Ba';
  if (sameTeam(team, podium.fourthPlace)) return 'Hạng Tư';
  if ((podium.fifthPlace || []).some(ref => sameTeam(team, ref))) return 'Hạng 5-6';
  return 'Chưa xác định';
}

const positionStyle = (pos: string) => {
  switch (pos) {
    case 'Vô Địch':
      return 'bg-yellow-400/20 border-yellow-300/60 text-yellow-200';
    case 'Á Quân':
      return 'bg-slate-300/10 border-slate-300/40 text-slate-200';
    case 'Hạng Ba':
      return 'bg-amber-700/20 border-amber-600/50 text-amber-300';
    case 'Hạng Tư':
      return 'bg-stone-500/10 border-stone-400/30 text-stone-300';
    default:
      return 'bg-white/5 border-white/10 text-slate-400';
  }
};

export const GoldenBallSection: React.FC<GoldenBallSectionProps> = ({ teams, podium, candidates }) => {
  const rows = (candidates || [])
    .map(c => {
      const team = teams.find(t => t.id === c.teamId);
      const player =
        team?.players.find(p => p.id === c.playerId) ||
        team?.players.find(p => p.name.toLowerCase() === c.name.toLowerCase());
      return {
        id: c.id,
        name: player?.name || c.name,
        team,
        votes: Number(c.votes) || 0,
        goals: player?.goals ?? 0,
        assists: player?.assists ?? 0,
        position: getFinalPosition(team, podium)
      };
    })
    .sort((a, b) => (b.votes !== a.votes ? b.votes - a.votes : a.name.localeCompare(b.name, 'vi')));

  const topVotes = rows.length > 0 ? Math.max(rows[0].votes, 1) : 1;

  return (
    <section className="space-y-5">
      <div className="pb-2 border-b border-amber-400/20">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5" />
          <span>Quả Bóng Vàng</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
          Quả Bóng <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-600">Vàng</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Danh sách đề cử, xếp theo số phiếu bầu từ cao xuống thấp.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-black/60 border border-amber-400/20 p-12 text-center text-slate-400 text-xs">
          Chưa có danh sách đề cử Quả Bóng Vàng.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, idx) => (
            <div
              key={r.id}
              className={`relative rounded-2xl border p-3 sm:p-4 bg-black/70 overflow-hidden ${
                idx === 0
                  ? 'border-yellow-300/60 shadow-[0_0_30px_-8px_rgba(250,204,21,0.45)]'
                  : 'border-amber-400/20'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-9 sm:w-12 shrink-0 text-center font-score text-3xl sm:text-4xl font-black text-amber-300">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-white text-base sm:text-lg break-words leading-tight">{r.name}</div>
                  <div className="mt-1.5">
                    <TeamBadge team={r.team} size="sm" layout="horizontal" align="left" logoPosition="left" />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-score text-4xl sm:text-5xl font-black text-yellow-300 leading-none">{r.votes}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">phiếu</div>
                </div>
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-yellow-200"
                  style={{ width: `${Math.max(3, Math.round((r.votes / topVotes) * 100))}%` }}
                />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/5 py-1.5 px-1">
                  <div className="text-[10px] text-slate-400">Bàn thắng</div>
                  <div className="font-score text-xl font-bold text-amber-300 leading-none mt-1">{r.goals}</div>
                </div>
                <div className="rounded-lg bg-white/5 py-1.5 px-1">
                  <div className="text-[10px] text-slate-400">Kiến tạo</div>
                  <div className="font-score text-xl font-bold text-amber-300 leading-none mt-1">{r.assists}</div>
                </div>
                <div className={`rounded-lg border py-1.5 px-1 flex flex-col items-center justify-center ${positionStyle(r.position)}`}>
                  <div className="text-[10px] opacity-70">Vị trí</div>
                  <div className="text-xs font-extrabold mt-1 leading-none">{r.position}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
