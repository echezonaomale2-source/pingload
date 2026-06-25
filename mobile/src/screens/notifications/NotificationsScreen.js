import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { formatDate } from '../../utils/formatters';
import { notificationService } from '../../services/transactionService';
import { updateAppBadgeCount } from '../../services/pushNotificationService';
import ScreenHeader from '../../components/ScreenHeader';
import { PageLoader } from '../../components/loading';

const NotificationsScreen = () => {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);


  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    refetchInterval: 10000,
  });

  const notifications = data?.data?.data || [];
  const unreadCount = data?.data?.unreadCount || 0;

  const syncBadge = async (nextUnread) => {
    const count = typeof nextUnread === 'number'
      ? nextUnread
      : (await notificationService.getUnreadCount()).data?.data?.unreadCount || 0;
    await updateAppBadgeCount(count);
    queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
  };

  const handleMarkRead = async (id) => {
    await notificationService.markAsRead(id);
    refetch();
    await syncBadge(Math.max(0, unreadCount - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    refetch();
    await syncBadge(0);
  };

  if (isLoading) return <PageLoader message="Loading notifications..." />;

  const getIcon = (type) => {
    const map = { transaction: 'swap-horizontal', promotion: 'gift', security: 'shield', system: 'information-circle' };
    return map[type] || 'notifications';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'Stay updated on your account'}
      />
      {unreadCount > 0 && (
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
          <Text style={styles.markAll}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.isRead && styles.unread]}
            onPress={() => handleMarkRead(item._id)}
            activeOpacity={0.7}
          >
            <View style={[styles.icon, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name={getIcon(item.type)} size={22} color={colors.primary} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 16,
    backgroundColor: colors.card, borderRadius: 12, marginBottom: 8,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  message: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  date: { fontSize: 11, color: colors.textLight, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { color: colors.textLight, marginTop: 12, fontSize: 14 },
  markAll: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  markAllBtn: { alignSelf: 'flex-end', marginRight: 16, marginBottom: 8 },
});

export default NotificationsScreen;
