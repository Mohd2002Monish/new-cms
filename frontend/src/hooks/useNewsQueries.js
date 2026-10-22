import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';

// Query Keys
export const queryKeys = {
  posts: (params) => ['posts', params],
  post: (id) => ['post', id],
  categories: () => ['categories'],
  stats: () => ['stats'],
  auditLogs: (params) => ['audit-logs', params],
};

/**
 * Hook to fetch paginated & filtered posts with automatic 2-minute caching.
 */
export function usePostsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.posts(params),
    queryFn: async () => {
      const res = await api.get('/posts', { params });
      return res.data;
    },
    placeholderData: (previousData) => previousData, // keep previous page data while loading next page
  });
}

/**
 * Hook to fetch a single post by ID.
 */
export function usePostDetailQuery(id) {
  return useQuery({
    queryKey: queryKeys.post(id),
    queryFn: async () => {
      const res = await api.get(`/posts/${id}`);
      return res.data;
    },
    enabled: Boolean(id) && id !== 'new',
  });
}

/**
 * Hook to fetch all categories with 5-minute cache.
 */
export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Mutation hook to approve a post with automatic query cache invalidation.
 */
export function useApprovePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.patch(`/posts/${id}/approve`, data);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate posts list so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

/**
 * Mutation hook to reject a post with cache invalidation.
 */
export function useRejectPostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const res = await api.patch(`/posts/${id}/reject`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

/**
 * Mutation hook to delete a post with cache invalidation.
 */
export function useDeletePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/posts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
