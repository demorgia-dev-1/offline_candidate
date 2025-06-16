// @ts-nocheck
import React from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  SafeAreaView,
  Pressable,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import "./global.css";
import { Ionicons } from "@expo/vector-icons";

const Footer = () => (
  <SafeAreaView>
    <View className="flex-row justify-around items-center py-1">
      <Text className="text-gray-400 text-xs">Offline assessir v1.0.0</Text>
    </View>
  </SafeAreaView>
);

const HeaderLogos = () => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <Image
      source={require("../assets/images/demorgia.png")}
      style={{ width: 100, height: 50, resizeMode: "contain" }}
    />
    <Image
      source={require("../assets/images/skill-india.png")}
      style={{ width: 40, height: 40, resizeMode: "contain" }}
    />
  </View>
);
export default function RootLayout() {
  const router = useRouter();

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#1d4ed8",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerTitleAlign: "center",
          headerTitle: () => <HeaderLogos />,

          headerRight: () => (
            <TouchableOpacity
              onPress={async () => {
                try {
                  await SecureStore.deleteItemAsync("token");

                  router.push({
                    pathname: "/",
                  });
                } catch (error) {
                  Alert.alert("Error", error);
                }
              }}
              style={{ paddingHorizontal: 16 }}
            >
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          ),
        }}
      />
      <Footer />
    </>
  );
}
