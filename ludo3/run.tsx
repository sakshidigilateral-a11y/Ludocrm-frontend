import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { io, Socket } from 'socket.io-client';
import { authHeaders } from '../api';
import { useAuth } from '../auth/AuthContext';

const { width: W } = Dimensions.get('window');
const s = (size: number) => (W / 390) * size;
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
const TEAM_CARD_WIDTH = BOARD_SIZE * 0.31;
const TEAM_CARD_HEIGHT = BOARD_SIZE * 0.285;

// ─── position string → grid col/row ──────────────────────────────────────────
// position format: "cell-area-{areaId}-id-{cellNum}"
// Board layout (15×15 grid, 0-indexed):
//   area 1 (blue)   = bottom-left  home area
//   area 2 (red)    = top-left
//   area 3 (green)  = top-right
//   area 4 (yellow) = bottom-right
// Main track cells map to specific grid positions

const AREA_TRACK: Record<number, Array<[number, number]>> = {
  // area 1 (blue) – bottom-left quadrant track cells 1-18
  1: [
    [8, 9],
    [8, 10],
    [8, 11],
    [8, 12],
    [8, 13],
    [8, 14], // cells 1-6
    [7, 14],
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9], // cells 7-12 (home col)
    [6, 14],
    [6, 13], // cells 13-14 (start)
    [6, 12],
    [6, 11],
    [6, 10],
    [6, 9], // cells 15-18
  ],
  // area 2 (red) – top-left
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
  // area 3 (green) – top-right
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
  // area 4 (yellow) – bottom-right
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

// Home stretch (cells 8-12) per color
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
    [10.72, 2.5],
    [12.1, 1.18],
    [13.48, 2.5],
    [12.1, 3.83],
  ],
  yellow: [
    [10.72, 11.5],
    [12.1, 10.18],
    [13.48, 11.5],
    [12.1, 12.84],
  ],
};

const FINISH_POSITIONS: Record<PawnColor, [number, number]> = {
  red: [6, 7],
  green: [7, 6],
  blue: [7, 8],
  yellow: [8, 7],
};

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

function positionToGrid(pos: string, color: string): [number, number] | null {
  if (!pos || pos === '0') return null;

  // finished pawns
  if (pos === 'finished') {
    return FINISH_POSITIONS[color as PawnColor];
  }

  // home track
  const homeMatch = pos.match(/home-area-(\d+)-id-(\d+)/);

  if (homeMatch) {
    const homeId = Number(homeMatch[2]);

    const homeTrack = HOME_TRACK[color];

    return homeTrack?.[homeId - 1] ?? null;
  }

  // normal track
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
const renderDebugGrid = () => {
  const cells = [];

  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      cells.push(
        <View
          key={`${row}-${col}`}
          style={{
            position: 'absolute',
            left: GRID_LEFT + col * TILE_W,
            top: GRID_TOP + row * TILE_H,
            width: TILE_W,
            height: TILE_H,
            borderWidth: 1,
            borderColor: 'rgba(255,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 8,
              color: 'red',
              fontWeight: 'bold',
            }}
          >
            {col},{row}
          </Text>
        </View>,
      );
    }
  }

  return cells;
};
function homeCardPosition(color: PawnColor) {
  const centers: Record<PawnColor, [number, number]> = {
    red: [3, 3],
    green: [12, 3],
    blue: [3, 12],
    yellow: [12, 12],
  };
  const [col, row] = centers[color];

  return {
    left: GRID_LEFT + col * TILE_W - TEAM_CARD_WIDTH / 2,
    top: GRID_TOP + row * TILE_H - TEAM_CARD_HEIGHT / 2,
  };
}

// ─── types ────────────────────────────────────────────────────────────────────
type PawnColor = 'red' | 'green' | 'yellow' | 'blue';

interface Pawn {
  id: string;
  playerId: string;
  color: PawnColor;
  type: string;
  currentPosition: string;
  moves: number;
}

const normalizePawnType = (type?: string | null) =>
  String(type || '').toLowerCase();

const normalizePawnPosition = (position?: string | number | null) =>
  String(position ?? '').trim();

const isBasePawn = (pawn: Pawn) => {
  const position = normalizePawnPosition(pawn.currentPosition);

  return (
    normalizePawnType(pawn.type) === 'base' || !position || position === '0'
  );
};

const isCenterPawn = (pawn: Pawn) =>
  normalizePawnType(pawn.type) === 'center' ||
  normalizePawnPosition(pawn.currentPosition) === 'finished';

interface Player {
  playerId: string;
  playerName: string;
  color: PawnColor;
  moves: number;
  currentDiceRollBalance: number;
  home: number;
  rank?: number | null;
  winPosition?: number | null;
  teamName?: string;
}

interface Notification {
  id: string;
  message: string;
  createdAt: string;
  actorName?: string;
  teamName?: string;
}

const PAWN_IMAGES: Record<PawnColor, ReturnType<typeof require>> = {
  red: require('../assets/gameAssets/pawn-red.png'),
  green: require('../assets/gameAssets/pawn-green.png'),
  yellow: require('../assets/gameAssets/pawn-yellow.png'),
  blue: require('../assets/gameAssets/pawn-blue.png'),
};

const getPawnImage = (color?: string | null) =>
  PAWN_IMAGES[color as PawnColor] || PAWN_IMAGES.blue;

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

const isPawnColor = (color?: string | null): color is PawnColor =>
  color === 'blue' ||
  color === 'red' ||
  color === 'green' ||
  color === 'yellow';

const COLOR_ACCENT: Record<PawnColor, string> = {
  red: '#e32425',
  green: '#0fba53',
  yellow: '#ff8a00',
  blue: '#1179cf',
};

// ─── component ────────────────────────────────────────────────────────────────
export default function RunScreen() {
  const { session, user } = useAuth();
  const baseUrl = session?.backendUrl || '';
  const isFlm = user?.role?.toLowerCase() === 'flm';
  const myFlmId = isFlm ? user?.id : user?.flmId;
  const [boardId, setBoardId] = useState<number | null>(null);
  const [pawns, setPawns] = useState<Pawn[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [myDice, setMyDice] = useState<number | null>(null);
  const [boardStatus, setBoardStatus] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const creatorId = 'S1101';
  const myPlayerColor = players.find(p => p.playerId === myFlmId)?.color;

  const getPerspectiveArea = useCallback(
    (area: number) => {
      if (!myPlayerColor) return area;

      return ((area - HOME_AREA_BY_COLOR[myPlayerColor] + 4) % 4) + 1;
    },
    [myPlayerColor],
  );

  const getPerspectiveColor = useCallback(
    (color?: string | null): PawnColor => {
      if (!isPawnColor(color)) return 'blue';
      if (!myPlayerColor) return color;

      return COLOR_BY_HOME_AREA[getPerspectiveArea(HOME_AREA_BY_COLOR[color])];
    },
    [getPerspectiveArea, myPlayerColor],
  );

  const getPerspectivePosition = useCallback(
    (position?: string | number | null) => {
      const normalized = normalizePawnPosition(position);

      if (!myPlayerColor) return normalized;

      return normalized.replace(
        /(cell-area-|home-area-)(\d+)(-id-\d+)/,
        (_match, prefix, area, suffix) =>
          `${prefix}${getPerspectiveArea(Number(area))}${suffix}`,
      );
    },
    [getPerspectiveArea, myPlayerColor],
  );
  // ── fetch active board ────────────────────────────────────────────────────
  const fetchNotifications = async (bid: number) => {
    if (!bid) return;

    try {
      const res = await fetch(
        `${baseUrl}/api/notifications?boardId=${bid}`,
        {
          headers: authHeaders(session?.token),
        },
      );

      const json = await res.json();
      console.log('res data', json);
      if (json.ok) {
        setNotifications(json.data || []);
      }
    } catch (e) {
      console.warn('fetchNotifications error:', e);
    }
  };
  const fetchBoard = useCallback(async () => {
    if (!myFlmId) return;
    try {
      const res = await fetch(
        `${baseUrl}/api/flm/${myFlmId}/boards/active`,
        {
          headers: authHeaders(session?.token),
        },
      );
      const json = await res.json();

      const board = json.data?.find((b: any) => b.status === 'active');

      if (board?.id) {
        setBoardId(board.id);
        await fetchBoardState(board.id);
        await fetchBoardStatus();
        await fetchNotifications(board.id);
      }
    } catch (e) {
      console.warn('fetchBoard error:', e);
    } finally {
      setLoading(false);
    }
  }, [myFlmId, session?.token]);
  const fetchBoardStatus = async () => {
    const res = await fetch(`${baseUrl}/api/flm/boards/status`, {
      method: 'POST',
      headers: {
        ...authHeaders(session?.token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creatorId,
        status: 'active',
      }),
    });

    const json = await res.json();
    if (json.success) {
      setBoardStatus(json.data || []);
    }
  };
  const fetchBoardState = async (bid: number) => {
    try {
      const res = await fetch(`${baseUrl}/api/flm/board/${myFlmId}`, {
        headers: authHeaders(session?.token),
      });
      const json = await res.json();
      console.log('data', json);
      if (json.success && json.data) {
        const data = json.data;
        setPawns(data.pawns || []);
        const updatedPlayers = (data.players || []).map((player: Player) => {
          const playerPawns = (data.pawns || []).filter(
            (p: Pawn) => p.playerId === player.playerId,
          );

          const totalMoves = playerPawns.reduce(
            (sum: number, p: Pawn) => sum + Number(p.moves || 0),
            0,
          );

          const homeCount = playerPawns.filter(
            (p: Pawn) =>
              normalizePawnPosition(p.currentPosition) === 'finished',
          ).length;

          return {
            ...player,
            moves: totalMoves,
            home: homeCount,
          };
        });

        setPlayers(updatedPlayers);

        // find my dice
        const myDiceRow = (data.diceRolls || []).find(
          (d: any) => d.playerId === (isFlm ? myFlmId : user?.id),
        );
        setMyDice(myDiceRow?.diceValue ?? null);
      }
    } catch (e) {
      console.warn('fetchBoardState error:', e);
    }
  };
  const sleep = (ms: number) =>
    new Promise<void>(resolve => setTimeout(() => resolve(), ms));

  const getPositionInfo = (pos: string) => {
    const normal = pos.match(/cell-area-(\d+)-id-(\d+)/);

    if (normal) {
      return {
        type: 'cell',
        area: Number(normal[1]),
        id: Number(normal[2]),
      };
    }

    const home = pos.match(/home-area-(\d+)-id-(\d+)/);

    if (home) {
      return {
        type: 'home',
        area: Number(home[1]),
        id: Number(home[2]),
      };
    }

    return null;
  };

  type PositionInfo = NonNullable<ReturnType<typeof getPositionInfo>>;

  const formatPositionInfo = (pos: PositionInfo) =>
    pos.type === 'home'
      ? `home-area-${pos.area}-id-${pos.id}`
      : `cell-area-${pos.area}-id-${pos.id}`;

  const getNextPositionInfo = (
    pos: PositionInfo,
    color: PawnColor,
  ): PositionInfo | null => {
    if (pos.type === 'home') {
      return pos.id >= 6 ? null : { ...pos, id: pos.id + 1 };
    }

    const homeArea = HOME_AREA_BY_COLOR[color];

    if (pos.id === 7 && pos.area !== homeArea) {
      return {
        type: 'cell',
        area: pos.area,
        id: 13,
      };
    }

    if (pos.id === 12) {
      if (pos.area === homeArea) {
        return {
          type: 'home',
          area: homeArea,
          id: 1,
        };
      }

      return null;
    }

    if (pos.id >= 18) {
      return {
        type: 'cell',
        area: (pos.area % 4) + 1,
        id: 1,
      };
    }

    return {
      type: 'cell',
      area: pos.area,
      id: pos.id + 1,
    };
  };

  const buildMovementPath = (
    oldPos: PositionInfo | null,
    newPos: PositionInfo | null,
    color: PawnColor,
  ) => {
    if (!oldPos || !newPos) return null;

    const path: string[] = [];
    let cursor = oldPos;

    for (let steps = 0; steps < 100; steps++) {
      const next = getNextPositionInfo(cursor, color);

      if (!next) return null;

      path.push(formatPositionInfo(next));

      if (
        next.type === newPos.type &&
        next.area === newPos.area &&
        next.id === newPos.id
      ) {
        return path;
      }

      cursor = next;
    }

    return null;
  };

  const animatePawnMovement = async (oldPawn: Pawn, newPawn: Pawn) => {
    const oldPos = getPositionInfo(oldPawn.currentPosition);

    const newPos = getPositionInfo(newPawn.currentPosition);

    const movementPath = buildMovementPath(
      oldPos,
      newPos,
      newPawn.color as PawnColor,
    );

    // fallback
    if (!movementPath) {
      setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));

      return;
    }

    // different track type → jump
    for (const currentPosition of movementPath) {
      await sleep(300);

      setPawns(prev =>
        prev.map(p =>
          p.id === newPawn.id
            ? {
                ...p,
                currentPosition,
                type: newPawn.type,
                moves: newPawn.moves,
              }
            : p,
        ),
      );
    }

    // final sync
    setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));
  };
  // ── socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);
  const pawnsRef = useRef<Pawn[]>([]);

  useEffect(() => {
    pawnsRef.current = pawns;
  }, [pawns]);
  useEffect(() => {
    if (!boardId) return;

    const socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);

      socket.emit('joinRoom', {
        boardId,
        isSpectator: true,
      });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // pawn moved
    socket.on('pawnMoved', async (delta: any) => {
      const d = delta?.data;

      if (!d || d.boardId !== boardId) return;

      // animate pawn movement
      if (d.updatedPawns?.length) {
        for (const updatedPawn of d.updatedPawns) {
          const oldPawn = pawnsRef.current.find(p => p.id === updatedPawn.id);

          if (!oldPawn) continue;

          await animatePawnMovement(oldPawn, updatedPawn);
        }
      }

      // update players
      // update players
      if (d.updatedPlayers?.length) {
        setPlayers(prev => {
          return prev.map(existingPlayer => {
            const updatedPlayer = d.updatedPlayers.find(
              (p: Player) => p.playerId === existingPlayer.playerId,
            );

            if (!updatedPlayer) {
              return existingPlayer;
            }

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
          });
        });
      }

      // update dice
      if (d.updatedDice?.length) {
        const myRow = d.updatedDice.find(
          (r: any) => r.playerId === (isFlm ? myFlmId : user?.id),
        );

        if (myRow !== undefined) {
          setMyDice(myRow?.diceValue ?? null);
        }
      }

      // refresh notifications
      fetchNotifications(boardId);
    });

    // upload approved
    socket.on('uploadStatusChanged', () => {
      if (boardId) {
        fetchBoardState(boardId);
        fetchNotifications(boardId);
      }
    });

    return () => {
      socket.emit('leaveRoom', { boardId });

      socket.disconnect();

      socketRef.current = null;
    };
  }, [boardId]);

  const getPlayerTeamLogo = (player: Player) => {
    const board = boardStatus.find(b => String(b.id) === String(boardId));

    const matchedPlayer = board?.players?.find(
      (p: any) => p.playerId === player.playerId,
    );

    return getTeamLogo(matchedPlayer?.teamName);
  };

  // ── render pawn on board ──────────────────────────────────────────────────
  const renderBoardPawns = () => {
    // group pawns at same position
    const posMap = new Map<string, Pawn[]>();
    pawns.forEach(pawn => {
      if (isBasePawn(pawn)) return;
      const perspectiveColor = getPerspectiveColor(pawn.color);
      const grid = positionToGrid(
        isCenterPawn(pawn)
          ? 'finished'
          : getPerspectivePosition(pawn.currentPosition),
        perspectiveColor,
      );
      if (!grid) return;
      const key = `${grid[0]},${grid[1]}`;
      if (!posMap.has(key)) posMap.set(key, []);
      posMap.get(key)!.push(pawn);
    });
    const elements: React.ReactNode[] = [];
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
                source={getPawnImage(getPerspectiveColor(pawn.color))}
                style={styles.boardPawnImage}
              />
            </View>
          </View>,
        );
      });
    });
    return elements;
  };

  // ── render base pawns in home corners ────────────────────────────────────
  const renderBasePawns = () => {
    const elements: React.ReactNode[] = [];
    const basePawnsByColor: Record<string, Pawn[]> = {};
    pawns.filter(isBasePawn).forEach(p => {
      const perspectiveColor = getPerspectiveColor(p.color);
      if (!basePawnsByColor[perspectiveColor]) {
        basePawnsByColor[perspectiveColor] = [];
      }
      basePawnsByColor[perspectiveColor].push(p);
    });

    Object.entries(basePawnsByColor).forEach(([color, colorPawns]) => {
      const positions = BASE_POSITIONS[color] || [];
      colorPawns.forEach((pawn, i) => {
        const pos = positions[i];
        if (!pos) return;
        const pixel = gridToPixel(pos[0], pos[1]);
        elements
          .push
          // <View
          //   key={pawn.id}
          //   style={[styles.boardPawn, { left: pixel.left, top: pixel.top }]}
          // >
          //   {/* <View style={styles.pawnBackplate}>
          //     <Image
          //       source={getPawnImage(pawn.color)}
          //       style={styles.boardPawnImage}
          //     />
          //   </View> */}
          // </View>,
          ();
      });
    });
    return elements;
  };

  const myPlayer = players.find(p => p.playerId === myFlmId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8e35ff" />
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  if (!boardId) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="sports-esports" size={s(48)} color="#8e35ff" />
        <Text style={styles.loadingText}>No active board found</Text>
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.boardHeaderOuter}>
        <View style={styles.boardHeaderInner}>
          <Text style={styles.boardHeaderText}>My Board: #{boardId}</Text>
          <View style={styles.connDot}>
            <View
              style={[
                styles.dot,
                { backgroundColor: connected ? '#4CAF50' : '#F44336' },
              ]}
            />
            <Text style={styles.connText}>
              {connected ? 'Live' : 'Offline'}
            </Text>
          </View>
          {myDice != null && (
            <View style={styles.diceBadge}>
              <Text style={styles.diceText}>🎲 {myDice}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Board */}
      <View style={styles.boardArea}>
        <Image
          source={require('../assets/gameAssets/ludo-board.png')}
          style={styles.boardImage}
        />

        {/* Player cards in corners */}
        {players.map(player => {
          const colorNumberMap: Record<PawnColor, number> = {
            blue: 1,
            red: 2,
            green: 3,
            yellow: 4,
          };
          const perspectiveColor = getPerspectiveColor(player.color);
          const cardPos = homeCardPosition(perspectiveColor);
          const isMe = player.playerId === myFlmId;
          const teamLogo = getPlayerTeamLogo(player);
          const rankLabel = player.rank || player.winPosition || '';
          console.log('TEAM NAME:', player.teamName);
          console.log('FOUND LOGO:', getTeamLogo(player.teamName));

          return (
            <React.Fragment key={player.playerId}>
              <View
                style={[styles.teamCard, cardPos, isMe && styles.teamCardMe]}
              >
                <View
                  style={[
                    styles.playerBadge,
                    { backgroundColor: COLOR_ACCENT[perspectiveColor] },
                  ]}
                >
                  <Text style={styles.playerBadgeText}>
                    {colorNumberMap[perspectiveColor]}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Image
                    source={require('../assets/gameAssets/moves.png')}
                    style={styles.statIcon}
                  />
                  <Text style={styles.statText}>{player.moves}</Text>
                  <Image
                    source={require('../assets/icons/ghar.png')}
                    style={styles.statIcon}
                  />
                  <Text style={styles.statText}>{player.home}</Text>
                </View>
                {teamLogo ? (
                  <Image source={teamLogo} style={styles.boardTeamLogo} />
                ) : (
                  <Image
                    source={require('../assets/icons/team.png')}
                    style={styles.boardTeamLogo}
                  />
                )}
                <View style={styles.markerRow}>
                  {pawns
                    .filter(
                      p => p.playerId === player.playerId && isBasePawn(p),
                    )
                    .map(pawn => (
                      <Image
                        key={pawn.id}
                        source={getPawnImage(perspectiveColor)}
                        style={styles.markerPawn}
                      />
                    ))}
                </View>
              </View>
            </React.Fragment>
          );
        })}

        {/* Pawns on board */}
        <View pointerEvents="none" style={styles.pawnLayer}>
          {/* {renderDebugGrid()} */}
          {renderBasePawns()}
          {renderBoardPawns()}
        </View>

        {/* My badge */}
        {myPlayer && (
          <View style={styles.youBadge}>
            <Text style={styles.youText}>You</Text>
            <Image
              source={require('../assets/gameAssets/moves.png')}
              style={styles.statIcon}
            />
            <Text style={styles.youText}>{myPlayer.moves}</Text>
            {myDice != null && <Text style={styles.youText}>🎲{myDice}</Text>}
          </View>
        )}
      </View>

      {/* Notifications */}
      <View style={styles.notificationsPanel}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationTitleWrap}>
            <Icon name="notifications" size={s(13)} color="#8e35ff" />
            <Text style={styles.notificationTitle}>Notifications</Text>
          </View>
          <Text style={styles.notificationTime}>Recent moves</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <Text style={styles.emptyNotif}>No activity yet</Text>
          ) : (
            notifications
              .filter(n => {
                if (!n.createdAt) return false;

                const created = new Date(n.createdAt).getTime();
                const now = Date.now();

                const FOUR_HOURS = 4 * 60 * 60 * 1000;

                return now - created <= FOUR_HOURS;
              })
              .map((n, i) => (
                <View key={n.id || i} style={styles.notificationItem}>
                  <View style={styles.bullet} />
                  <View style={styles.notificationCopy}>
                    <View style={styles.notificationCopy}>
                      <Text style={styles.notificationText}>
                        {n.message?.replace(
                          '{actorName}',
                          n.actorName || 'Player',
                        )}
                      </Text>

                      <Text style={styles.notificationTeam}>{n.teamName}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemTime}>
                    {n.createdAt
                      ? new Date(n.createdAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </Text>
                </View>
              ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020202' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020202',
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(12),
  },
  loadingText: { color: '#FFF', fontSize: s(14), fontWeight: '600' },
  boardHeaderOuter: {
    marginHorizontal: s(2),
    marginTop: s(2),
    marginBottom: s(5),
    borderRadius: s(14),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    backgroundColor: '#e6eefb',
    overflow: 'hidden',
  },
  boardHeaderInner: {
    height: s(34),
    borderRadius: s(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05346f',
    paddingHorizontal: s(12),
    gap: s(10),
  },
  boardHeaderText: { color: 'white', fontSize: s(14), fontWeight: '800' },
  connDot: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  dot: { width: s(8), height: s(8), borderRadius: s(4) },
  connText: { color: '#FFF', fontSize: s(11), fontWeight: '600' },
  diceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: s(8),
    paddingVertical: s(2),
    borderRadius: s(10),
  },
  diceText: { color: '#FFF', fontSize: s(12), fontWeight: 'bold' },
  boardArea: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: 'relative',
    backgroundColor: '#030303',
    overflow: 'hidden',
  },
  boardImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
    zIndex: 0,
  },
  notificationTeam: {
    color: '#8e35ff',
    fontSize: s(11),
    fontWeight: '700',
    marginTop: s(2),
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
    borderColor: 'rgba(255,255,255,0.9)',
    zIndex: 7,
    elevation: 7,
  },
  playerBadgeText: { color: 'white', fontSize: s(10), fontWeight: '900' },
  teamCard: {
    position: 'absolute',
    width: TEAM_CARD_WIDTH,
    height: TEAM_CARD_HEIGHT,
    backgroundColor: 'white',
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(7),
    paddingTop: s(8),
    paddingBottom: s(7),
    zIndex: 4,
    elevation: 4,
  },
  teamCardMe: { borderWidth: 2, borderColor: '#0069ba' },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(3),
    height: s(15),
  },
  statText: {
    color: '#2b2b2b',
    fontSize: s(10),
    fontWeight: '800',
    marginRight: s(4),
  },
  statIcon: { width: s(12), height: s(12), resizeMode: 'contain' },
  boardTeamLogo: {
    width: BOARD_SIZE * 0.18,
    height: BOARD_SIZE * 0.115,
    resizeMode: 'contain',
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
  },
  markerPawn: {
    width: s(22),
    height: s(22),
    resizeMode: 'contain',
    opacity: 0.82,
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
    // backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: s(3),
    shadowOffset: { width: 0, height: s(2) },
    elevation: 52,
  },
  boardPawnImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  youBadge: {
    position: 'absolute',
    left: BOARD_SIZE * 0.14,
    bottom: s(3),
    height: s(20),
    borderRadius: s(8),
    backgroundColor: '#0069ba',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(6),
    gap: s(4),
    zIndex: 7,
  },
  youText: { color: 'white', fontSize: s(12), fontWeight: '800' },
  notificationsPanel: {
    flex: 1,
    width: '94%',
    marginHorizontal: s(12),
    backgroundColor: '#f2f2f2',
    borderTopWidth: s(5),
    borderTopColor: '#050505',
    paddingTop: s(10),
    borderBottomLeftRadius: s(8),
    borderBottomRightRadius: s(8),
    overflow: 'hidden',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(12),
    paddingBottom: s(8),
  },
  notificationTitleWrap: { flexDirection: 'row', alignItems: 'center' },
  notificationTitle: {
    color: '#373737',
    fontSize: s(14),
    fontWeight: '800',
    marginLeft: s(5),
  },
  notificationTime: { color: '#8d8d8d', fontSize: s(12), fontWeight: '700' },
  notificationItem: {
    minHeight: s(44),
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#dedede',
    paddingHorizontal: s(14),
    paddingVertical: s(7),
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    width: s(4),
    height: s(4),
    borderRadius: s(2),
    backgroundColor: '#333',
    marginTop: s(7),
    marginRight: s(5),
  },
  notificationCopy: { flex: 1 },
  notificationText: { color: '#404040', fontSize: s(13), fontWeight: '700' },
  itemTime: {
    color: '#8c8c8c',
    fontSize: s(11),
    fontWeight: '700',
    marginLeft: s(8),
  },
  emptyNotif: {
    color: '#999',
    textAlign: 'center',
    marginTop: s(20),
    fontSize: s(13),
  },
});
