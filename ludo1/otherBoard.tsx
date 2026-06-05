/// <reference types="react" />
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactElement,
  JSX
} from 'react';
import {
  Dimensions,
  Image,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { io, Socket } from 'socket.io-client';
import { getBaseUrl, authHeaders } from '../api';
import { useAuth } from '../auth/AuthContext';
import DiceOne from '../assets/dice1.png';
import DiceTwo from '../assets/dice2.png';
import DiceThree from '../assets/dice3.png';
import DiceFour from '../assets/dice4.png';
import DiceFive from '../assets/dice5.png';
import DiceSix from '../assets/dice6.png';
import Dice3DOther from '../components/Dice3DOther';
import Toast from 'react-native-toast-message';
// ─── CONSTANTS ───
const { width: W, height: H } = Dimensions.get('window');
const s = (size: number) => (Math.min(W, H) / 390) * size;
const BOARD_SIZE = W;
const SOURCE_BOARD_WIDTH = 1803;
const SOURCE_BOARD_HEIGHT = 1799;
const SOURCE_GRID_BOUNDS = { left: 57, top: 48, width: 1696, height: 1702 };
const GRID_LEFT = (SOURCE_GRID_BOUNDS.left / SOURCE_BOARD_WIDTH) * BOARD_SIZE;
const GRID_TOP = (SOURCE_GRID_BOUNDS.top / SOURCE_BOARD_HEIGHT) * BOARD_SIZE;
const GRID_WIDTH = (SOURCE_GRID_BOUNDS.width / SOURCE_BOARD_WIDTH) * BOARD_SIZE;
const GRID_HEIGHT =
  (SOURCE_GRID_BOUNDS.height / SOURCE_BOARD_HEIGHT) * BOARD_SIZE;
const TILE_W = GRID_WIDTH / 15;
const TILE_H = GRID_HEIGHT / 15;
const PAWN_SIZE = Math.min(TILE_W, TILE_H) * 0.9;
const PAWN_TIP = PAWN_SIZE * 0.86;
// Creator/FLM id for boards filtering.
// Must match `boards.creator` in MySQL.
const CREATOR_ID = 'A1234';


// ─── AREA TRACK DATA ───
const DICE_IMAGE_BY_VALUE: Record<number, any> = {
  1: DiceOne,
  2: DiceTwo,
  3: DiceThree,
  4: DiceFour,
  5: DiceFive,
  6: DiceSix,
};
const AREA_TRACK: Record<number, Array<[number, number]>> = {
  1: [
    [8, 9],
    [8, 10],
    [8, 11],
    [8, 12],
    [8, 13],
    [8, 14],
    [7, 14],
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [6, 14],
    [6, 13],
    [6, 12],
    [6, 11],
    [6, 10],
    [6, 9],
  ],
  2: [
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
    [0, 7],
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [0, 6],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 6],
    [5, 6],
  ],
  3: [
    [6, 5],
    [6, 4],
    [6, 3],
    [6, 2],
    [6, 1],
    [6, 0],
    [7, 0],
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
  ],
  4: [
    [9, 6],
    [10, 6],
    [11, 6],
    [12, 6],
    [13, 6],
    [14, 6],
    [14, 7],
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [14, 8],
    [13, 8],
    [12, 8],
    [11, 8],
    [10, 8],
    [9, 8],
  ],
};

// ─── HOME TRACK DATA ───
const HOME_TRACK: Record<string, Array<[number, number]>> = {
  blue: [
    [7, 14],
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
  ],
  red: [
    [0, 7],
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ],
  green: [
    [7, 0],
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
  ],
  yellow: [
    [14, 7],
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
  ],
};

// ─── BASE POSITIONS ───
const BASE_POSITIONS: Record<string, Array<[number, number]>> = {
  blue: [
    [1.12, 11.47],
    [2.4, 10.18],
    [3.78, 11.5],
    [2.4, 12.84],
  ],
  red: [
    [1.12, 2.5],
    [2.4, 1.18],
    [3.78, 2.5],
    [2.4, 3.83],
  ],
  green: [
    [11.6, 1.2],
    [10.2, 2.5],
    [12.9, 2.5],
    [10, 2.5],
  ],
  yellow: [
    [11.4, 10.2],
    [10.2, 11.5],
    [12.8, 11.5],
    [12.1, 12.84],
  ],
};

// ─── FINISH POSITIONS ───
const FINISH_POSITIONS: Record<PawnColor, [number, number]> = {
  red: [6, 7],
  green: [7, 6],
  blue: [7, 8],
  yellow: [8, 7],
};

// ─── HOME AREA MAPPING ───
const HOME_AREA_BY_COLOR: Record<PawnColor, number> = {
  blue: 1,
  red: 2,
  green: 3,
  yellow: 4,
};

const COLOR_BY_HOME_AREA: Record<number, PawnColor> = {
  1: 'blue',
  2: 'red',
  3: 'green',
  4: 'yellow',
};

// ─── COLOR ACCENTS ───
const COLOR_ACCENT: Record<PawnColor, string> = {
  red: '#e32425',
  green: '#0fba53',
  yellow: '#ff8a00',
  blue: '#1179cf',
};

// ─── TEAM LOGOS ───
const teamLogos: Record<string, ReturnType<typeof require>> = {
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

// ─── PAWN IMAGES ───
const PAWN_IMAGES: Record<PawnColor, ReturnType<typeof require>> = {
  red: require('../assets/gameAssets/pawn-red.png'),
  green: require('../assets/gameAssets/pawn-green.png'),
  yellow: require('../assets/gameAssets/pawn-yellow.png'),
  blue: require('../assets/gameAssets/pawn-blue.png'),
};

// ─── TYPES ───
type PawnColor = 'red' | 'green' | 'yellow' | 'blue';

interface Pawn {
  id: string;
  playerId: string;
  color: PawnColor;
  type: string;
  currentPosition: string;
  moves: number;
}

interface Player {
  playerId: string;
  playerName: string;
  color: PawnColor;
  moves: number;
  currentDiceRollBalance: number;
  home: number;
  rank?: number | null;
  winPosition?: number | null
  teamName?: string;
  lastMovedAt?: string;
  movesLost: number;
  kills: number;
  hearts: number;
}

interface OtherBoard {
  id: number;
  players: Player[];
}
type DiceByPlayerRow = {
  playerId: string;
  teamId?: string;
  diceValue: number | null;
  uploadId?: string | null;
  rolledAt?: string | null;
};

// ─── HELPER FUNCTIONS ───
const cleanupTeamName = (team?: string | null) => {
  const raw = String(team || '').trim();
  const fileName = raw.split(/[\\/]/).pop() || raw;
  return fileName
    .replace(/\.(png|jpg|jpeg|webp)$/i, '')
    .replace(/logo$/i, '')
    .trim();
};

const normalizeTeamName = (team?: string | null) =>
  cleanupTeamName(team)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const normalizedTeamLogos = Object.entries(teamLogos).reduce<
  Record<string, any>
>((logos, [teamName, logo]) => {
  logos[normalizeTeamName(teamName)] = logo;
  return logos;
}, {});

const getTeamLogo = (team?: string | null) => {
  if (!team) return null;
  const cleanedName = cleanupTeamName(team);
  return (
    teamLogos[cleanedName] ||
    normalizedTeamLogos[normalizeTeamName(cleanedName)] ||
    null
  );
};

const getPawnImage = (color?: string | null) =>
  PAWN_IMAGES[color as PawnColor] || PAWN_IMAGES.blue;

const isPawnColor = (color?: string | null): color is PawnColor =>
  color === 'blue' ||
  color === 'red' ||
  color === 'green' ||
  color === 'yellow';

const normalizePawnPosition = (position?: string | number | null) =>
  String(position ?? '').trim();

const isBasePawn = (pawn: Pawn) => {
  const position = normalizePawnPosition(pawn.currentPosition);
  return !position || position === '0';
};

const isCenterPawn = (pawn: Pawn) =>
  normalizePawnPosition(pawn.currentPosition) === 'finished';

const deriveTeamDice=(allPlayersDice : any)=>{if(!Array.isArray(allPlayersDice))return[];const tm=new Map();for(const d of allPlayersDice){const k=d.teamId||d.playerId;if(!tm.has(k)||(d.rolledAt&&(!tm.get(k)?.rolledAt||new Date(d.rolledAt)>new Date(tm.get(k).rolledAt)))){tm.set(k,{...d,teamId:k});}}return Array.from(tm.values());};
function positionToGrid(pos: string, color: string): [number, number] | null {
  if (!pos || pos === '0') return null;

  if (pos === 'finished') {
    return FINISH_POSITIONS[color as PawnColor];
  }

  const homeMatch = pos.match(/home-area-(\d+)-id-(\d+)/);
  if (homeMatch) {
    const homeId = Number(homeMatch[2]);
    const homeTrack = HOME_TRACK[color];
    return homeTrack?.[homeId - 1] ?? null;
  }

  const match = pos.match(/cell-area-(\d+)-id-(\d+)/);
  if (!match) return null;

  const areaId = Number(match[1]);
  const cellNum = Number(match[2]);
  const track = AREA_TRACK[areaId];
  if (!track) return null;

  return track[cellNum - 1] ?? null;
}

function gridToPixel(col: number, row: number) {
  return {
    left: GRID_LEFT + col * TILE_W + TILE_W / 2 - PAWN_SIZE / 2,
    top: GRID_TOP + row * TILE_H + TILE_H / 2 - PAWN_TIP,
  };
}

// ─── MAIN COMPONENT ───
export default function OtherBoardScreen(): ReactElement {
  const { session, user } = useAuth();
  const baseUrl = session?.backendUrl || '';
  const isFlm = user?.role?.toLowerCase() === 'flm';
  const myFlmId = isFlm ? user?.id : user?.flmId;
const [rollingPlayers, setRollingPlayers] = useState<
  Record<string, boolean>
>({});
  // ─── STATE ───
  const [boardId, setBoardId] = useState<number | null>(null);
  const [otherBoards, setOtherBoards] = useState<OtherBoard[]>([]);
  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);
  const [inputBoardId, setInputBoardId] = useState('');
  const [pawns, setPawns] = useState<Pawn[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [myDice, setMyDice] = useState<number | null>(null);
  const [boardData, setBoardData] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const pawnsRef = useRef<Pawn[]>([]);
  const [diceRows, setDiceRows] = useState<DiceByPlayerRow[]>([]);
  // ─── DERIVED STATE ───
  const currentBoard = otherBoards[currentBoardIndex];
  const displayBoardId = currentBoard?.id || null;

  // ─── FETCH OTHER BOARDS ───
 const fetchOtherBoards = useCallback(async () => {
  try {
    const baseUrl = await getBaseUrl(); // ← ADD THIS, you're using session?.backendUrl directly but other fetches use getBaseUrl()
    const res = await fetch(`${baseUrl}/api/flm/boards/status`, {
      method: 'POST',
      headers: {
        ...authHeaders(session?.token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creatorId: CREATOR_ID,
        status: 'active',
        excludePlayerId: myFlmId,
      }),
    });

    const json = await res.json();
    console.log('fetchOtherBoards response =>', JSON.stringify(json, null, 2)); // ← add this to debug

    if (json.success) {
   const boards = (json.data || []).filter(
  (board: any) => {
    // For MR: don't filter out - they can watch any board including their FLM's
    // For FLM: exclude boards they're playing on
    if (!isFlm) return true;
    return !board.players?.some(
      (p: any) => String(p.playerId) === String(myFlmId),
    );
  }
);

      setOtherBoards(boards);

      if (boards.length > 0) {
        setCurrentBoardIndex(0);
        setInputBoardId(String(boards[0].id));
      }
    }
  } catch (error) {
    console.error('fetchOtherBoards error:', error);
  }
}, [session?.token, myFlmId]); // ← ADD myFlmId to deps

  // ─── FETCH BOARD STATE ───
 const fetchBoardState = useCallback(
  async (bid: number) => {
    try {
      const baseUrl = await getBaseUrl();
      
      const res = await fetch(`${baseUrl}/api/flm/boards/navigate`, {
        method: 'POST',
        headers: {
          ...authHeaders(session?.token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creator: CREATOR_ID,
          direction: 'current',
          currentBoardId: bid,
          excludePlayerId: null, // ← was myFlmId, that caused 404
        }),
      });

      console.log('fetchBoardState status =>', res.status);

      if (!res.ok) {
        const errText = await res.text();
        console.log('fetchBoardState error body =>', errText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      console.log('fetchBoardState response =>', JSON.stringify(json, null, 2));

      if (!json.success || !json.data) {
        console.log('No board data found');
        return;
      }

      const data = json.data;
      setPawns(data.pawns || []);
      setPlayers(data.players || []);
      setBoardData(json.data);
      
      const updatedDice = deriveTeamDice(data.diceValue || []);
      setDiceRows(updatedDice);
      
      const myDiceRow = (data.diceValue || []).find(
        (d: any) => d.playerId === myFlmId,
      );
      setMyDice(myDiceRow?.diceValue ?? null);
      
    } catch (error) {
      console.error('fetchBoardState error:', error);
    }
  },
  [session?.token, myFlmId],
);
  const sleep = (ms: number) =>
    new Promise<void>(resolve => setTimeout(() => resolve(), ms));

  const buildRouteForColor = (color: PawnColor): string[] => {
    const homeAreaId = HOME_AREA_BY_COLOR[color] ?? 1;
    const route: string[] = [];

    const getNextRouteCell = (areaId: number, cellNum: number) => {
      if (cellNum === 7 && areaId !== homeAreaId) {
        return { areaId, cellNum: 13 };
      }

      let nextAreaId = areaId;
      let nextCellNum = cellNum + 1;

      if (nextCellNum > 18) {
        nextCellNum = 1;
        nextAreaId = (areaId % 4) + 1;
      }

      return { areaId: nextAreaId, cellNum: nextCellNum };
    };

    let areaId = homeAreaId;
    let cellNum = 14;

    while (true) {
      route.push(`cell-area-${areaId}-id-${cellNum}`);

      if (areaId === homeAreaId && cellNum === 12) {
        break;
      }

      const next = getNextRouteCell(areaId, cellNum);
      areaId = next.areaId;
      cellNum = next.cellNum;

      if (route.length > 100) {
        break;
      }
    }

    return route;
  };

  const MAIN_ROUTE = buildRouteForColor('red');
  const ROUTES_BY_COLOR: Record<string, string[]> = {
    red: MAIN_ROUTE,
    blue: buildRouteForColor('blue'),
    green: buildRouteForColor('green'),
    yellow: buildRouteForColor('yellow'),
  };

  const getNextCellPosition = (currentPosition: string, color: string) => {
    if (currentPosition === 'finished') {
      return 'finished';
    }

    const route = ROUTES_BY_COLOR[color] || MAIN_ROUTE;
    const currentIndex = route.indexOf(currentPosition);

    if (currentIndex === -1) {
      return currentPosition;
    }

    if (currentIndex === route.length - 1) {
      return 'finished';
    }

    return route[currentIndex + 1];
  };
  const animatePawnMovement = async (
    oldPawn: any,
    newPawn: any,
    movedPawnData?: any,
  ) => {
    try {
      if (!movedPawnData?.steps) {
        setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));

        return;
      }

      const steps = Number(movedPawnData.steps);

      if (!steps || steps <= 0) {
        setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));

        return;
      }

      let currentPos = oldPawn.currentPosition;

      for (let i = 0; i < steps; i++) {
        currentPos = getNextCellPosition(currentPos, oldPawn.color);

        const animatedPawn = {
          ...oldPawn,
          currentPosition: currentPos,
        };

        setPawns(prev =>
          prev.map(p => (p.id === animatedPawn.id ? animatedPawn : p)),
        );

        await sleep(50);
      }

      setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));
    } catch (err) {
      setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));
    }
  };
  // ─── INITIALIZE ───
// REPLACE the two useEffects for init and fetchBoardState with this:

useEffect(() => {
  const init = async () => {
    setLoading(true);
    await fetchOtherBoards();
    setLoading(false);
  };
  init();
}, [fetchOtherBoards]);

useEffect(() => {
  if (!displayBoardId) return;
  setLoading(true);
  fetchBoardState(displayBoardId).finally(() => setLoading(false));
}, [displayBoardId, fetchBoardState]);

  // ─── SOCKET CONNECTION ───
  useEffect(() => {
    if (!displayBoardId) return;

    const socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);

      console.log('🎲 Joining OtherBoard room =>', {
        boardId: displayBoardId,
        isSpectator: true,
        userId: user?.id,
        flmId: myFlmId,
      });

      console.log('SOCKET joinRoom emit =>', {
        boardId: displayBoardId,
        isSpectator: true,
      });

      socket.emit(
        'joinRoom',
        {
          boardId: displayBoardId,
          isSpectator: true,
        },
        (response: any) => {
          console.log('SOCKET joinRoom callback =>', response);
          try {
            console.log(
              'SOCKET joinRoom callback JSON =>',
              JSON.stringify(response, null, 2),
            );
          } catch (e) {
            console.log('SOCKET joinRoom callback JSON stringify error', e);
          }
        },
      );
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });
    socket.on('playerStartedRolling', (data: any) => {
  console.log('🎲 playerStartedRolling', data);

  if (data.boardId !== displayBoardId) return;

  setRollingPlayers(prev => ({
    ...prev,
    [data.playerId]: true,
  }));

  setTimeout(() => {
    setRollingPlayers(prev => ({
      ...prev,
      [data.playerId]: false,
    }));
  }, 850);
});
    socket.on('diceRolled', (data: any) => {
      console.log('🎲 diceRolled', data);

      if (data.boardId !== displayBoardId) return;

      const updatedDice = deriveTeamDice(data.allPlayersDice || []);

      setDiceRows(updatedDice);

      if (data.updatedPlayers?.length) {
        setPlayers(prev =>
          prev.map(existing => {
            const updated = data.updatedPlayers.find(
              (p: Player) => p.playerId === existing.playerId,
            );

            return updated ? { ...existing, ...updated } : existing;
          }),
        );
      }
    });
    socket.on('diceCleared', (data: any) => {
      console.log('🎲 diceCleared', data);

      if (data.boardId !== displayBoardId) return;

      const updatedDice = deriveTeamDice(data.allPlayersDice || []);

      setDiceRows(updatedDice);
    });
    socket.on('activePlayerJoined', (data: any) => {
      // console.log('🟣 activePlayerJoined', data);
      Toast.show({
              type: 'success',
              text1: 'Player Joined',
              text2: `${data?.playerName || 'A player'} joined the board`,
              position: 'top',
              visibilityTime: 3000,
            });
    });
    socket.on('activePlayerLeft', (data: any) => {
      // console.log('🔴 activePlayerLeft', data);
      Toast.show({
              type: 'error',
              text1: 'Player Left',
              text2: `${data?.playerName || 'A player'} left the board`,
              position: 'top',
              visibilityTime: 3000,
            });
    });
    socket.on('pawnMoved', async (delta: any) => {
      const d = delta?.data;
      if (!d || d.boardId !== displayBoardId) return;

      if (d.updatedPawns?.length) {
        for (const updatedPawn of d.updatedPawns) {
          const oldPawn = pawnsRef.current.find(p => p.id === updatedPawn.id);

          if (!oldPawn) continue;

          animatePawnMovement(oldPawn, updatedPawn, d.movedPawn);
        }
      }

      if (d.updatedPlayers?.length) {
        setPlayers(prev =>
          prev.map(existingPlayer => {
            const updatedPlayer = d.updatedPlayers.find(
              (p: Player) => p.playerId === existingPlayer.playerId,
            );

            if (!updatedPlayer) return existingPlayer;

            return {
              ...existingPlayer,
              moves:
                updatedPlayer.moves !== undefined
                  ? Number(updatedPlayer.moves)
                  : existingPlayer.moves,
              home:
                updatedPlayer.home !== undefined
                  ? Number(updatedPlayer.home)
                  : existingPlayer.home,
              currentDiceRollBalance:
                updatedPlayer.currentDiceRollBalance !== undefined
                  ? Number(updatedPlayer.currentDiceRollBalance)
                  : existingPlayer.currentDiceRollBalance,
              rank: updatedPlayer.rank ?? existingPlayer.rank,
              winPosition:
                updatedPlayer.winPosition ?? existingPlayer.winPosition,
            };
          }),
        );
      }

      if (d.updatedDice?.length) {
        const updatedDice = deriveTeamDice(d.updatedDice);

        setDiceRows(updatedDice);

        const myRow = updatedDice.find((r: any) => r.playerId === myFlmId);

        if (myRow !== undefined) {
          setMyDice(myRow?.diceValue ?? null);
        }
      }
    });

    socket.on('uploadStatusChanged', () => {
      fetchBoardState(displayBoardId);
    });

    return () => {
      socket.emit('leaveRoom', {
        boardId: displayBoardId,
      });

      socket.disconnect();

      socketRef.current = null;
    };
  }, [displayBoardId, fetchBoardState, myFlmId]);

  useEffect(() => {
    pawnsRef.current = pawns;
  }, [pawns]);

  // ─── NAVIGATION HANDLERS ───
  const handlePrevBoard = () => {
    if (otherBoards.length === 0) return;
    const newIndex =
      currentBoardIndex <= 0 ? otherBoards.length - 1 : currentBoardIndex - 1;
    const board = otherBoards[newIndex];
    setCurrentBoardIndex(newIndex);
    setBoardId(board.id);
    setInputBoardId(String(board.id));
  };

  const handleNextBoard = () => {
    if (otherBoards.length === 0) return;
    const newIndex =
      currentBoardIndex >= otherBoards.length - 1 ? 0 : currentBoardIndex + 1;
    const board = otherBoards[newIndex];
    setCurrentBoardIndex(newIndex);
    setBoardId(board.id);
    setInputBoardId(String(board.id));
  };

  const handleGoToBoard = () => {
    const bid = Number(inputBoardId);
    if (isNaN(bid) || bid <= 0) return;
    setBoardId(bid);
  };

  // ─── RENDER BOARD PAWNS ───
  const renderBoardPawns = (): ReactElement[] => {
    const posMap = new Map<string, Pawn[]>();

    pawns.forEach(pawn => {
      if (isBasePawn(pawn)) return;

      const grid = positionToGrid(
        isCenterPawn(pawn) ? 'finished' : pawn.currentPosition,
        pawn.color,
      );
      if (!grid) return;

      const key = `${grid[0]},${grid[1]}`;
      if (!posMap.has(key)) posMap.set(key, []);
      posMap.get(key)!.push(pawn);
    });

    const elements: JSX.Element[] = [];

    posMap.forEach((group, key) => {
      const [col, row] = key.split(',').map(Number);
      const pixel = gridToPixel(col, row);

      group.forEach((pawn, i) => {
        const offset =
          group.length > 1 ? (i - (group.length - 1) / 2) * s(5) : 0;

        elements.push(
          <View
            key={pawn.id}
            style={[
              styles.boardPawn,
              { left: pixel.left + offset, top: pixel.top },
            ]}
          >
            <View style={styles.pawnBackplate}>
              <Image
                source={getPawnImage(pawn.color)}
                style={styles.boardPawnImage}
              />
            </View>
          </View>,
        );
      });
    });

    return elements;
  };

  const renderTeamCard = (
    player: Player | undefined,
    positionStyle: any,
    reverse?: boolean,
  ) => {
    if (!player) return null;

    const diceRow =
      [...diceRows]
        .reverse()
        .find(
          (r: DiceByPlayerRow) =>
            String(r.playerId) === String(player.playerId) &&
            r.diceValue != null,
        ) || null;

    const diceValue =
      diceRow?.diceValue == null ? null : Number(diceRow.diceValue);

    const logo = getTeamLogo(player.teamName);

    const lastMovedAt = player.lastMovedAt ?? null;

    return (
      <View style={[styles.diceboard, positionStyle]}>
        {reverse && (
          <View
            style={{
              right: s(8),
              alignSelf: 'center',
              width: '24%',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: s(29),
            }}
          >
            <Text style={styles.lastMovedText}>
              {lastMovedAt
                ? new Date(lastMovedAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '—'}
            </Text>

            {(() => {
  return (
   <Dice3DOther
  diceValue={diceValue || 1}
  size={32}
  position={
    player.color === 'red'
      ? 'topLeft'
      : player.color === 'green'
      ? 'topRight'
      : player.color === 'yellow'
      ? 'bottomRight'
      : 'bottomLeft'
  }
  isPlayerStartedRolling={
  rollingPlayers[player.playerId]
}
/>
  );
})()}

            {logo ? (
              <Image
                source={logo}
                style={styles.teamLogoImg}
                resizeMode="contain"
              />
            ) : null}
          </View>
        )}

        {!reverse && (
          <View
            style={{
              left: s(0),
              alignSelf: 'center',
              width: '24%',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: s(29),
            }}
          >
            {logo ? (
              <Image
                source={logo}
                style={styles.teamLogoImg}
                resizeMode="contain"
              />
            ) : null}

           <Dice3DOther
  diceValue={diceValue || 1}
  size={32}
  position={
    player.color === 'red'
      ? 'topLeft'
      : player.color === 'green'
      ? 'topRight'
      : player.color === 'yellow'
      ? 'bottomRight'
      : 'bottomLeft'
  }
  isPlayerStartedRolling={
  rollingPlayers[player.playerId]
}
/>

            <Text style={styles.lastMovedText}>
              {lastMovedAt
                ? new Date(lastMovedAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '—'}
            </Text>
          </View>
        )}
      </View>
    );
  };
  // ─── RENDER BASE PAWNS ───
  const renderBasePawns = (): ReactElement[] => {
    const elements: React.ReactElement[] = [];
    const basePawnsByColor: Record<string, Pawn[]> = {};

    pawns.filter(isBasePawn).forEach(p => {
      if (!basePawnsByColor[p.color]) {
        basePawnsByColor[p.color] = [];
      }
      basePawnsByColor[p.color].push(p);
    });

    Object.entries(basePawnsByColor).forEach(([color, colorPawns]) => {
      const positions = BASE_POSITIONS[color] || [];
      colorPawns.forEach((pawn, i) => {
        const pos = positions[i];
        if (!pos) return;

        const pixel = gridToPixel(pos[0], pos[1]);

        elements.push(
          <View
            key={pawn.id}
            style={[styles.boardPawn, { left: pixel.left, top: pixel.top }]}
          >
            <View style={styles.pawnBackplate}>
              <Image
                source={getPawnImage(pawn.color)}
                style={styles.boardPawnImage}
              />
            </View>
          </View>,
        );
      });
    });

    return elements;
  };

  // ─── LOADING STATE ───
if (loading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#8e35ff" />
      <Text style={styles.loadingText}>Loading board...</Text>
    </View>
  );
}

if (!displayBoardId || otherBoards.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="sports-esports" size={s(48)} color="#8e35ff" />
        <Text style={styles.loadingText}>No boards available</Text>
      </View>
    );
  }

  // ─── RENDER ───
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* BOARD SELECTOR */}
        <View style={styles.boardSelectorRow}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={handlePrevBoard}
            disabled={otherBoards.length === 0}
          >
            <Icon name="chevron-left" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.boardLabel}>Board ID</Text>

          <TextInput
            value={inputBoardId}
            placeholder="Enter Board ID"
            placeholderTextColor="#777"
            keyboardType="numeric"
            style={styles.boardInput}
            onChangeText={setInputBoardId}
          />

          <TouchableOpacity
            style={styles.goBtn}
            onPress={handleGoToBoard}
            disabled={!inputBoardId}
          >
            <Text style={styles.goBtnText}>Go</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchOtherBoards}
          >
            <Icon name="refresh" size={20} color="#222" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circleBtn}
            onPress={handleNextBoard}
            disabled={otherBoards.length === 0}
          >
            <Icon name="chevron-right" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* TEAMS GRID */}
        <View style={styles.teamsContainer}>
          {players.map((player, index) => {
            const diceRow =
              [...diceRows]
                .reverse()
                .find(
                  r =>
                    String(r.playerId) === String(player.playerId) &&
                    r.diceValue != null,
                ) || null;

            const playerDice =
              diceRow?.diceValue == null ? null : Number(diceRow.diceValue);
            const lastMovedAt = player.lastMovedAt ?? null;
            const rolledAt = diceRow?.rolledAt
              ? new Date(diceRow.rolledAt).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '--';
            const diceIcon =
              player.color === 'red'
                ? require('../assets/gameAssets/dice-red.png')
                : player.color === 'green'
                ? require('../assets/gameAssets/dice-green.png')
                : player.color === 'yellow'
                ? require('../assets/gameAssets/dice-yellow.png')
                : require('../assets/gameAssets/dice-blue.png');
            return (
              <View key={player.playerId} style={styles.teamCard}>
                <View style={styles.teamNumberCircle}>
                  <Text style={styles.teamNumberText}>{player.rank}</Text>
                </View>

                {/* TOP */}

                <View style={styles.compactStatsContainer}>
                  {/* TOP ROW */}
                  <View style={styles.compactRow}>
                    <Text style={styles.teamTitle} numberOfLines={2}>
                      {(player.teamName || player.playerName).replace(
                        /([a-z])([A-Z])/g,
                        '$1\n$2',
                      )}
                    </Text>
                    <View style={styles.compactItem}>
                      <Image
                        source={require('../assets/gameAssets/move-gain.png')}
                        style={styles.compactIcon}
                      />
                      <Text style={styles.compactText}>{player.moves}</Text>
                    </View>

                    <View style={styles.compactItem}>
                      <Image
                        source={require('../assets/gameAssets/moves.png')}
                        style={styles.compactIcon}
                      />
                      <Text style={styles.compactText}>{player.moves}</Text>
                    </View>
                  </View>

                  {/* BOTTOM ROW */}
                  <View style={styles.compactRow}>
                    <View style={styles.compactItem}>
                      <Image
                        source={require('../assets/gameAssets/kill.png')}
                        style={styles.compactIcon}
                      />
                      <Text style={styles.compactText}>{player.kills}</Text>
                    </View>

                    <View style={styles.compactItem}>
                      <Image
                        source={require('../assets/gameAssets/heart.png')}
                        style={styles.compactIcon}
                      />
                      <Text style={styles.compactText}>{player.hearts}</Text>
                    </View>

                    <View style={[styles.compactItem, { left: s(18) }]}>
                      <Image
                        source={require('../assets/gameAssets/move-loss.png')}
                        style={styles.compactIcon}
                      />
                      <Text style={styles.compactText}>{player.movesLost}</Text>
                    </View>
                    <View style={[styles.compactItem, { left: s(20) }]}>
                      <Image source={diceIcon} style={styles.compactIcon} />
                      <Text style={styles.compactText}>
                        {player.currentDiceRollBalance}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.dice}>
          {renderTeamCard(
            players.find(p => p.color === 'red'),
            {
              left: s(-2),
              borderBottomEndRadius: s(0),
              borderBottomStartRadius: s(0),
            },
            false,
          )}

          {renderTeamCard(
            players.find(p => p.color === 'green'),
            {
              right: s(-2),
              borderBottomEndRadius: s(0),
              borderBottomStartRadius: s(0),
            },
            true,
          )}
        </View>

        {/* BOARD AREA */}
        <View style={styles.boardArea}>
          <Image
            source={require('../assets/gameAssets/ludo-board.png')}
            style={styles.boardImage}
          />



          {/* GRID DEBUGGER */}
{/* <View pointerEvents="none" style={styles.gridDebugger}>
  {Array.from({ length: 15 }).map((_, row) =>
    Array.from({ length: 15 }).map((__, col) => (
      <View
        key={`${row}-${col}`}
        style={[
          styles.gridCell,
          {
            left: GRID_LEFT + col * TILE_W,
            top: GRID_TOP + row * TILE_H,
            width: TILE_W,
            height: TILE_H,
          },
        ]}
      >
        <Text style={styles.gridText}>
          {col},{row}
        </Text>
      </View>
    )),
  )}
</View> */}
{/* BOARD VALUE MARKERS */}
{[
  { value: '-1', positions: [[3, 8], [6, 3], [11, 6], [8, 11]] },
  { value: '-6', positions: [[0, 7], [7, 0], [14, 7], [7, 14]] },
  { value: '-3', positions: [[5, 6], [8, 5], [9, 8], [6, 9]] },
].flatMap(item =>
  item.positions.map(([col, row], index) => (
    <View
      key={`${item.value}-${col}-${row}-${index}`}
      style={[
        styles.boardMarker,
        {
          left: GRID_LEFT + col * TILE_W,
          top: GRID_TOP + row * TILE_H,
          width: TILE_W,
          height: TILE_H,
        },
      ]}
    >
      <Text style={styles.boardMarkerText}>
        {item.value}
      </Text>
    </View>
  )),
)}
{/* CENTER LOCK */}
<View style={styles.centerLockContainer}>
  <Image
    source={require('../assets/gameAssets/lock.png')}
    style={styles.centerLock}
  />
</View>


          {/* PAWNS LAYER */}
          <View pointerEvents="none" style={styles.pawnLayer}>
            {renderBasePawns()}
            {renderBoardPawns()}
          </View>
          {players.map(player => {
            const positionStyle =
              player.color === 'red'
                ? styles.redName
                : player.color === 'green'
                ? styles.greenName
                : player.color === 'yellow'
                ? styles.yellowName
                : styles.blueName;

            return (
              <View
  key={player.playerId}
  style={[
    styles.baseNameContainer,
    positionStyle,
    (player.color === 'green') && {
      flexDirection: 'row-reverse',right:s(4),top:s(12)
    },
    (player.color === 'yellow') && {
      flexDirection: 'row-reverse',right:s(4),bottom:s(12)
    },
    
    (player.color === 'red') && {
      left: s(6),top:s(12)
    },
    (player.color === 'blue') && {
      left: s(6),bottom:s(12)
    },

  ]}
>
  <Image
    source={require('../assets/gameAssets/pawn-white.png')}
    style={styles.playerPawnIcon}
  />

  <Text style={[styles.teamName, positionStyle,
    (player.color === 'red') && {
      left: s(-4),top:s(2)
    },
    (player.color === 'blue') && {
      left: s(-4),top:s(2)
    },
    (player.color === 'yellow') && {
      left: s(-4),top:s(2)
    },
    (player.color === 'green') && {
      left: s(-4),top:s(2)
    },
    ]}>
    {player.playerName}
  </Text>
</View>
            );
          })}
        </View>
        <View style={[styles.dice2]}>
          {renderTeamCard(
            players.find(p => p.color === 'blue'),
            {
              left: s(-2),
              borderBottomEndRadius: s(6),
              borderBottomStartRadius: s(6),
              borderTopEndRadius: s(0),
              borderTopStartRadius: s(0),
            },
            false,
          )}

          {renderTeamCard(
            players.find(p => p.color === 'yellow'),
            {
              right: s(-2),
              borderBottomEndRadius: s(6),
              borderBottomStartRadius: s(6),
              borderTopEndRadius: s(0),
              borderTopStartRadius: s(0),
            },
            true,
          )}
        </View>
        <View
          style={{
            position: 'relative',
            left: s(10),
            bottom: s(0),
          }}
        >
          <Text style={{ color: 'white' }}>
            Starting date:
            {boardData?.startTime
              ? new Date(boardData.startTime).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '--'}
          </Text>

          <Text style={{ color: 'white' }}>
            Ending date:
            {boardData?.endTime
              ? new Date(boardData.endTime).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '--'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ───
const styles = StyleSheet.create({
  centerLockContainer: {
  position: 'absolute',
  left: GRID_LEFT + 6 * TILE_W,
  top: GRID_TOP + 6 * TILE_H,
  width: TILE_W * 3,
  height: TILE_H * 3,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 15,
  borderWidth:2,
  backgroundColor:'rgba(228, 228, 228, 0.6)',
  borderRadius:'50%',
  borderColor:'rgb(152, 152, 152)'
},

centerLock: {
  width: TILE_W * 2.2,
  height: TILE_H * 2.2,
  resizeMode: 'contain',
},
  boardMarker: {
  position: 'absolute',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 20,
},

boardMarkerText: {
  color: 'red',
  fontSize: s(12),
  fontWeight: '900',
},

  gridDebugger: {
  ...StyleSheet.absoluteFill,
  zIndex: 5,
},

gridCell: {
  position: 'absolute',
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.25)',
  justifyContent: 'center',
  alignItems: 'center',
},

gridText: {
  fontSize: s(7),
  color: '#000000',
  fontWeight: '700',
},

  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerPawnIcon: {
  width: s(16),
  height: s(16),
  resizeMode: 'contain',
  marginHorizontal: s(4),
},
  baseNameContainer: {
    flexDirection:'row',
    position: 'absolute',
    zIndex: 100,
  },

  teamName: {
    color: '#fff',
    fontSize: s(11),
    fontWeight: '800',
  },

  redName: {
    top: s(18),
    left: s(18),
  },

  greenName: {
    top: s(18),
    right: s(18),
  },

  blueName: {
    bottom: s(18),
    left: s(18),
  },

  yellowName: {
    bottom: s(18),
    right: s(18),
  },
  scrollContainer: {
    paddingBottom: s(40),
  },
  compactStatsContainer: {
    // marginTop: s(6),
  },

  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginTop: s(4),
    flexWrap: 'wrap',
    width: '100%',
  },

  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginRight: s(4),
    paddingLeft: s(2),
    gap: s(2),
  },

  compactIcon: {
    width: s(20),
    height: s(20),
    resizeMode: 'contain',
    // marginRight: s(3),
  },

  compactText: {
    color: '#000',
    fontSize: s(11),
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(12),
  },

  loadingText: {
    color: '#FFF',
    fontSize: s(14),
    fontWeight: '600',
  },
  boardSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // marginTop: s(10),
    marginBottom: s(2),
    gap: s(10),
    // paddingHorizontal: s(8),
  },

  circleBtn: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: '#00087bd3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  boardLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: s(14),
  },

  boardInput: {
    width: s(80),
    height: s(34),
    backgroundColor: '#dbdbdb',
    borderRadius: s(6),
    paddingHorizontal: s(10),
    color: '#000',
    fontWeight: '700',
    fontSize: s(12),
  },

  goBtn: {
    height: s(34),
    paddingHorizontal: s(14),
    backgroundColor: '#f0f0f0',
    borderRadius: s(6),
    justifyContent: 'center',
    alignItems: 'center',
  },

  goBtnText: {
    color: '#111',
    fontWeight: '700',
    fontSize: s(12),
  },
  teamTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  diceBox: {
    width: s(16),
    height: s(16),
    borderRadius: s(6),
    justifyContent: 'center',
    alignItems: 'center',
  },

  diceText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: s(13),
  },
  teamCard: {
    width: '48%',
    backgroundColor: '#e1e1e1',
    borderRadius: s(10),
    borderWidth: 3,
    borderColor: '#979797',
    paddingHorizontal: s(10),
    paddingTop: s(14),
    paddingBottom: s(10),
    minHeight: s(40),
  },
  refreshBtn: {
    width: s(34),
    height: s(34),
    borderRadius: s(17),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  teamsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: s(10),
    marginTop: s(10),
    marginBottom: s(8),
    gap: s(8),
  },

  teamNumberCircle: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: '#f2b000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  teamNumberText: {
    color: '#000',
    fontWeight: '900',
    fontSize: s(11),
  },

  teamTitle: {
    color: '#000',
    fontSize: s(13),
    fontWeight: '800',
    textAlign: 'left',
    width: '50%',
  },
  teamBottom: {
    marginTop: s(8),
  },

  teamStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  crossIcon: {
    width: s(16),
    height: s(16),
    resizeMode: 'contain',
    marginRight: s(3),
    tintColor: '#ff4444',
  },

  teamPawn: {
    width: s(16),
    height: s(16),
    resizeMode: 'contain',
    marginRight: s(3),
  },

  teamStatText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: s(12),
  },

  boardArea: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: 'relative',
    backgroundColor: '#030303',
    overflow: 'hidden',
    borderRadius: s(4),
    alignSelf: 'center',
    marginVertical: s(8),
    borderWidth: 1,
    borderColor: '#333',
  },

  boardImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
    zIndex: 0,
  },

  pawnLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
    elevation: 50,
  },

  playerBadge: {
    position: 'absolute',
    left: s(-9),
    top: s(-9),
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 7,
    elevation: 7,
  },

  playerBadgeText: {
    color: 'white',
    fontSize: s(10),
    fontWeight: '900',
  },

  boardPawn: {
    position: 'absolute',
    width: PAWN_SIZE,
    height: PAWN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 51,
    elevation: 51,
  },

  pawnBackplate: {
    width: '100%',
    height: '100%',
    borderRadius: PAWN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: s(3),
    shadowOffset: { width: 0, height: s(2) },
    elevation: 52,
  },

  boardPawnImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  bottomPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#101010',
    marginHorizontal: s(5),
    paddingHorizontal: s(10),
    paddingVertical: s(8),
    minHeight: s(80),
  },

  bottomPlayerBox: {
    width: '30%',
    alignItems: 'center',
  },

  bottomLogo: {
    width: s(34),
    height: s(34),
    resizeMode: 'contain',
  },

  bottomPlayerText: {
    color: '#ccc',
    fontSize: s(10),
    textAlign: 'center',
    marginTop: s(4),
    fontWeight: '600',
  },

  bottomStats: {
    marginTop: s(4),
  },

  bottomStat: {
    color: '#999',
    fontWeight: '600',
    fontSize: s(9),
  },

  bottomDice: {
    width: s(56),
    height: s(56),
    borderRadius: s(8),
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },

  bottomDiceText: {
    color: '#777',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: s(12),
  },

  noDataText: {
    color: '#999',
    fontSize: s(14),
    fontWeight: '600',
  },
  dice: {
    position: 'relative',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: '2%',
    top: s(16),
  },
  dice2: {
    position: 'relative',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: '2%',
    bottom: s(16),
  },
  diceboard: {
    position: 'relative',
    backgroundColor: '#d9d9d9',
    width: '48%',
    height: s(42),
    borderTopLeftRadius: s(6),
    borderTopRightRadius: s(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(8),
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 30,
  },

  teamLogoImg: {
    width: s(34),
    height: s(34),
  },

  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },

  cardInnerReverse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginLeft: 'auto',
  },

  lastMovedText: {
    fontSize: s(10),
    color: '#333',
    fontWeight: '700',
  },

  centerDiceBox: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -14 }],
  },

  fallbackDiceText: {
    fontSize: s(16),
    fontWeight: '800',
    color: '#555',
  },
});
