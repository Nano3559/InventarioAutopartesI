import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  colors,
  shadows,
  space,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  button,
  input,
  iconSize,
  createComponentStyles,
  a11y,
  opacity,
} from '../theme';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Credential {
  role: string;
  email: string;
  password: string;
}

const CREDENTIALS: readonly Credential[] = [
  { role: 'Administrador', email: 'admin@autorepuestos.com', password: 'Admin1234!' },
  { role: 'Encargado Inventario', email: 'almacen@autorepuestos.com', password: 'Almacen1234!' },
  { role: 'Vendedor Tienda 1', email: 'tienda1@autorepuestos.com', password: 'Tienda1234!' },
  { role: 'Vendedor Tienda 2', email: 'tienda2@autorepuestos.com', password: 'Tienda1234!' },
  { role: 'Vendedor Tienda 3', email: 'tienda3@autorepuestos.com', password: 'Tienda1234!' },
] as const;

const compStyles = createComponentStyles('light');

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 360;
  const isCompactHeight = height < 720;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  const fillCredentials = (c: Credential) => {
    setEmail(c.email);
    setPassword(c.password);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundAccent} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingVertical: isCompactHeight ? space.lg : space['3xl'] },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="car-sport" size={iconSize['2xl']} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.title}>AutoPartes Pro</Text>
            <Text style={styles.subtitle}>Sistema de Inventario y Ventas</Text>
          </View>

          {/* Login Card - Glassmorphism matching web */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar Sesión</Text>
            <Text style={styles.cardSubtitle}>Ingresa tus credenciales para acceder</Text>

            {/* Quick Role Fillers (matching web) */}
            <View style={styles.quickRolesSection}>
              <Text style={styles.quickRolesTitle}>⚡ Acceso Rápido de Prueba (Demo)</Text>
              <View style={[styles.quickRolesGrid, { flexDirection: isSmallScreen ? 'column' : 'row' }]}>
                {CREDENTIALS.map((c, i) => (
                  <Pressable
                    key={i}
                    style={[styles.quickRoleBtn, { flexBasis: isSmallScreen ? '100%' : '48%' }]}
                    onPress={() => fillCredentials(c)}
                    accessibilityRole={a11y.button}
                    accessibilityLabel={`Ingresar como ${c.role}`}
                    android_ripple={{ color: colors.primarySoft }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.quickRoleBtnText} numberOfLines={2}>{c.role}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View
                style={styles.errorBox}
                accessible={true}
                accessibilityRole={a11y.alert}
                accessibilityLiveRegion="assertive"
              >
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={compStyles.section}>
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo Electrónico</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail" size={iconSize.md} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      compStyles.inputBase,
                      focusedField === 'email' && compStyles.inputFocused,
                      {
                        fontFamily: fontFamily.sans,
                        fontSize: 14,
                        lineHeight: 20,
                        paddingLeft: space.lg + iconSize.md + space.md,
                        paddingRight: space.lg,
                      },
                    ]}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder={isSmallScreen ? 'correo@ejemplo.com' : 'ejemplo@autorepuestos.com'}
                    placeholderTextColor={colors.textPlaceholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!submitting}
                    testID="login-email"
                    accessibilityLabel="Correo electrónico"
                    accessibilityHint="Ingresa tu correo electrónico registrado"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={iconSize.md} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      compStyles.inputBase,
                      focusedField === 'password' && compStyles.inputFocused,
                      {
                        fontFamily: fontFamily.sans,
                        fontSize: 14,
                        lineHeight: 20,
                        paddingLeft: space.lg + iconSize.md + space.md,
                        paddingRight: space.lg + iconSize.md + space.md,
                      },
                    ]}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textPlaceholder}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!submitting}
                    onSubmitEditing={handleSubmit}
                    testID="login-password"
                    accessibilityLabel="Contraseña"
                    accessibilityHint="Ingresa tu contraseña"
                    autoComplete="password"
                    textContentType="password"
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    accessibilityRole={a11y.button}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={iconSize.md}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                compStyles.btnPrimary,
                !canSubmit && styles.btnDisabled,
                pressed && canSubmit && styles.btnPressed,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              testID="login-submit"
              accessibilityRole={a11y.button}
              accessibilityLabel="Iniciar sesión"
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
              android_ripple={{ color: colors.primarySoft }}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textOnPrimary} size="large" />
              ) : (
                <>
                  <Ionicons name="log-in" size={18} color={canSubmit ? colors.textOnPrimary : colors.primaryStrong} style={styles.submitBtnIcon} />
                  <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>Ingresar al Sistema</Text>
                </>
              )}
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    flexGrow: 1,
  },
  backgroundAccent: {
    position: 'absolute',
    top: 0,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.blueSoft,
  },
  brand: {
    alignItems: 'center',
    marginBottom: space['2xl'],
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
    ...shadows.level2,
  },
  title: {
    fontSize: fontSize.display,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
    lineHeight: lineHeight.heading,
    marginBottom: space.xs,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    lineHeight: lineHeight.body,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.lg,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    ...shadows.level3,
  },
  cardTitle: {
    fontSize: fontSize.title,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
    marginBottom: space.xs,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginBottom: space.lg,
    textAlign: 'center',
  },
  quickRolesSection: {
    backgroundColor: colors.systemSurfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: space.md,
    marginBottom: space.lg,
  },
  quickRolesTitle: {
    fontSize: 10,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: space.sm,
    textAlign: 'center',
  },
  quickRolesGrid: {
    flexWrap: 'wrap',
    gap: space.xs,
  },
  quickRoleBtn: {
    flexGrow: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    minHeight: 40,
  },
  quickRoleBtnText: {
    fontSize: 11,
    fontFamily: fontFamily.sansMedium,
    color: colors.text,
    textAlign: 'center',
  },
  inputGroup: {
    gap: space.xs,
  },
  label: {
    fontSize: fontSize.captionStrong,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: space.md,
    zIndex: 1,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingLeft: space.lg + iconSize.md + space.sm,
    paddingRight: space.lg + iconSize.md + space.sm,
    includeFontPadding: false,
  },
  passwordToggle: {
    position: 'absolute',
    right: space.md,
    padding: space.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: radius.sm,
    padding: space.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    flex: 1,
  },
  submitBtn: {
    height: button.height.lg,
    borderRadius: button.radius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: button.paddingX.lg,
    ...shadows.level2,
  },
  btnDisabled: {
    backgroundColor: colors.primarySoft,
    opacity: 1,
  },
  btnPressed: {
    opacity: opacity.pressed,
    transform: [{ translateY: 1 }],
  },
  submitBtnIcon: {
    marginTop: 1, // optical alignment
  },
  submitBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
  },
  submitBtnTextDisabled: {
    color: colors.primaryStrong,
  },
});