import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  useSettingsStore,
  useSubscriptionStore,
  useAuthStore,
} from '../stores';
import { useAddonStore } from '../stores/addonStore';
import { SUBTITLE_LANGUAGES } from '../utils/subtitleLanguages';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const {
    autoPlay,
    autoPlayNext,
    skipIntro,
    skipOutro,
    subtitles,
    subtitleAppearance,
    blurUnwatchedEpisodes,
    showForYou,
    streamSorting,
    preferredAudioLanguage,
    tmdbCustomApiKey,
    tmdbUseCustomKey,
    setAutoPlay,
    setAutoPlayNext,
    setSkipIntro,
    setSkipOutro,
    setSubtitleAutoLoad,
    setSubtitleLanguage,
    setPreferHearingImpaired,
    setSubtitleAppearance,
    setBlurUnwatchedEpisodes,
    setShowForYou,
    setStreamSorting,
    setPreferredAudioLanguage,
    setTmdbCustomApiKey,
    setTmdbUseCustomKey,
    resetSettings,
  } = useSettingsStore();

  const { isAuthenticated, logout, user } = useAuthStore();
  const { subscription, isLoading: subLoading, fetchStatus, startCheckout, openPortal } =
    useSubscriptionStore();
  const addonCount = useAddonStore((s) => s.addons.length);

  const isPaid = subscription?.tier === 'vreamio_plus';

  const [tmdbKeyInput, setTmdbKeyInput] = useState(tmdbCustomApiKey || '');
  const [tmdbValidating, setTmdbValidating] = useState(false);

  useEffect(() => {
    if (isAuthenticated) fetchStatus();
  }, [isAuthenticated]);

  const handleCheckout = async () => {
    const url = await startCheckout();
    if (url) Linking.openURL(url);
  };

  const handlePortal = async () => {
    const url = await openPortal();
    if (url) Linking.openURL(url);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleReset = () => {
    Alert.alert('Reset Settings', 'Reset all settings to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetSettings },
    ]);
  };

  const handleSaveTmdbKey = async () => {
    if (!tmdbKeyInput.trim()) return;
    setTmdbValidating(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(tmdbKeyInput.trim())}`,
      );
      if (res.ok) {
        setTmdbCustomApiKey(tmdbKeyInput.trim());
        setTmdbUseCustomKey(true);
        Alert.alert('Success', 'TMDB API key saved');
      } else {
        Alert.alert('Error', 'Invalid TMDB API key');
      }
    } catch {
      Alert.alert('Error', 'Validation failed');
    } finally {
      setTmdbValidating(false);
    }
  };

  const handleRemoveTmdbKey = () => {
    setTmdbCustomApiKey('');
    setTmdbUseCustomKey(false);
    setTmdbKeyInput('');
  };

  const AUDIO_LANGUAGES = [
    { code: 'eng', label: 'English' },
    { code: 'nld', label: 'Dutch' },
    { code: 'spa', label: 'Spanish' },
    { code: 'fra', label: 'French' },
    { code: 'deu', label: 'German' },
    { code: 'ita', label: 'Italian' },
    { code: 'por', label: 'Portuguese' },
    { code: 'jpn', label: 'Japanese' },
    { code: 'kor', label: 'Korean' },
    { code: 'zho', label: 'Chinese' },
    { code: 'hin', label: 'Hindi' },
    { code: 'ara', label: 'Arabic' },
    { code: 'rus', label: 'Russian' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>Customize your FlowVid experience</Text>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.tierRow}>
          <View style={[styles.tierBadge, isPaid ? styles.tierPlus : styles.tierFree]}>
            <Text style={styles.tierBadgeText}>
              {isPaid ? 'FlowVid+' : 'FlowVid Free'}
            </Text>
          </View>
        </View>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>✅ Stream via your addons</Text>
          <Text style={styles.featureItem}>✅ Subtitles & skip intro</Text>
          <Text style={styles.featureItem}>✅ Library & sync</Text>
          <Text style={[styles.featureItem, !isPaid && styles.featureLocked]}>
            {isPaid ? '✅' : '🔒'} Family profiles (up to 8)
          </Text>
          <Text style={[styles.featureItem, !isPaid && styles.featureLocked]}>
            {isPaid ? '✅' : '🔒'} Cross-device sync
          </Text>
        </View>
        {!isPaid && (
          <TouchableOpacity style={styles.upgradeButtonWrapper} onPress={handleCheckout}>
            <LinearGradient
              colors={[colors.primary, '#818cf8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeButton}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to FlowVid+</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {isPaid && (
          <TouchableOpacity style={styles.manageButton} onPress={handlePortal}>
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Addons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Addons</Text>
        <Text style={styles.sectionDescription}>
          Install and manage third-party addons for streaming.
        </Text>
        <TouchableOpacity
          style={styles.manageAddonsButton}
          onPress={() => navigation.navigate('Addons')}
        >
          <Text style={styles.manageAddonsText}>
            Manage Addons ({addonCount} installed)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Playback */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Playback</Text>
        <SettingToggle
          label="Auto Play"
          description="Automatically start playing when a source is found"
          value={autoPlay}
          onToggle={setAutoPlay}
        />
        <SettingToggle
          label="Auto Play Next Episode"
          description="Automatically play the next episode when one ends"
          value={autoPlayNext}
          onToggle={setAutoPlayNext}
        />
        <SettingToggle
          label="Skip Intro"
          description="Automatically skip intros using IntroDB & AniSkip"
          value={skipIntro}
          onToggle={setSkipIntro}
        />
        <SettingToggle
          label="Skip Outro"
          description="Automatically skip outros using IntroDB & AniSkip"
          value={skipOutro}
          onToggle={setSkipOutro}
        />

        {/* Stream sorting */}
        <View style={toggleStyles.container}>
          <View style={toggleStyles.info}>
            <Text style={toggleStyles.label}>Stream Sorting</Text>
            <Text style={toggleStyles.description}>
              {streamSorting === 'quality'
                ? 'Best quality first across all addons'
                : 'Grouped by addon priority order'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sortingToggle}
            onPress={() =>
              setStreamSorting(streamSorting === 'quality' ? 'addon' : 'quality')
            }
          >
            <Text style={styles.sortingToggleText}>
              {streamSorting === 'quality' ? 'Quality' : 'Addon'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Audio language */}
        <View style={toggleStyles.container}>
          <View style={toggleStyles.info}>
            <Text style={toggleStyles.label}>Preferred Audio Language</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.langChips}>
            {AUDIO_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langChip,
                  preferredAudioLanguage === lang.code && styles.langChipActive,
                ]}
                onPress={() => setPreferredAudioLanguage(lang.code)}
              >
                <Text
                  style={[
                    styles.langChipText,
                    preferredAudioLanguage === lang.code && styles.langChipTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Subtitles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subtitles</Text>
        <SettingToggle
          label="Auto-load Subtitles"
          value={subtitles.autoLoad}
          onToggle={setSubtitleAutoLoad}
        />
        <SettingToggle
          label="Prefer Hearing Impaired"
          value={subtitles.preferHearingImpaired}
          onToggle={setPreferHearingImpaired}
        />

        <Text style={styles.subsectionTitle}>Appearance</Text>

        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Font Size: {subtitleAppearance.fontSize}px</Text>
          <View style={styles.sliderButtons}>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() =>
                setSubtitleAppearance({ fontSize: Math.max(14, subtitleAppearance.fontSize - 2) })
              }
            >
              <Text style={styles.sliderBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() =>
                setSubtitleAppearance({ fontSize: Math.min(48, subtitleAppearance.fontSize + 2) })
              }
            >
              <Text style={styles.sliderBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>
            Background: {Math.round(subtitleAppearance.backgroundOpacity * 100)}%
          </Text>
          <View style={styles.sliderButtons}>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() =>
                setSubtitleAppearance({
                  backgroundOpacity: Math.max(0, +(subtitleAppearance.backgroundOpacity - 0.1).toFixed(1)),
                })
              }
            >
              <Text style={styles.sliderBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() =>
                setSubtitleAppearance({
                  backgroundOpacity: Math.min(1, +(subtitleAppearance.backgroundOpacity + 0.1).toFixed(1)),
                })
              }
            >
              <Text style={styles.sliderBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SettingToggle
          label="Text Shadow"
          value={subtitleAppearance.textShadow}
          onToggle={(v) => setSubtitleAppearance({ textShadow: v })}
        />

        <View style={styles.subtitlePreview}>
          <View
            style={[
              styles.subtitlePreviewBg,
              { backgroundColor: `rgba(0,0,0,${subtitleAppearance.backgroundOpacity})` },
            ]}
          >
            <Text
              style={[
                styles.subtitlePreviewText,
                {
                  fontSize: Math.min(subtitleAppearance.fontSize, 24),
                  color: subtitleAppearance.textColor,
                },
                subtitleAppearance.textShadow && {
                  textShadowColor: 'rgba(0,0,0,0.8)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3,
                },
              ]}
            >
              Subtitle Preview Text
            </Text>
          </View>
        </View>
      </View>

      {/* Display */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display</Text>
        <SettingToggle
          label="Blur Unwatched Episodes"
          description="Blur thumbnails to avoid spoilers"
          value={blurUnwatchedEpisodes}
          onToggle={setBlurUnwatchedEpisodes}
        />
        <SettingToggle
          label="Show For You Row"
          description="Personalized recommendations on home screen"
          value={showForYou}
          onToggle={setShowForYou}
        />
      </View>

      {/* TMDB */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TMDB API Key</Text>
        <Text style={styles.sectionDescription}>
          Optional: use your own TMDB API key for metadata. A built-in key is used by default.
        </Text>
        {tmdbUseCustomKey && tmdbCustomApiKey ? (
          <View style={styles.tmdbActiveRow}>
            <Text style={styles.tmdbActiveText}>Custom key active ✓</Text>
            <TouchableOpacity onPress={handleRemoveTmdbKey}>
              <Text style={styles.tmdbRemoveText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.apiKeyRow}>
            <TextInput
              style={styles.apiKeyInput}
              placeholder="TMDB API key"
              placeholderTextColor={colors.textMuted}
              value={tmdbKeyInput}
              onChangeText={setTmdbKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveTmdbKey}
              disabled={tmdbValidating || !tmdbKeyInput.trim()}
            >
              {tmdbValidating ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {isAuthenticated && user && (
          <Text style={styles.accountEmail}>{user.email}</Text>
        )}
        {isAuthenticated ? (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.notLoggedIn}>Not logged in</Text>
        )}
      </View>

      {/* Reset */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset All Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

function SettingToggle({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={toggleStyles.container}>
      <View style={toggleStyles.info}>
        <Text style={toggleStyles.label}>{label}</Text>
        {description && <Text style={toggleStyles.description}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.bgTertiary, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: { flex: 1, marginRight: spacing.md },
  label: { color: colors.textPrimary, fontSize: fontSize.md },
  description: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  pageHeader: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.lg,
  },
  pageTitle: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 },
  section: {
    backgroundColor: colors.bgCard, marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: '700', marginBottom: 6, letterSpacing: -0.2 },
  sectionDescription: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: spacing.md },
  subsectionTitle: {
    color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600',
    marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tierRow: { flexDirection: 'row', marginBottom: spacing.md },
  tierBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.round },
  tierPlus: { backgroundColor: colors.primaryLight },
  tierFree: { backgroundColor: colors.bgTertiary },
  tierBadgeText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  featureList: { marginBottom: spacing.md },
  featureItem: { color: colors.textSecondary, fontSize: fontSize.sm, paddingVertical: 3 },
  featureLocked: { opacity: 0.5 },
  upgradeButtonWrapper: {
    borderRadius: borderRadius.md, overflow: 'hidden',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  upgradeButton: { paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  upgradeButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700', letterSpacing: 0.2 },
  manageButton: {
    backgroundColor: colors.bgTertiary, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  manageButtonText: { color: colors.textPrimary, fontSize: fontSize.md },
  manageAddonsButton: {
    backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center',
  },
  manageAddonsText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  sortingToggle: {
    backgroundColor: colors.bgTertiary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border,
  },
  sortingToggleText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  langChips: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  langChip: {
    backgroundColor: colors.bgTertiary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border,
  },
  langChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  langChipText: { color: colors.textSecondary, fontSize: fontSize.xs },
  langChipTextActive: { color: colors.primary, fontWeight: '600' },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  sliderLabel: { color: colors.textSecondary, fontSize: fontSize.sm },
  sliderButtons: { flexDirection: 'row', gap: spacing.sm },
  sliderBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgTertiary,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  sliderBtnText: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: '600' },
  subtitlePreview: {
    marginTop: spacing.md, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: borderRadius.md,
    padding: spacing.lg, alignItems: 'center',
  },
  subtitlePreviewBg: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 4 },
  subtitlePreviewText: { textAlign: 'center' },
  tmdbActiveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tmdbActiveText: { color: colors.success, fontSize: fontSize.sm },
  tmdbRemoveText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '500' },
  apiKeyRow: { flexDirection: 'row', gap: spacing.sm },
  apiKeyInput: {
    flex: 1, backgroundColor: colors.bgTertiary, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary,
    fontSize: fontSize.sm, borderWidth: 1, borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  saveButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  accountEmail: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.md },
  notLoggedIn: { color: colors.textMuted, fontSize: fontSize.sm },
  logoutButton: {
    backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: spacing.md, borderRadius: borderRadius.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.danger,
  },
  logoutButtonText: { color: colors.danger, fontSize: fontSize.md, fontWeight: '500' },
  resetButton: { paddingVertical: spacing.md, alignItems: 'center' },
  resetButtonText: { color: colors.danger, fontSize: fontSize.md },
  bottomPadding: { height: 100 },
});
