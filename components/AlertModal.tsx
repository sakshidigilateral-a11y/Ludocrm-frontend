import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type AlertVariant = 'info' | 'error' | 'confirm';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  variant?: AlertVariant;
  buttons?: AlertButton[];
  onRequestClose?: () => void;
};

const variantColors: Record<AlertVariant, { headerBg: string; accent: string }> =
  {
    info: { headerBg: '#141414', accent: '#1b3982' },
    error: { headerBg: '#2a0b0b', accent: '#1b3982' },
    confirm: { headerBg: '#141414', accent: '#1b3982' },
  };

export default function AlertModal({
  visible,
  title,
  message,
  variant = 'info',
  buttons = [],
  onRequestClose,
}: Props) {
  const colors = variantColors[variant];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onRequestClose}
        />
        <LinearGradient 
        colors={['#1b3982','#1b3982', '#000278']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
          style={[
            styles.modal,
            { borderColor: colors.accent },
          ]}
        >
          {title ? (
            <View style={[styles.message]}>
              <Text style={styles.title}>{title}</Text>
            </View>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.buttonsRow}>
            {buttons.map((b, idx) => {
              const btnStyle =
                b.style === 'destructive'
                  ? styles.btnDestructive
                  : b.style === 'cancel'
                    ? styles.btnCancel
                    : styles.btnDefault;

              return (
                <TouchableOpacity
                  key={`${b.text}-${idx}`}
                  disabled={b.disabled}
                  activeOpacity={0.85}
                  style={[styles.btnBase, btnStyle, b.disabled ? { opacity: 0.6 } : null]}
                  onPress={() => b.onPress?.()}
                >
                  <Text style={styles.btnText}>{b.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modal: {
    borderWidth: 2,
    borderRadius: 14,
    // backgroundColor: '#380505',
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  title: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 20,
  },
  message: {
    color: '#e8e8e8',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  buttonsRow: {
  flexDirection: 'row',
  gap: 10,
  padding: 14,
},
  btnBase: {
  minHeight: 44,
  borderRadius: 10,
  paddingHorizontal: 18,
  paddingVertical: 10,
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1,
},
  btnDefault: {
    backgroundColor: '#3e71f3',
    borderColor: '#ffffff22',
    borderWidth: 1,
  },
  btnCancel: {
    backgroundColor: '#4f4f4f',
    borderColor: '#ffffff22',
    borderWidth: 1,
  },
  btnDestructive: {
    backgroundColor: '#e15b5b',
    borderColor: '#ffffff22',
    borderWidth: 1,
  },
  btnText: {
  color: '#ffffff',
  fontWeight: '700',
  fontSize: 15,
},
});
