import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 minutes — fresh data without unnecessary refetches
      gcTime: 1000 * 60 * 10,         // 10 minutes cache garbage collection
      refetchOnWindowFocus: false,     // Don't refetch automatically on window focus for smoother UX
      retry: 1,                       // Retry once on network failure
    },
    mutations: {
      retry: 0,
    },
  },
});
