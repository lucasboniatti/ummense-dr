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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Request failed';

    return Promise.reject(new Error(`API ${status ?? 'ERR'}: ${message}`));
  }
);
