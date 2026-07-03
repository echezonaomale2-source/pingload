import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../services/transactionService';

/** Single shared notification-count query — avoids duplicate polling across tabs/screens. */
export const useNotificationCount = () => {
  const query = useQuery({
    queryKey: ['notificationCount'],
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 20000,
    refetchInterval: 30000,
    select: (data) => data?.data?.data?.unreadCount || 0,
  });

  return {
    unreadCount: query.data ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};
