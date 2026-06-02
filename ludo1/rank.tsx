import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { io, Socket } from 'socket.io-client';
import { getBaseUrl, authHeaders } from '../api';
import { useAuth } from '../auth/AuthContext';
import { baseUrl } from './../api';

const { width: W } = Dimensions.get('window');
const s = (size: number) => (W / 390) * size;

const teamLogos: Record<string, any> = {
  'Andhra Blasters': require('../assets/teamLogo/AndhraBlasters.png'),
  AndhraBlasters: require('../assets/teamLogo/AndhraBlasters.png'),
  'Bangalore Indians': require('../assets/teamLogo/BangaloreIndians.png'),
  BangaloreIndians: require('../assets/teamLogo/BangaloreIndians.png'),
  'Bhopal Titans': require('../assets/teamLogo/BhopalTitans.png'),
  BhopalTitans: require('../assets/teamLogo/BhopalTitans.png'),
  'Chennai Superstars': require('../assets/teamLogo/ChennaiSuperstars.png'),
  ChennaiSuperstars: require('../assets/teamLogo/ChennaiSuperstars.png'),
  'Cuttack Gladiators': require('../assets/teamLogo/CuttackGladiators.png'),
  CuttackGladiators: require('../assets/teamLogo/CuttackGladiators.png'),
  'Delhi Fighters': require('../assets/teamLogo/DelhiFighters.png'),
  DelhiFighters: require('../assets/teamLogo/DelhiFighters.png'),
  'Gujarat Commandos': require('../assets/teamLogo/GujaratCommandos.png'),
  GujaratCommandos: require('../assets/teamLogo/GujaratCommandos.png'),
  'Guwahati Champions': require('../assets/teamLogo/GuwahatiChampions.png'),
  GuwahatiChampions: require('../assets/teamLogo/GuwahatiChampions.png'),
  'Hyderabad Nawabs': require('../assets/teamLogo/HyderabadNawabs.png'),
  HyderabadNawabs: require('../assets/teamLogo/HyderabadNawabs.png'),
  'Kerala Riders': require('../assets/teamLogo/KeralaRiders.png'),
  KeralaRiders: require('../assets/teamLogo/KeralaRiders.png'),
  'Kolkata Invincibles': require('../assets/teamLogo/KolkataInvincibles.png'),
  KolkataInvincibles: require('../assets/teamLogo/KolkataInvincibles.png'),
  'Lucknow Royals': require('../assets/teamLogo/LucknowRoyals.png'),
  LucknowRoyals: require('../assets/teamLogo/LucknowRoyals.png'),
  'Mumbai Runners': require('../assets/teamLogo/MumbaiRunners.png'),
  MumbaiRunners: require('../assets/teamLogo/MumbaiRunners.png'),
  'Nagpur Legends': require('../assets/teamLogo/NagpurLegends.png'),
  NagpurLegends: require('../assets/teamLogo/NagpurLegends.png'),
  'Patna Kings': require('../assets/teamLogo/PatnaKings.png'),
  PatnaKings: require('../assets/teamLogo/PatnaKings.png'),
  'Punjab Giants': require('../assets/teamLogo/PunjabGiants.png'),
  PunjabGiants: require('../assets/teamLogo/PunjabGiants.png'),
  'Pune Warriors': require('../assets/teamLogo/PuneWarriors.png'),
  PuneWarriors: require('../assets/teamLogo/PuneWarriors.png'),
  'Raipur Challengers': require('../assets/teamLogo/RaipurChallengers.png'),
  RaipurChallengers: require('../assets/teamLogo/RaipurChallengers.png'),
  'Ranchi Daredevils': require('../assets/teamLogo/RanchiDaredevils.png'),
  RanchiDaredevils: require('../assets/teamLogo/RanchiDaredevils.png'),
  'Rajasthan Stormers': require('../assets/teamLogo/RajasthanStormers.png'),
  RajasthanStormers: require('../assets/teamLogo/RajasthanStormers.png'),
};

const normalizeTeamName = (team?: string | null) =>
  (team || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizedTeamLogos = Object.entries(teamLogos).reduce<
  Record<string, any>
>((logos, [teamName, logo]) => {
  logos[normalizeTeamName(teamName)] = logo;
  return logos;
}, {});

const getTeamLogo = (team?: string | null) =>
  team ? teamLogos[team] || normalizedTeamLogos[normalizeTeamName(team)] : null;

const getTeamInitials = (team?: string | null) =>
  (team || '-')
    .split(/(?=[A-Z])|\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('') || '-';

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

type RankTab = 'Team Rank' | 'Player Rank';
type RankFilter =
  | 'home'
  | 'moves'
  | 'kills'
  | 'moveup'
  | 'movedown'
  | 'points'
  | 'dice';
type ApiRankObject = {
  rank?: number;
  moves?: number;
  movesGained?: number;
  movesLost?: number;
  kills?: number;
  homes?: number;
};

type LeaderboardApiRow = {
  rank?: number | ApiRankObject;
  teamName?: string | null;
  managerName?: string | null;
  mrName?: string | null;
  totalPoints?: number;
  totalHomePawns?: number;
  metricValue?: number;
  isHighlighted?: boolean;
};

type LeaderboardApiResponse = {
  success: boolean;
  data?: LeaderboardApiRow[];
  highlight?: LeaderboardApiRow | null;
  message?: string;
};

type LeaderboardRow = {
  rank: number;
  team: string | null;
  captain: string;
  moves: number;
  home: number;
  kills: number;
  moveUp: number;
  moveDown: number;
  dice: number;
  points: number;
  isHighlighted: boolean;
};

const getRankNumber = (rank?: number | ApiRankObject) =>
  typeof rank === 'object' ? Number(rank.rank || 0) : Number(rank || 0);

const getMoves = (rank?: number | ApiRankObject, metricValue?: number) =>
  typeof rank === 'object' ? Number(rank.moves || 0) : Number(metricValue || 0);

const mapLeaderboardRow = (
  item: LeaderboardApiRow,
  index: number,
  activeTab: RankTab,
): LeaderboardRow => {
  const rankObj = typeof item.rank === 'object' ? item.rank : null;

  return {
    rank: getRankNumber(item.rank) || index + 1,

    team: item.teamName || null,

    captain:
      activeTab === 'Team Rank'
        ? item.managerName || 'Unknown'
        : item.mrName || 'Unknown',

    moves:
      activeTab === 'Player Rank'
        ? Number(rankObj?.moves || 0)
        : getMoves(item.rank, item.metricValue),

    home:
      activeTab === 'Player Rank'
        ? Number(rankObj?.homes || 0)
        : Number(item.totalHomePawns || 0),

    kills:
      activeTab === 'Player Rank'
        ? Number(rankObj?.kills || 0)
        : Number(item.metricValue || 0),

    moveUp:
      activeTab === 'Player Rank'
        ? Number(rankObj?.movesGained || 0)
        : Number(item.metricValue || 0),
moveDown:
  activeTab === 'Player Rank'
    ? Number(rankObj?.movesLost || 0)
    : Number(item.metricValue || 0),

dice:
  activeTab === 'Player Rank'
    ? Number(item.metricValue || 0)
    : Number(item.metricValue || 0),

points: Number(item.totalPoints || 0),

    isHighlighted: Boolean(item.isHighlighted),
  };
};

const monthRangeForCurrentYear = (month: string | null) => {
  if (!month) {
    return null;
  }

  const monthIndex = MONTHS.indexOf(month);

  if (monthIndex < 0) {
    return null;
  }

  const year = new Date().getFullYear();

  const startDate = new Date(year, monthIndex, 1);

  const endDate = new Date(year, monthIndex + 1, 0);

  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    startDate: format(startDate),
    endDate: format(endDate),
  };
};

const renderLogo = (team?: string | null, style?: any) => {
  const logo = getTeamLogo(team);
  if (logo) {
    return <Image source={logo} style={style || styles.teamLogo} />;
  }

  return (
    <View style={[style || styles.teamLogo, styles.logoPlaceholder]}>
      <Text style={styles.logoPlaceholderText}>{getTeamInitials(team)}</Text>
    </View>
  );
};

const getWeeksForMonth = (month: string | null) => {
  if (!month) {
    return [];
  }

  const monthIndex = MONTHS.indexOf(month);

  if (monthIndex < 0) {
    return [];
  }

  const year = new Date().getFullYear();

  const firstDay = new Date(year, monthIndex, 1);

  const lastDay = new Date(year, monthIndex + 1, 0);

  const weeks = [];

  const current = new Date(firstDay);

  while (current.getDay() !== 1) {
    current.setDate(current.getDate() - 1);
  }

  while (current <= lastDay) {
    const start = new Date(current);

    const end = new Date(current);
    end.setDate(end.getDate() + 6);

    const format = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0',
      )}-${String(date.getDate()).padStart(2, '0')}`;

    const display = (date: Date) =>
      `${date.getDate()} ${MONTHS[date.getMonth()]}`;

    weeks.push({
      label: `${display(start)} - ${display(end)}`,
      startDate: format(start),
      endDate: format(end),
    });

    current.setDate(current.getDate() + 7);
  }

  return weeks;
};
const LeaderboardScreen: React.FC = () => {
  const { session, user } = useAuth();
  const baseUrl = session?.backendUrl || '';
  const [activeTab, setActiveTab] = useState<RankTab>('Team Rank');
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<{
    startDate: string;
    endDate: string;
    label: string;
  } | null>(null);
  const [activeFilter, setActiveFilter] = useState<RankFilter>('home');
  const [data, setData] = useState<LeaderboardRow[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => {
    if (activeTab === 'Team Rank' && activeFilter === 'points') {
      setActiveFilter('home');
    }
  }, [activeTab, activeFilter]);
  const FILTERS: {
    key: RankFilter;
    label: string;
    icon: any;
  }[] = [
    {
      key: 'home',
      label: 'Home',
      icon: require('../assets/gameAssets/home.png'),
    },

    {
      key: 'moves',
      label: 'Moves',
      icon: require('../assets/gameAssets/moves.png'),
    },

    {
      key: 'kills',
      label: 'Kills',
      icon: require('../assets/gameAssets/kill.png'),
    },

    {
      key: 'moveup',
      label: 'Move +',
      icon: require('../assets/gameAssets/move-gain.png'),
    },

    {
      key: 'movedown',
      label: 'Move -',
      icon: require('../assets/gameAssets/move-loss.png'),
    },
    {
      key: 'dice',
      label: 'Dice Roll',
      icon: require('../assets/newAssets/bgdice.png'),
    },

    ...(activeTab === 'Player Rank'
      ? [
          {
            key: 'points' as RankFilter,
            label: 'Points',
            icon: require('../assets/gameAssets/Coin-homepage.png'),
          },
        ]
      : []),
  ];
  const weeks = useMemo(() => getWeeksForMonth(activeMonth), [activeMonth]);
  const sortBy = activeFilter;

//   const leaderboardUrl = useMemo(() => {
//     let endpoint = '/api/flm/leaderboard/home';

//     if (activeTab === 'Team Rank') {
//       if (activeFilter === 'home') {
//         endpoint = '/api/flm/leaderboard/home';
//       }

//       if (activeFilter === 'moves') {
//         endpoint = '/api/flm/leaderboard/moves';
//       }

//       if (activeFilter === 'kills') {
//         endpoint = '/api/flm/leaderboard/kills';
//       }

//       if (activeFilter === 'moveup') {
//         endpoint = '/api/flm/leaderboard/moves-earned';
//       }

//       if (activeFilter === 'movedown') {
//         endpoint = '/api/flm/leaderboard/moves-lost';
//       }
//       if (activeFilter === 'dice') {
//   endpoint =
//     '/api/flm/leaderboard/dice-roll-balance?division=team&limit=all&managerLevel=flm';
// }
      
//     }

//  if (activeTab === 'Player Rank') {
//   endpoint = '/api/flm/leaderboard/mr-points';

//   if (activeFilter === 'dice') {
//     endpoint = '/api/flm/leaderboard/dice-roll-balance';
//   }
// }
//   const params = new URLSearchParams({
//       limit: '10',
//       userId: user?.id || '',
//       userRole: (user?.role || '').toLowerCase(),
//       sortBy,
//     });
//     const range = selectedWeek || monthRangeForCurrentYear(activeMonth);

//     if (range) {
//       params.set('startDate', range.startDate);
//       params.set('endDate', range.endDate);
//     }

//     if (
//   activeTab === 'Team Rank' &&
//   activeFilter === 'dice'
// ) {
//   return `${baseUrl}${endpoint}&${params.toString()}`;
// }

// return `${baseUrl}${endpoint}?${params.toString()}`;
//     }, [
//   activeMonth,
//   selectedWeek,
//   activeTab,
//   sortBy,
//   user?.id,
//   user?.role,
// ]);

  // const loadLeaderboard = useCallback(async () => {
  //   if (!user?.id) {
  //     setData([]);
  //     setMyRank(null);
  //     return;
  //   }

  //   try {
  //     setIsLoading(true);
  //     setErrorMessage('');

  //     const response = await fetch(leaderboardUrl, {
  //       headers: authHeaders(session?.token),
  //     });

  //     const text = await response.text();

  //     // console.log('RAW RESPONSE =>', text);

  //     let json: LeaderboardApiResponse;

  //     try {
  //       json = JSON.parse(text);
  //     } catch (e) {
  //       throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
  //     }

  //     if (!response.ok || !json.success) {
  //       setData([]);
  //       setMyRank(null);
  //       setErrorMessage(json.message || 'Unable to load leaderboard.');
  //       return;
  //     }
  //     console.log('FIRST ROW =>', JSON.stringify(json.data?.[0], null, 2));

  //     const mappedData = (json.data || []).map((item, index) =>
  //       mapLeaderboardRow(item, index, activeTab),
  //     );
  //     const mappedHighlight = json.highlight
  //       ? mapLeaderboardRow(json.highlight, 0, activeTab)
  //       : mappedData.find(item => item.isHighlighted) || null;

  //     setData(mappedData);
  //     setMyRank(mappedHighlight);
  //   } catch (error) {
  //     setData([]);
  //     setMyRank(null);
  //     setErrorMessage(
  //       error instanceof Error ? error.message : 'Unable to load leaderboard.',
  //     );
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [activeTab, leaderboardUrl, session?.token, user?.id]);

  const loadLeaderboard = useCallback(async () => {

  if (!user?.id) {
    setData([]);
    setMyRank(null);
    return;
  }

  try {

    setIsLoading(true);
    setErrorMessage('');

    const baseUrl = await getBaseUrl();

    let endpoint = '/api/flm/leaderboard/home';

    if (activeTab === 'Team Rank') {

      if (activeFilter === 'moves') {
        endpoint = '/api/flm/leaderboard/moves';
      }

      if (activeFilter === 'kills') {
        endpoint = '/api/flm/leaderboard/kills';
      }

      if (activeFilter === 'moveup') {
        endpoint =
          '/api/flm/leaderboard/moves-earned';
      }

      if (activeFilter === 'movedown') {
        endpoint =
          '/api/flm/leaderboard/moves-lost';
      }

      if (activeFilter === 'dice') {
        endpoint =
          '/api/flm/leaderboard/dice-roll-balance?division=team&limit=all&managerLevel=flm';
      }
    }

    if (activeTab === 'Player Rank') {

      endpoint = '/api/flm/leaderboard/mr-points';

      if (activeFilter === 'dice') {
        endpoint =
          '/api/flm/leaderboard/dice-roll-balance';
      }
    }

    const params = new URLSearchParams({
      limit: '10',
      userId: user?.id || '',
      userRole: (user?.role || '').toLowerCase(),
      sortBy: activeFilter,
    });

    const range =
      selectedWeek ||
      monthRangeForCurrentYear(activeMonth);

    if (range) {
      params.set('startDate', range.startDate);
      params.set('endDate', range.endDate);
    }

    const leaderboardUrl =
      activeTab === 'Team Rank' &&
      activeFilter === 'dice'
        ? `${baseUrl}${endpoint}&${params.toString()}`
        : `${baseUrl}${endpoint}?${params.toString()}`;

    console.log(
      'LEADERBOARD URL =>',
      leaderboardUrl,
    );

    const response = await fetch(
      leaderboardUrl,
      {
        headers: authHeaders(session?.token),
      },
    );

    const text = await response.text();

    console.log(
      'LEADERBOARD RAW =>',
      text,
    );

    let json: LeaderboardApiResponse;

    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(
        `Invalid JSON response: ${text.slice(
          0,
          100,
        )}`,
      );
    }

    if (!response.ok || !json.success) {

      setData([]);
      setMyRank(null);

      setErrorMessage(
        json.message ||
          'Unable to load leaderboard.',
      );

      return;
    }

    const mappedData = (
      json.data || []
    ).map((item, index) =>
      mapLeaderboardRow(
        item,
        index,
        activeTab,
      ),
    );

    const mappedHighlight = json.highlight
      ? mapLeaderboardRow(
          json.highlight,
          0,
          activeTab,
        )
      : mappedData.find(
          item => item.isHighlighted,
        ) || null;

    setData(mappedData);
    setMyRank(mappedHighlight);

  } catch (error) {

    setData([]);
    setMyRank(null);

    setErrorMessage(
      error instanceof Error
        ? error.message
        : 'Unable to load leaderboard.',
    );

  } finally {
    setIsLoading(false);
  }

}, [
  activeMonth,
  selectedWeek,
  activeTab,
  activeFilter,
  session?.token,
  user?.id,
  user?.role,
]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    const socket: Socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.on('boardSummaryUpdated', loadLeaderboard);
    socket.on('uploadCreated', loadLeaderboard);
    socket.on('uploadStatusChanged', loadLeaderboard);
    socket.on('activePlayerJoined', loadLeaderboard);
    socket.on('activePlayerLeft', loadLeaderboard);

    return () => {
      socket.off('boardSummaryUpdated');
      socket.off('uploadCreated');
      socket.off('uploadStatusChanged');
      socket.off('activePlayerJoined');
      socket.off('activePlayerLeft');
      socket.disconnect();
    };
  }, [loadLeaderboard]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/newAssets/bgMain.png')}
        style={styles.bg}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.sectionWrap}>
          <LinearGradient
            colors={['#0d1537', '#7b92ea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topTabs}
          >
            {(['Team Rank', 'Player Rank'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab !== tab && styles.tabInactive]}
              >
                {activeTab === tab ? (
                  <LinearGradient
                    colors={['#8d5ce7', '#a59de4', '#8d5ce7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabGradient}
                  >
                    <Text style={styles.tabTextActive}>{tab}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.tabText}>{tab}</Text>
                )}
              </TouchableOpacity>
            ))}
          </LinearGradient>
        </View>

        <View style={styles.sectionWrap}>
          <LinearGradient
            colors={['#0d1537', '#7b92ea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.monthScroll}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {MONTHS.map(month => (
                <TouchableOpacity
                  key={month}
                  onPress={() => {
                    setSelectedWeek(null);

                    setActiveMonth(prev => (prev === month ? null : month));
                  }}
                  style={styles.monthItem}
                >
                  <Text
                    style={[
                      styles.monthText,
                      activeMonth === month && styles.monthActive,
                    ]}
                  >
                    {month}
                  </Text>
                  {activeMonth === month && (
                    <View style={styles.monthUnderline} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </LinearGradient>
        </View>
              {activeMonth && (
  <View style={styles.sectionWrap}>
     <LinearGradient
    colors={['#0d1537', '#7b92ea']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.monthScroll}
  >
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {weeks.map(week => (
        <TouchableOpacity
          key={week.label}
          onPress={() =>
            setSelectedWeek(week)
          }
          style={[
            styles.weekCard,
            selectedWeek?.label ===
              week.label &&
              styles.weekCardActive,
          ]}
        >
          <Text style={styles.weekText}>
            {week.label}
          </Text>

          <Text style={styles.weekDate}>
            {week.startDate} → {week.endDate}
          </Text>
        </TouchableOpacity>
      ))}
      
    </ScrollView>
    </LinearGradient>
  </View>
)}
        <View style={styles.sectionWrap}>
          <LinearGradient
            colors={['#0d1537', '#7b92ea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.filterBar}
          >
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.filterBtn,
                  activeFilter !== f.key && styles.filterInactive,
                ]}
              >
                {activeFilter === f.key ? (
                  <LinearGradient
                    colors={['#8d5ce7', '#a59de4', '#8d5ce7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterGradient}
                  >
                    <Image source={f.icon} style={styles.filterIcon} />
                    {/* <Text style={styles.filterLabelActive}>{f.label}</Text> */}
                  </LinearGradient>
                ) : (
                  <>
                    <Image source={f.icon} style={styles.filterIcon} />
                    {/* <Text style={styles.filterLabel}>{f.label}</Text> */}
                  </>
                )}
              </TouchableOpacity>
            ))}
          </LinearGradient>
        </View>

        <View style={styles.userRankBorder}>
          <LinearGradient
            colors={['#8d5ce7', '#a59de4', '#8d5ce7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.userRankCard}
          >
            <Text style={styles.userRankLabel}>YOUR RANK</Text>
            {myRank ? (
              <View style={styles.userRankRow}>
                <View style={styles.userRankLeft}>
                  <Text style={styles.userRankNum}>#{myRank.rank}</Text>
                  {renderLogo(myRank.team, styles.userRankLogo)}
                  <Text style={styles.userRankName}>
                    {activeTab === 'Team Rank'
                      ? myRank.team || '-'
                      : myRank.captain}
                  </Text>
                </View>
                <View style={styles.userRankRight}>
                  {/* <View style={styles.userRankStat}>
                    <Image
                      source={require('../assets/gameAssets/moves.png')}
                      style={styles.statIconSmall}
                    />
                    <Text style={styles.userRankStatText}>
                      {myRank.moves} moves
                    </Text>
                  </View> */}
                  <View style={styles.userRankStat}>
                   <Image
  source={
    activeFilter === 'home'
      ? require('../assets/gameAssets/home.png')
      : activeFilter === 'moves'
      ? require('../assets/gameAssets/moves.png')
      : activeFilter === 'kills'
      ? require('../assets/gameAssets/kill.png')
      : activeFilter === 'moveup'
      ? require('../assets/gameAssets/move-gain.png')
      : activeFilter === 'movedown'
      ? require('../assets/gameAssets/move-loss.png')
      : activeFilter === 'dice'
      ? require('../assets/newAssets/bgdice.png')
      : require('../assets/gameAssets/Coin-homepage.png')
  }
  style={styles.statIconSmall}
/>
                    <Text style={styles.userRankStatText}>
                      {activeFilter === 'points'
                        ? `${myRank.points} pts`
                        : activeFilter === 'home'
                        ? `${myRank.home} home`
                        : activeFilter === 'kills'
                        ? `${myRank.kills} kills`
                        : activeFilter === 'moveup'
                        ? `${myRank.moveUp} move+`
                        : activeFilter === 'dice'
                        ? `${myRank.dice} Dice`
                        : activeFilter === 'movedown'
                        ? `${myRank.moveDown} move-`
                        : `${myRank.moves} moves`}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.noRankText}>No rank available</Text>
            )}
          </LinearGradient>
        </View>

        <View style={styles.barBorder}>
          <LinearGradient
            colors={['#7b92ea', '#0d1537']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tableHeader}
          >
            <Text style={[styles.headerText, styles.rankHeader]}>#</Text>
            <Text style={[styles.headerText, styles.logoHeader]}>Team</Text>
            <Text style={[styles.headerText, styles.nameHeader]}>
              {activeTab === 'Team Rank' ? 'Team Name' : 'Player'}
            </Text>
            {activeFilter === 'home' && (
              <Text style={[styles.headerText, styles.metricHeader]}>Home</Text>
            )}
            {activeFilter === 'moves' && (
              <Text style={[styles.headerText, styles.metricHeader]}>
                Moves
              </Text>
            )}
            {activeFilter === 'kills' && (
              <Text style={[styles.headerText, styles.metricHeader]}>
                Kills
              </Text>
            )}
            {activeFilter === 'moveup' && (
              <Text style={[styles.headerText, styles.metricHeader]}>
                Move +
              </Text>
            )}

            {activeFilter === 'movedown' && (
              <Text style={[styles.headerText, styles.metricHeader]}>
                Move -
              </Text>
            )}
            {activeFilter === 'points' && (
              <Text style={[styles.headerText, styles.metricHeader]}>
                Points
              </Text>
            )}
            {activeFilter === 'dice' && (
  <Text style={[styles.headerText, styles.metricHeader]}>
    Dice Rolls
  </Text>
)}
          </LinearGradient>
        </View>

        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : errorMessage ? (
            <Text style={styles.emptyText}>{errorMessage}</Text>
          ) : data.length === 0 ? (
            <Text style={styles.emptyText}>No rank data</Text>
          ) : (
            data.map(item => (
              <LinearGradient
                key={`${item.rank}-${item.team}-${item.captain}`}
                colors={
                  item.isHighlighted
                    ? ['#b889ff', '#5b43bc']
                    : ['#a6b1dd', '#293772']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.row}
              >
                <Text style={styles.rankNumber}>
                  {item.rank <= 3
                    ? ['1', '2', '3'][item.rank - 1]
                    : `${item.rank}.`}
                </Text>
                {renderLogo(item.team)}
                <Text style={styles.captainName}>
                  {activeTab === 'Team Rank' ? item.team || '-' : item.captain}
                </Text>
                {activeFilter === 'moves' && (
                  <Text style={styles.moveCount}>{item.moves}</Text>
                )}
                {activeFilter === 'home' && (
                  <Text style={styles.moveCount}>{item.home}</Text>
                )}

                {activeFilter === 'kills' && (
                  <Text style={styles.moveCount}>{item.kills}</Text>
                )}
                {activeFilter === 'moveup' && (
                  <Text style={styles.moveCount}>{item.moveUp}</Text>
                )}

                {activeFilter === 'movedown' && (
                  <Text style={styles.moveCount}>{item.moveDown}</Text>
                )}
                {activeFilter === 'points' && (
                  <Text style={styles.moveCount}>{item.points}</Text>
                )}
                {activeFilter === 'dice' && (
  <Text style={styles.moveCount}>{item.dice}</Text>
)}
              </LinearGradient>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create<Record<string, any>>({
  container: { flex: 1, backgroundColor: '#0A0066' },
  bg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  safeArea: { flex: 1 },
  sectionWrap: { marginHorizontal: s(15), marginTop: s(10) },
  barBorder: {
    marginHorizontal: s(15),
    marginTop: s(10),
    borderRadius: s(25),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  topTabs: {
    flexDirection: 'row',
    borderRadius: s(25),
    paddingHorizontal: s(4),
    paddingVertical: s(4),
  },
  tab: { flex: 1, borderRadius: s(20), overflow: 'hidden' },
  tabInactive: { alignItems: 'center', paddingVertical: s(10) },
  tabGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(10),
    borderRadius: s(20),
  },
  tabText: { color: '#CCC', fontWeight: '600', fontSize: s(13) },
  tabTextActive: { color: '#FFF', fontWeight: 'bold', fontSize: s(13) },
  weekCard: {
  backgroundColor: '#233b9f',
  borderRadius: s(14),
  paddingHorizontal: s(10),
  paddingVertical: s(10),
  marginRight: s(4),
  minWidth: s(120),
},

weekCardActive: {
  backgroundColor: '#7B61FF',
},

weekText: {
  color: '#fff',
  fontWeight: '700',
  fontSize: s(12),
},

weekDate: {
  color: 'rgba(255,255,255,0.7)',
  fontSize: s(10),
  marginTop: s(3),
},
  monthScroll: {
    borderRadius: s(25),
    paddingHorizontal: s(15),
    paddingVertical: s(4),
  },
  monthItem: { alignItems: 'center', marginRight: s(20) },
  monthText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: s(12),
    paddingVertical: s(6),
  },
  monthActive: { color: '#fff', fontWeight: 'bold' },
  monthUnderline: {
    height: 2,
    width: '100%',
    backgroundColor: '#7B61FF',
    borderRadius: 2,
  },
  filterBar: {
    flexDirection: 'row',
    borderRadius: s(25),
    paddingHorizontal: s(4),
    paddingVertical: s(4),
  },
  filterBtn: { flex: 1, borderRadius: s(22), overflow: 'hidden' },
  filterInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(8),
  },
  filterGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(8),
    borderRadius: s(22),
  },
  filterIcon: {
    width: s(24),
    height: s(24),
    resizeMode: 'contain',
    marginRight: s(5),
  },
  filterLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: s(11),
    fontWeight: '600',
  },
  filterLabelActive: { color: '#fff', fontWeight: 'bold' },
  userRankBorder: {
    marginHorizontal: s(15),
    marginTop: s(12),
    borderRadius: s(50),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  userRankCard: {
    borderRadius: s(50),
    paddingHorizontal: s(18),
    paddingVertical: s(4),
  },
  userRankLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: s(10),
    marginBottom: s(2),
  },
  userRankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    flex: 1,
  },
  userRankNum: { color: '#FFD700', fontWeight: 'bold', fontSize: s(16) },
  userRankLogo: { width: s(32), height: s(32), resizeMode: 'contain' },
  userRankName: { color: '#fff', fontWeight: 'bold', fontSize: s(13), flex: 1 },
  userRankRight: { alignItems: 'flex-end', gap: s(4), bottom: s(6) },
  userRankStat: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  userRankStatText: { color: '#fff', fontSize: s(14) },
  noRankText: { color: '#fff', fontSize: s(12), fontWeight: '700' },
  statIconSmall: { width: s(26), height: s(26), resizeMode: 'contain' },
  tableHeader: {
    flexDirection: 'row',
    borderRadius: s(25),
    paddingHorizontal: s(20),
    paddingVertical: s(10),
    alignItems: 'center',
  },
  headerText: { color: '#BBB', fontSize: s(11), fontWeight: '600' },
  rankHeader: { width: s(30) },
  logoHeader: { width: s(40) },
  nameHeader: { flex: 1, marginLeft: s(10) },
  metricHeader: { width: s(55), textAlign: 'right' },
  listContainer: { flex: 1, marginTop: s(4) },
  loadingWrap: { paddingVertical: s(26) },
  emptyText: {
    color: '#fff',
    fontSize: s(14),
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: s(28),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: s(15),
    marginVertical: s(3),
    paddingHorizontal: s(12),
    paddingVertical: s(10),
    borderRadius: s(12),
  },
  rankNumber: {
    color: '#FFD700',
    fontSize: s(16),
    width: s(30),
    fontWeight: '900',
  },
  teamLogo: {
    width: s(36),
    height: s(36),
    resizeMode: 'contain',
    marginRight: s(10),
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: s(18),
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoPlaceholderText: { color: '#fff', fontWeight: '900', fontSize: s(11) },
  captainName: { color: '#FFF', flex: 1, fontSize: s(13) },
  moveCount: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: s(13),
    width: s(50),
    textAlign: 'right',
  },
  coinCount: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: s(13),
    width: s(50),
    textAlign: 'right',
  },
});

export default LeaderboardScreen;
