// screenRegistry.ts

// ── LUDO 1 ──
import Ludo1Dashboard from './ludo1/dashboard';
import Ludo1Rank from './ludo1/rank';
import Ludo1Notification from './ludo1/notification';
import Ludo1Run from './ludo1/run';
import Ludo1NewUpload from './ludo1/newupload';
import Ludo1Upload from './ludo1/uploads';
import Ludo1Profile from './ludo1/profile';
import Ludo1MyBoard from './ludo1/myBoard';
import Ludo1OtherBoard from './ludo1/otherBoard';

// ── LUDO 2 ──
import Ludo2Dashboard from './ludo2/dashboard';
import Ludo2Rank from './ludo2/rank';
import Ludo2Notification from './ludo2/notification';
import Ludo2Run from './ludo2/run';
import Ludo2NewUpload from './ludo2/newupload';
import Ludo2Upload from './ludo2/uploads';
import Ludo2Profile from './ludo2/profile';
import Ludo2MyBoard from './ludo2/myBoard';
import Ludo2OtherBoard from './ludo2/otherBoard';

// ── LUDO 3 ──
import Ludo3Dashboard from './ludo3/dashboard';
import Ludo3Rank from './ludo3/rank';
import Ludo3Notification from './ludo3/notification';
import Ludo3Run from './ludo3/run';
import Ludo3NewUpload from './ludo3/newupload';
import Ludo3Upload from './ludo3/uploads';
import Ludo3Profile from './ludo3/profile';

export type BusinessUnit = 'ludo1' | 'ludo2' | 'ludo3';

export type ScreenSet = {
  Dashboard: React.ComponentType<any>;
  Rank: React.ComponentType<any>;
  Notification: React.ComponentType<any>;
  Run: React.ComponentType<any>;
  NewUpload: React.ComponentType<any>;
  Upload: React.ComponentType<any>;
  Profile: React.ComponentType<any>;
  MyBoard: React.ComponentType<any>;
  OtherBoard: React.ComponentType<any>;
};

const REGISTRY: Record<BusinessUnit, ScreenSet> = {
  ludo1: {
    Dashboard: Ludo1Dashboard,
    Rank: Ludo1Rank,
    Notification: Ludo1Notification,
    Run: Ludo1Run,
    NewUpload: Ludo1NewUpload,
    Upload: Ludo1Upload,
    Profile: Ludo1Profile,
    MyBoard: Ludo1MyBoard,
    OtherBoard: Ludo1OtherBoard,
  },
  ludo2: {
    Dashboard: Ludo2Dashboard,
    Rank: Ludo2Rank,
    Notification: Ludo2Notification,
    Run: Ludo2Run,
    NewUpload: Ludo2NewUpload,
    Upload: Ludo2Upload,
    Profile: Ludo2Profile,
    MyBoard: Ludo2MyBoard,
    OtherBoard: Ludo2OtherBoard,
  },
  ludo3: {
    Dashboard: Ludo3Dashboard,
    Rank: Ludo3Rank,
    Notification: Ludo3Notification,
    Run: Ludo3Run,
    NewUpload: Ludo3NewUpload,
    Upload: Ludo3Upload,
    Profile: Ludo3Profile,
    MyBoard: Ludo3MyBoard,
    OtherBoard: Ludo3OtherBoard,
  },
};

export const getScreens = (businessUnit?: string | null): ScreenSet => {
  const unit = (businessUnit || 'ludo1') as BusinessUnit;
  return REGISTRY[unit] ?? REGISTRY.ludo1;
};