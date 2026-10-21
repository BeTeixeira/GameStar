import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import CatalogScreen from "../components/CatalogScreen";

// Tela inicial ("/"). Cada tipo de conta tem a sua home:
//   - conta normal  → catálogo (CatalogScreen);
//   - especialista  → painel do especialista (src/app/especialista/index.tsx);
//   - admin         → painel do admin (src/app/admin/index.tsx).
export default function Home() {
  const { isAdmin, isExpert } = useAuth();
  if (isAdmin) return <Redirect href="/admin" />;
  if (isExpert) return <Redirect href="/especialista" />;
  return <CatalogScreen />;
}
