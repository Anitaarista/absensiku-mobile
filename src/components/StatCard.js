import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StatCard = ({ icon, value, title, color = '#0D9488', subtitle }) => {
  return (
    <View style={[styles.container, { borderLeftColor: color }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
});

export default StatCard;
