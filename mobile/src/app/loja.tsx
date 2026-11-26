import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "../components/Screen";
import TopBar from "../components/TopBar";
import BottomTabs from "../components/BottomTabs";
import CategoryScroller from "../components/CategoryScroller";
import StoreBadgeCard from "../components/StoreBadgeCard";
import RedeemSheet from "../components/RedeemSheet";
import { useAppTheme } from "../theme/ThemeContext";
import { useBadges } from "../context/BadgesContext";
import { BADGES, Badge } from "../data/badges";
import { ALL_CATEGORIES, BADGE_CATEGORIES, STORE_SECTIONS, StoreSection, TEST_PHASE_FREE } from "../data/store";

// LOJA — rota "/loja" (aba "Loja" da barra de baixo).
// Abas: Badges (pronta), Bordas e Nomes (em desenvolvimento).
// Na fase de testes toda badge pode ser resgatada de graça (ver src/data/store.ts).

export default function Loja() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { owned, slots, loaded, error, refresh, redeem, saveSlots } = useBadges();

  const [section, setSection] = useState<StoreSection>("badges");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(
    () => (category === ALL_CATEGORIES ? BADGES : BADGES.filter((badge) => badge.category === category)),
    [category]
  );
  // Grade de 2 colunas: com quantidade ímpar, um espaço vazio mantém o último card na largura certa.
  const cells: (Badge | null)[] = visible.length % 2 === 1 ? [...visible, null] : visible;
  const open: Badge | null = openId ? BADGES.find((badge) => badge.id === openId) ?? null : null;
  const freeSlot = slots.indexOf(null);
  const sectionInfo = STORE_SECTIONS.find((item) => item.value === section);

  async function equip(badgeId: string) {
    if (freeSlot === -1) return;
    await saveSlots(slots.map((id, index) => (index === freeSlot ? badgeId : id)));
  }

  return (
    <Screen>
      <TopBar />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Loja</Text>
        {TEST_PHASE_FREE && (
          <View style={[styles.phase, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="flask-outline" size={13} color={colors.star} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.star }}>Fase de testes</Text>
          </View>
        )}
      </View>

      <View style={styles.sections}>
        {STORE_SECTIONS.map((item) => {
          const active = item.value === section;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => setSection(item.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                styles.sectionTab,
                { backgroundColor: active ? colors.pillActive : colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: active ? colors.pillTextActive : colors.textSecondary }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!sectionInfo?.ready ? (
        <InDevelopment label={sectionInfo?.label ?? ""} />
      ) : (
        <>
          <View style={styles.filters}>
            <CategoryScroller options={BADGE_CATEGORIES} selected={category} onSelect={setCategory} />
          </View>

          {!loaded ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={cells}
              keyExtractor={(badge, index) => badge?.id ?? `empty-${index}`}
              numColumns={2}
              columnWrapperStyle={styles.column}
              contentContainerStyle={styles.grid}
              ListHeaderComponent={
                <View>
                  {TEST_PHASE_FREE && (
                    <View style={[styles.banner, { backgroundColor: colors.accent }]}>
                      <Ionicons name="gift" size={34} color="#FFFFFF" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bannerKicker}>FASE DE TESTES</Text>
                        <Text style={styles.bannerTitle}>Todas as badges grátis</Text>
                        <Text style={styles.bannerText}>Resgate quantas quiser e equipe até 6 no seu perfil.</Text>
                      </View>
                    </View>
                  )}
                  {error && (
                    <TouchableOpacity onPress={refresh} style={styles.errorRow}>
                      <Ionicons name="refresh" size={14} color={colors.danger} />
                      <Text style={{ fontSize: 12, color: colors.danger }}>{error} Toque para tentar de novo.</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={[styles.count, { color: colors.textSecondary }]}>
                    {visible.length} badges · {visible.filter((badge) => owned.has(badge.id)).length} resgatadas
                  </Text>
                </View>
              }
              renderItem={({ item }) =>
                item ? (
                  <StoreBadgeCard
                    badge={item}
                    owned={owned.has(item.id)}
                    equipped={slots.includes(item.id)}
                    onPress={() => setOpenId(item.id)}
                  />
                ) : (
                  <View style={{ flex: 1 }} />
                )
              }
            />
          )}
        </>
      )}

      <BottomTabs />

      <RedeemSheet
        badge={open}
        owned={open ? owned.has(open.id) : false}
        equipped={open ? slots.includes(open.id) : false}
        slotsFull={freeSlot === -1}
        onClose={() => setOpenId(null)}
        onRedeem={() => (open ? redeem(open.id) : Promise.resolve())}
        onEquip={() => (open ? equip(open.id) : Promise.resolve())}
        onManage={() => {
          setOpenId(null);
          router.push("/badges");
        }}
      />
    </Screen>
  );
}

function InDevelopment({ label }: { label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.devWrap}>
      <View style={[styles.devCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="construct-outline" size={36} color={colors.accent} />
        <Text style={[styles.devTitle, { color: colors.textPrimary }]}>{label}: em desenvolvimento</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, textAlign: "center", color: colors.textSecondary }}>
          Esta seção da loja ainda está sendo construída. Por enquanto, confira as badges.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800" },
  phase: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  sections: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  sectionTab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  filters: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  grid: { paddingHorizontal: 16, paddingBottom: 24 },
  column: { gap: 12, marginBottom: 12 },
  banner: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, padding: 16, marginTop: 8, marginBottom: 12 },
  bannerKicker: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, color: "#FFE9A8" },
  bannerTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  bannerText: { fontSize: 12, color: "#F1E8FF", marginTop: 2 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  count: { fontSize: 12, marginBottom: 10 },
  devWrap: { flex: 1, padding: 16, justifyContent: "center" },
  devCard: { alignItems: "center", gap: 10, borderRadius: 18, borderWidth: 1, padding: 24 },
  devTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
});
