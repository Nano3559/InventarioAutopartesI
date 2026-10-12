import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
const Inter_400Regular = require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf');
const Inter_500Medium = require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf');
const Inter_600SemiBold = require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf');
const Inter_700Bold = require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf');
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { despertarServidor } from './src/api/client';
import {
  TiqueadorProvider,
  useTiqueador,
} from './src/context/TiqueadorContext';
import AppDrawer from './src/components/AppDrawer';
import LoginScreen from './src/screens/LoginScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import TiendaDashboardScreen from './src/screens/TiendaDashboardScreen';
import InventarioDashboardScreen from './src/screens/InventarioDashboardScreen';
import SalesScreen from './src/screens/SalesScreen';
import SalesEditScreen from './src/screens/SalesEditScreen';
import DevolucionesScreen from './src/screens/DevolucionesScreen';
import SolicitudesScreen from './src/screens/SolicitudesScreen';
import VentaMayorScreen from './src/screens/VentaMayorScreen';
import InventarioScreen from './src/screens/InventarioScreen';
import SalesHistoryScreen from './src/screens/SalesHistoryScreen';
import ReportesScreen from './src/screens/ReportesScreen';
import SearchByImageScreen from './src/screens/SearchByImageScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import FaceRegisterScreen from './src/screens/FaceRegisterScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';
import {
  colors,
} from './src/theme';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator();

const drawerScreenOptions = {
  headerShown: false,
  drawerType: 'front' as const,
  drawerStyle: {
    backgroundColor: colors.bg,
    width: 280,
  },
};

function AdminDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={AppDrawer}
      screenOptions={drawerScreenOptions}
    >
      <Drawer.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Drawer.Screen name="Inventario" component={InventarioScreen} />
      <Drawer.Screen name="Sales" component={SalesScreen} />
      <Drawer.Screen name="VentaMayor" component={VentaMayorScreen} />
      <Drawer.Screen name="SalesHistory" component={SalesHistoryScreen} />
      <Drawer.Screen name="Devoluciones" component={DevolucionesScreen} />
      <Drawer.Screen name="Solicitudes" component={SolicitudesScreen} />
      <Drawer.Screen name="Reportes" component={ReportesScreen} />
      <Drawer.Screen name="Scanner" component={ScannerScreen} />
      <Drawer.Screen name="FaceRegister" component={FaceRegisterScreen} />
      <Drawer.Screen name="Attendance" component={AttendanceScreen} />
      <Drawer.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
      <Drawer.Screen name="SearchByImage" component={SearchByImageScreen} />
    </Drawer.Navigator>
  );
}

function TiendaDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={AppDrawer}
      screenOptions={drawerScreenOptions}
    >
      <Drawer.Screen name="TiendaDashboard" component={TiendaDashboardScreen} />
      <Drawer.Screen name="Inventario" component={InventarioScreen} />
      <Drawer.Screen name="Sales" component={SalesScreen} />
      <Drawer.Screen name="VentaMayor" component={VentaMayorScreen} />
      <Drawer.Screen name="SalesHistory" component={SalesHistoryScreen} />
      <Drawer.Screen name="Devoluciones" component={DevolucionesScreen} />
      <Drawer.Screen name="Solicitudes" component={SolicitudesScreen} />
      <Drawer.Screen name="Reportes" component={ReportesScreen} />
      <Drawer.Screen name="Scanner" component={ScannerScreen} />
      <Drawer.Screen name="SearchByImage" component={SearchByImageScreen} />
    </Drawer.Navigator>
  );
}

function InventarioDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={AppDrawer}
      screenOptions={drawerScreenOptions}
    >
      <Drawer.Screen name="InventarioDashboard" component={InventarioDashboardScreen} />
      <Drawer.Screen name="Inventario" component={InventarioScreen} />
      <Drawer.Screen name="Solicitudes" component={SolicitudesScreen} />
      <Drawer.Screen name="Reportes" component={ReportesScreen} />
      <Drawer.Screen name="Scanner" component={ScannerScreen} />
      <Drawer.Screen name="SearchByImage" component={SearchByImageScreen} />
    </Drawer.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const { activo: enTiqueador, listo: tiqueadorListo, salir } = useTiqueador();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Se espera también al flag del kiosco: antes de saber si esta tablet está en
  // modo tiqueador no se dibuja ninguna pantalla, ni un instante de la app admin.
  if (loading || !fontsLoaded || !tiqueadorListo) {
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

  // Modo tiqueador (tarea R9): la tablet de la tienda deja de mostrar la app y
  // queda solo con la pantalla de marcaje. Se cambia **el árbol entero**, no una
  // ruta del drawer, para que no quede forma de volver atrás con el gesto: la
  // única salida es el botón "Salir", que pide la contraseña del admin.
  if (enTiqueador) {
    return <AttendanceScreen modoTiqueador onSalir={salir} />;
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
      {user.rol === 'admin' && <Stack.Screen name="Main" component={AdminDrawer} />}
      {user.rol === 'tienda' && <Stack.Screen name="Main" component={TiendaDrawer} />}
      {user.rol === 'inventario' && <Stack.Screen name="Main" component={InventarioDrawer} />}
      <Stack.Screen name="SalesEdit" component={SalesEditScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  // Render se duerme a los 15 min sin tráfico (spin-down) y el primer request
  // tarda ~52.7 s. En lugar de esperar ese arranque a mitad del día, la app lo
  // mantiene despierto mientras está abierta: ping al abrir, al volver del fondo
  // y cada 9 min (menos que los 15). Así `esperarServidorVivo()` responde en el
  // primer intento y el flujo queda instantáneo. El 52.7 s solo ocurre si nadie
  // usó la app por un rato largo (fin de semana, noche).
  useEffect(() => {
    const ping = () => {
      despertarServidor();
    };
    ping();
    const timer = setInterval(ping, 9 * 60 * 1000);
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') ping();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return (
    // `GestureHandlerRootView` es obligatorio para el drawer de
    // `@react-navigation/drawer` v7: sin él, la app arranca en Expo Go pero
    // revienta en el dispositivo (pantalla azul al montar Main).
    <GestureHandlerRootView style={styles.raiz}>
      <SafeAreaProvider>
        <AuthProvider>
          <TiqueadorProvider>
            <NavigationContainer>
              <RootNavigator />
              <StatusBar style="dark" animated />
            </NavigationContainer>
          </TiqueadorProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
