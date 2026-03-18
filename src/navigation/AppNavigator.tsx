import React, { useEffect, useState } from 'react';
import { Platform, StatusBar, View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  HomeScreen,
  SearchScreen,
  DetailsScreen,
  PlayerScreen,
  LibraryScreen,
  CalendarScreen,
  SettingsScreen,
  LoginScreen,
  ProfileSelectScreen,
  AddonsScreen,
  DiscoverScreen,
  BrowseScreen,
  OnboardingScreen,
} from '../screens';
import { useAddonStore } from '../stores/addonStore';
import { colors } from '../styles/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Dark theme matching FlowVid desktop
const FlowVidDarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bgPrimary,
    card: colors.bgSecondary,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.primary,
  },
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Home:     { active: 'home',          inactive: 'home-outline' },
  Search:   { active: 'search',        inactive: 'search-outline' },
  Discover: { active: 'compass',       inactive: 'compass-outline' },
  Library:  { active: 'library',       inactive: 'library-outline' },
  Settings: { active: 'settings',      inactive: 'settings-outline' },
};

function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const iconSet = TAB_ICONS[name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
  return (
    <View style={tabStyles.iconWrap}>
      {focused && <View style={tabStyles.activeBar} />}
      <Ionicons
        name={focused ? iconSet.active : iconSet.inactive}
        size={23}
        color={color}
      />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    width: 40,
    paddingTop: 4,
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
});

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(10,10,15,0.97)',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 84 : 64,
          elevation: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.1,
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function AppNavigator() {
  const addonCount = useAddonStore((s) => s.addons.length);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Wait a tick for zustand persist to hydrate
    const t = setTimeout(() => setHasHydrated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const showOnboarding = hasHydrated && addonCount === 0;

  return (
    <NavigationContainer theme={FlowVidDarkTheme}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
      <AppInitializer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: colors.bgPrimary },
          }}
        >
          {showOnboarding && (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )}
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Details"
            component={DetailsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{
              animation: 'fade',
              orientation: 'landscape',
            }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="ProfileSelect"
            component={ProfileSelectScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="Addons"
            component={AddonsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Browse"
            component={BrowseScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      </AppInitializer>
    </NavigationContainer>
  );
}
