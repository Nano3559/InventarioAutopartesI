import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
const Inter_400Regular = require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf');
const Inter_500Medium = require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf');
const Inter_600SemiBold = require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf');
const Inter_700Bold = require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf');
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import TiendaDashboardScreen from './src/screens/TiendaDashboardScreen';
import InventarioDashboardScreen from './src/screens/InventarioDashboardScreen';
import SalesScreen from './src/screens/SalesScreen';
import {
  colors,
  space,
  radius,
  tabBar,
  shadows,
  componentStyles,
} from './src/theme';
import type { RootStackParamList } from './src/types/navigation';
import Ionicons from '@expo/vector-icons/Ionicons';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  tabBar: {
    height: tabBar.height,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingBottom: 0,
    paddingHorizontal: space.md,
    ...shadows.level3,
  },
});

const tabBarOptions = {
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: styles.tabBar,
  headerShown: false,
  tabBarLabelStyle: {
    fontSize: tabBar.labelFontSize,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  tabBarIconStyle: {
    marginBottom: 0,
  },
};

function getTabIcon(routeName: string, focused: boolean) {
  if (routeName === 'AdminDashboard' || routeName === 'TiendaDashboard' || routeName === 'InventarioDashboard') {
    return focused ? 'home' : 'home-outline';
  }
  return focused ? 'cash' : 'cash-outline';
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBarOptions,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={getTabIcon(route.name, focused)} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Sales" component={SalesScreen} options={{ title: 'Ventas' }} />
    </Tab.Navigator>
  );
}

function TiendaTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBarOptions,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={getTabIcon(route.name, focused)} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="TiendaDashboard" component={TiendaDashboardScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Sales" component={SalesScreen} options={{ title: 'Ventas' }} />
    </Tab.Navigator>
  );
}

function InventarioTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBarOptions,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={getTabIcon(route.name, focused)} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="InventarioDashboard" component={InventarioDashboardScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Sales" component={SalesScreen} options={{ title: 'Ventas' }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...(Platform.OS === 'ios' && {
          cardStyleInterpolator: ({ current }: { current: { progress: any } }) => ({
            cardStyle: {
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          }),
        }),
      }}
    >
      {user.rol === 'admin' && <Stack.Screen name="Main" component={AdminTabs} />}
      {user.rol === 'tienda' && <Stack.Screen name="Main" component={TiendaTabs} />}
      {user.rol === 'inventario' && <Stack.Screen name="Main" component={InventarioTabs} />}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="dark" animated />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}