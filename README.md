# Vreamio Mobile Apps

Native Android and iOS apps for Vreamio — visually and functionally identical to the web/desktop version.

## Structure

```
phone-app/
├── android/     # Kotlin + Jetpack Compose + Media3 ExoPlayer
├── ios/         # Swift + SwiftUI + AVPlayer
└── docs/        # Parity validation documentation
```

## Android

**Tech stack**: Kotlin 1.9.22, Jetpack Compose (Material 3), Media3 ExoPlayer 1.2.1, Retrofit 2.9.0, Coil, DataStore, Navigation Compose

**Architecture**: MVVM with ViewModels + StateFlow

### Build & Run
```bash
cd android
./gradlew assembleDebug
```

**Requirements**: JDK 17, Android SDK 34, minSdk 26

## iOS

**Tech stack**: Swift 5.9, SwiftUI, AVPlayer, Kingfisher (async images)

**Architecture**: MVVM with ObservableObject + @Published

### Build & Run
Open `ios/Vreamio.xcodeproj` in Xcode 15+ and run.

**Requirements**: Xcode 15+, iOS 16+

## Feature Coverage

Both apps implement 100% of the web features:

- **Auth**: Login, register, token refresh, persistent sessions
- **Profiles**: Create, select, switch (12 avatar colors × 12 icons, max 8)
- **Home**: Hero banner (15s auto-rotate), continue watching, catalog rows
- **Search**: 400ms debounced, combined results, filter tabs
- **Details**: Backdrop hero, metadata, genres, cast, season/episode browser
- **Library**: Filter (All/Movies/Series/Favorites/Watchlist), sort options
- **Player**: Custom controls, seek ±10s, progress saving (10s), resume, next episode
- **Settings**: Account info, subscription management, profile switching, logout

## Design System

All color tokens, border radius values, and typography are 1:1 mapped from the web CSS variables. See [docs/PARITY.md](docs/PARITY.md) for the complete mapping.

## API Integration

Both apps connect to the same backend endpoints:
- Vreamio API (auth, profiles, library, history, billing)
- Cinemeta (catalog, search, metadata)
- Torrentio (stream sources)
- OpenSubtitles (subtitles)
