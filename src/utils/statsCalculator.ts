import { Team, Match, GroupStanding, Player, GoalDetail, CardDetail, PenaltyShootoutRound, Podium } from '../types/tournament';

/**
 * Normalizes text for matching player/team names
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Kiến tạo hợp lệ của một bàn thắng. Trả về undefined (không có kiến tạo) khi:
 *  - Bàn phản lưới nhà (Own Goal): không tính cho đội nào, cầu thủ nào;
 *  - Bàn thắng từ chấm phạt đền: người đá pen không có kiến tạo;
 *  - Người kiến tạo trùng với người ghi bàn: cầu thủ ghi bàn không thể tự kiến tạo cho bàn của mình.
 */
export function getCreditedAssister(g: Pick<GoalDetail, 'scorer' | 'assister' | 'isPenalty' | 'isOwnGoal'>): string | undefined {
  if (!g || !g.assister) return undefined;
  if (g.isOwnGoal || g.isPenalty) return undefined;
  if (g.scorer && normalizeText(g.scorer) === normalizeText(g.assister)) return undefined;
  return g.assister;
}

/**
 * Checks if a match is eligible for a penalty shootout:
 * Must be Leg 2 of Semi-final, 3rd place, or Final,
 * and the aggregate score across both legs must be tied.
 */
export function isPenaltyShootoutEligible(match: Match | null | undefined, allMatches: Match[]): boolean {
  if (!match || match.leg !== 2 || !match.pairId) return false;
  if (match.stage !== 'semi' && match.stage !== 'third_place' && match.stage !== 'final') {
    return false;
  }

  // Find Leg 1
  const leg1 = allMatches.find(m => m.pairId === match.pairId && m.leg === 1);
  if (!leg1) return false;

  const leg1Played = leg1.homeScore !== null && leg1.awayScore !== null;
  const leg2Played = match.homeScore !== null && match.awayScore !== null;

  if (!leg1Played || !leg2Played) return false;

  // Calculate aggregate score
  let leg1HomeGoals = 0;
  let leg1AwayGoals = 0;

  if (leg1.homeTeamId === match.homeTeamId) {
    leg1HomeGoals = leg1.homeScore ?? 0;
    leg1AwayGoals = leg1.awayScore ?? 0;
  } else if (leg1.awayTeamId === match.homeTeamId) {
    leg1HomeGoals = leg1.awayScore ?? 0;
    leg1AwayGoals = leg1.homeScore ?? 0;
  }

  const totalHome = leg1HomeGoals + (match.homeScore ?? 0);
  const totalAway = leg1AwayGoals + (match.awayScore ?? 0);

  return totalHome === totalAway;
}

/**
 * Calculates aggregate scores and penalties for a 2-leg knockout pair.
 */
export interface KnockoutAggregateResult {
  team1Id: string;
  team2Id: string;
  team1Score: number;
  team2Score: number;
  team1Penalties?: number | null;
  team2Penalties?: number | null;
  winnerId?: string | null;
  isCompleted: boolean;
  isTied: boolean;
  displayText: string;
}

export function calculateKnockoutAggregate(
  leg1: Match | undefined,
  leg2: Match | undefined
): KnockoutAggregateResult | null {
  if (!leg1 || !leg2) return null;

  const leg1Played = leg1.status === 'completed' && leg1.homeScore !== null && leg1.awayScore !== null;
  const leg2Played = leg2.status === 'completed' && leg2.homeScore !== null && leg2.awayScore !== null;

  const team1Id = leg1.homeTeamId;
  const team2Id = leg1.awayTeamId;

  const score1_t1 = leg1.homeScore ?? 0;
  const score1_t2 = leg1.awayScore ?? 0;

  let score2_t1 = 0;
  let score2_t2 = 0;

  if (leg2.homeTeamId === team1Id) {
    score2_t1 = leg2.homeScore ?? 0;
    score2_t2 = leg2.awayScore ?? 0;
  } else {
    score2_t1 = leg2.awayScore ?? 0;
    score2_t2 = leg2.homeScore ?? 0;
  }

  const totalT1 = score1_t1 + score2_t1;
  const totalT2 = score1_t2 + score2_t2;

  const isCompleted = leg1Played && leg2Played;
  const isTied = totalT1 === totalT2;

  let penT1: number | null = null;
  let penT2: number | null = null;

  // Penalties are recorded on Leg 2
  if (leg2.homePenalties !== undefined && leg2.homePenalties !== null && leg2.awayPenalties !== null) {
    if (leg2.homeTeamId === team1Id) {
      penT1 = leg2.homePenalties;
      penT2 = leg2.awayPenalties ?? null;
    } else {
      penT1 = leg2.awayPenalties ?? null;
      penT2 = leg2.homePenalties;
    }
  }

  let winnerId: string | null = null;
  if (isCompleted) {
    if (totalT1 > totalT2) {
      winnerId = team1Id;
    } else if (totalT2 > totalT1) {
      winnerId = team2Id;
    } else if (penT1 !== null && penT2 !== null) {
      winnerId = penT1 > penT2 ? team1Id : team2Id;
    }
  }

  let displayText = `Tổng: ${totalT1} - ${totalT2}`;
  if (penT1 !== null && penT2 !== null) {
    displayText = `Tổng: ${totalT1} - ${totalT2} (Pen: ${penT1} - ${penT2})`;
  }

  return {
    team1Id,
    team2Id,
    team1Score: totalT1,
    team2Score: totalT2,
    team1Penalties: penT1,
    team2Penalties: penT2,
    winnerId,
    isCompleted,
    isTied,
    displayText
  };
}

/**
 * Format aggregate score strictly for Leg 2 display under the main score
 */
export function getLeg2AggregateDisplay(
  leg1: Match | undefined,
  leg2: Match | undefined
): string | null {
  if (!leg1 || !leg2) return null;
  const leg1Played = leg1.status === 'completed' && leg1.homeScore !== null && leg1.awayScore !== null;
  const leg2Played = leg2.status === 'completed' && leg2.homeScore !== null && leg2.awayScore !== null;
  if (!leg1Played && !leg2Played) return null;

  const leg2HomeId = leg2.homeTeamId;

  let leg1HomeTeamScore = 0;
  let leg1AwayTeamScore = 0;

  if (leg1.homeTeamId === leg2HomeId) {
    leg1HomeTeamScore = leg1.homeScore ?? 0;
    leg1AwayTeamScore = leg1.awayScore ?? 0;
  } else if (leg1.awayTeamId === leg2HomeId) {
    leg1HomeTeamScore = leg1.awayScore ?? 0;
    leg1AwayTeamScore = leg1.homeScore ?? 0;
  }

  const totalHome = leg1HomeTeamScore + (leg2.homeScore ?? 0);
  const totalAway = leg1AwayTeamScore + (leg2.awayScore ?? 0);

  if (leg2.homePenalties !== undefined && leg2.homePenalties !== null && leg2.awayPenalties !== null) {
    return `Tổng 2 lượt: ${totalHome} - ${totalAway} (Pen: ${leg2.homePenalties} - ${leg2.awayPenalties})`;
  }

  return `Tổng 2 lượt: ${totalHome} - ${totalAway}`;
}

/**
 * Re-calculates player statistics, grouping goals & assists, cards,
 * with priority breakdown: OVR -> Knockout -> Group -> Penalties.
 */
export function recalculateAllStats(teams: Team[], matches: Match[], podium?: Podium) {
  // 1. Reset all team stats
  teams.forEach(team => {
    // Keep team dat_bao_dnc name standardized
    if (team.id === 'dat_bao_dnc') {
      team.name = 'DAT BAO DNC';
    }

    team.stats = {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      totalMatchesAll: 0,
      totalGoalsFor: 0,
      totalGoalsAgainst: 0,
      avgGoalsFor: 0,
      avgGoalsAgainst: 0
    };

    // Reset player stats
    team.players.forEach(player => {
      player.goals = 0;
      player.assists = 0;
      player.yellowCards = 0;
      player.redCards = 0;
      player.matchesPlayed = 0;
      player.breakdown = {
        goals: { ovr: 0, knockout: 0, group: 0, penalty: 0, nonPenalty: 0 },
        assists: { ovr: 0, knockout: 0, group: 0 },
        yellowCards: { ovr: 0, knockout: 0, group: 0 },
        redCards: { ovr: 0, knockout: 0, group: 0 },
        ga: { ovr: 0, knockout: 0, group: 0 }
      };
    });
  });

  // Track match appearances and goals
  matches.forEach(match => {
    const isCompleted = match.status === 'completed';
    const isGroup = match.stage === 'group_a' || match.stage === 'group_b';
    const isKnockout = !isGroup;

    const homeTeam = teams.find(t => t.id === match.homeTeamId);
    const awayTeam = teams.find(t => t.id === match.awayTeamId);

    // Track total matches for teams
    if (isCompleted && match.homeScore !== null && match.awayScore !== null) {
      if (homeTeam) {
        homeTeam.stats.totalMatchesAll = (homeTeam.stats.totalMatchesAll || 0) + 1;
        homeTeam.stats.totalGoalsFor = (homeTeam.stats.totalGoalsFor || 0) + match.homeScore;
        homeTeam.stats.totalGoalsAgainst = (homeTeam.stats.totalGoalsAgainst || 0) + match.awayScore;

        if (isGroup) {
          homeTeam.stats.played += 1;
          homeTeam.stats.goalsFor += match.homeScore;
          homeTeam.stats.goalsAgainst += match.awayScore;
          homeTeam.stats.goalDifference = homeTeam.stats.goalsFor - homeTeam.stats.goalsAgainst;

          if (match.homeScore > match.awayScore) {
            homeTeam.stats.won += 1;
            homeTeam.stats.points += 3;
          } else if (match.homeScore === match.awayScore) {
            homeTeam.stats.drawn += 1;
            homeTeam.stats.points += 1;
          } else {
            homeTeam.stats.lost += 1;
          }
        }
      }

      if (awayTeam) {
        awayTeam.stats.totalMatchesAll = (awayTeam.stats.totalMatchesAll || 0) + 1;
        awayTeam.stats.totalGoalsFor = (awayTeam.stats.totalGoalsFor || 0) + match.awayScore;
        awayTeam.stats.totalGoalsAgainst = (awayTeam.stats.totalGoalsAgainst || 0) + match.homeScore;

        if (isGroup) {
          awayTeam.stats.played += 1;
          awayTeam.stats.goalsFor += match.awayScore;
          awayTeam.stats.goalsAgainst += match.homeScore;
          awayTeam.stats.goalDifference = awayTeam.stats.goalsFor - awayTeam.stats.goalsAgainst;

          if (match.awayScore > match.homeScore) {
            awayTeam.stats.won += 1;
            awayTeam.stats.points += 3;
          } else if (match.awayScore === match.homeScore) {
            awayTeam.stats.drawn += 1;
            awayTeam.stats.points += 1;
          } else {
            awayTeam.stats.lost += 1;
          }
        }
      }
    }

    // Process Goal events
    // `team` = đội có danh sách chứa bàn này, `opponent` = đội còn lại.
    const processGoals = (goals: GoalDetail[], team: Team | undefined, _opponent: Team | undefined) => {
      if (!goals || !Array.isArray(goals) || !team) return;
      goals.forEach(g => {
        if (g.isOwnGoal) return;
        if (!g.scorer) return;
        const normScorer = normalizeText(g.scorer);

        // OWN GOAL: bàn thắng cho đội được hưởng (đã nằm trong tỉ số), KHÔNG tính cho cầu thủ nào, không có kiến tạo.
        if (g.isOwnGoal) return;
        const player = team.players.find(p => normalizeText(p.name).includes(normScorer) || normScorer.includes(normalizeText(p.name)));
        if (player && player.breakdown) {
          player.goals += 1;
          player.breakdown.goals.ovr += 1;
          player.breakdown.ga.ovr += 1;

          if (g.isPenalty) {
            player.breakdown.goals.penalty = (player.breakdown.goals.penalty || 0) + 1;
          } else {
            player.breakdown.goals.nonPenalty = (player.breakdown.goals.nonPenalty || 0) + 1;
          }

          if (isKnockout) {
            player.breakdown.goals.knockout += 1;
            player.breakdown.ga.knockout += 1;
          } else {
            player.breakdown.goals.group += 1;
            player.breakdown.ga.group += 1;
          }
        }

        // Phạt đền / tự ghi bàn rồi tự kiến tạo: không có kiến tạo
        const creditedAssister = getCreditedAssister(g);
        if (creditedAssister) {
          const normAssister = normalizeText(creditedAssister);
          const assisterPlayer = team.players.find(p => normalizeText(p.name).includes(normAssister) || normAssister.includes(normalizeText(p.name)));
          if (assisterPlayer && assisterPlayer.breakdown) {
            assisterPlayer.assists += 1;
            assisterPlayer.breakdown.assists.ovr += 1;
            assisterPlayer.breakdown.ga.ovr += 1;

            if (isKnockout) {
              assisterPlayer.breakdown.assists.knockout += 1;
              assisterPlayer.breakdown.ga.knockout += 1;
            } else {
              assisterPlayer.breakdown.assists.group += 1;
              assisterPlayer.breakdown.ga.group += 1;
            }
          }
        }
      });
    };

    // Process Cards
    const processCards = (cards: CardDetail[] | undefined, team: Team | undefined) => {
      if (!cards || !Array.isArray(cards) || !team) return;
      cards.forEach(c => {
        if (!c.player) return;
        const normPlayer = normalizeText(c.player);
        const player = team.players.find(p => normalizeText(p.name).includes(normPlayer) || normPlayer.includes(normalizeText(p.name)));
        if (player && player.breakdown) {
          if (c.type === 'yellow') {
            player.yellowCards = (player.yellowCards || 0) + 1;
            player.breakdown.yellowCards.ovr += 1;
            if (isKnockout) {
              player.breakdown.yellowCards.knockout += 1;
            } else {
              player.breakdown.yellowCards.group += 1;
            }
          } else if (c.type === 'red') {
            player.redCards = (player.redCards || 0) + 1;
            player.breakdown.redCards.ovr += 1;
            if (isKnockout) {
              player.breakdown.redCards.knockout += 1;
            } else {
              player.breakdown.redCards.group += 1;
            }
          }
        }
      });
    };

    processGoals(match.homeGoals, homeTeam, awayTeam);
    processGoals(match.awayGoals, awayTeam, homeTeam);
    processCards(match.homeCards, homeTeam);
    processCards(match.awayCards, awayTeam);
  });

  // Calculate averages for teams
  teams.forEach(team => {
    const total = team.stats.totalMatchesAll || 0;
    if (total > 0) {
      team.stats.avgGoalsFor = Number(((team.stats.totalGoalsFor || 0) / total).toFixed(2));
      team.stats.avgGoalsAgainst = Number(((team.stats.totalGoalsAgainst || 0) / total).toFixed(2));
    } else {
      team.stats.avgGoalsFor = 0;
      team.stats.avgGoalsAgainst = 0;
    }
  });

  // Tự động kiểm tra điều kiện hoàn tất vòng bảng, bán kết và cập nhật vinh danh giải đấu
  updateKnockoutProgression(teams, matches, podium);
}

/**
 * Điểm thẻ (fair play) của một đội ở vòng bảng: thẻ vàng = 1, thẻ đỏ = 2 (đỏ = 2 vàng). Càng ít càng tốt.
 */
function getGroupCardPoints(teamId: string, matches: Match[]): number {
  let pts = 0;
  matches.forEach(m => {
    if (m.stage !== 'group_a' && m.stage !== 'group_b') return;
    const cards = m.homeTeamId === teamId ? m.homeCards : m.awayTeamId === teamId ? m.awayCards : undefined;
    (cards || []).forEach(c => {
      pts += c.type === 'red' ? 2 : 1;
    });
  });
  return pts;
}

/**
 * Mini-league giữa các đội đang bằng nhau (chỉ tính các trận đối đầu trực tiếp đã đấu giữa họ).
 */
function getHeadToHead(tiedIds: string[], matches: Match[]): Record<string, { pts: number; gd: number; gf: number }> {
  const res: Record<string, { pts: number; gd: number; gf: number }> = {};
  tiedIds.forEach(id => { res[id] = { pts: 0, gd: 0, gf: 0 }; });
  matches.forEach(m => {
    if (m.stage !== 'group_a' && m.stage !== 'group_b') return;
    if (m.status !== 'completed' || m.homeScore === null || m.awayScore === null) return;
    if (!tiedIds.includes(m.homeTeamId) || !tiedIds.includes(m.awayTeamId)) return;
    const h = res[m.homeTeamId];
    const a = res[m.awayTeamId];
    h.gf += m.homeScore; a.gf += m.awayScore;
    h.gd += m.homeScore - m.awayScore; a.gd += m.awayScore - m.homeScore;
    if (m.homeScore > m.awayScore) h.pts += 3;
    else if (m.homeScore < m.awayScore) a.pts += 3;
    else { h.pts += 1; a.pts += 1; }
  });
  return res;
}

/**
 * Calculates group standings (A or B)
 * Thứ tự xếp hạng: Điểm -> Hiệu số -> Bàn thắng.
 * Nếu vẫn bằng nhau (ngầm, không hiển thị): đối đầu trực tiếp -> thẻ phạt (đỏ = 2 vàng, ít thẻ hơn xếp trên).
 */
export function getGroupStandings(teams: Team[], group: 'A' | 'B', matches: Match[] = []): GroupStanding[] {
  const groupTeams = teams.filter(t => t.group === group);
  const sameBase = (a: Team, b: Team) =>
    a.stats.points === b.stats.points &&
    a.stats.goalDifference === b.stats.goalDifference &&
    a.stats.goalsFor === b.stats.goalsFor;

  const sorted = [...groupTeams].sort((a, b) => {
    if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
    if (b.stats.goalDifference !== a.stats.goalDifference) return b.stats.goalDifference - a.stats.goalDifference;
    if (b.stats.goalsFor !== a.stats.goalsFor) return b.stats.goalsFor - a.stats.goalsFor;

    // Hòa hoàn toàn -> xét ngầm
    if (matches.length > 0) {
      const tiedIds = groupTeams.filter(t => sameBase(t, a)).map(t => t.id);
      const h2h = getHeadToHead(tiedIds, matches);
      const ha = h2h[a.id], hb = h2h[b.id];
      if (ha && hb) {
        if (hb.pts !== ha.pts) return hb.pts - ha.pts;
        if (hb.gd !== ha.gd) return hb.gd - ha.gd;
        if (hb.gf !== ha.gf) return hb.gf - ha.gf;
      }
      const ca = getGroupCardPoints(a.id, matches);
      const cb = getGroupCardPoints(b.id, matches);
      if (ca !== cb) return ca - cb; // ít thẻ hơn xếp trên
    }
    return 0;
  });

  return sorted.map((t, idx) => ({
    rank: idx + 1,
    teamId: t.id,
    played: t.stats.played,
    won: t.stats.won,
    drawn: t.stats.drawn,
    lost: t.stats.lost,
    goalsFor: t.stats.goalsFor,
    goalsAgainst: t.stats.goalsAgainst,
    goalDifference: t.stats.goalDifference,
    points: t.stats.points,
    status: idx < 2 ? 'qualified' : 'eliminated'
  }));
}

/**
 * Tự động ghép cặp bán kết, chung kết, tranh hạng ba và cập nhật vinh danh giải đấu:
 * 1. KHÔNG update logo và tên đội lên vòng bán kết trừ khi đã đá xong vòng bảng (cả 3 đội mỗi bảng, 6 trận).
 *    BK1: Nhất A đấu với Nhì B
 *    BK2: Nhất B đấu với Nhì A
 * 2. Tương tự, chỉ cập nhật logo và tên đội vào Tranh Hạng 3 và Chung Kết sau khi đã đá xong 2 cặp Bán Kết.
 * 3. Đá xong giải thì tự động cập nhật vào phần Vinh Danh Giải Đấu (Podium).
 */
export function updateKnockoutProgression(teams: Team[], matches: Match[], podium?: Podium) {
  if (!Array.isArray(matches) || matches.length === 0) return;

  // A. Kiểm tra hoàn tất toàn bộ vòng bảng: Cả 3 đội bảng A và cả 3 đội bảng B đều đã thi đấu đủ số trận
  const groupAMatches = matches.filter(m => m.stage === 'group_a');
  const groupBMatches = matches.filter(m => m.stage === 'group_b');

  const groupACompleted = groupAMatches.length >= 3 && groupAMatches.every(m => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null);
  const groupBCompleted = groupBMatches.length >= 3 && groupBMatches.every(m => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null);
  const allGroupMatchesCompleted = groupACompleted && groupBCompleted;

  // Bán kết 1 & 2
  const semi1_1 = matches.find(m => m.id === 'm_semi1_1');
  const semi1_2 = matches.find(m => m.id === 'm_semi1_2');
  const semi2_1 = matches.find(m => m.id === 'm_semi2_1');
  const semi2_2 = matches.find(m => m.id === 'm_semi2_2');

  // Tranh hạng 3 & Chung kết
  const h3_1 = matches.find(m => m.id === 'm_h3_1');
  const h3_2 = matches.find(m => m.id === 'm_h3_2');
  const ck_1 = matches.find(m => m.id === 'm_ck_1');
  const ck_2 = matches.find(m => m.id === 'm_ck_2');

  if (!allGroupMatchesCompleted) {
    // VÒNG BẢNG CHƯA ĐÁ XONG: TUYỆT ĐỐI KHÔNG UPDATE LOGO VÀ TÊN ĐỘI LÊN VÒNG BÁN KẾT
    if (semi1_1) { semi1_1.homeTeamId = 'nhat_a'; semi1_1.awayTeamId = 'nhi_b'; }
    if (semi1_2) { semi1_2.homeTeamId = 'nhi_b'; semi1_2.awayTeamId = 'nhat_a'; }
    if (semi2_1) { semi2_1.homeTeamId = 'nhat_b'; semi2_1.awayTeamId = 'nhi_a'; }
    if (semi2_2) { semi2_2.homeTeamId = 'nhi_a'; semi2_2.awayTeamId = 'nhat_b'; }

    if (h3_1) { h3_1.homeTeamId = 'thua_bk1'; h3_1.awayTeamId = 'thua_bk2'; }
    if (h3_2) { h3_2.homeTeamId = 'thua_bk2'; h3_2.awayTeamId = 'thua_bk1'; }
    if (ck_1) { ck_1.homeTeamId = 'thang_bk1'; ck_1.awayTeamId = 'thang_bk2'; }
    if (ck_2) { ck_2.homeTeamId = 'thang_bk2'; ck_2.awayTeamId = 'thang_bk1'; }

    if (podium) {
      podium.champion = 'Chờ Chung kết';
      podium.runnerUp = 'Chờ Chung kết';
      podium.thirdPlace = 'Chờ Tranh Hạng Ba';
      podium.fourthPlace = 'Chờ Tranh Hạng Ba';
    }
    return;
  }

  // VÒNG BẢNG ĐÃ ĐÁ XONG: Lấy chính xác Nhất A, Nhì A, Nhất B, Nhì B
  const standingsA = getGroupStandings(teams, 'A', matches);
  const standingsB = getGroupStandings(teams, 'B', matches);

  const nhatA = standingsA[0]?.teamId;
  const nhiA = standingsA[1]?.teamId;
  const nhatB = standingsB[0]?.teamId;
  const nhiB = standingsB[1]?.teamId;

  if (nhatA && nhiB && nhatB && nhiA) {
    // BK1: Nhất A đấu với Nhì B
    if (semi1_1) { semi1_1.homeTeamId = nhatA; semi1_1.awayTeamId = nhiB; }
    if (semi1_2) { semi1_2.homeTeamId = nhiB; semi1_2.awayTeamId = nhatA; }

    // BK2: Nhất B đấu với Nhì A
    if (semi2_1) { semi2_1.homeTeamId = nhatB; semi2_1.awayTeamId = nhiA; }
    if (semi2_2) { semi2_2.homeTeamId = nhiA; semi2_2.awayTeamId = nhatB; }
  }

  // B. Kiểm tra Bán kết đã đá xong cả 2 lượt và xác định đội thắng / thua
  const aggSemi1 = calculateKnockoutAggregate(semi1_1, semi1_2);
  const aggSemi2 = calculateKnockoutAggregate(semi2_1, semi2_2);

  const semiFinalsCompleted = !!(aggSemi1?.isCompleted && aggSemi1.winnerId && aggSemi2?.isCompleted && aggSemi2.winnerId);

  if (!semiFinalsCompleted) {
    // BÁN KẾT CHƯA XONG: Tranh Hạng 3 và Chung Kết giữ placeholder
    if (h3_1) { h3_1.homeTeamId = 'thua_bk1'; h3_1.awayTeamId = 'thua_bk2'; }
    if (h3_2) { h3_2.homeTeamId = 'thua_bk2'; h3_2.awayTeamId = 'thua_bk1'; }
    if (ck_1) { ck_1.homeTeamId = 'thang_bk1'; ck_1.awayTeamId = 'thang_bk2'; }
    if (ck_2) { ck_2.homeTeamId = 'thang_bk2'; ck_2.awayTeamId = 'thang_bk1'; }

    if (podium) {
      podium.champion = 'Chờ Chung kết';
      podium.runnerUp = 'Chờ Chung kết';
      podium.thirdPlace = 'Chờ Tranh Hạng Ba';
      podium.fourthPlace = 'Chờ Tranh Hạng Ba';
    }
    return;
  }

  // BÁN KẾT ĐÃ XONG: Xác định đội vào Chung kết và Tranh hạng 3
  const winnerBK1 = aggSemi1!.winnerId!;
  const loserBK1 = (aggSemi1!.winnerId === aggSemi1!.team1Id) ? aggSemi1!.team2Id : aggSemi1!.team1Id;

  const winnerBK2 = aggSemi2!.winnerId!;
  const loserBK2 = (aggSemi2!.winnerId === aggSemi2!.team1Id) ? aggSemi2!.team2Id : aggSemi2!.team1Id;

  // Chung kết (Winner BK1 vs Winner BK2)
  if (ck_1) { ck_1.homeTeamId = winnerBK1; ck_1.awayTeamId = winnerBK2; }
  if (ck_2) { ck_2.homeTeamId = winnerBK2; ck_2.awayTeamId = winnerBK1; }

  // Tranh hạng 3 (Loser BK1 vs Loser BK2)
  if (h3_1) { h3_1.homeTeamId = loserBK1; h3_1.awayTeamId = loserBK2; }
  if (h3_2) { h3_2.homeTeamId = loserBK2; h3_2.awayTeamId = loserBK1; }

  // C. Kiểm tra Chung kết & Tranh hạng 3 hoàn tất -> Cập nhật Vinh Danh Giải Đấu
  const aggCK = calculateKnockoutAggregate(ck_1, ck_2);
  const aggH3 = calculateKnockoutAggregate(h3_1, h3_2);

  const tournamentCompleted = !!(aggCK?.isCompleted && aggCK.winnerId && aggH3?.isCompleted && aggH3.winnerId);

  if (podium) {
    if (tournamentCompleted) {
      const champTeam = teams.find(t => t.id === aggCK!.winnerId);
      const runnerTeam = teams.find(t => t.id === (aggCK!.winnerId === aggCK!.team1Id ? aggCK!.team2Id : aggCK!.team1Id));
      const thirdTeam = teams.find(t => t.id === aggH3!.winnerId);
      const fourthTeam = teams.find(t => t.id === (aggH3!.winnerId === aggH3!.team1Id ? aggH3!.team2Id : aggH3!.team1Id));

      podium.champion = champTeam?.name || 'Chờ xác định';
      podium.runnerUp = runnerTeam?.name || 'Chờ xác định';
      podium.thirdPlace = thirdTeam?.name || 'Chờ xác định';
      podium.fourthPlace = fourthTeam?.name || 'Chờ xác định';
    } else {
      podium.champion = 'Chờ Chung kết';
      podium.runnerUp = 'Chờ Chung kết';
      podium.thirdPlace = 'Chờ Tranh Hạng Ba';
      podium.fourthPlace = 'Chờ Tranh Hạng Ba';
    }
  }
}

/**
 * Thứ tự lịch Bảng B hiện hành:
 *   Vòng 1B: CORNER FC vs DAT BAO DNC
 *   Vòng 2B: DAT BAO DNC vs KIHITO MADAM
 *   Vòng 3B: KIHITO MADAM vs CORNER FC
 * Hàm này sắp lại các trận Bảng B (dữ liệu cũ đã lưu trên server/trình duyệt) theo đúng thứ tự trên,
 * giữ nguyên tỉ số, bàn thắng, thẻ của từng cặp đấu. An toàn khi gọi nhiều lần.
 */
export function normalizeGroupBSchedule(matches: Match[]): void {
  if (!Array.isArray(matches)) return;
  const slots: Array<{ teams: [string, string]; n: number }> = [
    { teams: ['corner_fc', 'dat_bao_dnc'], n: 1 },
    { teams: ['dat_bao_dnc', 'kihito_madam'], n: 2 },
    { teams: ['kihito_madam', 'corner_fc'], n: 3 }
  ];
  matches.forEach(m => {
    if (!m || m.stage !== 'group_b') return;
    const slot = slots.find(
      sl =>
        (m.homeTeamId === sl.teams[0] && m.awayTeamId === sl.teams[1]) ||
        (m.homeTeamId === sl.teams[1] && m.awayTeamId === sl.teams[0])
    );
    if (!slot) return;
    m.id = `m_gb_${slot.n}`;
    m.matchCode = `Vòng ${slot.n}B`;
    m.roundName = `Vòng ${slot.n}`;
  });
}

/**
 * Canonical sort order:
 * 1A -> 1B -> 2A -> 2B -> 3A -> 3B ->
 * Bán kết 1 đi -> Bán kết 2 đi -> Bán kết 1 về -> Bán kết 2 về ->
 * Hạng 3 đi -> Hạng 3 về -> Chung kết đi -> Chung kết về
 */
export function getMatchSortRank(m: Match): number {
  if (!m) return 99;

  if (m.id === 'm_ga_1') return 1;
  if (m.id === 'm_gb_1') return 2;
  if (m.id === 'm_ga_2') return 3;
  if (m.id === 'm_gb_2') return 4;
  if (m.id === 'm_ga_3') return 5;
  if (m.id === 'm_gb_3') return 6;
  if (m.id === 'm_semi1_1') return 7;
  if (m.id === 'm_semi2_1') return 8;
  if (m.id === 'm_semi1_2') return 9;
  if (m.id === 'm_semi2_2') return 10;
  if (m.id === 'm_h3_1') return 11;
  if (m.id === 'm_h3_2') return 12;
  if (m.id === 'm_ck_1') return 13;
  if (m.id === 'm_ck_2') return 14;

  const code = (m.matchCode || '').toLowerCase();
  const stage = m.stage || '';
  const leg = m.leg;
  const pairId = m.pairId || '';

  if (code.includes('1a') || (stage === 'group_a' && code.includes('1'))) return 1;
  if (code.includes('1b') || (stage === 'group_b' && code.includes('1'))) return 2;
  if (code.includes('2a') || (stage === 'group_a' && code.includes('2'))) return 3;
  if (code.includes('2b') || (stage === 'group_b' && code.includes('2'))) return 4;
  if (code.includes('3a') || (stage === 'group_a' && code.includes('3'))) return 5;
  if (code.includes('3b') || (stage === 'group_b' && code.includes('3'))) return 6;

  if (stage === 'semi' || code.includes('bk') || code.includes('bán kết') || code.includes('ban ket')) {
    const isSemi1 = pairId === 'semi_1' || code.includes('1');
    const isSemi2 = pairId === 'semi_2' || code.includes('2');
    const isLeg1 = leg === 1 || code.includes('lượt đi') || code.includes('luot di');
    const isLeg2 = leg === 2 || code.includes('lượt về') || code.includes('luot ve');

    if (isSemi1 && isLeg1) return 7;
    if (isSemi2 && isLeg1) return 8;
    if (isSemi1 && isLeg2) return 9;
    if (isSemi2 && isLeg2) return 10;

    if (isLeg1) return 7;
    if (isLeg2) return 9;
    return 7;
  }

  if (stage === 'third_place' || code.includes('hạng 3') || code.includes('hang 3')) {
    if (leg === 1 || code.includes('lượt đi') || code.includes('luot di')) return 11;
    if (leg === 2 || code.includes('lượt về') || code.includes('luot ve')) return 12;
    return 11;
  }

  if (stage === 'final' || code.includes('chung kết') || code.includes('chung ket') || code.includes('ck')) {
    if (leg === 1 || code.includes('lượt đi') || code.includes('luot di')) return 13;
    if (leg === 2 || code.includes('lượt về') || code.includes('luot ve')) return 14;
    return 13;
  }

  return 99;
}

export function sortMatchesByCanonicalOrder(matches: Match[]): Match[] {
  if (!Array.isArray(matches)) return [];
  return [...matches].sort((a, b) => getMatchSortRank(a) - getMatchSortRank(b));
}
