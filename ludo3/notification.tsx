import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { io, Socket } from 'socket.io-client';
import { getBaseUrl, authHeaders } from '../api';
import { useAuth } from '../auth/AuthContext';

const { width: W } = Dimensions.get('window');
const s = (size: number) => (W / 390) * size;

const FILTERS = ['Today', 'Yesterday', 'Last 7 Days', 'This Month'];

type NotificationItem = {
  id: number | string;
  boardId: number | string;
  playerId?: string | null;
  teamName?: string | null;
  type?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  ok: boolean;
  data?: NotificationItem[];
  msg?: string;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const notificationMatchesFilter = (
  notification: NotificationItem,
  filter: string,
) => {
  const createdAt = new Date(notification.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return true;
  }

  const now = new Date();
  const today = startOfDay(now);

  if (filter === 'Today') {
    return isSameDay(createdAt, now);
  }

  if (filter === 'Yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return isSameDay(createdAt, yesterday);
  }

  if (filter === 'Last 7 Days') {
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    return createdAt >= sevenDaysAgo;
  }

  if (filter === 'This Month') {
    return (
      createdAt.getFullYear() === now.getFullYear() &&
      createdAt.getMonth() === now.getMonth()
    );
  }

  return true;
};

const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Notification() {
  const { session, user } = useAuth();
  const baseUrl = session?.backendUrl || '';
  const [selectedFilter, setSelectedFilter] = useState('Today');
  const [showFilters, setShowFilters] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const boardId = session?.currentBoard?.boardId;

  const filteredNotifications = useMemo(
    () =>
      notifications.filter(notification =>
        notificationMatchesFilter(notification, selectedFilter),
      ),
    [notifications, selectedFilter],
  );

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      if (!boardId) {
        setNotifications([]);
        setErrorMessage('');
        return;
      }

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setErrorMessage('');

        const response = await fetch(
          `${baseUrl}/api/notifications?boardId=${encodeURIComponent(
            String(boardId),
          )}`,
          {
            headers: authHeaders(session?.token),
          },
        );
        const json: NotificationsResponse = await response.json();

        if (!response.ok || !json.ok) {
          setErrorMessage(json.msg || 'Unable to load notifications.');
          setNotifications([]);
          return;
        }

        setNotifications(json.data || []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load notifications.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [boardId, session?.token],
  );

  const markAsRead = async (notification: NotificationItem) => {
    if (notification.isRead) {
      return;
    }

    setNotifications(current =>
      current.map(item =>
        item.id === notification.id ? { ...item, isRead: true } : item,
      ),
    );

    try {
      await fetch(`${baseUrl}/api/notifications/${notification.id}/read`, {
        method: 'PATCH',
        headers: authHeaders(session?.token),
      });
    } catch (error) {
      console.warn('Mark notification read failed:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!boardId) {
      return;
    }

    const socket: Socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      socket.emit('joinRoom', { boardId, isSpectator: true });
    });

    socket.on('newNotification', (notification: NotificationItem) => {
      setNotifications(current => {
        if (current.some(item => item.id === notification.id)) {
          return current;
        }
        return [notification, ...current];
      });
    });

    socket.on('connect_error', error => {
      console.warn('Notification socket connection failed:', error.message);
    });

    return () => {
      socket.emit('leaveRoom', { boardId });
      socket.off('connect');
      socket.off('newNotification');
      socket.off('connect_error');
      socket.disconnect();
    };
  }, [boardId]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/newAssets/bgMain.png')}
        style={styles.bg}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.filterWrap}>
            <TouchableOpacity
              style={styles.filterButton}
              activeOpacity={0.85}
              onPress={() => setShowFilters(prev => !prev)}
            >
              <Icon name="calendar-today" size={s(13)} color="white" />
              <Text style={styles.filterText}>{selectedFilter}</Text>
              <Icon
                name={showFilters ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={s(18)}
                color="white"
              />
            </TouchableOpacity>

            {showFilters && (
              <View style={styles.dropdown}>
                {FILTERS.map(filter => (
                  <TouchableOpacity
                    key={filter}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedFilter(filter);
                      setShowFilters(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        selectedFilter === filter && styles.dropdownTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.panel}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadNotifications(true)}
              />
            }
          >
            {!boardId ? (
              <Text style={styles.emptyText}>No active board found</Text>
            ) : isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#153e9f" />
              </View>
            ) : errorMessage ? (
              <Text style={styles.emptyText}>{errorMessage}</Text>
            ) : filteredNotifications.length === 0 ? (
              <Text style={styles.emptyText}>No notifications</Text>
            ) : (
              filteredNotifications.map(item => (
                <TouchableOpacity
                  key={String(item.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.notificationCard,
                    !item.isRead && styles.notificationUnread,
                  ]}
                  onPress={() => markAsRead(item)}
                >
                  <View style={styles.notificationTitleRow}>
                    {!item.isRead && <View style={styles.unreadDot} />}
                    <Text style={styles.notificationTitle}>{item.message}</Text>
                  </View>
                  <View style={styles.notificationMetaRow}>
                    <Text style={styles.notificationTeam}>
                      {item.teamName || user?.teamName || '-'}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatNotificationTime(item.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020a22',
  },
  bg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: s(3),
    paddingTop: s(5),
  },
  header: {
    height: s(42),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: s(4),
  },
  title: {
    color: 'white',
    fontSize: s(22),
    fontWeight: '800',
  },
  filterWrap: {
    position: 'relative',
    zIndex: 10,
  },
  filterButton: {
    height: s(34),
    minWidth: s(118),
    borderRadius: s(9),
    backgroundColor: '#153e9f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(10),
    gap: s(7),
  },
  filterText: {
    color: 'white',
    fontSize: s(13),
    fontWeight: '800',
  },
  dropdown: {
    position: 'absolute',
    top: s(39),
    right: 0,
    width: s(138),
    backgroundColor: '#153e9f',
    borderRadius: s(8),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 7,
    elevation: 8,
  },
  dropdownItem: {
    paddingHorizontal: s(12),
    paddingVertical: s(10),
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
  },
  dropdownText: {
    color: '#ffffff',
    fontSize: s(14),
    fontWeight: '700',
  },
  dropdownTextActive: {
    color: '#ced1ff',
    fontWeight: '900',
  },
  panel: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    borderRadius: s(9),
    overflow: 'hidden',
    paddingTop: s(9),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  loadingWrap: {
    paddingVertical: s(28),
  },
  emptyText: {
    color: '#777',
    fontSize: s(14),
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: s(28),
  },
  notificationCard: {
    minHeight: s(64),
    backgroundColor: '#f8f8f8',
    borderRadius: s(7),
    marginHorizontal: s(4),
    marginBottom: s(1),
    paddingHorizontal: s(11),
    paddingVertical: s(11),
    borderBottomWidth: 1,
    borderBottomColor: '#d6d6d6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  notificationUnread: {
    backgroundColor: '#eef3ff',
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: s(7),
    height: s(7),
    borderRadius: s(4),
    backgroundColor: '#153e9f',
    marginRight: s(7),
  },
  notificationTitle: {
    flex: 1,
    color: '#3a3a3a',
    fontSize: s(14),
    fontWeight: '900',
  },
  notificationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: s(3),
  },
  notificationTeam: {
    color: '#8b8b8b',
    fontSize: s(12),
    fontWeight: '700',
  },
  notificationTime: {
    color: '#8b8b8b',
    fontSize: s(11),
    fontWeight: '700',
  },
});
