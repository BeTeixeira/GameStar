import React, { useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";

type Props = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

// Quanto cada toque nas setas anda a linha de filtros (em pixels).
const SCROLL_STEP = 180;
const EDGE_TOLERANCE = 4;

// Linha de filtros com rolagem horizontal e setas nas pontas (usada na Loja).
// A seta fica apagada quando a linha já está no começo ou no fim.
export default function CategoryScroller({ options, selected, onSelect }: Props) {
  const { colors } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [offset, setOffset] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [viewWidth, setViewWidth] = useState(0);

  const maxOffset = Math.max(0, contentWidth - viewWidth);
  const canGoBack = offset > EDGE_TOLERANCE;
  const canGoForward = offset < maxOffset - EDGE_TOLERANCE;

  function scrollBy(delta: number) {
    const target = Math.min(maxOffset, Math.max(0, offset + delta));
    scrollRef.current?.scrollTo({ x: target, animated: true });
  }

  return (
    <View style={styles.row}>
      <Arrow icon="chevron-back" label="Categorias anteriores" enabled={canGoBack} onPress={() => scrollBy(-SCROLL_STEP)} />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.pills}
        scrollEventThrottle={16}
        onScroll={(event) => setOffset(event.nativeEvent.contentOffset.x)}
        onContentSizeChange={(width) => setContentWidth(width)}
        onLayout={(event) => setViewWidth(event.nativeEvent.layout.width)}
      >
        {options.map((option) => {
          const active = option === selected;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onSelect(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.pill,
                { backgroundColor: active ? colors.pillActive : colors.pillInactive, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: active ? "700" : "500", color: active ? colors.pillTextActive : colors.pillTextInactive }}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Arrow icon="chevron-forward" label="Próximas categorias" enabled={canGoForward} onPress={() => scrollBy(SCROLL_STEP)} />
    </View>
  );
}

function Arrow({
  icon,
  label,
  enabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.arrow, { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: enabled ? 1 : 0.3 }]}
    >
      <Ionicons name={icon} size={16} color={colors.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  scroll: { flex: 1, flexGrow: 1 },
  pills: { gap: 6, alignItems: "center", paddingVertical: 2 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  arrow: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
