import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  iconSize,
  a11y,
} from '../theme';
import Ionicons from '@expo/vector-icons/Ionicons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface NavItem {
  label: string;
  icon: IoniconsName;
  route: string;
}

const adminItems: NavItem[] = [
  { label: 'Dashboard', icon: 'home', route: 'AdminDashboard' },
  { label: 'Ventas', icon: 'cash', route: 'Sales' },
  { label: 'Ventas por Mayor', icon: 'briefcase', route: 'VentaMayor' },
  { label: 'Historial Ventas', icon: 'receipt', route: 'SalesHistory' },
  { label: 'Devoluciones', icon: 'refresh', route: 'Devoluciones' },
  { label: 'Solicitudes', icon: 'document-text', route: 'Solicitudes' },
  { label: 'Reportes', icon: 'stats-chart', route: 'Reportes' },
  { label: 'Búsqueda por Imagen', icon: 'camera', route: 'SearchByImage' },
];

const tiendaItems: NavItem[] = [
  { label: 'Dashboard', icon: 'home', route: 'TiendaDashboard' },
  { label: 'Punto de Venta', icon: 'cash', route: 'Sales' },
  { label: 'Ventas por Mayor', icon: 'briefcase', route: 'VentaMayor' },
  { label: 'Historial Ventas', icon: 'receipt', route: 'SalesHistory' },
  { label: 'Devoluciones', icon: 'refresh', route: 'Devoluciones' },
  { label: 'Solicitudes', icon: 'document-text', route: 'Solicitudes' },
  { label: 'Reportes', icon: 'stats-chart', route: 'Reportes' },
  { label: 'Búsqueda por Imagen', icon: 'camera', route: 'SearchByImage' },
];

const inventarioItems: NavItem[] = [
  { label: 'Dashboard', icon: 'home', route: 'InventarioDashboard' },
  { label: 'Solicitudes', icon: 'document-text', route: 'Solicitudes' },
  { label: 'Reportes', icon: 'stats-chart', route: 'Reportes' },
  { label: 'Búsqueda por Imagen', icon: 'camera', route: 'SearchByImage' },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  tienda: 'Vendedor de Tienda',
  inventario: 'Encargado de Inventario',
};

const roleColors: Record<string, string> = {
  admin: colors.primary,
  tienda: colors.emerald,
  inventario: colors.warning,
};

export default function AppDrawer(props: DrawerContentComponentProps) {
  const { user, signOut } = useAuth();
  const { state, navigation } = props;
  const activeRoute = state.routes[state.index]?.name;
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const items =
    user?.rol === 'admin'
      ? adminItems
      : user?.rol === 'tienda'
        ? tiendaItems
        : inventarioItems;

  const handleNav = (route: string) => {
    navigation.navigate(route);
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Header */}
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: roleColors[user?.rol || 'admin'] + '22' }]}>
            <Text style={[styles.avatarText, { color: roleColors[user?.rol || 'admin'] }]}>
              {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.nombre || 'Usuario'}</Text>
            <Text style={[styles.userRole, { color: roleColors[user?.rol || 'admin'] }]}>
              {roleLabels[user?.rol || 'admin']}
            </Text>
            {user?.tienda?.nombre && (
              <Text style={styles.userStore}>{user.tienda.nombre}</Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Nav Items */}
        <View style={styles.navSection}>
          {items.map((item) => {
            const isActive = activeRoute === item.route;
            return (
              <Pressable
                key={item.route}
                style={({ pressed }) => [
                  styles.navItem,
                  isActive && styles.navItemActive,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleNav(item.route)}
                accessibilityRole={a11y.button}
                accessibilityLabel={item.label}
              >
                <Ionicons
                  name={isActive ? item.icon : (item.icon.replace(/-outline$/, '') + '-outline') as IoniconsName}
                  size={iconSize.md}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Logout Footer */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
          onPress={() => setShowLogoutModal(true)}
          accessibilityRole={a11y.button}
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons name="log-out" size={iconSize.md} color={colors.danger} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </Pressable>
      </View>

      {/* Confirm Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out" size={28} color={colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Cerrar sesión</Text>
            <Text style={styles.modalBody}>
              ¿Seguro que deseas cerrar sesión como {user?.nombre || 'Usuario'}?
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmBtn}
                onPress={() => {
                  setShowLogoutModal(false);
                  signOut();
                }}
              >
                <Text style={styles.modalConfirmText}>Cerrar sesión</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingTop: 0,
  },

  // User header
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.title,
    fontFamily: fontFamily.sansBold,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  userRole: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
  },
  userStore: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginTop: 1,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: space.sm,
  },

  // Nav section
  navSection: {
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    marginBottom: 2,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: colors.primarySoft,
  },
  navLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    flex: 1,
  },
  navLabelActive: {
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // Footer
  footer: {
    paddingBottom: space.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginHorizontal: space.sm,
    borderRadius: radius.md,
    marginTop: space.xs,
  },
  logoutText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.danger,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space['2xl'],
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.crimsonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  modalBody: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  modalCancelText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  modalConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
  },
  modalConfirmText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.white,
  },
});
