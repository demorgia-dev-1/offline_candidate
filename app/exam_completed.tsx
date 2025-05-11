import React, { useEffect } from "react";
import { View, Text, Pressable, BackHandler, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { MaterialIcons, Feather } from "@expo/vector-icons";

const ExamComplete = () => {
  const router = useRouter();
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        Alert.alert(
          "Warning",
          "You cannot go back to your exam once it is submitted.",
          [{ text: "OK" }]
        );
        return true;
      }
    );

    return () => backHandler.remove();
  }, []);
  return (
    <View className="flex-1 bg-white px-6 justify-center items-center">
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <View className="bg-green-50 p-8 rounded-3xl shadow-lg w-full max-w-md">
        <View className="items-center mb-6">
          <MaterialIcons name="celebration" size={48} color="#15803d" />
          <Text className="text-2xl font-bold text-green-700 text-center mt-2">
            Exam Completed!
          </Text>
          <Text className="text-gray-600 text-center mt-2 leading-relaxed">
            Your responses have been submitted successfully.
          </Text>
        </View>

        {/* Info box */}
        <View className="bg-white p-5 rounded-xl border border-green-100 mb-6 space-y-2">
          <View className="flex-row items-center">
            <Feather name="clock" size={20} color="#15803d" />
            <Text className="ml-2 text-gray-800 text-base">
              You will receive your results shortly.
            </Text>
          </View>
          {/* <View className="flex-row items-center">
            <Feather name="mail" size={20} color="#15803d" />
            <Text className="ml-2 text-gray-800 text-base">
              Check your email for further instructions.
            </Text>
          </View> */}
          <View className="flex-row items-center">
            <Feather name="help-circle" size={20} color="#15803d" />
            <Text className="ml-2 text-gray-800 text-base">
              Contact support if you have any questions.
            </Text>
          </View>
        </View>

        <Pressable
          android_ripple={{ color: "#166534" }}
          onPress={() => router.push("/")}
          className="bg-green-600 py-3 px-6 rounded-full shadow-md flex-row items-center justify-center"
        >
          <MaterialIcons name="home" size={20} color="#ffffff" />
          <Text className="ml-2 text-white text-lg font-semibold">
            Return to Home
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default ExamComplete;
