import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type AuthUser = {
  id: string;

  mrId?: string | null;
  flmId?: string | null;

  name?: string | null;
  role: string;

  adminId?: string | null;
  teamName?: string | null;
};

type AuthSession = {
  token: string;
  user: AuthUser;

  backendUrl?: string;
  businessUnit?: string;

  currentBoard?: {
    boardId: number | string;
    myColor?: string | null;
  };
};

type AuthContextValue = {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  user: AuthUser | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_SESSION_STORAGE_KEY = 'ludocrm.auth.session';

const isValidSession = (value: unknown): value is AuthSession => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<AuthSession>;
  return Boolean(
    session.token &&
      typeof session.token === 'string' &&
      session.user &&
      typeof session.user.id === 'string' &&
      typeof session.user.role === 'string',
  );
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const storedSession = await AsyncStorage.getItem(
          AUTH_SESSION_STORAGE_KEY,
        );

        if (!storedSession) {
          return;
        }

        const parsedSession = JSON.parse(storedSession);
        if (isValidSession(parsedSession) && isMounted) {
          setSession(parsedSession);
        } else {
          await AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        }
      } catch (error) {
        console.warn('Unable to restore auth session:', error);
        await AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateSession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);

    if (nextSession) {
      AsyncStorage.setItem(
        AUTH_SESSION_STORAGE_KEY,
        JSON.stringify(nextSession),
      ).catch(error => {
        console.warn('Unable to save auth session:', error);
      });
      return;
    }

    AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY).catch(error => {
      console.warn('Unable to clear auth session:', error);
    });
  }, []);

  const value = useMemo(
    () => ({
      session,
      setSession: updateSession,
      user: session?.user || null,
      isLoading,
    }),
    [isLoading, session, updateSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
