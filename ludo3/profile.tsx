import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../auth/AuthContext';
import { authHeaders } from '../api';
import AlertModal from '../components/AlertModal';

const { width: W } = Dimensions.get('window');
const s = (size: number) => (W / 390) * size;

interface UserStats {
  // common
  id?: string;
  name?: string;
  email?: string;
  points?: number;
  moves?: number;
  zone?: string;
  region?: string;
  status?: string;
  flmId?: string;
  // MR specific
  prescriptionStats?: {
    total: number;
    approved: string | number;
    pending: string | number;
    rejected: string | number;
    approvedPoints: string | number;
  };
  recentBoards?: any[];
  // FLM specific
  flmName?: string;
  teamName?: string;
  kills?: number;
  hearts?: number;
  diceRollBalance?: number;
  currentDiceRollBalance?: number;
  currentMoveBalance?: number;
  totalMrs?: number;
  activeMrs?: number;
  totalBoards?: number;
  activeBoards?: number;
  finishedBoards?: number;
}

interface GameStat {
  boardId: number | string;
  playerRank?: number | null;
  moves?: number | string | null;
}

export default function Profile() {
  const navigation = useNavigation<any>();
  const { setSession, user, session } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'stats'>('profile');
  const [profileUri, setProfileUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [lastGames, setLastGames] = useState<GameStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const role = user?.role?.toUpperCase() === 'FLM' ? 'FLM' : 'MR';

  useEffect(() => {
    fetchProfileImage();
  }, []);

  useEffect(() => {
    if (activeTab === 'stats') fetchStats();
  }, [activeTab]);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertVariant, setAlertVariant] = useState<'info' | 'error' | 'confirm'>('info');
  const closeAlert = () => setAlertVisible(false);

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' = 'success',
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);

    if (type === 'error') setAlertVariant('error');
    else if (type === 'warning') setAlertVariant('confirm');
    else setAlertVariant('info');

    setAlertVisible(true);
  };
  const fetchProfileImage = async () => {
    try {
      const res = await fetch(
        `${baseUrl}/api/profile/get?playerId=${user?.id}&role=${role}`,
      );
      const json = await res.json();
      if (json.success && json.imageName) {
        setProfileUri(`${baseUrl}/profileImage/${json.imageName}`);
      } else if (json.success && json.imageUrl) {
        setProfileUri(json.imageUrl);
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
    }
  };

  const fetchStats = async () => {
    if (!user?.id) return;
    setStatsLoading(true);
    try {
      const flmId = role === 'FLM' ? user.id : user.flmId;
      const query = role === 'MR' && flmId ? `?flmId=${flmId}` : '';

      const [statsRes, gamesRes] = await Promise.all([
        fetch(
          `${baseUrl}/api/flm/user/stats?userId=${user.id}&userRole=${role}`,
          {
            headers: authHeaders(session?.token),
          },
        ),
        fetch(
          `${baseUrl}/api/flm/getLast5GamesStats/${
            user.id
          }/${role.toLowerCase()}${query}`,
          {
            headers: authHeaders(session?.token),
          },
        ),
      ]);

      const statsJson = await statsRes.json();
      const gamesJson = await gamesRes.json();

      if (statsJson.success) setStats(statsJson.data);
      if (gamesJson.success && Array.isArray(gamesJson.data))
        setLastGames(gamesJson.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

const handleLogout = () => {
  setAlertTitle('Logout');
  setAlertMessage('Do you want to logout?');
  setAlertVariant('confirm');
  setAlertVisible(true);
};

  const pickProfileImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
        assetRepresentationMode: 'compatible',
      });
      if (result.didCancel) return;
  if (result.errorCode) {
        showAlert('Error', result.errorMessage || 'Unable to pick image.');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        showAlert('Error', 'No image returned.');
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append('profileImage', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `profile_${Date.now()}.jpg`,
      } as any);
      formData.append('playerId', user?.id || '');
      formData.append('role', role);

      const res = await fetch(`${baseUrl}/api/profile/upload`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        const imageUrl = json.imageName
          ? `${baseUrl}/profileImage/${json.imageName}`
          : json.imageUrl;
        setProfileUri(`${imageUrl}?t=${Date.now()}`);
      showAlert('Success', 'Profile picture updated!');
      } else {
        showAlert('Error', json.message || 'Upload failed');
      }
    } catch (error) {
      showAlert(
        'Error',
        error instanceof Error ? error.message : 'Upload failed',
      );
    } finally {
      setUploading(false);
    }
  };

  const StatCard = ({
    icon,
    label,
    value,
    color = '#7d46f2',
  }: {
    icon: string;
    label: string;
    value: string | number;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '22' }]}>
        <Icon name={icon} size={s(22)} color={color} />
      </View>
      <Text style={styles.statValue}>{value ?? '-'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const rankColor = (rank: number | null | undefined) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    if (rank === 4) return '#F44336';
    return '#888';
  };

  return (
    <ImageBackground
      source={require('../assets/newAssets/bgMain.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Top Panel */}
        <View style={styles.topPanel}>
          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.85}
              onPress={handleLogout}
            >
              <Icon name="logout" size={s(13)} color="white" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            >
              <Icon name="close" size={s(22)} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('profile')}
              style={styles.tabBtn}
              activeOpacity={0.85}
            >
              {activeTab === 'profile' ? (
                <LinearGradient
                  colors={['#d5b7ff', '#7d46f2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeTab}
                >
                  <Icon name="person" size={s(16)} color="white" />
                  <Text style={styles.tabTextActive}>Profile</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <Icon name="person" size={s(16)} color="#d9d6ff" />
                  <Text style={styles.tabText}>Profile</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('stats')}
              style={styles.tabBtn}
              activeOpacity={0.85}
            >
              {activeTab === 'stats' ? (
                <LinearGradient
                  colors={['#d5b7ff', '#7d46f2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeTab}
                >
                  <Icon name="bar-chart" size={s(16)} color="white" />
                  <Text style={styles.tabTextActive}>My Stats</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <Icon name="bar-chart" size={s(16)} color="#d9d6ff" />
                  <Text style={styles.tabText}>My Stats</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <>
            <LinearGradient
              colors={['rgba(71, 96, 186, 0.82)', 'rgba(58, 43, 144, 0.72)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileCard}
            >
              <View style={styles.avatarRing}>
                <Image
                  source={
                    profileUri
                      ? { uri: profileUri }
                      : require('../assets/profile.jpg')
                  }
                  style={styles.avatar}
                />
                <TouchableOpacity
                  style={styles.avatarEditButton}
                  activeOpacity={0.85}
                  onPress={pickProfileImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Icon name="photo-camera" size={s(17)} color="white" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.profileName}>{user?.name || '-'}</Text>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>ID: {user?.id || '-'}</Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{role}</Text>
              </View>
            </LinearGradient>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={pickProfileImage}
              style={styles.uploadWrap}
              disabled={uploading}
            >
              <LinearGradient
                colors={['#8b1fe8', '#7d4dff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.uploadButton}
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Icon name="photo-camera" size={s(20)} color="white" />
                    <Text style={styles.uploadText}>Upload New Picture</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.statsScroll}
          >
            {statsLoading ? (
              <ActivityIndicator
                size="large"
                color="#7d46f2"
                style={{ marginTop: s(40) }}
              />
            ) : !stats ? (
              <Text style={styles.noStats}>No stats available</Text>
            ) : (
              <>
                {/* MR Stats */}
                {role === 'MR' && (
                  <>
                    <Text style={styles.sectionTitle}>Profile Info</Text>
                    <View style={styles.infoList}>
                      {[
                        { label: 'Name', value: stats.name },
                        { label: 'Email', value: stats.email },
                        { label: 'Zone', value: stats.zone },
                        { label: 'Region', value: stats.region },
                        { label: 'Status', value: stats.status },
                        { label: 'FLM ID', value: stats.flmId },
                      ]
                        .filter(f => f.value)
                        .map(({ label, value }) => (
                          <View key={label} style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{label}</Text>
                            <Text style={styles.infoValue}>{value}</Text>
                          </View>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Points</Text>
                    <View style={styles.statsGrid}>
                      <StatCard
                        icon="stars"
                        label="Total Points"
                        value={stats.points ?? 0}
                        color="#FFD700"
                      />
                      <StatCard
                        icon="directions-walk"
                        label="Total Moves"
                        value={stats.moves ?? 0}
                        color="#4CAF50"
                      />
                    </View>

                    <Text style={styles.sectionTitle}>Uploads</Text>
                    <View style={styles.statsGrid}>
                      <StatCard
                        icon="cloud-upload"
                        label="Total"
                        value={stats.prescriptionStats?.total ?? 0}
                        color="#607D8B"
                      />
                      <StatCard
                        icon="check-circle"
                        label="Approved"
                        value={stats.prescriptionStats?.approved ?? 0}
                        color="#4CAF50"
                      />
                      <StatCard
                        icon="access-time"
                        label="Pending"
                        value={stats.prescriptionStats?.pending ?? 0}
                        color="#FFC107"
                      />
                      <StatCard
                        icon="cancel"
                        label="Rejected"
                        value={stats.prescriptionStats?.rejected ?? 0}
                        color="#F44336"
                      />
                    </View>
                  </>
                )}

                {/* FLM Stats */}
                {role === 'FLM' && (
                  <>
                    <Text style={styles.sectionTitle}>Performance</Text>
                    <View style={styles.statsGrid}>
                      <StatCard
                        icon="stars"
                        label="Points"
                        value={stats.points ?? 0}
                        color="#FFD700"
                      />
                      <StatCard
                        icon="directions-walk"
                        label="Moves"
                        value={stats.moves ?? 0}
                        color="#4CAF50"
                      />
                      <StatCard
                        icon="casino"
                        label="Dice Balance"
                        value={
                          stats.currentDiceRollBalance ??
                          stats.diceRollBalance ??
                          0
                        }
                        color="#9C27B0"
                      />
                      <StatCard
                        icon="favorite"
                        label="Hearts"
                        value={stats.hearts ?? 0}
                        color="#F44336"
                      />
                      <StatCard
                        icon="sports-kabaddi"
                        label="Kills"
                        value={stats.kills ?? 0}
                        color="#FF5722"
                      />
                      <StatCard
                        icon="home"
                        label="Move Balance"
                        value={stats.currentMoveBalance ?? 0}
                        color="#2196F3"
                      />
                    </View>

                    <Text style={styles.sectionTitle}>Team</Text>
                    <View style={styles.statsGrid}>
                      <StatCard
                        icon="group"
                        label="Total MRs"
                        value={stats.totalMrs ?? 0}
                        color="#3F51B5"
                      />
                      <StatCard
                        icon="person"
                        label="Active MRs"
                        value={stats.activeMrs ?? 0}
                        color="#4CAF50"
                      />
                      <StatCard
                        icon="dashboard"
                        label="Total Boards"
                        value={stats.totalBoards ?? 0}
                        color="#607D8B"
                      />
                      <StatCard
                        icon="play-circle-filled"
                        label="Active Boards"
                        value={stats.activeBoards ?? 0}
                        color="#FF9800"
                      />
                    </View>
                  </>
                )}

                {/* Last 5 games */}
                {lastGames.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Last 5 Games</Text>
                    <View style={styles.gamesRow}>
                      {lastGames.map((game, i) => (
                        <View key={i} style={styles.gameCard}>
                          <View
                            style={[
                              styles.rankCircle,
                              { borderColor: rankColor(game.playerRank) },
                            ]}
                          >
                            <Icon
                              name="emoji-events"
                              size={s(12)}
                              color={rankColor(game.playerRank)}
                            />
                            <Text
                              style={[
                                styles.rankText,
                                { color: rankColor(game.playerRank) },
                              ]}
                            >
                              #{game.playerRank ?? '-'}
                            </Text>
                          </View>
                          <Text style={styles.gameMovesText}>
                            {game.moves ?? 0}
                          </Text>
                          <Text style={styles.gameLabel}>moves</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}
        <AlertModal
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          variant={alertVariant === 'error' ? 'error' : alertVariant}
          buttons={[
            ...(alertTitle === 'Logout'
              ? [
                  {
                    text: 'Cancel',
                    style: 'cancel' as const,
                    onPress: closeAlert,
                  },
                  {
                    text: 'Logout',
                    style: 'destructive' as const,
                    onPress: () => {
                      closeAlert();
                      setSession(null);
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Welcome' }],
                      });
                    },
                  },
                ]
              : [
                  {
                    text: 'OK',
                    style: 'default' as const,
                    onPress: closeAlert,
                  },
                ]),
          ]}
          onRequestClose={closeAlert}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07113a' },
  alertOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.65)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
},

alertBox: {
  width: '82%',
  height: '20%',
  borderRadius: 24,
  paddingHorizontal: 25,
  paddingVertical: 25,
  alignItems: 'center',
  borderWidth:2,
  borderColor:'white'
},

successAlert: {
  backgroundColor: '#000f84',
},

errorAlert: {
  backgroundColor: '#000f84',
},

warningAlert: {
  backgroundColor: '#1b339f',
},

alertTitle: {
  color: 'white',
  fontSize: 22,
  fontWeight: 'bold',
  marginTop: 12,
},

alertMessage: {
  color: 'white',
  fontSize: 15,
  textAlign: 'center',
  marginTop: 10,
  lineHeight: 22,
},

alertButton: {
  marginTop: 20,
  backgroundColor: 'rgba(255,255,255,0.2)',
  paddingHorizontal: 30,
  paddingVertical: 10,
  borderRadius: 15,
},

alertButtonText: {
  color: 'white',
  fontWeight: 'bold',
  fontSize: 15,
},
  safeArea: { flex: 1, paddingHorizontal: s(12), paddingTop: s(10) },
  topPanel: {
    backgroundColor: '#120082',
    borderRadius: s(14),
    paddingHorizontal: s(13),
    paddingTop: s(12),
    paddingBottom: s(10),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: s(13),
  },
  logoutButton: {
    height: s(32),
    borderRadius: s(7),
    paddingHorizontal: s(13),
    backgroundColor: 'rgba(92, 122, 226, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: s(13),
    fontWeight: '800',
    marginLeft: s(5),
  },
  closeButton: {
    width: s(28),
    height: s(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    height: s(38),
    borderRadius: s(9),
    backgroundColor: 'rgba(91, 111, 232, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(3),
    paddingVertical: s(3),
  },
  tabBtn: { flex: 1, height: '100%' },
  activeTab: {
    flex: 1,
    height: '100%',
    borderRadius: s(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTab: {
    flex: 1,
    height: '100%',
    borderRadius: s(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTextActive: {
    color: 'white',
    fontSize: s(13),
    fontWeight: '900',
    marginLeft: s(5),
  },
  tabText: {
    color: '#d9d6ff',
    fontSize: s(13),
    fontWeight: '900',
    marginLeft: s(5),
  },
  // Profile tab
  profileCard: {
    height: s(260),
    borderRadius: s(12),
    marginTop: s(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(188, 163, 255, 0.45)',
  },
  avatarRing: {
    width: s(130),
    height: s(130),
    borderRadius: s(65),
    borderWidth: s(4),
    borderColor: '#d7b5ff',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: s(118),
    height: s(118),
    borderRadius: s(59),
    resizeMode: 'cover',
  },
  avatarEditButton: {
    position: 'absolute',
    right: s(-3),
    bottom: s(11),
    width: s(31),
    height: s(31),
    borderRadius: s(16),
    backgroundColor: '#6320d8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  profileName: {
    color: '#FFF',
    fontSize: s(16),
    fontWeight: '800',
    marginTop: s(10),
  },
  idBadge: {
    minWidth: s(94),
    height: s(26),
    borderRadius: s(13),
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(8),
    paddingHorizontal: s(10),
  },
  idText: { color: '#9a8fab', fontSize: s(12), fontWeight: '900' },
  roleBadge: {
    marginTop: s(6),
    backgroundColor: 'rgba(125,70,242,0.7)',
    paddingHorizontal: s(12),
    paddingVertical: s(3),
    borderRadius: s(10),
  },
  roleText: { color: '#FFF', fontSize: s(11), fontWeight: '700' },
  uploadWrap: { marginTop: s(24) },
  uploadButton: {
    height: s(56),
    borderRadius: s(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: 'white',
    fontSize: s(15),
    fontWeight: '900',
    marginLeft: s(11),
  },
  // Stats tab
  statsScroll: { marginTop: s(16) },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: s(13),
    fontWeight: '700',
    marginBottom: s(10),
    marginTop: s(6),
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(10),
    marginBottom: s(16),
  },
  statCard: {
    width: (W - s(24) - s(10) * 2) / 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: s(12),
    paddingVertical: s(14),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statIconWrap: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: s(6),
  },
  statValue: { color: '#FFF', fontSize: s(18), fontWeight: '900' },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: s(10),
    fontWeight: '600',
    marginTop: s(2),
    textAlign: 'center',
  },
  noStats: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: s(40),
    fontSize: s(14),
  },
  infoList: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: s(12),
    marginBottom: s(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: s(14),
    paddingVertical: s(10),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  infoLabel: { color: 'rgba(255,255,255,0.5)', fontSize: s(13) },
  infoValue: {
    color: '#FFF',
    fontSize: s(13),
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  // Last 5 games
  gamesRow: { flexDirection: 'row', gap: s(8), marginBottom: s(20) },
  gameCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: s(12),
    paddingVertical: s(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rankCircle: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: s(6),
  },
  rankText: { fontSize: s(10), fontWeight: '800' },
  gameMovesText: { color: '#FFF', fontSize: s(16), fontWeight: '900' },
  gameLabel: { color: 'rgba(255,255,255,0.5)', fontSize: s(10) },
});
