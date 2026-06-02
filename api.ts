import AsyncStorage from '@react-native-async-storage/async-storage';

export const getBaseUrl = async () => {
  const backendUrl =
    await AsyncStorage.getItem('backendUrl');

  return backendUrl || '';
};

export const getToken = async () => {
  const token = await AsyncStorage.getItem('token');
  return token || '';
};

export const authHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {}),
});