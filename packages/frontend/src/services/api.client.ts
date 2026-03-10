import axios from 'axios';

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3001';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const token =
    window.localStorage.getItem('tasksflow_dev_token') ||
    window.localStorage.getItem('token');

  if (!token) {
    return config;
  }

  const headers = (config.headers || {}) as Record<string, string>;
  if (!headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  config.headers = headers as any;

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Request failed';

    if (status === 401) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('tasksflow_dev_token');
        window.localStorage.removeItem('token');
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(new Error(`API ${status ?? 'ERR'}: ${message}`));
  }
);
