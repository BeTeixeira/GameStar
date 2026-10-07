import { Alert, Platform } from "react-native";

// Confirmação antes de uma ação destrutiva; funciona no celular e no navegador.
export function confirmAction(message: string, onConfirm: () => void, confirmLabel = "Excluir") {
  if (Platform.OS === "web") {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert("Confirmar", message, [
    { text: "Cancelar", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

// Data da API (ISO, ex: "2026-09-30T18:51:29") → "30/09/2026"
export function formatDate(iso: string) {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}
