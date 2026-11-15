import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPenaltyShootoutEligible,
  calculateKnockoutAggregate,
  getMatchSortRank,
  recalculateAllStats,
  normalizeText,
  getCreditedAssister,
  getGroupStandings
} from './statsCalculator';
import { Team, Match } from '../types/tournament';

test('isPenaltyShootoutEligible identifies tied aggregate in Leg 2', () => {
  const leg1: Match = {
    id: 'm_semi1_1',
    matchCode: 'BK 1 (Lượt đi)',
    stage: 'semi',
    stageLabel: 'Bán kết 1',
    roundName: 'Lượt đi',
    leg: 1,
    pairId: 'semi_1',
    homeTeamId: 'team_a',
    awayTeamId: 'team_b',
    homeScore: 2,
    awayScore: 1,
    status: 'completed',
    statusText: 'Đã đấu',
    homeGoals: [],
    awayGoals: []
  };

  const leg2Tied: Match = {
    id: 'm_semi1_2',
    matchCode: 'BK 1 (Lượt về)',
    stage: 'semi',
    stageLabel: 'Bán kết 1',
    roundName: 'Lượt về',
    leg: 2,
    pairId: 'semi_1',
    homeTeamId: 'team_b',
    awayTeamId: 'team_a',
    homeScore: 2,
    awayScore: 1,
    status: 'completed',
    statusText: 'Đã đấu',
    homeGoals: [],
    awayGoals: []
  };

  // Leg 1: Team A 2 - 1 Team B
  // Leg 2: Team B 2 - 1 Team A
  // Total: Team A (2 + 1 = 3) vs Team B (1 + 2 = 3) => TIED (3-3)
  assert.equal(isPenaltyShootoutEligible(leg2Tied, [leg1, leg2Tied]), true);

  const leg2NotTied: Match = {
    ...leg2Tied,
    homeScore: 3,
    awayScore: 1
  };
  // Total: Team A (2 + 1 = 3) vs Team B (1 + 3 = 4) => NOT TIED
  assert.equal(isPenaltyShootoutEligible(leg2NotTied, [leg1, leg2NotTied]), false);
});

test('calculateKnockoutAggregate computes 2-leg aggregates accurately', () => {
  const leg1: Match = {
    id: 'm_ck_1',
    matchCode: 'CK (Lượt đi)',
    stage: 'final',
    stageLabel: 'Chung kết',
    roundName: 'Lượt đi',
    leg: 1,
    pairId: 'final',
    homeTeamId: 'team_a',
    awayTeamId: 'team_b',
    homeScore: 3,
    awayScore: 2,
    status: 'completed',
    statusText: 'Đã đấu',
    homeGoals: [],
    awayGoals: []
  };

  const leg2: Match = {
    id: 'm_ck_2',
    matchCode: 'CK (Lượt về)',
    stage: 'final',
    stageLabel: 'Chung kết',
    roundName: 'Lượt về',
    leg: 2,
    pairId: 'final',
    homeTeamId: 'team_b',
    awayTeamId: 'team_a',
    homeScore: 2,
    awayScore: 1,
    homePenalties: 4,
    awayPenalties: 5,
    status: 'completed',
    statusText: 'Đã đấu',
    homeGoals: [],
    awayGoals: []
  };

  const agg = calculateKnockoutAggregate(leg1, leg2);
  assert.notEqual(agg, null);
  // Team A: 3 (leg 1) + 1 (leg 2 away) = 4
  // Team B: 2 (leg 1) + 2 (leg 2 home) = 4
  assert.equal(agg!.team1Score, 4);
  assert.equal(agg!.team2Score, 4);
  assert.equal(agg!.isTied, true);
  // Team A had away penalties 5, Team B had home penalties 4 => Team A wins on pens
  assert.equal(agg!.winnerId, 'team_a');
});

test('recalculateAllStats distinguishes penalty vs non-penalty goals', () => {
  const teams: Team[] = [
    {
      id: 'dat_bao_dnc',
      name: 'DAT BAO DNC',
      shortCode: 'ARG',

      group: 'B',
      nationalTeam: { name: 'ARGENTINA', code: 'ARG', logo: '/logos/argentina.png' },
      players: [
        { id: 'p1', name: 'Trịnh Gia Bảo', teamId: 'dat_bao_dnc', goals: 0, assists: 0, matchesPlayed: 0 },
        { id: 'p2', name: 'Phan Tiến Đạt', teamId: 'dat_bao_dnc', goals: 0, assists: 0, matchesPlayed: 0 }
      ],
      stats: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }
    }
  ];

  const matches: Match[] = [
    {
      id: 'm_test_1',
      matchCode: 'Vòng 1',
      stage: 'group_b',
      stageLabel: 'Bảng B',
      roundName: 'Vòng 1',
      homeTeamId: 'dat_bao_dnc',
      awayTeamId: 'other_team',
      homeScore: 3,
      awayScore: 0,
      status: 'completed',
      statusText: 'Đã đấu',
      homeGoals: [
        { id: 'g1', scorer: 'Trịnh Gia Bảo', minute: '12', isPenalty: false },
        { id: 'g2', scorer: 'Trịnh Gia Bảo', minute: '45+1', isPenalty: true },
        { id: 'g3', scorer: 'Phan Tiến Đạt', minute: '90', isPenalty: false }
      ],
      awayGoals: []
    }
  ];

  recalculateAllStats(teams, matches);

  const bao = teams[0].players[0];
  assert.equal(bao.goals, 2);
  assert.equal(bao.breakdown?.goals.ovr, 2);
  assert.equal(bao.breakdown?.goals.penalty, 1);
  assert.equal(bao.breakdown?.goals.nonPenalty, 1);

  const dat = teams[0].players[1];
  assert.equal(dat.goals, 1);
  assert.equal(dat.breakdown?.goals.penalty, 0);
  assert.equal(dat.breakdown?.goals.nonPenalty, 1);
});

test('getCreditedAssister: phạt đền, Own Goal và tự kiến tạo đều không có kiến tạo', () => {
  assert.equal(getCreditedAssister({ scorer: 'A', assister: 'B' }), 'B');
  assert.equal(getCreditedAssister({ scorer: 'A', assister: 'B', isPenalty: false }), 'B');
  assert.equal(getCreditedAssister({ scorer: 'A', assister: 'B', isPenalty: true }), undefined);
  assert.equal(getCreditedAssister({ scorer: 'A', assister: 'B', isOwnGoal: true }), undefined);
  assert.equal(getCreditedAssister({ scorer: 'Trịnh Gia Bảo', assister: 'trinh gia bao' }), undefined);
  assert.equal(getCreditedAssister({ scorer: 'A' }), undefined);
});

test('recalculateAllStats: Own Goal cộng cho đội, không tính cho cầu thủ; phạt đền không có kiến tạo', () => {
  const mkTeam = (id: string, names: string[]): Team => ({
    id,
    name: id,
    shortCode: id,

    group: 'A',
    nationalTeam: { name: id, code: id, logo: '' },
    players: names.map((n, i) => ({ id: `${id}_${i}`, name: n, teamId: id, goals: 0, assists: 0, matchesPlayed: 0 })),
    stats: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }
  });
  const teams = [mkTeam('t1', ['An', 'Binh']), mkTeam('t2', ['Cuong', 'Dung'])];

  const matches: Match[] = [
    {
      id: 'm1',
      matchCode: 'Vòng 1A',
      stage: 'group_a',
      stageLabel: 'Bảng A',
      roundName: 'Vòng 1',
      homeTeamId: 't1',
      awayTeamId: 't2',
      homeScore: 4, // 1 bàn thường + 1 pen + 1 bàn tự kiến tạo + 1 Own Goal (cộng cho đội nhà)
      awayScore: 0,
      status: 'completed',
      statusText: 'Đã đấu',
      homeGoals: [
        { id: 'g1', scorer: 'An', minute: '10', assister: 'Binh' },
        { id: 'g2', scorer: 'An', minute: '30', isPenalty: true, assister: 'Binh' },
        { id: 'g3', scorer: 'Binh', minute: '50', assister: 'Binh' },
        { id: 'g4', scorer: 'Own Goal', minute: '70', isOwnGoal: true }
      ],
      awayGoals: []
    }
  ];

  recalculateAllStats(teams, matches);

  const [an, binh] = teams[0].players;
  const [cuong, dung] = teams[1].players;
  assert.equal(an.goals, 2);
  assert.equal(an.assists, 0);
  assert.equal(binh.goals, 1);
  assert.equal(binh.assists, 1); // chỉ bàn g1 (bàn g2 là pen, bàn g3 tự kiến tạo cho mình)
  assert.equal(cuong.goals, 0);
  assert.equal(dung.assists, 0);
  // Own Goal tính 1 bàn cho đội được hưởng, không thuộc cầu thủ nào
  assert.equal(teams[0].stats.goalsFor, 4);
  assert.equal(teams[1].stats.goalsAgainst, 4);
  assert.equal(teams[1].stats.goalsFor, 0);
});

test('getGroupStandings: hòa điểm/hiệu số/bàn thắng -> đối đầu trực tiếp, rồi thẻ', () => {
  const mk = (id: string): Team => ({
    id, name: id, shortCode: id, group: 'A',
    nationalTeam: { name: id, code: id, logo: '' }, players: [],
    stats: { played: 2, won: 0, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 2, goalDifference: 0, points: 3 }
  });
  const teams = [mk('a'), mk('b')];
  const base = { stage: 'group_a' as const, stageLabel: '', roundName: '', matchCode: '', status: 'completed' as const, statusText: '', homeGoals: [], awayGoals: [] };
  // b thắng a trực tiếp -> b xếp trên
  const h2h: Match[] = [{ ...base, id: 'x', homeTeamId: 'a', awayTeamId: 'b', homeScore: 0, awayScore: 1 }];
  assert.equal(getGroupStandings(teams, 'A', h2h)[0].teamId, 'b');
  // đối đầu hòa, a ít thẻ hơn -> a xếp trên (đỏ = 2 vàng)
  const draw: Match[] = [{
    ...base, id: 'y', homeTeamId: 'a', awayTeamId: 'b', homeScore: 1, awayScore: 1,
    homeCards: [{ id: 'c1', player: 'p', type: 'yellow' }],
    awayCards: [{ id: 'c2', player: 'q', type: 'red' }]
  }];
  assert.equal(getGroupStandings(teams, 'A', draw)[0].teamId, 'a');
});
