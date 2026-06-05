import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import bgImg from '../assets/newAssets/Layer1copy.png';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { authHeaders } from '../api';
import { useAuth } from './AuthContext';
import { mediatorLogin } from '../api/mediator';
import AsyncStorage from '@react-native-async-storage/async-storage';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const LoginScreen = () => {
  const { width, height } = useWindowDimensions();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setSession } = useAuth();
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });
  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' = 'success',
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
    });
  };

  // Responsive scaling based on screen dimensions
  const scale = (size: number) => (width / 390) * size;
  const isSmallScreen = width < 360;
  const isTablet = width >= 768;
  const isShortScreen = height < 700;
  const isLandscape = width > height;

  // Scaled dimensions
  const fieldHeight = clamp(
    scale(50),
    isSmallScreen ? 44 : 46,
    isTablet ? 58 : 56,
  );
  const fieldFontSize = clamp(scale(18), isSmallScreen ? 14 : 15, 18);
  const cardPadding = clamp(
    scale(24),
    isSmallScreen ? 16 : 18,
    isTablet ? 32 : 28,
  );
  const fieldGap = clamp(scale(12), 10, isTablet ? 16 : 15);
  const borderRadius = clamp(scale(20), 14, 24);

  // Card width responsive
  const baseCardWidth = Math.min(width - 32, isTablet ? 500 : 430);
  const cardWidth =
    isLandscape && height < 500 ? Math.min(width - 32, 550) : baseCardWidth;

  const handleLogin = async () => {
    const trimmedUserId = userId.trim();

    if (!trimmedUserId || !password) {
      showAlert('Login Required', 'Please enter your user ID and password.');
      return;
    }

    try {
      setIsSubmitting(true);

      // mediator api call
      const json = await mediatorLogin(trimmedUserId, password);
      console.log('Mediator login responseeeeeeeeeeeeee:', json);
      // validation
      if (!json.success) {
        showAlert('Login Failed', json.message || 'Invalid credentials.');
        return;
      }

      const loginData = json.data;
      console.log('Parsed login data:', loginData);
      // optional access check
      // if (loginData.user.hasAccess !== 1) {
      //   showAlert(
      //     'Access Denied',
      //     'Your account does not have access.',
      //   );
      //   return;
      // }

      // store session
      // save locally
      await AsyncStorage.multiSet([
        ['token', loginData.token],
        ['backendUrl', loginData.backendUrl],
        ['businessUnit', loginData.businessUnit],
        ['user', JSON.stringify(loginData.user)],
      ]);

      console.log('BACKEND URL SAVED =>', loginData.backendUrl);

      // store auth context
      setSession({
        token: loginData.token,
        user: loginData.user,
        backendUrl: loginData.backendUrl,
        businessUnit: loginData.businessUnit,
      });

      await AsyncStorage.setItem('backendUrl', loginData.backendUrl);

      await AsyncStorage.setItem('token', loginData.token);
      // go dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: 'dashboard' }],
      });
    } catch (error) {
      showAlert(
        'Login Failed',
        error instanceof Error ? error.message : 'Unable to connect to server.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#0B132B', '#1C2541']} style={styles.container}>
      <View style={styles.bgImageContainer} pointerEvents="none">
        <Image source={bgImg} style={styles.bgImage} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            minHeight: height,
            paddingHorizontal: clamp(scale(16), 16, 28),
            paddingVertical: isShortScreen ? scale(24) : scale(36),
          },
        ]}
      >
        <LinearGradient
          colors={['#7F4BE2', '#9F6BFF']}
          style={[
            styles.card,
            {
              width: cardWidth,
              padding: cardPadding,
              borderRadius: borderRadius,
              gap: fieldGap,
            },
          ]}
        >
          <TextInput
            placeholder="MR ID / User ID"
            placeholderTextColor="#ddd"
            style={[
              styles.input,
              {
                height: fieldHeight,
                fontSize: fieldFontSize,
                paddingHorizontal: clamp(
                  scale(12),
                  isSmallScreen ? 10 : 12,
                  16,
                ),
              },
            ]}
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
          />

          <View
            style={[
              styles.passwordContainer,
              {
                height: fieldHeight,
                paddingHorizontal: clamp(
                  scale(12),
                  isSmallScreen ? 10 : 12,
                  16,
                ),
              },
            ]}
          >
            <TextInput
              placeholder="Password"
              placeholderTextColor="#ddd"
              secureTextEntry={!passwordVisible}
              style={[styles.passwordInput, { fontSize: fieldFontSize }]}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              onPress={() => setPasswordVisible(!passwordVisible)}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Icon
                name={passwordVisible ? 'visibility-off' : 'visibility'}
                size={clamp(scale(20), 18, 22)}
                color="#ddd"
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.button,
              {
                height: fieldHeight,
                minWidth: clamp(scale(136), 124, 160),
                paddingHorizontal: clamp(
                  scale(18),
                  isSmallScreen ? 14 : 16,
                  24,
                ),
                marginTop: isLandscape
                  ? clamp(scale(4), 2, 8)
                  : clamp(scale(8), 4, 12),
              },
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  { fontSize: clamp(scale(18), 16, 18) },
                ]}
              >
                Login
              </Text>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
      {alertConfig.visible && (
        <View style={styles.alertOverlay}>
          <LinearGradient
            colors={['#1c3b82', '#1c3b82', '#000479']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.alertBox,
              {
                width: Math.min(width - 40, isTablet ? 420 : 360),
                paddingHorizontal: clamp(
                  scale(24),
                  isSmallScreen ? 18 : 20,
                  isTablet ? 32 : 28,
                ),
                paddingVertical: clamp(
                  scale(28),
                  isSmallScreen ? 22 : 24,
                  isTablet ? 34 : 30,
                ),
                borderRadius: clamp(scale(28), 20, 34),
              },
            ]}
          >
            <View style={styles.alertIconWrapper}>
              <Icon
                name={
                  alertConfig.type === 'success'
                    ? 'error'
                    : alertConfig.type === 'error'
                    ? 'error'
                    : 'warning'
                }
                size={clamp(scale(34), isSmallScreen ? 28 : 32, 38)}
                color="#f5365c"
              />
            </View>

            <Text
              style={[
                styles.alertTitle,
                { fontSize: clamp(scale(22), isSmallScreen ? 18 : 20, 24) },
              ]}
            >
              {alertConfig.title}
            </Text>

            <Text
              style={[
                styles.alertMessage,
                { fontSize: clamp(scale(15), isSmallScreen ? 13 : 14, 16) },
              ]}
            >
              {alertConfig.message}
            </Text>

            <TouchableOpacity
              style={[
                styles.alertButton,
                {
                  marginTop: clamp(scale(18), 14, 22),
                  paddingVertical: clamp(scale(12), 10, 14),
                },
              ]}
              onPress={() =>
                setAlertConfig(prev => ({
                  ...prev,
                  visible: false,
                }))
              }
            >
              <Text
                style={[
                  styles.alertButtonText,
                  { fontSize: clamp(scale(15), 13, 17) },
                ]}
              >
                OK
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </LinearGradient>
  );
};

export default LoginScreen;

const styles = StyleSheet.create<Record<string, any>>({
  container: {
    flex: 1,
  },
  bgImageContainer: {
    ...StyleSheet.absoluteFill,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: 'cover',
    height: '100%',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  tagline: {
    color: '#ccc',
    marginBottom: 40,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    width: '100%',
    color: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
  },
  button: {
    backgroundColor: '#1C2541',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
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
    alignItems: 'center',
    backgroundColor: '#0E1F4F',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
  },
  alertIconWrapper: {
    width: 84,
    height: 84,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  alertTitle: {
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  alertMessage: {
    color: 'rgba(255,255,255,0.86)',
    textAlign: 'center',
    lineHeight: 22,
  },
  alertButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  alertButtonText: {
    color: '#0E1F4F',
    fontWeight: '700',
  },
});
