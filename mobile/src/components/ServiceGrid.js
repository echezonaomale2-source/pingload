import React from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../utils/colors';
import { useTheme } from '../context/ThemeContext';

const ServiceGrid = ({ services, onServicePress }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, { color: colors.text }]}>Services</Text>
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <FlatList
          data={services}
          numColumns={4}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => onServicePress(item)} activeOpacity={0.7}>
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}12` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={[styles.itemName, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, marginTop: 20 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  container: {
    borderRadius: 16,
    padding: 12,
    paddingBottom: 4,
    ...shadows.card,
  },
  item: { flex: 1, alignItems: 'center', marginBottom: 14, maxWidth: '25%' },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  itemName: { fontSize: 11, textAlign: 'center', fontWeight: '600' },
});

export default ServiceGrid;
