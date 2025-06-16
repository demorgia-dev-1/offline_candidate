// @ts-nocheck
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Text,
  View,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useCameraPermissions } from "expo-camera";
import qrImage from "../assets/images/qr-code (1).png";

export default function Index() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const router = useRouter();

  const handleSubmitPress = () => {
    if (!ipAddress) {
      Alert.alert(
        "Missing IP Address",
        "Please enter the IP address with port."
      );
      return;
    }
    router.push({
      pathname: "/candidate_login",
      params: { ip: ipAddress },
    });
  };

  const handleScanPress = async () => {
    try {
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

      router.push({
        pathname: "/scanner",
        params: { ip: ipAddress },
      });
    } catch (error) {
      console.error("Scanner error:", error);
      Alert.alert("Error", "Failed to open scanner. Please try again.");
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Stack.Screen
        options={{
          title: "Candidate Offline",
          headerShown: true,
          headerStyle: {
            backgroundColor: "#1d4ed8",
          },
          headerTintColor: "#fff",
        }}
      />

      <Image
        source={qrImage}
        style={{ width: 160, height: 160, marginBottom: 30 }}
        resizeMode="contain"
      />

      <Pressable
        onPress={handleScanPress}
        disabled={isLoading}
        className={`bg-blue-600 w-full rounded-lg px-8 py-3 ${
          isLoading ? "opacity-50" : ""
        }`}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-medium text-lg text-center">
            Scan QR Code
          </Text>
        )}
      </Pressable>
      <Text className="text-gray-500 my-5">OR</Text>

      <TextInput
        placeholder="Enter IP address with port (e.g. 192.168.0.1:5000)"
        value={ipAddress}
        onChangeText={setIpAddress}
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-4 text-base"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmitPress}
        className="bg-green-600 w-full rounded-lg px-8 py-3 mb-4"
      >
        <Text className="text-white font-medium text-lg text-center">
          Submit
        </Text>
      </Pressable>
    </View>
  );
}
