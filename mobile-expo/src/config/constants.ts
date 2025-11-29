import { Platform } from 'react-native';

type GlobalWithProcess = typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const localFallback =
  Platform.select({
    android: 'http://10.0.2.2:4000',
    ios: 'http://localhost:4000',
    default: 'http://localhost:4000',
  }) || 'http://localhost:4000';

const envBackendUrl =
  (globalThis as GlobalWithProcess).process?.env?.EXPO_PUBLIC_BACKEND_URL;

export const BACKEND_URL =
  envBackendUrl && envBackendUrl.length > 0 ? envBackendUrl : localFallback;

export const APP_TITLE = 'Hệ thống Quản lý Bài tập';

