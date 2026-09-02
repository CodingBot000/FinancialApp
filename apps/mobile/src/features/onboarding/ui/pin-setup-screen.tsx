import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  AppText,
  FullScreenSurface,
  colors,
  spacing,
} from '../../../shared/design-system';

const PIN_LENGTH = 6;
const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

function shuffledDigits(): string[] {
  const result = [...digits];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function PinSetupScreen({
  onComplete,
}: {
  readonly onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string>();
  const [keypad, setKeypad] = useState(shuffledDigits);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    if (phase === 'create') {
      setFirstPin(pin);
      setPin('');
      setPhase('confirm');
      setKeypad(shuffledDigits());
      setError(undefined);
      return;
    }
    if (pin === firstPin) {
      onComplete();
      return;
    }
    setError('간편비밀번호가 일치하지 않아요. 다시 입력해주세요.');
    setPin('');
    setKeypad(shuffledDigits());
  }, [firstPin, onComplete, phase, pin]);

  const appendDigit = (digit: string) => {
    if (pin.length < PIN_LENGTH) {
      setError(undefined);
      setPin((current) => `${current}${digit}`);
    }
  };

  const removeDigit = () => {
    setError(undefined);
    setPin((current) => current.slice(0, -1));
  };

  return (
    <FullScreenSurface>
      <View style={styles.container}>
        <View style={styles.hero}>
          <AppText style={styles.title} variant="title1">
            {phase === 'create'
              ? `신규 간편비밀번호를\n입력해주세요`
              : '간편비밀번호 확인'}
          </AppText>
          <View
            accessibilityLabel={`비밀번호 ${pin.length}자리 입력됨`}
            style={styles.dots}
          >
            {Array.from({ length: PIN_LENGTH }, (_, index) => (
              <View
                accessibilityLabel={`${index + 1}번째 비밀번호 자리${index < pin.length ? ', 입력됨' : ''}`}
                key={index}
                style={[styles.dot, index < pin.length && styles.filledDot]}
              />
            ))}
          </View>
          {error ? (
            <AppText style={styles.error} tone="danger" variant="body">
              {error}
            </AppText>
          ) : null}
        </View>

        <View accessibilityLabel="숫자 입력 패드" style={styles.keypad}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.keyRow}>
              {keypad.slice(row * 3, row * 3 + 3).map((digit) => (
                <KeypadButton digit={digit} key={digit} onPress={appendDigit} />
              ))}
            </View>
          ))}
          <View style={styles.keyRow}>
            <Pressable
              accessibilityLabel="입력한 비밀번호 지우기"
              accessibilityRole="button"
              onPress={removeDigit}
              style={styles.key}
            >
              <Ionicons
                color={colors.text.secondary}
                name="arrow-back"
                size={42}
              />
            </Pressable>
            <KeypadButton digit={keypad[9] ?? '0'} onPress={appendDigit} />
            <View style={styles.key} />
          </View>
        </View>
      </View>
    </FullScreenSurface>
  );
}

function KeypadButton({
  digit,
  onPress,
}: {
  readonly digit: string;
  readonly onPress: (digit: string) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`숫자 ${digit}`}
      accessibilityRole="button"
      onPress={() => onPress(digit)}
      style={({ pressed }) => [styles.key, pressed && styles.pressed]}
    >
      <AppText style={styles.keyLabel} variant="title1">
        {digit}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dot: {
    backgroundColor: colors.border.subtle,
    borderRadius: 999,
    height: 20,
    width: 20,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing[6],
    justifyContent: 'center',
    marginTop: spacing[12] + spacing[10] + spacing[2],
  },
  error: {
    marginTop: spacing[4],
    textAlign: 'center',
  },
  filledDot: {
    backgroundColor: colors.text.primary,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing[16] + spacing[8] + spacing[3],
  },
  key: {
    alignItems: 'center',
    height: 80,
    justifyContent: 'center',
    width: '33.3333%',
  },
  keyLabel: {
    fontSize: 30,
    fontWeight: '400',
    lineHeight: 38,
  },
  keyRow: {
    flexDirection: 'row',
  },
  keypad: {
    marginTop: 'auto',
    paddingBottom: spacing[6],
  },
  pressed: {
    opacity: 0.5,
  },
  title: {
    textAlign: 'center',
  },
});
