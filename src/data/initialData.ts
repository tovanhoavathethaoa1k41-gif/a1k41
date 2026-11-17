import { Team, Match, Podium } from '../types/tournament';

export const INITIAL_TEAMS: Team[] = [
  {
    id: 'phoi_fc',
    name: 'PHÔI FC',
    shortCode: 'ENG',
    group: 'A',
    nationalTeam: {
      name: 'ENGLAND',
      code: 'ENG',
      logo: '/logos/england.png'
    },
    players: [
      {
        id: 'p_phoi_1',
        name: 'Nguyễn Lê Đăng Khoa',
        teamId: 'phoi_fc',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      },
      {
        id: 'p_phoi_2',
        name: 'Nguyễn Minh Hào',
        teamId: 'phoi_fc',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      }
    ],
    stats: {
      played: 2,
      won: 1,
      drawn: 0,
      lost: 1,
      goalsFor: 4,
      goalsAgainst: 6,
      goalDifference: -2,
      points: 3
    }
  },
  {
    id: 'arsenal_an_4',
    name: 'ARSENAL ĂN 4',
    shortCode: 'BRA',
    group: 'A',
    nationalTeam: {
      name: 'BRAZIL',
      code: 'BRA',
      logo: '/logos/brazil.png'
    },
    players: [
      {
        id: 'p_arsenal_1',
        name: 'Lê Tiến Thành',
        teamId: 'arsenal_an_4',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      },
      {
        id: 'p_arsenal_2',
        name: 'Lưu Xuân Bách',
        teamId: 'arsenal_an_4',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      }
    ],
    stats: {
      played: 2,
      won: 1,
      drawn: 0,
      lost: 1,
      goalsFor: 7,
      goalsAgainst: 5,
      goalDifference: 2,
      points: 3
    }
  },
  {
    id: 'oceansky',
    name: 'OCEANSKY',
    shortCode: 'POR',
    group: 'A',
    nationalTeam: {
      name: 'PORTUGAL',
      code: 'POR',
      logo: '/logos/portugal.png'
    },
    players: [
      {
        id: 'p_ocean_1',
        name: 'Lương Công Tuấn',
        teamId: 'oceansky',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      },
      {
        id: 'p_ocean_2',
        name: 'Đặng Đại Dương Bảo',
        teamId: 'oceansky',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      }
    ],
    stats: {
      played: 2,
      won: 1,
      drawn: 0,
      lost: 1,
      goalsFor: 2,
      goalsAgainst: 2,
      goalDifference: 0,
      points: 3
    }
  },
  {
    id: 'dat_bao_dnc',
    name: 'DAT BAO DNC',
    shortCode: 'ARG',
    group: 'B',
    nationalTeam: {
      name: 'ARGENTINA',
      code: 'ARG',
      logo: '/logos/argentina.png'
    },
    players: [
      {
        id: 'p_datbao_1',
        name: 'Trịnh Gia Bảo',
        teamId: 'dat_bao_dnc',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      },
      {
        id: 'p_datbao_2',
        name: 'Phan Tiến Đạt',
        teamId: 'dat_bao_dnc',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      }
    ],
    stats: {
      played: 2,
      won: 2,
      drawn: 0,
      lost: 0,
      goalsFor: 13,
      goalsAgainst: 2,
      goalDifference: 11,
      points: 6
    }
  },
  {
    id: 'corner_fc',
    name: 'CORNER FC',
    shortCode: 'ESP',
    group: 'B',
    nationalTeam: {
      name: 'SPAIN',
      code: 'ESP',
      logo: '/logos/spain.png'
    },
    players: [
      {
        id: 'p_corner_1',
        name: 'Lưu Thái Hiệp',
        teamId: 'corner_fc',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      },
      {
        id: 'p_corner_2',
        name: 'Huỳnh Đăng Khoa',
        teamId: 'corner_fc',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      }
    ],
    stats: {
      played: 2,
      won: 1,
      drawn: 0,
      lost: 1,
      goalsFor: 4,
      goalsAgainst: 10,
      goalDifference: -6,
      points: 3
    }
  },
  {
    id: 'kihito_madam',
    name: 'KIHITO MADAM',
    shortCode: 'FRA',
    group: 'B',
    nationalTeam: {
      name: 'FRANCE',
      code: 'FRA',
      logo: '/logos/france.png'
    },
    players: [
      {
        id: 'p_kihito_1',
        name: 'Lê Minh Hiển',
        teamId: 'kihito_madam',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      },
      {
        id: 'p_kihito_2',
        name: 'Trần Hữu Nguyên Khang',
        teamId: 'kihito_madam',
        goals: 0,
        assists: 0,
        matchesPlayed: 2,
      }
    ],
    stats: {
      played: 2,
      won: 0,
      drawn: 0,
      lost: 2,
      goalsFor: 3,
      goalsAgainst: 8,
      goalDifference: -5,
      points: 0
    }
  }
];

export const INITIAL_MATCHES: Match[] = [
  // 1. Vòng 1A
  {
    id: 'm_ga_1',
    matchCode: 'Vòng 1A',
    stage: 'group_a',
    stageLabel: 'Bảng A',
    roundName: 'Vòng 1',
    homeTeamId: 'phoi_fc',
    awayTeamId: 'arsenal_an_4',
    homeScore: 3,
    awayScore: 6,
    status: 'completed',
    statusText: 'Đã đấu',
    homeGoals: [],
    awayGoals: []
  },
  // 2. Vòng 1B
  {
    id: 'm_gb_1',
    matchCode: 'Vòng 1B',
    stage: 'group_b',
    stageLabel: 'Bảng B',
    roundName: 'Vòng 1',
    homeTeamId: 'corner_fc',
    awayTeamId: 'dat_bao_dnc',
    homeScore: 1,
    awayScore: 8,
    status: 'completed',
    statusText: 'Đã đấu',
    homeGoals: [],
    awayGoals: []
  },
  // 3. Vòng 2A
  {
    id: 'm_ga_2',
    matchCode: 'Vòng 2A',
    stage: 'group_a',
    stageLabel: 'Bảng A',
    roundName: 'Vòng 2',
    homeTeamId: 'arsenal_an_4',
    awayTeamId: 'oceansky',
    homeScore: 1,
    awayScore: 2,
    status: 'completed',
    statusText: 'Đã đấu',
    homeGoals: [],
    awayGoals: []
  },
  // 4. Vòng 2B
  {
    id: 'm_gb_2',
    matchCode: 'Vòng 2B',
    stage: 'group_b',
    stageLabel: 'Bảng B',
    roundName: 'Vòng 2',
    homeTeamId: 'dat_bao_dnc',
    awayTeamId: 'kihito_madam',
    homeScore: 5,
    awayScore: 1,
    status: 'completed',
    statusText: 'Đã đấu',
    homeGoals: [],
    awayGoals: []
  },
  // 5. Vòng 3A
  {
    id: 'm_ga_3',
    matchCode: 'Vòng 3A',
    stage: 'group_a',
    stageLabel: 'Bảng A',
    roundName: 'Vòng 3',
    homeTeamId: 'oceansky',
    awayTeamId: 'phoi_fc',
    homeScore: 0,
    awayScore: 1,
    status: 'completed',
    statusText: 'Đã đấu',
    homeGoals: [],
    awayGoals: []
  },
  // 6. Vòng 3B
  {
    id: 'm_gb_3',
    matchCode: 'Vòng 3B',
    stage: 'group_b',
    stageLabel: 'Bảng B',
    roundName: 'Vòng 3',
    homeTeamId: 'kihito_madam',
    awayTeamId: 'corner_fc',
    homeScore: 2,
    awayScore: 3,
    status: 'completed',
    statusText: 'Đã đấu',
    homeGoals: [],
    awayGoals: []
  },

  // 7. Bán kết 1 (Lượt đi)
  {
    id: 'm_semi1_1',
    matchCode: 'BK 1 (Lượt đi)',
    stage: 'semi',
    stageLabel: 'Bán kết 1',
    roundName: 'Lượt đi',
    leg: 1,
    pairId: 'semi_1',
    homeTeamId: 'nhat_a',
    awayTeamId: 'nhi_b',
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    statusText: 'Chưa đấu',
    homeGoals: [],
    awayGoals: []
  },
  // 8. Bán kết 2 (Lượt đi)
  {
    id: 'm_semi2_1',
    matchCode: 'BK 2 (Lượt đi)',
    stage: 'semi',
    stageLabel: 'Bán kết 2',
    roundName: 'Lượt đi',
    leg: 1,
    pairId: 'semi_2',
    homeTeamId: 'nhat_b',
    awayTeamId: 'nhi_a',
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    statusText: 'Chưa đấu',
    homeGoals: [],
    awayGoals: []
  },
  // 9. Bán kết 1 (Lượt về)
  {
    id: 'm_semi1_2',
    matchCode: 'BK 1 (Lượt về)',
    stage: 'semi',
    stageLabel: 'Bán kết 1',
    roundName: 'Lượt về',
    leg: 2,
    pairId: 'semi_1',
    homeTeamId: 'nhi_b',
    awayTeamId: 'nhat_a',
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    statusText: 'Chưa đấu',
    homeGoals: [],
    awayGoals: []
  },
  // 10. Bán kết 2 (Lượt về)
  {
    id: 'm_semi2_2',
    matchCode: 'BK 2 (Lượt về)',
    stage: 'semi',
    stageLabel: 'Bán kết 2',
    roundName: 'Lượt về',
    leg: 2,
    pairId: 'semi_2',
    homeTeamId: 'nhi_a',
    awayTeamId: 'nhat_b',
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    statusText: 'Chưa đấu',
    homeGoals: [],
    awayGoals: []
  },

  // 11. Tranh Hạng 3 (Lượt đi)
  {
    id: 'm_h3_1',
    matchCode: 'Tranh Hạng 3 (Lượt đi)',
    stage: 'third_place',
    stageLabel: 'Tranh Hạng 3',
    roundName: 'Lượt đi',
    leg: 1,
    pairId: 'third_place',
    homeTeamId: 'thua_bk1',
    awayTeamId: 'thua_bk2',
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    statusText: 'Chưa đấu',
    homeGoals: [],
    awayGoals: []
  },
  // 12. Tranh Hạng 3 (Lượt về)
  {
    id: 'm_h3_2',
    matchCode: 'Tranh Hạng 3 (Lượt về)',
    stage: 'third_place',
    stageLabel: 'Tranh Hạng 3',
    roundName: 'Lượt về',
    leg: 2,
    pairId: 'third_place',
    homeTeamId: 'thua_bk2',
    awayTeamId: 'thua_bk1',
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    statusText: 'Chưa đấu',
    homeGoals: [],
    awayGoals: []
  },

  // 13. Chung kết (Lượt đi)
  {
    id: 'm_ck_1',
    matchCode: 'Chung kết (Lượt đi)',
    stage: 'final',
    stageLabel: 'Chung kết',
    roundName: 'Lượt đi',
    leg: 1,
    pairId: 'final',
    homeTeamId: 'thang_bk1',
    awayTeamId: 'thang_bk2',
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    statusText: 'Chưa đấu',
    homeGoals: [],
    awayGoals: []
  },
  // 14. Chung kết (Lượt về)
  {
    id: 'm_ck_2',
    matchCode: 'Chung kết (Lượt về)',
    stage: 'final',
    stageLabel: 'Chung kết',
    roundName: 'Lượt về',
    leg: 2,
    pairId: 'final',
    homeTeamId: 'thang_bk2',
    awayTeamId: 'thang_bk1',
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    statusText: 'Chưa đấu',
    homeGoals: [],
    awayGoals: []
  }
];

export const INITIAL_PODIUM: Podium = {
  champion: 'Chờ Chung kết',
  runnerUp: 'Chờ Chung kết',
  thirdPlace: 'Chờ Tranh Hạng Ba',
  fourthPlace: 'Chờ Tranh Hạng Ba',
  fifthPlace: ['PHÔI FC (ENG)', 'KIHITO MADAM (FRA)']
};
