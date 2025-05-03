import React from "react";
import { Stack, useRouter } from "expo-router";
import { View, Text, SafeAreaView, Pressable } from "react-native";
import * as SecureStore from "expo-secure-store";
import "./global.css";
import { Ionicons } from "@expo/vector-icons";

const Footer = () => (
  <SafeAreaView>
    <View className="flex-row justify-around items-center py-2">
      <Text className="text-gray-400 text-xs">Offline assessir v1.0.0</Text>
    </View>
  </SafeAreaView>
);
export default function RootLayout() {
  const router = useRouter();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("assessor_token");
    router.push({
      pathname: "/candidate_login",
    });
  };

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
          headerRight: () => (
            <Pressable onPress={handleLogout} className="px-4">
              <Ionicons name="log-out-outline" size={24} color="white" />
            </Pressable>
          ),
        }}
      />
      {/* <Footer /> */}
    </>
  );
}
