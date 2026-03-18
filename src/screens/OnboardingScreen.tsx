import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAddonStore } from '../stores/addonStore';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const addonCount = useAddonStore((s) => s.addons.length);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Icon */}
        <LinearGradient
          colors={[colors.primary, '#0066ff']}
          style={styles.iconCircle}
        >
          <Text style={styles.iconText}>▶</Text>
        </LinearGradient>

        <Text style={styles.title}>Welcome to FlowVid</Text>
        <Text style={styles.lead}>
          FlowVid is a neutral media player — it doesn't bundle any content sources.
        </Text>

        {/* Steps */}
        <View style={styles.steps}>
          <View style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Find an addon</Text>
              <Text style={styles.stepDesc}>
                Get a manifest URL from any Stremio-compatible addon provider of your choice.
              </Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Paste the URL</Text>
              <Text style={styles.stepDesc}>
                Go to the Addons page and paste the manifest URL. FlowVid fetches the addon info automatically.
              </Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Use your addons</Text>
              <Text style={styles.stepDesc}>
                Open media and FlowVid will query your installed addons for available sources.
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Addons')}
        >
          <LinearGradient
            colors={[colors.primary, '#818cf8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtnGradient}
          >
            <Text style={styles.primaryBtnText}>
              {addonCount > 0 ? 'Manage Addons' : 'Install My First Addon'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.secondaryBtnText}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          FlowVid supports the Stremio addon protocol. Addons are third-party and managed by you.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: SCREEN_WIDTH - spacing.lg * 2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconText: { color: colors.white, fontSize: 24 },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  lead: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  steps: { width: '100%', marginBottom: spacing.lg },
  step: { flexDirection: 'row', marginBottom: spacing.md },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  stepNumText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '700' },
  stepBody: { flex: 1 },
  stepTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '600', marginBottom: 2 },
  stepDesc: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 },
  primaryBtn: { width: '100%', borderRadius: borderRadius.md, overflow: 'hidden', marginBottom: spacing.sm },
  primaryBtnGradient: { paddingVertical: spacing.md, alignItems: 'center', borderRadius: borderRadius.md },
  primaryBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  secondaryBtnText: { color: colors.textMuted, fontSize: fontSize.sm },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
});
