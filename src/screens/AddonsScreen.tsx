import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAddonStore } from '../stores/addonStore';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

export function AddonsScreen() {
  const {
    addons,
    isLoading,
    error,
    installAddon,
    removeAddon,
    toggleAddon,
    reorderAddon,
    refreshManifest,
    clearError,
  } = useAddonStore();

  const [manifestUrl, setManifestUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const sortedAddons = [...addons].sort((a, b) => a.order - b.order);

  const handleInstall = async () => {
    if (!manifestUrl.trim()) return;

    let url = manifestUrl.trim();
    if (!url.endsWith('/manifest.json')) {
      url = url.replace(/\/$/, '') + '/manifest.json';
    }

    setInstalling(true);
    setInstallError(null);
    clearError();

    try {
      await installAddon(url);
      setManifestUrl('');
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : 'Failed to install addon.');
    } finally {
      setInstalling(false);
    }
  };

  const handleRemove = (addon: (typeof sortedAddons)[0]) => {
    Alert.alert('Remove Addon', `Remove "${addon.manifest.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeAddon(addon.id) },
    ]);
  };

  const handleUpdateAll = async () => {
    setUpdatingAll(true);
    await Promise.allSettled(addons.map((a) => refreshManifest(a.id)));
    setUpdatingAll(false);
  };

  const handleUpdateOne = async (addonId: string) => {
    setUpdatingId(addonId);
    await refreshManifest(addonId);
    setUpdatingId(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Addons</Text>
        <Text style={styles.subtitle}>Install and manage third-party addons.</Text>
      </View>

      {/* Install form */}
      <View style={styles.section}>
        <View style={styles.installRow}>
          <TextInput
            style={styles.urlInput}
            placeholder="Paste addon manifest URL…"
            placeholderTextColor={colors.textMuted}
            value={manifestUrl}
            onChangeText={setManifestUrl}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!installing}
            keyboardType="url"
          />
          <TouchableOpacity
            style={[styles.installBtn, (!manifestUrl.trim() || installing) && styles.installBtnDisabled]}
            onPress={handleInstall}
            disabled={installing || !manifestUrl.trim()}
          >
            {installing ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.installBtnText}>Install</Text>
            )}
          </TouchableOpacity>
        </View>
        {(installError || error) && (
          <Text style={styles.errorText}>{installError || error}</Text>
        )}
      </View>

      {/* Installed list header */}
      {sortedAddons.length > 0 && (
        <View style={styles.listHeader}>
          <Text style={styles.countText}>{sortedAddons.length} installed</Text>
          <TouchableOpacity
            style={styles.updateAllBtn}
            onPress={handleUpdateAll}
            disabled={updatingAll}
          >
            <Text style={styles.updateAllText}>
              {updatingAll ? 'Updating…' : 'Update All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {sortedAddons.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No addons installed</Text>
          <Text style={styles.emptyHint}>
            Paste an addon manifest URL above to get started
          </Text>
        </View>
      )}

      {/* Addon cards */}
      {sortedAddons.map((addon, idx) => (
        <View
          key={addon.id}
          style={[styles.addonCard, !addon.enabled && styles.addonCardDisabled]}
        >
          <View style={styles.addonHeader}>
            {addon.manifest.logo ? (
              <Image source={{ uri: addon.manifest.logo }} style={styles.addonLogo} />
            ) : (
              <View style={styles.addonLogoPlaceholder}>
                <Text style={styles.addonLogoText}>
                  {addon.manifest.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.addonInfo}>
              <View style={styles.addonNameRow}>
                <Text style={styles.addonName} numberOfLines={1}>
                  {addon.manifest.name}
                </Text>
                <Text style={styles.addonVersion}>v{addon.manifest.version}</Text>
                <Text style={styles.addonPriority}>#{idx + 1}</Text>
              </View>
              {addon.manifest.description && (
                <Text style={styles.addonDescription} numberOfLines={2}>
                  {addon.manifest.description}
                </Text>
              )}
              <View style={styles.chips}>
                {addon.manifest.resources.map((r) => (
                  <View key={typeof r === 'string' ? r : r.name} style={styles.chip}>
                    <Text style={styles.chipText}>
                      {typeof r === 'string' ? r : r.name}
                    </Text>
                  </View>
                ))}
                {addon.manifest.types.map((t) => (
                  <View key={t} style={styles.typeChip}>
                    <Text style={styles.chipText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.addonActions}>
            <TouchableOpacity
              style={[styles.actionBtn, idx === 0 && styles.actionBtnDisabled]}
              onPress={() => reorderAddon(addon.id, idx - 1)}
              disabled={idx === 0}
            >
              <Text style={styles.actionBtnText}>↑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, idx === sortedAddons.length - 1 && styles.actionBtnDisabled]}
              onPress={() => reorderAddon(addon.id, idx + 1)}
              disabled={idx === sortedAddons.length - 1}
            >
              <Text style={styles.actionBtnText}>↓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, addon.enabled && styles.toggleBtnOn]}
              onPress={() => toggleAddon(addon.id)}
            >
              <Text style={[styles.toggleBtnText, addon.enabled && styles.toggleBtnTextOn]}>
                {addon.enabled ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleUpdateOne(addon.id)}
              disabled={updatingId === addon.id || updatingAll}
            >
              <Text style={styles.actionBtnText}>
                {updatingId === addon.id ? '…' : '↻'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(addon)}>
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {sortedAddons.length > 0 && (
        <Text style={styles.disclaimer}>
          FlowVid does not provide or host addon content. You control what you install and use.
        </Text>
      )}

      {isLoading && (
        <View style={styles.syncingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.syncingText}>Syncing…</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  title: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  installRow: { flexDirection: 'row', gap: spacing.sm },
  urlInput: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  installBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  installBtnDisabled: { opacity: 0.5 },
  installBtnText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  errorText: { color: colors.danger, fontSize: fontSize.xs, marginTop: spacing.sm },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  countText: { color: colors.textSecondary, fontSize: fontSize.sm },
  updateAllBtn: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  updateAllText: { color: colors.textPrimary, fontSize: fontSize.xs },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: '600' },
  emptyHint: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 },
  addonCard: {
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addonCardDisabled: { opacity: 0.5 },
  addonHeader: { flexDirection: 'row', marginBottom: spacing.sm },
  addonLogo: { width: 40, height: 40, borderRadius: 8, marginRight: spacing.md },
  addonLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  addonLogoText: { color: colors.primary, fontSize: fontSize.lg, fontWeight: '700' },
  addonInfo: { flex: 1 },
  addonNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  addonName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '600', flexShrink: 1 },
  addonVersion: { color: colors.textMuted, fontSize: fontSize.xs },
  addonPriority: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '600' },
  addonDescription: { color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  typeChip: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  chipText: { color: colors.textSecondary, fontSize: 10 },
  addonActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnDisabled: { opacity: 0.3 },
  actionBtnText: { color: colors.textPrimary, fontSize: fontSize.md },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtnOn: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  toggleBtnText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '600' },
  toggleBtnTextOn: { color: colors.primary },
  removeBtn: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  removeBtnText: { color: colors.danger, fontSize: fontSize.md },
  disclaimer: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  syncingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  syncingText: { color: colors.textMuted, fontSize: fontSize.sm },
});
