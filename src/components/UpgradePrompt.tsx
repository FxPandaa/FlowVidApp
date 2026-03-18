import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSubscriptionStore } from '../stores';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

type GatedFeature = 'family_profiles' | 'native_scrapers' | 'managed_torbox';

interface UpgradePromptProps {
  feature: GatedFeature;
  onClose: () => void;
}

const FEATURE_INFO: Record<GatedFeature, { title: string; description: string }> = {
  family_profiles: {
    title: 'Family Profiles',
    description:
      'Create up to 8 profiles with separate libraries and watch histories. Perfect for families sharing one account.',
  },
  native_scrapers: {
    title: 'Native Scrapers',
    description:
      'Unlock 11 in-app torrent scrapers for zero-downtime streaming. Search more sources, find more results.',
  },
  managed_torbox: {
    title: 'Managed TorBox',
    description:
      'Get a pre-configured TorBox account included with your subscription. Zero-setup streaming with no additional costs.',
  },
};

export function UpgradePrompt({ feature, onClose }: UpgradePromptProps) {
  const { startCheckout, checkoutLoading } = useSubscriptionStore();
  const info = FEATURE_INFO[feature];

  const handleUpgrade = async () => {
    const url = await startCheckout();
    if (url) {
      // Open in browser
      const { Linking } = require('react-native');
      Linking.openURL(url);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modal}>
          <Text style={styles.badge}>FlowVid+</Text>
          <Text style={styles.title}>{info.title}</Text>
          <Text style={styles.description}>{info.description}</Text>

          <View style={styles.features}>
            <Text style={styles.featureItem}>✅ 11 native scrapers</Text>
            <Text style={styles.featureItem}>✅ Family profiles (8 max)</Text>
            <Text style={styles.featureItem}>✅ Managed TorBox included</Text>
            <Text style={styles.featureItem}>✅ Priority support</Text>
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            disabled={checkoutLoading}
          >
            <Text style={styles.upgradeButtonText}>
              {checkoutLoading ? 'Starting...' : 'Upgrade to FlowVid+'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.bgGlassBorder,
    alignItems: 'center',
  },
  badge: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: spacing.xl,
  },
  featureItem: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    paddingVertical: spacing.xs,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: spacing.sm,
  },
  closeButtonText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
