import React, { useRef, useState, useEffect } from 'react';

import { useAuth } from './auth/AuthContext';


import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import AlertModal, { AlertButton } from './components/AlertModal';

import Dashboard from './ludo1/dashboard';
import Rank from './ludo1/rank';
import Notification from './ludo2/notification';
import Run from './ludo1/run';
import NewUpload from './ludo1/newupload';

import Upload from './ludo1/uploads';

import {  authHeaders, getBaseUrl } from './api';

const isMrUser = (role?: string | null) =>
  String(role || '').toLowerCase() === 'mr';


const diceIcon = require('./assets/newAssets/bgdice.png');

const isCurrentUserActiveOnBoard = async () => {
  const boardId = (globalThis as any).boardId;
  const userId = (globalThis as any).userId;
  const flmId = (globalThis as any).flmId;

  if (!boardId || !userId || !flmId) return false;

  try {
    const res = await fetch(
      `${getBaseUrl}/api/active-player/board/${boardId}`,
      {
        headers: authHeaders((globalThis as any).sessionToken),
      },
    );

    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];

    return rows.some(
      (player: any) =>
        String(player.playerId) === String(userId) &&
        String(player.flmId) === String(flmId),
    );
  } catch (err) {
    console.log('active player check error', err);
    return !!(globalThis as any).isMyBoardActivePlayer;
  }
};

const TabNavigator = () => {
  const Tab = createBottomTabNavigator();

 const { user, session } = useAuth();

const baseUrl =
  session?.backendUrl || '';
  const showNewUpload = isMrUser(user?.role);


  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState<'info' | 'error' | 'confirm'>('confirm');
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);

  const yesActionRef = useRef<(() => Promise<void>) | null>(null);

  const closeAlert = () => setAlertVisible(false);

  const showAlert = (opts: {
    title?: string;
    message?: string;
    variant?: 'info' | 'error' | 'confirm';
    buttons?: AlertButton[];
  }) => {
    setAlertTitle(opts.title ?? '');
    setAlertMessage(opts.message ?? '');
    setAlertVariant(opts.variant ?? 'info');
    setAlertButtons(opts.buttons ?? []);
    setAlertVisible(true);
  };

  const createLeaveRunListener = (targetScreenName: string) => ({ navigation }: any) => ({
    tabPress: async (e: any) => {
      const goToTargetTab = () => {
        if (typeof navigation.jumpTo === 'function') {
          navigation.jumpTo(targetScreenName);
          return;
        }
        navigation.navigate(targetScreenName);
      };

      if (!(globalThis as any).boardId) return;

      e.preventDefault();

      const isActivePlayer = await isCurrentUserActiveOnBoard();

      if (!isActivePlayer) {
        goToTargetTab();
        return;
      }

      yesActionRef.current = async () => {
        try {
          await fetch(`${baseUrl}/api/active-player/end`, {
            method: 'POST',
            headers: {
              ...authHeaders((globalThis as any).sessionToken),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              boardId: (globalThis as any).boardId,
              playerId: (globalThis as any).userId,
              flmId: (globalThis as any).flmId,
            }),
          });

          (globalThis as any).boardId = null;
          (globalThis as any).isMyBoardActivePlayer = false;

          if (typeof (globalThis as any).resetRunBoardState === 'function') {
            (globalThis as any).resetRunBoardState();
          }

          goToTargetTab();
        } catch (err) {
          console.log('leave game error', err);
        }
      };

      showAlert({
        title: 'Leave Board',
        message: 'Want to leave board?',
        variant: 'confirm',
        buttons: [
          {
            text: 'No',
            style: 'cancel',
            onPress: closeAlert,
          },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              closeAlert();
              await yesActionRef.current?.();
            },
          },
        ],
      });
    },
  });

  return (
    <>
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        variant={alertVariant}
        buttons={alertButtons}
        onRequestClose={closeAlert}
      />

      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => {
            if (route.name === 'Run') {
              return (
                <Image
                  source={diceIcon}
                  style={{
                    width: size + 4,
                    height: size + 4,
                    resizeMode: 'contain',
                    tintColor: focused ? '#7600fd' : '#888',
                  }}
                />
              );
            }

            const icons: Record<string, string> = {
              Dashboard: 'home',
              Rank: 'emoji-events',
              Notification: 'notifications',
              NewUpload: 'cloud-upload',
              Upload: 'thumb-up',
            };

            return (
              <Icon name={icons[route.name]} size={size + 6} color={color} />
            );
          },
          tabBarActiveTintColor: '#7600fd',
          tabBarInactiveTintColor: '#888',
          tabBarStyle: {
            backgroundColor: '#0B132B',
            height: 70,
            paddingBottom: 10,
            paddingTop: 6,
          },
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={Dashboard}
          listeners={createLeaveRunListener('Dashboard')}
        />

        <Tab.Screen name="Run" component={Run} />

        <Tab.Screen
          name="Rank"
          component={Rank}
          listeners={createLeaveRunListener('Rank')}
        />

        {showNewUpload && (
          <Tab.Screen
            name="NewUpload"
            component={NewUpload}
            listeners={createLeaveRunListener('NewUpload')}
          />
        )}


        <Tab.Screen
          name="Upload"
          component={Upload}
          listeners={createLeaveRunListener('Upload')}
        />

        <Tab.Screen
          name="Notification"
          component={Notification}
          listeners={createLeaveRunListener('Notification')}
        />
      </Tab.Navigator>
    </>
  );
};

export default TabNavigator;
