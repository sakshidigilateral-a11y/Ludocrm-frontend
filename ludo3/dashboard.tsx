import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { io, Socket } from 'socket.io-client';
import { getBaseUrl, authHeaders } from '../api';
import { useAuth } from '../auth/AuthContext';

const { width: W, height: H } = Dimensions.get('window');
const s = (size: number) => (W / 390) * size;

const teamLogos: Record<string, any> = {
  'Andhra Blasters': require('../assets/teamLogo/AndhraBlasters.png'),
  'Bangalore Indians': require('../assets/teamLogo/BangaloreIndians.png'),
  'Bhopal Titans': require('../assets/teamLogo/BhopalTitans.png'),
  'Chennai Superstars': require('../assets/teamLogo/ChennaiSuperstars.png'),
  'Cuttack Gladiators': require('../assets/teamLogo/CuttackGladiators.png'),
  'Delhi Fighters': require('../assets/teamLogo/DelhiFighters.png'),
  'Gujarat Commandos': require('../assets/teamLogo/GujaratCommandos.png'),
  'Guwahati Champions': require('../assets/teamLogo/GuwahatiChampions.png'),
  'Hyderabad Nawabs': require('../assets/teamLogo/HyderabadNawabs.png'),
  'Kerala Riders': require('../assets/teamLogo/KeralaRiders.png'),
  'Kolkata Invincibles': require('../assets/teamLogo/KolkataInvincibles.png'),
  'Lucknow Royals': require('../assets/teamLogo/LucknowRoyals.png'),
  'Mumbai Runners': require('../assets/teamLogo/MumbaiRunners.png'),
  'Nagpur Legends': require('../assets/teamLogo/NagpurLegends.png'),
  'Patna Kings': require('../assets/teamLogo/PatnaKings.png'),
  'Punjab Giants': require('../assets/teamLogo/PunjabGiants.png'),
  'Pune Warriors': require('../assets/teamLogo/PuneWarriors.png'),
  'Raipur Challengers': require('../assets/teamLogo/RaipurChallengers.png'),
  'Ranchi Daredevils': require('../assets/teamLogo/RanchiDaredevils.png'),
  'Rajasthan Stormers': require('../assets/teamLogo/RajasthanStormers.png'),
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
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('') || '-';

const formatValue = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? '-' : String(value);

const numberFromDb = (...values: unknown[]) => {
  const value = values.find(
    item => item !== undefined && item !== null && item !== '',
  );

  return Number(value || 0);
};
type DashboardMatch = {
  _id: string;
  startDate: string;
  endDate: string;
  teams: string[];
  scores: number[];
  result: string;
};

type BoardPlayer = {
  teamName?: string;
  moves?: number;
  rank?: number | null;
};

type BoardStatusResponse = {
  success: boolean;
  data?: Array<{
    id: number | string;
    startTime?: string;
    endTime?: string;
    players?: BoardPlayer[];
  }>;
};

type DashboardProfile = {
  username?: string | null;
  teamName?: string | null;
  role?: string | null;
  playerId?: string | null;
  hq?: string | null;
  region?: string | null;
  zone?: string | null;
  managerId?: string | null;
  coins: number;
  moves: number;
  profileImage?: string | null;
};

type MrDetailsResponse = {
  success: boolean;
  data?: Record<string, any>;
  message?: string;
};

type LastGameRow = {
  boardId: number | string;
  playerRank?: number | null;
  moves?: number | string | null;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) {
    return '-';
  }

  const [day, month] = dateStr.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (!day || monthIndex < 0 || monthIndex >= months.length) {
    return '-';
  }

  return `${day} ${months[monthIndex]}`;
};

const formatApiDate = (dateStr?: string) => {
  if (!dateStr) {
    return '';
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr.slice(0, 5);
  }

  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${day}-${month}`;
};

const boardStatusForTab = (tab: string) => {
  if (tab === 'Live') {
    return 'active';
  }
  if (tab === 'Upcoming') {
    return 'upcoming';
  }
  return 'finished';
};

const convertBoardToMatch = (
  board: NonNullable<BoardStatusResponse['data']>[number],
): DashboardMatch => {
  const players = board.players || [];
  const rankedWinner = players.find(player => player.rank === 1);

  return {
    _id: String(board.id),
    startDate: formatApiDate(board.startTime),
    endDate: formatApiDate(board.endTime),
    teams: players.map(player => player.teamName || ''),
    scores: players.map(player => Number(player.moves || 0)),
    result: rankedWinner?.teamName || '',
  };
};

const fallbackByTab: Record<string, DashboardMatch[]> = {
  Live: [],
  Previous: [],
  Upcoming: [],
};

const ProfilePage = () => {
  const navigation = useNavigation<any>();
  const { session, user } = useAuth();
  const baseUrl = session?.backendUrl || '';
  const [activeTab, setActiveTab] = useState('Live');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profile, setProfile] = useState<DashboardProfile>({
    coins: 0,
    moves: 0,
  });
  const [recentMatches, setRecentMatches] = useState<
    Array<{ isWin: boolean; isDraw: boolean; mrScore: number }>
  >([]);
  const [matchesByTab, setMatchesByTab] =
    useState<Record<string, DashboardMatch[]>>(fallbackByTab);
  const [socketConnected, setSocketConnected] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const socketRef = useRef<Socket | null>(null);
  const playerRole = user?.role || 'MR';

  const playerId =
    user?.mrId || user?.flmId || user?.slmId || user?.tlmId || '';

  // For MR, use the manager/FLM id fetched into `profile.managerId` (e.g. E31671)
  // because `user?.flmId` can be empty in the AuthContext.
  // Force creatorId for board status filtering
  const creatorId = 'S1101';

  const profileTeamLogo = getTeamLogo(profile.teamName);

  const renderTeamLogo = (team?: string | null) => {
    const logo = getTeamLogo(team);

    if (logo) {
      return <Image source={logo} style={styles.teamLogo} />;
    }

    return (
      <View style={[styles.teamLogo, styles.teamLogoPlaceholder]}>
        <Text style={styles.teamLogoPlaceholderText}>
          {getTeamInitials(team)}
        </Text>
      </View>
    );
  };

  const allMatches = [
    ...matchesByTab.Live.map(m => ({ ...m, type: 'Live' })),
    ...matchesByTab.Previous.map(m => ({ ...m, type: 'Previous' })),
    ...matchesByTab.Upcoming.map(m => ({ ...m, type: 'Upcoming' })),
  ];

  const searchResults = allMatches.filter(m =>
    m.teams.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const isUserTeamMatch = (match: DashboardMatch) => {
    const userTeam = normalizeTeamName(profile.teamName);

    return Boolean(
      userTeam &&
        match.teams.some(team => normalizeTeamName(team) === userTeam),
    );
  };

  const renderUserTeamTag = (match: DashboardMatch) =>
    isUserTeamMatch(match) ? (
      <View style={styles.userTeamTag}>
        <Text style={styles.userTeamTagText}>My Team</Text>
      </View>
    ) : null;

  const matchCardStyle = (match: DashboardMatch) => [
    styles.matchCard,
    isUserTeamMatch(match) && styles.userTeamMatchCard,
  ];

  const handleSearchPress = () => {
    setIsSearching(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text === '') {
      setIsSearching(false);
    }
  };

  const loadProfile = useCallback(async () => {
    if (!playerId) {
      return;
    }

    try {
      const role = playerRole;

      const rolePath = role.toLowerCase();

      const [detailsResponse, imageResponse] = await Promise.all([
        fetch(`${baseUrl}/api/${rolePath}/details`, {
          method: 'POST',
          headers: authHeaders(session?.token),
          body: JSON.stringify(
            role === 'MR'
              ? {
                  mrId: playerId,
                }
              : role === 'FLM'
              ? {
                  flmId: playerId,
                }
              : role === 'SLM'
              ? {
                  slmId: playerId,
                }
              : {
                  tlmId: playerId,
                },
          ),
        }),
        fetch(`${baseUrl}/api/profile/get?playerId=${playerId}&role=${role}`),
      ]);

      const json: MrDetailsResponse = await detailsResponse.json();
      const imageJson = await imageResponse.json();

      if (!json.success || !json.data) {
        return;
      }

      const data = json.data;
      const profileImageUrl =
        imageJson.success && imageJson.imageName
          ? `${baseUrl}/profileImage/${imageJson.imageName}?t=${Date.now()}`
          : null;

      setProfile({
        username: data.mrName || data.flmName || user?.name || null,
        teamName: data.teamName || user?.teamName || null,
        role: data.role || playerRole,
        playerId: data.mrId || data.flmId || playerId,
        hq: data.hq || null,
        region: data.region || null,
        zone: data.zone || null,
        managerId: data.flmId || data.slmId || user?.flmId || null,
        coins: numberFromDb(data.points),
        moves: numberFromDb(
          data.currentMoveBalance,
          data.currentBalanceMoves,
          data.moves,
        ),
        profileImage: profileImageUrl,
      });
    } catch (error) {
      console.warn('Dashboard profile fetch failed:', error);
    }
  }, [
    playerId,
    playerRole,
    session?.token,
    user?.flmId,
    user?.name,
    user?.teamName,
  ]);

  const loadRecentMatches = useCallback(async () => {
    if (!playerId) {
      return;
    }

    try {
      const query =
        playerRole === 'MR' && user?.flmId
          ? `?flmId=${encodeURIComponent(user.flmId)}`
          : '';
      const response = await fetch(
        `${baseUrl}/api/flm/getLast5GamesStats/${encodeURIComponent(
          playerId,
        )}/${playerRole.toLowerCase()}${query}`,
        {
          headers: authHeaders(session?.token),
        },
      );
      const json = await response.json();

      if (!json.success || !Array.isArray(json.data)) {
        return;
      }

      setRecentMatches(
        json.data.map((match: LastGameRow) => {
          const rank = match.playerRank ?? 0;

          return {
            isWin: Number(match.playerRank || 0),
            isDraw: 0,
            mrScore: Number(match.moves || 0),
          };
        }),
      );
    } catch (error) {
      console.warn('Dashboard recent matches fetch failed:', error);
    }
  }, [playerId, playerRole, session?.token, user?.flmId]);

  const loadBoards = useCallback(
    async (tab: string) => {
      if (!creatorId) {
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/flm/boards/status`, {
          method: 'POST',
          headers: authHeaders(session?.token),
          body: JSON.stringify({
            creatorId,
            status: boardStatusForTab(tab),
          }),
        });

        const json: BoardStatusResponse = await response.json();
        if (!json.success || !json.data) {
          return;
        }

        setMatchesByTab(current => ({
          ...current,
          [tab]: (json.data || []).map(convertBoardToMatch),
        }));
      } catch (error) {
        console.warn('Dashboard board fetch failed:', error);
      }
    },
    [creatorId, session?.token],
  );

  const refreshVisibleBoards = useCallback(() => {
    loadBoards(activeTab);
  }, [activeTab, loadBoards]);

  useEffect(() => {
    loadProfile();
    loadRecentMatches();
    loadBoards('Live');
    loadBoards('Previous');
    loadBoards('Upcoming');
  }, [loadBoards, loadProfile, loadRecentMatches]);

  useFocusEffect(
    useCallback(() => {
      // loadProfile();
      loadRecentMatches();
      loadBoards('Live');
      loadBoards('Previous');
      loadBoards('Upcoming');
    }, [loadBoards, loadProfile, loadRecentMatches]),
  );

  useEffect(() => {
    const socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', error => {
      setSocketConnected(false);
      console.warn('Dashboard socket connection failed:', error.message);
    });

    socket.on('boardSummaryUpdated', refreshVisibleBoards);
    socket.on('uploadCreated', refreshVisibleBoards);
    socket.on('uploadStatusChanged', refreshVisibleBoards);
    socket.on('activePlayerJoined', refreshVisibleBoards);
    socket.on('activePlayerLeft', refreshVisibleBoards);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('boardSummaryUpdated');
      socket.off('uploadCreated');
      socket.off('uploadStatusChanged');
      socket.off('activePlayerJoined');
      socket.off('activePlayerLeft');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [refreshVisibleBoards]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/newAssets/bgMain.png')}
        style={styles.bgimage}
      />
      <SafeAreaView style={{ flex: 1, width: '100%' }}>
        <LinearGradient
          colors={[
            'rgba(8, 0, 125, 0.75)',
            'rgba(12, 0, 179, 0.4)',
            'rgba(8, 0, 125, 0.75)',
          ]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 1 }}
          style={styles.profile}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Profile')}
            style={styles.playerImgButton}
          >
            {profile.profileImage ? (
              <Image
                style={styles.playerImg}
                source={{ uri: profile.profileImage }}
              />
            ) : (
              <Image
                style={styles.playerImg}
                source={require('../assets/profile.jpg')}
              />
            )}
          </TouchableOpacity>
          {profileTeamLogo ? (
            <Image source={profileTeamLogo} style={styles.teamImg} />
          ) : (
            <View style={[styles.teamImg, styles.teamImgPlaceholder]}>
              <Text style={styles.teamImgPlaceholderText}>
                {getTeamInitials(profile.teamName)}
              </Text>
            </View>
          )}
          <Text
            style={[
              styles.detail,
              { left: 110, fontSize: 24, fontWeight: 'bold' },
            ]}
          >
            {formatValue(profile.username)}
          </Text>
          <Text style={[styles.detail, { left: 110, fontSize: 14 }]}>
            {formatValue(profile.role)}
          </Text>
          <Text style={[styles.detail, { left: 110, fontSize: 14 }]}>
            {formatValue(profile.playerId)}
          </Text>
          <Text style={[styles.detail, { left: 110, fontSize: 14 }]}>
            HQ: {formatValue(profile.hq)}
          </Text>
          <Text style={[styles.detail, { left: 110, fontSize: 14 }]}>
            Region: {formatValue(profile.region)}
          </Text>
          <Text style={[styles.detail, { left: 110, fontSize: 14 }]}>
            Zone: {formatValue(profile.zone)}
          </Text>
          <Text style={[styles.detail, { left: 110, fontSize: 14 }]}>
            Manager ID: {formatValue(profile.managerId)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Image
                source={require('../assets/gameAssets/Coin-homepage.png')}
                style={styles.statIcon}
              />
              <Text style={styles.statChipText}>{profile.coins}</Text>
            </View>
            <View style={styles.statChip}>
              <Image
                source={require('../assets/gameAssets/moves.png')}
                style={styles.statIcon}
              />
              <Text style={styles.statChipText}>{profile.moves}</Text>
            </View>
          </View>

          <View style={styles.socketBadge}>
            <View
              style={[
                styles.socketDot,
                socketConnected
                  ? styles.socketDotOnline
                  : styles.socketDotOffline,
              ]}
            />
            <Text style={styles.socketText}>
              {socketConnected ? 'Live' : 'Offline'}
            </Text>
          </View>

          <View style={styles.history}>
            <Text style={styles.historyLabel}>Last 5 Matches</Text>
            {recentMatches.length === 0 ? (
              <Text style={styles.noRecentText}>No matches</Text>
            ) : (
              recentMatches.map((m, i) => (
                <View key={i} style={styles.matchItem}>
                  <View style={styles.rankBadge}>
                    <Icon name="emoji-events" size={8} color="#FFD700" />
                    <Text style={styles.rankText}>#{m.isWin}</Text>
                  </View>
                  <View
                    style={[
                      styles.resultDot,
                      {
                        backgroundColor: m.isDraw
                          ? '#FFC107'
                          : m.isWin
                          ? '#4CAF50'
                          : '#F44336',
                      },
                    ]}
                  >
                    <Text style={styles.recentText}>{m.mrScore}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </LinearGradient>

        <View style={styles.Searchsection}>
          {isSearching ? (
            <>
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search team..."
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
              />
              <TouchableOpacity
                style={styles.searchIcon}
                onPress={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                }}
              >
                <Icon name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              {['Live', 'Upcoming', 'Previous'].map(tab => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={styles.tabItem}
                >
                  {activeTab === tab && (
                    <LinearGradient
                      colors={['#051478c9', '#4A64E2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.underline}
                    />
                  )}
                  <Text
                    style={{ color: 'white', textAlign: 'center', zIndex: 1 }}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.searchIcon}
                onPress={handleSearchPress}
              >
                <Icon name="search" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.bottomSection}>
          <LinearGradient
            colors={[
              'rgb(109, 91, 183)',
              'rgb(118, 98, 198)',
              'rgb(128, 109, 203)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.box}
          >
            <ScrollView style={styles.matchList} nestedScrollEnabled>
              {isSearching ? (
                searchResults.length === 0 ? (
                  <Text style={styles.emptyText}>No matches found</Text>
                ) : (
                  searchResults.map((match, index) => (
                    <View key={match._id} style={matchCardStyle(match)}>
                      {renderUserTeamTag(match)}
                      <View style={styles.matchRow}>
                        <Text style={styles.matchDate}>
                          {formatDate(match.startDate)}
                        </Text>
                        <Text style={styles.matchNo}>#{index + 1}</Text>
                      </View>
                      <View style={styles.teamsGrid}>
                        {match.teams.map((team, i) => (
                          <React.Fragment key={team}>
                            <View style={styles.teamCell}>
                              {renderTeamLogo(team)}
                              {match.scores[i] !== undefined && (
                                <Text style={styles.scoreText}>
                                  {match.scores[i]}
                                </Text>
                              )}
                            </View>
                            {i < match.teams.length - 1 && (
                              <View style={styles.teamDivider} />
                            )}
                          </React.Fragment>
                        ))}
                      </View>
                      {match.result ? (
                        <Text style={styles.winnerText}>
                          Winner: {match.result}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )
              ) : (
                <>
                  {activeTab === 'Live' &&
                    (matchesByTab.Live.length === 0 ? (
                      <Text style={styles.emptyText}>
                        No live Games At The Movement
                      </Text>
                    ) : (
                      matchesByTab.Live.map((match, index) => (
                        <View key={match._id} style={matchCardStyle(match)}>
                          {renderUserTeamTag(match)}
                          <View style={styles.matchRow}>
                            <Text style={styles.matchDate}>
                              {formatDate(match.startDate)} -{' '}
                              {formatDate(match.endDate)}
                            </Text>
                            <Text style={styles.matchNo}>#{index + 1}</Text>
                          </View>
                          <View style={styles.teamsGrid}>
                            {match.teams.map((team, i) => (
                              <React.Fragment key={`${match._id}-${team}`}>
                                <View style={styles.teamCell}>
                                  {renderTeamLogo(team)}
                                  <Text style={styles.scoreText}>
                                    {match.scores[i] || 0}
                                  </Text>
                                </View>
                                {i < match.teams.length - 1 && (
                                  <View style={styles.teamDivider} />
                                )}
                              </React.Fragment>
                            ))}
                          </View>
                        </View>
                      ))
                    ))}
                  {activeTab === 'Previous' &&
                    (matchesByTab.Previous.length === 0 ? (
                      <Text style={styles.emptyText}>No matches</Text>
                    ) : (
                      matchesByTab.Previous.map((match, index) => (
                        <View key={match._id} style={matchCardStyle(match)}>
                          {renderUserTeamTag(match)}
                          <View style={styles.matchRow}>
                            <Text style={styles.matchDate}>
                              {formatDate(match.startDate)} -{' '}
                              {formatDate(match.endDate)}
                            </Text>
                            <Text style={styles.matchNo}>#{index + 1}</Text>
                          </View>
                          <View style={styles.teamsGrid}>
                            {match.teams.map((team, i) => (
                              <React.Fragment key={`${match._id}-${team}`}>
                                <View style={styles.teamCell}>
                                  {renderTeamLogo(team)}
                                  <Text style={styles.scoreText}>
                                    {match.scores[i] || 0}
                                  </Text>
                                </View>
                                {i < match.teams.length - 1 && (
                                  <View style={styles.teamDivider} />
                                )}
                              </React.Fragment>
                            ))}
                          </View>
                          {match.result ? (
                            <Text style={styles.winnerText}>
                              Winner: {match.result}
                            </Text>
                          ) : null}
                        </View>
                      ))
                    ))}
                  {activeTab === 'Upcoming' &&
                    (matchesByTab.Upcoming.length === 0 ? (
                      <Text style={styles.emptyText}>
                        No Upcoming Games Scheduled
                      </Text>
                    ) : (
                      matchesByTab.Upcoming.map((match, index) => (
                        <View key={match._id} style={matchCardStyle(match)}>
                          {renderUserTeamTag(match)}
                          <View style={styles.matchRow}>
                            <Text style={styles.matchDate}>
                              {formatDate(match.startDate)} -{' '}
                              {formatDate(match.endDate)}
                            </Text>
                            <Text style={styles.matchNo}>#{index + 1}</Text>
                          </View>
                          <View style={styles.teamsGrid}>
                            {match.teams.map((team, i) => (
                              <React.Fragment key={`${match._id}-${team}`}>
                                <View style={styles.teamCell}>
                                  {renderTeamLogo(team)}
                                </View>
                                {i < match.teams.length - 1 && (
                                  <View style={styles.teamDivider} />
                                )}
                              </React.Fragment>
                            ))}
                          </View>
                        </View>
                      ))
                    ))}
                </>
              )}
            </ScrollView>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' },
  bgimage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profile: { marginHorizontal: s(2), height: H * 0.32, borderRadius: s(20) },
  playerImg: {
    width: s(90),
    height: s(90),
    borderRadius: s(45),
    backgroundColor: '#000',
  },
  playerImgButton: {
    position: 'absolute',
    top: s(50),
    left: s(10),
    borderRadius: s(45),
  },
  teamImg: {
    width: s(100),
    height: s(100),
    position: 'absolute',
    top: s(30),
    right: s(20),
    resizeMode: 'contain',
  },
  teamImgPlaceholder: {
    borderRadius: s(50),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  teamImgPlaceholderText: {
    color: '#fff',
    fontSize: s(22),
    fontWeight: '900',
  },
  detail: {
    fontSize: s(10),
    color: 'white',
    position: 'relative',
    top: s(20),
    width: '100%',
    textAlign: 'left',
  },
  statsRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: s(80),
    left: s(10),
    right: s(2),
    justifyContent: 'space-around',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: s(20),
    paddingHorizontal: s(10),
    paddingVertical: s(4),
  },
  statIcon: {
    width: s(16),
    height: s(16),
    resizeMode: 'contain',
    marginRight: s(4),
  },
  statChipText: { color: '#fff', fontSize: s(13), fontWeight: 'bold' },
  socketBadge: {
    position: 'absolute',
    right: s(14),
    bottom: s(80),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: s(16),
    paddingHorizontal: s(9),
    paddingVertical: s(5),
  },
  socketDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    marginRight: s(5),
  },
  socketDotOnline: {
    backgroundColor: '#4CAF50',
  },
  socketDotOffline: {
    backgroundColor: '#F44336',
  },
  socketText: {
    color: 'white',
    fontSize: s(10),
    fontWeight: 'bold',
  },
  history: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: s(10),
    left: s(10),
    right: s(10),
  },
  historyLabel: {
    color: 'white',
    fontSize: s(11),
    fontWeight: 'bold',
    marginRight: s(6),
  },
  matchItem: { alignItems: 'center', marginHorizontal: s(3) },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: s(20),
    paddingHorizontal: s(5),
    paddingVertical: s(3),
    marginBottom: s(3),
  },
  rankText: {
    color: '#000',
    fontSize: s(10),
    fontWeight: 'bold',
    marginLeft: s(1),
  },
  resultDot: {
    width: s(28),
    height: s(28),
    borderRadius: s(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentText: {
    fontSize: s(16),
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
  },
  noRecentText: {
    color: 'white',
    fontSize: s(11),
    fontWeight: '700',
    opacity: 0.8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  underline: {
    position: 'absolute',
    height: s(30),
    width: '100%',
    borderRadius: s(10),
    zIndex: -1,
    alignSelf: 'center',
  },
  Searchsection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 0, 125, 0.75)',
    marginTop: s(10),
    marginHorizontal: s(10),
    borderRadius: s(20),
    paddingVertical: s(10),
    paddingHorizontal: s(8),
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: s(20),
    paddingHorizontal: s(14),
    paddingVertical: s(6),
    color: '#000',
    fontSize: s(14),
  },
  searchIcon: { paddingHorizontal: s(8) },
  bottomSection: {
    flex: 1,
    marginTop: s(10),
    marginHorizontal: s(10),
    borderRadius: s(20),
  },
  matchList: { marginTop: s(8), borderRadius: s(10) },
  matchCard: {
    backgroundColor: '#213369',
    marginBottom: s(4),
    paddingHorizontal: s(8),
    paddingVertical: s(8),
    borderRadius: s(10),
  },
  userTeamMatchCard: {
    borderWidth: s(1.5),
    borderColor: '#FFD43B',
    paddingTop: s(14),
  },
  userTeamTag: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#FFD43B',
    borderBottomLeftRadius: s(6),
    borderBottomRightRadius: s(6),
    paddingHorizontal: s(8),
    paddingVertical: s(2),
    zIndex: 1,
  },
  userTeamTagText: {
    color: '#172047',
    fontSize: s(9),
    fontWeight: '900',
  },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: s(2),
  },
  matchNo: { color: 'white', fontSize: s(13), fontWeight: 'bold' },
  matchDate: { color: 'white', fontSize: s(13), fontWeight: 'bold' },
  teamsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: s(6),
  },
  teamCell: { width: '24%', alignItems: 'center' },
  teamDivider: {
    width: s(3),
    backgroundColor: 'rgba(187, 187, 187, 0.3)',
    marginVertical: s(4),
  },
  teamLogo: {
    width: s(70),
    height: s(70),
    resizeMode: 'contain',
    marginBottom: s(4),
  },
  teamLogoPlaceholder: {
    borderRadius: s(35),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  teamLogoPlaceholderText: {
    color: '#fff',
    fontSize: s(15),
    fontWeight: '900',
  },
  scoreText: { color: 'white', fontSize: s(12), fontWeight: 'bold' },
  winnerText: {
    color: '#ffffff',
    fontSize: s(13),
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: s(4),
  },
  emptyText: {
    color: 'white',
    textAlign: 'center',
    marginTop: s(20),
    fontSize: 14,
  },
  box: {
    flex: 1,
    borderRadius: s(20),
    paddingHorizontal: s(8),
    paddingVertical: s(6),
  },
});

export default ProfilePage;
