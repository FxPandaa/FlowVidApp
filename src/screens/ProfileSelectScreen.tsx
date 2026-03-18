import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore } from '../stores/profileStore';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AVATAR_SIZE = (SCREEN_WIDTH - spacing.xxl * 2 - spacing.lg * 3) / 4;

export function ProfileSelectScreen() {
  const navigation = useNavigation<any>();
  const { profiles, setActiveProfile } = useProfileStore();

  const handleSelectProfile = (profileId: string) => {
    setActiveProfile(profileId);
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const avatarEmojis = ['😀', '😎', '🦊', '🐱', '🐶', '🦁', '🐼', '🦄', '🐸', '🎮', '🎬', '🎵'];

  return (
    <View style={styles.container}>
      {/* Ambient glow */}
      <LinearGradient
        colors={['rgba(99,102,241,0.2)', 'transparent']}
        style={styles.bgGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        pointerEvents="none"
      />

      <Text style={styles.title}>Who's Watching?</Text>
      <Text style={styles.subtitle}>Select your profile to continue</Text>

      <View style={styles.profileGrid}>
        {profiles.map((profile: any) => (
          <TouchableOpacity
            key={profile.id}
            style={styles.profileCard}
            onPress={() => handleSelectProfile(profile.id)}
            activeOpacity={0.75}
          >
            <View style={[
              styles.avatarWrapper,
              { shadowColor: profile.color || colors.primary },
            ]}>
              <LinearGradient
                colors={[profile.color || colors.primary, `${profile.color || colors.primary}88`]}
                style={styles.avatar}
              >
                <Text style={styles.avatarEmoji}>
                  {avatarEmojis[profile.avatarIndex || 0]}
                </Text>
              </LinearGradient>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile.name}
            </Text>
            {profile.isKids && (
              <View style={styles.kidsBadge}>
                <Text style={styles.kidsLabel}>Kids</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.manageButton} activeOpacity={0.7}>
        <Text style={styles.manageButtonText}>Manage Profiles</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  bgGlow: {
    position: 'absolute',
    top: 0,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_HEIGHT * 0.5,
    zIndex: 0,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
    zIndex: 1,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing.xxxl,
    letterSpacing: 0.2,
    zIndex: 1,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xxxl,
    zIndex: 1,
  },
  profileCard: {
    alignItems: 'center',
    width: AVATAR_SIZE + spacing.lg,
  },
  avatarWrapper: {
    borderRadius: borderRadius.lg + 4,
    marginBottom: spacing.sm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatarEmoji: {
    fontSize: AVATAR_SIZE * 0.5,
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  kidsBadge: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    marginTop: 4,
  },
  kidsLabel: {
    color: colors.info,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  manageButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    zIndex: 1,
  },
  manageButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
