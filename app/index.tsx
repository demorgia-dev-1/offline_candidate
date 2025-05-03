// @ts-nocheck
import { Link, Stack } from "expo-router";
import React, { useState } from "react";
import { Text, View, Pressable, Alert, Image } from "react-native";
import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import qrImage from "../assets/images/qr-code (1).png";
export default function Index() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  const handleScanPress = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Camera access is required to scan QR codes",
          [{ text: "OK" }]
        );
        return;
      }
    }
    router.push("/scanner");
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Stack.Screen
        options={{
          title: "Assessir Offline",
          headerShown: true,
          headerStyle: {
            backgroundColor: "#1d4ed8",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerTitleAlign: "center",
        }}
      />

      <Image
        source={qrImage}
        style={{
          width: 160,
          height: 160,
          marginBottom: 30,
        }}
        resizeMode="contain"
      />
      <Pressable
        onPress={handleScanPress}
        className="active:scale-95 active:bg-blue-700 bg-blue-500 px-6 py-3 rounded-lg transition-all duration-200"
      >
        <Text className="text-white text-xl">Scan QR Code</Text>
      </Pressable>
    </View>
  );
}
