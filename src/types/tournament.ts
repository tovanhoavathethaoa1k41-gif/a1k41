export interface PlayerStatBreakdown {
  ovr: number;
  knockout: number;
  group: number;
  penalty?: number;
  nonPenalty?: number;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  goals: number;
  assists: number;
  yellowCards?: number;
  redCards?: number;
  matchesPlayed: number;
  breakdown?: {
    goals: PlayerStatBreakdown;
    assists: PlayerStatBreakdown;
    yellowCards: PlayerStatBreakdown;
    redCards: PlayerStatBreakdown;
    ga: PlayerStatBreakdown; // Goals + Assists
  };
}

export interface NationalTeam {
  name: string;
  code: string;
  logo: string; // Transparent PNG path
}

export interface TeamStats {
  played: number; // group matches
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  // Tournament-wide aggregate stats (Group + Knockout)
  totalMatchesAll?: number;
  totalGoalsFor?: number;
  totalGoalsAgainst?: number;
  avgGoalsFor?: number;
  avgGoalsAgainst?: number;
}

export interface Team {
  id: string;
  name: string;
  shortCode: string;
  group: 'A' | 'B';
  nationalTeam: NationalTeam;
  players: Player[];
  stats: TeamStats;
}

export interface GoalDetail {
  id: string;
  scorer: string;
  minute?: string; // e.g. "14'", "90+2'", "120+1'"
  assister?: string; // e.g. "Nguyễn Minh Hào"
  isPenalty?: boolean; // true if penalty goal, false if open play
  /**
   * Phản lưới nhà (own goal): tính 1 bàn cho đội được hưởng (đội chứa bàn này), không thuộc cầu thủ nào.
   */
  isOwnGoal?: boolean;
}

export interface CardDetail {
  id: string;
  player: string;
  minute?: string; // e.g. "35'", "90+3'"
  type: 'yellow' | 'red';
}

export interface PenaltyShootoutRound {
  round: number; // 1, 2, 3, 4, 5...
  homeShooter?: string;
  homeScored: boolean; // true = goal, false = miss
  awayShooter?: string;
  awayScored: boolean; // true = goal, false = miss
}

export type MatchStage = 'group_a' | 'group_b' | 'semi' | 'third_place' | 'final';

export interface Match {
  id: string;
  matchCode: string; // e.g. "Vòng 1A", "BK 1 (Lượt đi)", "CK (Lượt về)"
  stage: MatchStage;
  stageLabel: string;
  roundName: string; // e.g. "Lượt đi", "Lượt về", "Vòng 1"
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  penaltyShootout?: PenaltyShootoutRound[];
  status: 'completed' | 'in_progress' | 'upcoming';
  statusText: string; // "Đã đấu", "Đang đấu", "Chưa đấu"
  leg?: 1 | 2 | 'aggregate';
  pairId?: string;
  homeGoals: GoalDetail[];
  awayGoals: GoalDetail[];
  homeCards?: CardDetail[];
  awayCards?: CardDetail[];
}

export interface GroupStanding {
  rank: number;
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  status: 'qualified' | 'eliminated';
}

export interface Podium {
  champion: string;
  runnerUp: string;
  thirdPlace: string;
  fourthPlace: string;
  fifthPlace: string[];
}
