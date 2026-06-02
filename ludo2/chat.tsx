import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';

import { io, Socket } from 'socket.io-client';

import { getBaseUrl} from '../api';
const baseUrl = getBaseUrl();
const { width: W, height: H } =
  Dimensions.get('window');

const s = (size: number) =>
  (W / 390) * size;

interface ChatMessage {
  id: number;
  boardId: number;
  playerId: string;
  playerName: string;
  teamName?: string;
  message: string;
  createdAt: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;

  boardId: number;

  playerId: string;

  playerName: string;

  teamName?: string;

  userId?: string;
}

export default function Chat({
  visible,
  onClose,
  boardId,
  playerId,
  playerName,
  teamName,
  userId,
}: Props) {
  const socketRef =
    useRef<Socket | null>(null);
  const flatListRef =
    useRef<FlatList>(null);
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [message, setMessage] =
    useState('');

  // Initialize socket only once when component mounts, not on visibility change
  useEffect(() => {
    if (!visible) {
      return;
    }

    console.log('[CHAT] Initializing socket for boardId:', boardId);

    const socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      forceNew: false, // Changed from true to false to prevent duplicate connections
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(
        '✅ Chat socket connected',
      );

      socket.emit('joinGame', {
        boardId,
        playerId,
        userId,
      });

      socket.emit(
        'getBoardChatHistory',
        {
          boardId,
          limit: 200,
        },
        (response: any) => {
          if (response?.ok) {
            setMessages(
              response.data || [],
            );
          }
        },
      );
    });

    socket.on(
      'newBoardChat',
      (data: any) => {
        if (!data?.data) return;

        setMessages(prev => [
          ...prev,
          data.data,
        ]);
      },
    );

    socket.on('connect_error', (error) => {
      console.log('❌ Chat socket connection error:', error);
    });

    return () => {
      console.log('[CHAT] Cleaning up socket');
      socket.off('connect');
      socket.off('newBoardChat');
      socket.off('connect_error');
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [visible, boardId, playerId, userId]);

  const sendMessage = () => {
    if (!message.trim()) {
      return;
    }

    socketRef.current?.emit(
      'sendBoardChat',
      {
        boardId,
        playerId,
        playerName,
        teamName,
        message: message.trim(),
      },
      (response: any) => {
        if (response?.ok) {
          setMessage('');
        }
      },
    );
  };

  // Scroll to end when messages update
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages]);

  // ✅ KEY FIX: Use Modal instead of conditional null return
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerText}>
              Board Chat
            </Text>

            <TouchableOpacity
              onPress={onClose}
            >
              <Icon
                name="close"
                size={24}
                color="#000000"
              />
            </TouchableOpacity>
          </View>

          {/* CHAT MESSAGES */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) =>
              `${item.id}-${index}`
            }
            contentContainerStyle={{
              padding: s(10),
              paddingBottom: s(20),
            }}
            renderItem={({ item }) => {
              const isMine =
                String(item.playerId) ===
                String(playerId);

              return (
                <View
                  style={[
                    styles.messageBox,

                    isMine
                      ? styles.myMessage
                      : styles.otherMessage,
                  ]}
                >
                  {!isMine && (
                    <Text
                      style={
                        styles.sender
                      }
                    >
                      {item.playerName}
                    </Text>
                  )}

                  <Text
                    style={
                      styles.messageText
                    }
                  >
                    {item.message}
                  </Text>
                </View>
              );
            }}
          />

          {/* INPUT */}
          <View style={styles.inputRow}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type message..."
              placeholderTextColor="#999"
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.sendBtn}
              onPress={sendMessage}
            >
              <Icon
                name="send"
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },

  container: {
    height: H * 0.5,
    backgroundColor: 'rgba(237, 237, 237, 0.95)',
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
    overflow: 'hidden',
  },

  header: {
    height: s(56),
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
  },

  headerText: {
    color: '#000000',
    fontSize: s(18),
    fontWeight: '700',
  },

  messageBox: {
    padding: s(10),
    borderRadius: s(12),
    marginBottom: s(10),
    maxWidth: '80%',
  },

  myMessage: {
    backgroundColor: '#8c32ff',
    alignSelf: 'flex-end',
  },

  otherMessage: {
    backgroundColor: '#262626',
    alignSelf: 'flex-start',
  },

  sender: {
    color: '#c084fc',
    fontWeight: '700',
    marginBottom: s(4),
  },

  messageText: {
    color: '#fff',
    fontSize: s(14),
  },

  inputRow: {
    flexDirection: 'row',
    padding: s(10),
    borderTopWidth: 1,
    borderColor: '#222',
  },

  input: {
    flex: 1,
    backgroundColor: '#a8a8a8',
    borderRadius: s(12),
    paddingHorizontal: s(12),
    color: '#000000',
    height: s(44),
  },

  sendBtn: {
    width: s(46),
    height: s(46),
    borderRadius: s(23),
    backgroundColor: '#8c32ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: s(8),
  },
});