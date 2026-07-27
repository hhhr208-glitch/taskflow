import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Extend the Axios request config to include our custom _retry flag
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Type for the queue of pending requests
interface FailedQueueItem {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  withCredentials: true,   // important for sending/receiving cookies
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,   // 10 seconds timeout
});



let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

   
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
     
      await apiClient.post('/token/refresh/', {});
      
      
      processQueue(null);
      
  
      return apiClient(originalRequest);
      
    } catch (refreshError) {

      processQueue(refreshError as AxiosError);
      

      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
      
      return Promise.reject(refreshError);
      
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;

/*import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  withCredentials: true,   // important for sending/receiving cookies
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,   // 10 seconds timeout
});

export default apiClient;*/