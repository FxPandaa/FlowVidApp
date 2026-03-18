import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

interface StreamConfirmPopupProps {
  title: string;
  quality?: string;
  size?: string;
  seeds?: number;
  isInstant?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StreamConfirmPopup({
  title,
  quality,
  size,
  seeds,
  isInstant,
  onConfirm,
  onCancel,
}: StreamConfirmPopupProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.popup}>
        <Text style={styles.heading}>Start Streaming?</Text>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>

        <View style={styles.badges}>
          {quality && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{quality}</Text>
            </View>
          )}
          {size && <Text style={styles.meta}>{size}</Text>}
          {seeds !== undefined && <Text style={styles.meta}>↑ {seeds}</Text>}
          {isInstant && (
            <View style={[styles.badge, styles.instantBadge]}>
              <Text style={styles.badgeText}>⚡ Instant</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
            <Text style={styles.confirmText}>▶ Play</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  popup: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.bgGlassBorder,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  instantBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
