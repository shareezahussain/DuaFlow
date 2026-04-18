import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Dua } from "../data/rabbanas";
import { useApp } from "../context/AppContext";
import { useQuranContent } from "../context/QuranContentContext";
import { RootStackParamList } from "../../App";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ur: "اردو",
  bn: "বাংলা",
};

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { language, setLanguage, addToPrint, removeFromPrint, isInPrint, printCollection } =
    useApp();
  const { duas, isLoading, error, retry } = useQuranContent();
  const [search, setSearch] = useState("");

  const filtered = duas.filter(
    (d: Dua) =>
      d.arabicText.includes(search) ||
      d.transliteration.toLowerCase().includes(search.toLowerCase()) ||
      d.translations.en.toLowerCase().includes(search.toLowerCase()) ||
      d.topic.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = useCallback(
    ({ item }: { item: Dua }) => {
      const inPrint = isInPrint(item.id);
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("DuaDetail", { duaId: item.id })}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={styles.numbadge}>
              <Text style={styles.numText}>{item.id}</Text>
            </View>
            <Text style={styles.topicText}>{item.topic}</Text>
            <Text style={styles.refText}>
              {item.surah}:{item.ayah}
            </Text>
          </View>
          <Text style={styles.arabicText} numberOfLines={2}>
            {item.arabicText}
          </Text>
          <Text style={styles.translitText} numberOfLines={1}>
            {item.transliteration}
          </Text>
          <Text style={styles.transText} numberOfLines={2}>
            {item.translations[language]}
          </Text>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, inPrint && styles.actionBtnActive]}
              onPress={() =>
                inPrint ? removeFromPrint(item.id) : addToPrint(item)
              }
            >
              <Text
                style={[styles.actionBtnText, inPrint && styles.actionBtnTextActive]}
              >
                {inPrint ? "✓ In Print" : "+ Add to Print"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.listenBtn}
              onPress={() =>
                navigation.navigate("DuaDetail", { duaId: item.id })
              }
            >
              <Text style={styles.listenBtnText}>▶ Listen</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [language, isInPrint, addToPrint, removeFromPrint]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a5276" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rabbanas</Text>
          <Text style={styles.headerSubtitle}>
            Quranic Supplications
          </Text>
        </View>
        <TouchableOpacity
          style={styles.printBadge}
          onPress={() => navigation.navigate("PrintDesigner")}
        >
          <Text style={styles.printBadgeText}>🖨 {printCollection.length}</Text>
        </TouchableOpacity>
      </View>

      {/* Language Toggle */}
      <View style={styles.langRow}>
        {(["en", "ur", "bn"] as const).map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.langBtn, language === lang && styles.langBtnActive]}
            onPress={() => setLanguage(lang)}
          >
            <Text
              style={[
                styles.langBtnText,
                language === lang && styles.langBtnTextActive,
              ]}
            >
              {LANGUAGE_LABELS[lang]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by topic, dua, or translation..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setSearch("")}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#1a5276" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>
            Loading duas from Quran Foundation…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Failed to load duas</Text>
          <TouchableOpacity onPress={retry} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No duas found</Text>
            </View>
          }
        />
      )}

      {/* Print FAB */}
      {printCollection.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("PrintDesigner")}
        >
          <Text style={styles.fabText}>🖨 Design & Print ({printCollection.length})</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  header: {
    backgroundColor: "#1a5276",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      web: { paddingTop: 20 },
    }),
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: "#a9cce3",
    fontSize: 12,
    marginTop: 2,
  },
  printBadge: {
    backgroundColor: "#2e86c1",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  printBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  langRow: {
    flexDirection: "row",
    backgroundColor: "#1a5276",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  langBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2e86c1",
  },
  langBtnActive: {
    backgroundColor: "#f39c12",
    borderColor: "#f39c12",
  },
  langBtnText: {
    color: "#a9cce3",
    fontSize: 13,
    fontWeight: "500",
  },
  langBtnTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: "#333",
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: "#999",
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  numbadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1a5276",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  numText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  topicText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1a5276",
  },
  refText: {
    fontSize: 12,
    color: "#888",
    backgroundColor: "#eef2f7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  arabicText: {
    fontSize: 22,
    color: "#1a1a2e",
    textAlign: "right",
    lineHeight: 36,
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "serif",
    marginBottom: 6,
  },
  translitText: {
    fontSize: 13,
    color: "#7f8c8d",
    fontStyle: "italic",
    marginBottom: 6,
  },
  transText: {
    fontSize: 14,
    color: "#2c3e50",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a5276",
    alignItems: "center",
  },
  actionBtnActive: {
    backgroundColor: "#1a5276",
  },
  actionBtnText: {
    fontSize: 13,
    color: "#1a5276",
    fontWeight: "600",
  },
  actionBtnTextActive: {
    color: "#fff",
  },
  listenBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f39c12",
    alignItems: "center",
  },
  listenBtnText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "700",
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#1a5276",
    borderRadius: 20,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "#1a5276",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
