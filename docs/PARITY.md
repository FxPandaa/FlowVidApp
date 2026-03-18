# Vreamio Mobile Apps — Parity Documentation

## Overview

This document validates the visual and functional parity between the existing web/desktop application and the native mobile apps (Android + iOS). Both apps are built with MVVM architecture and target 100% feature coverage.

---

## 1. Navigation Parity

| Web Route | Android Screen | iOS Screen | Status |
|-----------|---------------|------------|--------|
| `/login` | `LoginScreen` | `LoginScreen` | ✅ |
| `/app/profiles` | `ProfileSelectScreen` | `ProfileSelectScreen` | ✅ |
| `/app` (Home) | `HomeScreen` (Tab) | `HomeScreen` (Tab) | ✅ |
| `/app/search` | `SearchScreen` (Tab) | `SearchScreen` (Tab) | ✅ |
| `/app/library` | `LibraryScreen` (Tab) | `LibraryScreen` (Tab) | ✅ |
| `/app/settings` | `SettingsScreen` (Tab) | `SettingsScreen` (Tab) | ✅ |
| `/app/details/:type/:id` | `DetailsScreen` | `DetailsScreen` | ✅ |
| `/app/player/:type/:id` | `PlayerScreen` | `PlayerScreen` | ✅ |

### Auth Guards
- **Web**: `AuthGuard` component wraps `/app/*` routes
- **Android**: Navigation graph checks `authState.isAuthenticated` to set start destination
- **iOS**: `ContentView` conditionally renders `LoginScreen` / `ProfileSelectScreen` / `MainTabView`
- All three platforms redirect to login if unauthenticated and to profile selection if no active profile

### Bottom Navigation
- Web: Sidebar layout with Home, Search, Library, Settings
- Mobile: Bottom tab bar with same 4 tabs (adapted for mobile UX convention)

---

## 2. Visual Design Parity

### Color Tokens

| CSS Variable | Hex | Android (`Color.kt`) | iOS (`DesignSystem.swift`) |
|-------------|-----|----------------------|---------------------------|
| `--bg-primary` | `#050507` | `BgPrimary` | `Color.bgPrimary` |
| `--bg-secondary` | `#0a0a0f` | `BgSecondary` | `Color.bgSecondary` |
| `--bg-tertiary` | `#111118` | `BgTertiary` | `Color.bgTertiary` |
| `--bg-elevated` | `#16161f` | `BgElevated` | `Color.bgElevated` |
| `--primary` | `#6366F1` | `Primary` | `Color.primaryBrand` |
| `--primary-hover` | `#818CF8` | `PrimaryHover` | `Color.primaryHover` |
| `--accent-blue` | `#3B82F6` | `AccentBlue` | `Color.accentBlue` |
| `--accent-purple` | `#8B5CF6` | `AccentPurple` | `Color.accentPurple` |
| `--accent-pink` | `#EC4899` | `AccentPink` | `Color.accentPink` |
| `--accent-green` | `#10B981` | `AccentGreen` | `Color.accentGreen` |
| `--accent-yellow` | `#F59E0B` | `AccentYellow` | `Color.accentYellow` |
| `--accent-red` | `#EF4444` | `AccentRed` | `Color.accentRed` |
| `--text-primary` | `#FFFFFF` | `TextPrimary` | `Color.textPrimary` |
| `--text-secondary` | `rgba(255,255,255,0.7)` | `TextSecondary` | `Color.textSecondary` |
| `--text-tertiary` | `rgba(255,255,255,0.4)` | `TextTertiary` | `Color.textTertiary` |

### Border Radius

| CSS Variable | Value | Android (dp) | iOS (CGFloat) |
|-------------|-------|-------------|---------------|
| `--radius-xs` | 6px | 6.dp | 6 |
| `--radius-sm` | 10px | 10.dp | 10 |
| `--radius-md` | 14px | 14.dp | 14 |
| `--radius-lg` | 20px | 20.dp | 20 |
| `--radius-xl` | 28px | 28.dp | 28 |

### Typography
- All three platforms use system sans-serif fonts
- Font weights: Light (300), Regular (400), Medium (500), SemiBold (600), Bold (700)
- Size scale maintained proportionally across platforms

### Glass Effect
- **Web**: `backdrop-filter: blur()` + semi-transparent background
- **Android**: `Color.White.copy(alpha = 0.05f)` with border
- **iOS**: `.ultraThinMaterial.opacity(0.3)` + custom `GlassEffect` modifier

---

## 3. API Parity

### Authentication
| Endpoint | Web | Android | iOS | 
|----------|-----|---------|-----|
| `POST /auth/login` | ✅ `authService.login()` | ✅ `VreamioApi.login()` | ✅ `NetworkManager.login()` |
| `POST /auth/register` | ✅ `authService.register()` | ✅ `VreamioApi.register()` | ✅ `NetworkManager.register()` |
| `POST /auth/refresh` | ✅ auto-refresh | ✅ OkHttp interceptor | ✅ URLSession retry logic |

### Profiles
| Endpoint | Web | Android | iOS |
|----------|-----|---------|-----|
| `GET /profiles` | ✅ | ✅ `VreamioApi.getProfiles()` | ✅ `NetworkManager.getProfiles()` |
| `POST /profiles` | ✅ | ✅ `VreamioApi.createProfile()` | ✅ `NetworkManager.createProfile()` |
| `PUT /profiles/:id` | ✅ | ✅ `VreamioApi.updateProfile()` | ✅ `NetworkManager.updateProfile()` |
| `DELETE /profiles/:id` | ✅ | ✅ `VreamioApi.deleteProfile()` | ✅ `NetworkManager.deleteProfile()` |

### Library
| Endpoint | Web | Android | iOS |
|----------|-----|---------|-----|
| `GET /user/library` | ✅ | ✅ | ✅ |
| `POST /user/library` | ✅ | ✅ | ✅ |
| `DELETE /user/library/:id` | ✅ | ✅ | ✅ |

### Watch History
| Endpoint | Web | Android | iOS |
|----------|-----|---------|-----|
| `GET /user/history` | ✅ | ✅ | ✅ |
| `POST /user/history` | ✅ | ✅ | ✅ |

### Billing
| Endpoint | Web | Android | iOS |
|----------|-----|---------|-----|
| `GET /billing/status` | ✅ | ✅ | ✅ |
| `POST /billing/checkout` | ✅ | ✅ | ✅ |
| `POST /billing/portal` | ✅ | ✅ | ✅ |

### External APIs
| API | Web | Android | iOS |
|-----|-----|---------|-----|
| Cinemeta (catalog/search/meta) | ✅ | ✅ `CinemetaApi` | ✅ `NetworkManager` |
| Torrentio (streams) | ✅ | ✅ `VreamioApi` | ✅ `NetworkManager` |
| OpenSubtitles | ✅ | ✅ `VreamioApi` | ✅ `NetworkManager` |

---

## 4. Feature Parity

### Home Screen
| Feature | Web | Android | iOS |
|---------|-----|---------|-----|
| Hero banner (auto-rotate 15s) | ✅ | ✅ `HorizontalPager` | ✅ `TabView` |
| Continue watching row | ✅ | ✅ | ✅ |
| Popular movies row | ✅ | ✅ | ✅ |
| Popular series row | ✅ | ✅ | ✅ |
| Top rated rows | ✅ | ✅ | ✅ |
| Pull-to-refresh | N/A | ✅ | ✅ |

### Search
| Feature | Web | Android | iOS |
|---------|-----|---------|-----|
| Debounced search (400ms) | ✅ | ✅ | ✅ |
| Combined movie + series results | ✅ | ✅ | ✅ |
| Filter tabs (All/Movies/Series) | ✅ | ✅ | ✅ |
| Grid results display | ✅ | ✅ | ✅ |

### Details
| Feature | Web | Android | iOS |
|---------|-----|---------|-----|
| Full-screen backdrop | ✅ | ✅ | ✅ |
| Metadata (year, rating, runtime) | ✅ | ✅ | ✅ |
| Genres chips | ✅ | ✅ | ✅ |
| Description | ✅ | ✅ | ✅ |
| Cast list | ✅ | ✅ | ✅ |
| Season tabs (series) | ✅ | ✅ | ✅ |
| Episode list with thumbnails | ✅ | ✅ | ✅ |
| Add/Remove from library | ✅ | ✅ | ✅ |

### Player
| Feature | Web | Android | iOS |
|---------|-----|---------|-----|
| Video playback | ✅ web player | ✅ Media3 ExoPlayer | ✅ AVPlayer |
| Custom overlay controls | ✅ | ✅ Compose overlay | ✅ SwiftUI overlay |
| Play/pause | ✅ | ✅ | ✅ |
| Seek ±10s | ✅ | ✅ | ✅ |
| Progress slider | ✅ | ✅ | ✅ |
| Time display | ✅ | ✅ | ✅ |
| Auto-hide controls (3s) | ✅ | ✅ | ✅ |
| Resume from last position | ✅ | ✅ | ✅ |
| Progress saving (10s interval) | ✅ | ✅ | ✅ |
| Skip if >95% complete | ✅ | ✅ | ✅ |
| Next episode button | ✅ | ✅ | ✅ |
| Landscape lock (Android) | N/A | ✅ | N/A |
| Background audio | N/A | ✅ foreground service | ✅ background mode |
| Lifecycle management | N/A | ✅ ON_PAUSE/ON_RESUME | ✅ scenePhase |

### Library
| Feature | Web | Android | iOS |
|---------|-----|---------|-----|
| Filter (All/Movies/Series/Favorites/Watchlist) | ✅ | ✅ | ✅ |
| Sort (Recent/Title/Year/Rating) | ✅ | ✅ | ✅ |
| Pull-to-refresh | N/A | ✅ | ✅ |

### Profiles
| Feature | Web | Android | iOS |
|---------|-----|---------|-----|
| Profile selection grid | ✅ | ✅ | ✅ |
| Create profile | ✅ | ✅ | ✅ |
| Avatar color picker (12 colors) | ✅ | ✅ | ✅ |
| Avatar icon picker (12 icons) | ✅ | ✅ | ✅ |
| Kids profile toggle | ✅ | ✅ | ✅ |
| Max 8 profiles | ✅ | ✅ | ✅ |

### Settings
| Feature | Web | Android | iOS |
|---------|-----|---------|-----|
| Account email display | ✅ | ✅ | ✅ |
| Subscription status | ✅ | ✅ | ✅ |
| Manage subscription (opens browser) | ✅ | ✅ | ✅ |
| Upgrade plan | ✅ | ✅ | ✅ |
| Switch profile | ✅ | ✅ | ✅ |
| Sign out | ✅ | ✅ | ✅ |
| Version info | ✅ | ✅ | ✅ |

---

## 5. Architecture Comparison

| Aspect | Web | Android | iOS |
|--------|-----|---------|-----|
| UI Framework | React 18 | Jetpack Compose | SwiftUI |
| State Management | Zustand stores | ViewModel + StateFlow | ObservableObject + @Published |
| Navigation | React Router | Navigation Compose | NavigationStack |
| Networking | Fetch API | Retrofit + OkHttp | URLSession |
| Image Loading | `<img>` tag | Coil | Kingfisher |
| Storage | localStorage | DataStore Preferences | UserDefaults |
| Video Player | HTML5 video | Media3 ExoPlayer | AVPlayer |
| Build Tool | Vite | Gradle 8.5 | Xcode / SPM |

---

## 6. Platform-Specific Adaptations

### Android
- Bottom navigation bar instead of sidebar (mobile UX convention)
- `enableEdgeToEdge()` for modern system bars
- Back button/gesture handled by Navigation Compose
- Landscape lock during video playback (`ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE`)
- Pull-to-refresh with Compose's `pullRefresh` modifier

### iOS
- Tab bar at bottom (UIKit convention matched)
- `NavigationStack` with typed routes for type-safe navigation
- Sheet presentation for create profile (`.sheet` modifier)
- `AVPlayer` with `VideoPlayer` SwiftUI view
- Background audio mode enabled in Info.plist
- `.preferredColorScheme(.dark)` for system-wide dark mode

---

## 7. Data Model Parity

All data models are 1:1 mapped from the web TypeScript types:

| Web Type | Android (Kotlin) | iOS (Swift) |
|----------|-----------------|-------------|
| `LoginRequest` | `LoginRequest` | `LoginRequest` |
| `AuthResponse` | `AuthResponse` | `AuthResponse` |
| `User` | `User` | `User` |
| `Profile` | `Profile` | `Profile` |
| `MediaItem` | `MediaItem` | `MediaItem` |
| `MediaMeta` | `MediaMeta` | `MediaMeta` |
| `Episode` | `Episode` | `Episode` |
| `LibraryItem` | `LibraryItem` | `LibraryItem` |
| `WatchHistoryItem` | `WatchHistoryItem` | `WatchHistoryItem` |
| `SubscriptionInfo` | `SubscriptionInfo` | `SubscriptionInfo` |
| `TorrentResult` | `TorrentResult` | `TorrentResult` |
| `Subtitle` | `Subtitle` | `Subtitle` |

All computed properties preserved:
- `MediaMeta.seasons` — extracts unique sorted season numbers
- `MediaMeta.displayBackdrop` — falls back to poster if no background
- `Episode.displayTitle` — falls back to "Episode X"
- `Episode.episodeNum` — formatted "S01E01"
- `WatchHistoryItem.progressPercent` — computed from progress/duration

---

## 8. File Structure

### Android (`phone-app/android/`)
```
├── settings.gradle.kts
├── build.gradle.kts
├── gradle/wrapper/gradle-wrapper.properties
└── app/
    ├── build.gradle.kts
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml
        ├── res/values/themes.xml
        └── java/io/vreamio/app/
            ├── MainActivity.kt
            ├── VreamioApp.kt
            ├── data/
            │   ├── models/Models.kt
            │   ├── network/
            │   │   ├── VreamioApi.kt
            │   │   ├── CinemetaApi.kt
            │   │   └── NetworkModule.kt
            │   └── local/AuthPreferences.kt
            └── ui/
                ├── theme/
                │   ├── Color.kt
                │   └── Theme.kt
                ├── viewmodels/
                │   ├── AuthViewModel.kt
                │   ├── HomeViewModel.kt
                │   ├── DetailsViewModel.kt
                │   ├── SearchViewModel.kt
                │   ├── LibraryViewModel.kt
                │   ├── ProfileViewModel.kt
                │   └── PlayerViewModel.kt
                ├── components/
                │   ├── MediaCard.kt
                │   ├── MediaRow.kt
                │   ├── HeroBanner.kt
                │   └── ContinueWatching.kt
                ├── screens/
                │   ├── LoginScreen.kt
                │   ├── HomeScreen.kt
                │   ├── DetailsScreen.kt
                │   ├── SearchScreen.kt
                │   ├── LibraryScreen.kt
                │   ├── ProfileSelectScreen.kt
                │   ├── PlayerScreen.kt
                │   └── SettingsScreen.kt
                └── navigation/Navigation.kt
```

### iOS (`phone-app/ios/`)
```
├── Package.swift
├── Vreamio.xcodeproj/project.pbxproj
└── Vreamio/
    ├── Sources/
    │   ├── App/
    │   │   ├── VreamioApp.swift
    │   │   └── ContentView.swift
    │   ├── Models/Models.swift
    │   ├── Theme/DesignSystem.swift
    │   ├── Services/
    │   │   ├── NetworkManager.swift
    │   │   ├── AuthManager.swift
    │   │   └── ProfileManager.swift
    │   ├── ViewModels/
    │   │   ├── HomeViewModel.swift
    │   │   ├── SearchViewModel.swift
    │   │   ├── DetailsViewModel.swift
    │   │   ├── LibraryViewModel.swift
    │   │   └── PlayerViewModel.swift
    │   └── Views/
    │       ├── Components/
    │       │   ├── MediaCardView.swift
    │       │   ├── HeroBannerView.swift
    │       │   └── ContinueWatchingView.swift
    │       ├── Screens/
    │       │   ├── LoginScreen.swift
    │       │   ├── HomeScreen.swift
    │       │   ├── DetailsScreen.swift
    │       │   ├── SearchScreen.swift
    │       │   ├── LibraryScreen.swift
    │       │   ├── ProfileSelectScreen.swift
    │       │   ├── PlayerScreen.swift
    │       │   └── SettingsScreen.swift
    │       └── Navigation/MainTabView.swift
    └── Resources/
        ├── Info.plist
        └── Assets.xcassets/
```

---

## 9. Build Instructions

### Android
```bash
cd phone-app/android
./gradlew assembleDebug
# APK at app/build/outputs/apk/debug/app-debug.apk
```

Requirements: JDK 17, Android SDK 34

### iOS
```bash
cd phone-app/ios
open Vreamio.xcodeproj
# Or use swift build with Package.swift
```

Requirements: Xcode 15+, iOS 16+ deployment target

---

## 10. Known Platform Differences

1. **Bottom nav vs sidebar**: Mobile uses bottom tabs (platform convention), web uses sidebar
2. **Pull-to-refresh**: Available on mobile, not on web
3. **Video player**: ExoPlayer (Android) / AVPlayer (iOS) vs HTML5 (web) — all support HLS/DASH
4. **Deep linking**: Not implemented yet (future enhancement)
5. **Push notifications**: Not implemented yet (future enhancement)
6. **Offline mode**: Not implemented yet (future enhancement)
