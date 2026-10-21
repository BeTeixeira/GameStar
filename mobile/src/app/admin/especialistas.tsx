import React from "react";
import { View, StyleSheet } from "react-native";
import Screen from "../../components/Screen";
import BackBar from "../../components/BackBar";
import BottomTabs from "../../components/BottomTabs";
import ExpertsAdmin from "../../components/admin/ExpertsAdmin";

// Promover/rebaixar especialista colando o ID da conta (fluxo que já existia).
// Rota "/admin/especialistas" — aberta pelo link "Promover por ID" da aba Contas.
export default function AdminEspecialistas() {
  return (
    <Screen>
      <BackBar title="Promover por ID" fallback="/admin/contas" />
      <View style={styles.content}>
        <ExpertsAdmin />
      </View>
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { flex: 1, padding: 12 } });
