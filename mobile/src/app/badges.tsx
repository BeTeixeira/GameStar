import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import Screen from "../components/Screen";
import BackBar from "../components/BackBar";
import SectionCard from "../components/SectionCard";
import FilterPills from "../components/FilterPills";
import BadgeTile from "../components/BadgeTile";
import BadgeSlots from "../components/BadgeSlots";
import BadgeSheet from "../components/BadgeSheet";
import { useAppTheme } from "../theme/ThemeContext";
import { MAX_SLOTS, Slots, useBadges } from "../context/BadgesContext";
import { BADGES, Badge } from "../data/badges";

// MINHAS BADGES — rota "/badges" (aberta pelo Perfil).
// Mostra todas as badges (as que a conta tem coloridas, as outras em cinza),
// deixa escolher até 6 para o perfil e salvar. As que faltam podem ser
// resgatadas aqui mesmo ou na Loja (fase de testes: grátis). Tocar numa badge abre o pop-up
// com nome, status, preço, período e como desbloquear.

type Filter = "all" | "owned" | "missing";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "owned", label: "Tenho" },
  { value: "missing", label: "Faltam" },
];

const sameSlots = (a: Slots, b: Slots) => a.length === b.length && a.every((v, i) => v === b[i]);

export default function BadgesScreen() {
  const { colors } = useAppTheme();
  const { owned, slots: savedSlots, saveSlots, redeem } = useBadges();

  const [draft, setDraft] = useState<Slots>(savedSlots); // escolha ainda não salva
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  // As badges equipadas chegam da API depois que a tela abre: atualiza a escolha quando elas mudam.
  useEffect(() => setDraft(savedSlots), [savedSlots]);

  const dirty = !sameSlots(draft, savedSlots);
  const ownedCount = BADGES.filter((b) => owned.has(b.id)).length;
  const open: Badge | null = openId ? BADGES.find((b) => b.id === openId) ?? null : null;
  const slotsFull = draft.every((id) => id !== null);

  // Agrupa por categoria, mantendo a ordem do arquivo de dados.
  const groups = useMemo(() => {
    const map = new Map<string, Badge[]>();
    for (const b of BADGES) {
      const has = owned.has(b.id);
      if (filter === "owned" && !has) continue;
      if (filter === "missing" && has) continue;
      map.set(b.category, [...(map.get(b.category) ?? []), b]);
    }
    return [...map.entries()];
  }, [filter, owned]);

  function addToProfile(id: string) {
    const free = draft.indexOf(null);
    if (free === -1) return;
    setDraft(draft.map((v, i) => (i === free ? id : v)));
    setMessage(null);
    setOpenId(null);
  }

  function removeFromProfile(index: number) {
    setDraft(draft.map((v, i) => (i === index ? null : v)));
    setMessage(null);
  }

  async function redeemOpen() {
    if (!openId) return;
    setRedeeming(true);
    try {
      await redeem(openId);
      setMessage({ ok: true, text: "Badge resgatada! Agora você pode colocá-la no perfil." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Não foi possível resgatar." });
      setOpenId(null);
    } finally {
      setRedeeming(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await saveSlots(draft);
      setMessage({ ok: true, text: "Badges salvas no seu perfil." });
    } catch {
      setMessage({ ok: false, text: "Não foi possível salvar. Tente de novo." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <BackBar title="Minhas badges" fallback="/perfil" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
          {ownedCount} de {BADGES.length} desbloqueadas
        </Text>

        <SectionCard title={`Exibidas no seu perfil (${draft.filter(Boolean).length}/${MAX_SLOTS})`} icon="ribbon-outline">
          <BadgeSlots slots={draft} onRemove={removeFromProfile} />
          <TouchableOpacity
            onPress={save}
            disabled={!dirty || saving}
            style={[styles.save, { backgroundColor: colors.accent, opacity: !dirty || saving ? 0.4 : 1 }]}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>{saving ? "Salvando..." : "Salvar"}</Text>
          </TouchableOpacity>
          {message && (
            <Text style={{ fontSize: 12, marginTop: 8, color: message.ok ? "#4CC38A" : colors.danger }}>{message.text}</Text>
          )}
          {!message && dirty && (
            <Text style={{ fontSize: 11, marginTop: 8, color: colors.textSecondary }}>Você tem mudanças que ainda não foram salvas.</Text>
          )}
        </SectionCard>

        <FilterPills options={FILTERS} selected={filter} onSelect={(v) => setFilter(v as Filter)} />

        {groups.length === 0 && (
          <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 24 }}>
            Nenhuma badge neste filtro.
          </Text>
        )}

        {groups.map(([category, list]) => (
          <View key={category} style={{ marginTop: 6 }}>
            <Text style={[styles.category, { color: colors.textSecondary }]}>{category}</Text>
            <View style={styles.grid}>
              {list.map((b) => (
                <BadgeTile key={b.id} badge={b} owned={owned.has(b.id)} selected={draft.includes(b.id)} onPress={() => setOpenId(b.id)} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <BadgeSheet
        badge={open}
        owned={open ? owned.has(open.id) : false}
        inProfile={open ? draft.includes(open.id) : false}
        slotsFull={slotsFull}
        onClose={() => setOpenId(null)}
        onRedeem={redeemOpen}
        redeeming={redeeming}
        onAdd={() => open && addToProfile(open.id)}
        onRemove={() => {
          if (!open) return;
          removeFromProfile(draft.indexOf(open.id));
          setOpenId(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  save: { height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 14 },
  category: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
