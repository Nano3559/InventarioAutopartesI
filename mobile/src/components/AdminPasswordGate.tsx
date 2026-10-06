import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { login } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PrimaryCTA } from '.';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  shadows,
  iconSize,
  a11y,
  opacity,
} from '../theme';

interface AdminPasswordGateProps {
  visible: boolean;
  /** Qué está pidiendo la contraseña, para que el título sea explícito. */
  motivo: string;
  /** Texto del botón de confirmar. */
  confirmar?: string;
  onCancel?: () => void;
  onSuccess: () => void;
}

/**
 * Pedir la contraseña del administrador para entrar o salir del **modo tiqueador**
 * (tarea R9).
 *
 * En una tablet de tienda la pantalla queda a cargo de cualquiera que esté
 * enfrente, así que entrar y salir del tiqueador lleva la misma contraseña del
 * admin. No hay endpoint "validar contraseña", así que se reutiliza
 * `POST /auth/login` con el email del admin que ya tiene la sesión: si responde
 * 200 y el rol es `admin`, la contraseña era correcta.
 *
 * El `token` que devuelve ese login se descarta a propósito: la sesión sigue
 * siendo la original. Si sobreescribiéramos el token guardado, un cambio de
 * contraseña del admin cerraría la sesión del tiqueador sin avisar.
 */
export default function AdminPasswordGate({
  visible,
  motivo,
  confirmar = 'Confirmar',
  onCancel,
  onSuccess,
}: AdminPasswordGateProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const limpiar = useCallback(() => {
    setPassword('');
    setError(null);
    setVisiblePassword(false);
    setEnviando(false);
  }, []);

  useEffect(() => {
    if (visible) limpiar();
  }, [visible, limpiar]);

  const confirmarAcceso = useCallback(async () => {
    if (!password || enviando) return;
    if (!user?.email) {
      setError('No hay sesión activa.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const data = await login(user.email, password);
      if (data.user.rol !== 'admin') {
        setError('Esa cuenta no es administradora.');
        return;
      }
      limpiar();
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo verificar la contraseña. Intentá de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  }, [enviando, onSuccess, password, user?.email, limpiar]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        limpiar();
        onCancel?.();
      }}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.fuera}
          onPress={() => {
            limpiar();
            onCancel?.();
          }}
          accessibilityRole={a11y.button}
          accessibilityLabel="Cerrar"
        />
        <View style={styles.dialogo}>
          <View style={styles.iconoFila}>
            <Ionicons name="lock-closed" size={iconSize.sm} color={colors.primary} />
            <Text style={styles.titulo}>Modo tiqueador</Text>
          </View>
          <Text style={styles.motivo}>{motivo}</Text>

          <TextInput
            style={[styles.campo, error ? styles.campoError : null]}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (error) setError(null);
            }}
            placeholder="Contraseña del administrador"
            placeholderTextColor={colors.textPlaceholder}
            secureTextEntry={!visiblePassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            editable={!enviando}
            onSubmitEditing={confirmarAcceso}
            returnKeyType="go"
            accessibilityLabel="Contraseña del administrador"
          />

          <Pressable
            style={styles.verPass}
            onPress={() => setVisiblePassword((v) => !v)}
            disabled={enviando}
            accessibilityRole={a11y.button}
            accessibilityLabel={
              visiblePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
          >
            <Ionicons
              name={visiblePassword ? 'eye-off' : 'eye'}
              size={iconSize.sm}
              color={colors.textMuted}
            />
            <Text style={styles.verPassTexto}>
              {visiblePassword ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>

          {error ? (
            <View style={styles.error} accessibilityRole={a11y.alert}>
              <Ionicons name="alert-circle" size={iconSize.sm} color={colors.danger} />
              <Text style={styles.errorTexto}>{error}</Text>
            </View>
          ) : null}

          <PrimaryCTA
            label={enviando ? 'Verificando…' : confirmar}
            iconName="checkmark-circle"
            onPress={confirmarAcceso}
            disabled={!password || enviando}
            color={error ? colors.danger : colors.primary}
          />

          {onCancel ? (
            <Pressable
              style={({ pressed }) => [styles.cancelar, pressed && styles.pressed]}
              onPress={() => {
                limpiar();
                onCancel();
              }}
              disabled={enviando}
              accessibilityRole={a11y.button}
            >
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: space.lg,
  },
  fuera: { flex: 1 },
  dialogo: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
    ...shadows.level4,
  },
  iconoFila: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titulo: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  motivo: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    lineHeight: lineHeight.body,
  },
  campo: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.text,
    backgroundColor: colors.white,
  },
  campoError: { borderColor: colors.danger, borderWidth: 2 },
  verPass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-end',
    paddingVertical: space.xs,
  },
  verPassTexto: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.textMuted,
  },
  error: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorTexto: {
    flex: 1,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansMedium,
    color: colors.danger,
    lineHeight: lineHeight.relaxed,
  },
  cancelar: { alignItems: 'center', paddingVertical: space.sm },
  cancelarTexto: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.textMuted,
  },
  pressed: { opacity: opacity.pressed },
});
