// @ts-nocheck
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

export default function CandidateLogin() {
  const { ip } = useLocalSearchParams();
  const router = useRouter();

  const [enrollment, setEnrollment] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!enrollment || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    console.log("Enrollment:", enrollment);
    console.log("Password:", password);

    setIsLoading(true);
    const apiUrl = `${ip}/auth/candidate-login`;
    console.log("API URL:", apiUrl);

    try {
      const response = await axios({
        method: "post",
        url: apiUrl,
        data: {
          _id: enrollment,
          password,
        },
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 500,
      });

      console.log("Response Status:", response);
      console.log("Response Data:", response.data);

      if (response.status === 200) {
        const { token, name } = response.data;
        try {
          await SecureStore.setItemAsync("token", token);
          await SecureStore.setItemAsync("name", name);

          router.push({
            pathname: "/document",
            params: { ip },
          });
        } catch (storageError) {
          console.error("Token storage error:", storageError);
          Alert.alert("Warning", "Failed to store login credentials");
        }
      } else if (response.status === 401) {
        Alert.alert("Error", "Invalid Enrollment Number or Password");
      } else {
        Alert.alert("Error", "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Error details:", error);
      if (error.code === "ECONNABORTED") {
        Alert.alert("Error", "Request timed out");
      } else if (error.code === "ERR_NETWORK") {
        Alert.alert(
          "Network Error",
          "Cannot connect to server. Please check:\n" +
            "1. Server is running\n" +
            "2. IP address is correct\n" +
            "3. You are on the same network"
        );
      } else {
        Alert.alert("Error", error.response.data.error || "Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white justify-center items-center px-6"
    >
      <Stack.Screen options={{ title: "Candidate Login" }} />

      <View className="w-full max-w-md gap-6">
        <Text className="text-3xl font-semibold text-center text-gray-800">
          Candidate Login
        </Text>

        <TextInput
          className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-4 text-base text-gray-800"
          placeholder="Enrollment Number"
          placeholderTextColor="#9CA3AF"
          value={enrollment}
          onChangeText={setEnrollment}
        />

        <TextInput
          className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-4 text-base text-gray-800"
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          onPress={handleLogin}
          disabled={isLoading}
          className={`w-full bg-blue-600 rounded-xl py-4 ${
            isLoading ? "opacity-70" : "active:bg-blue-700"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center text-lg font-medium">
              Login
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
