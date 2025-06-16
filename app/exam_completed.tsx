// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  BackHandler,
  Alert,
  ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const ExamComplete = () => {
  const router = useRouter();
  const { ip } = useLocalSearchParams();
  const [feedbackForm, setFeedbackForm] = useState(null);
  const [responses, setResponses] = useState({}); // Store user responses

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

  useEffect(() => {
    const getFeedbackForm = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          Alert.alert(
            "Error",
            "You are not Authorized to view this page. Please log in again."
          );
          return;
        }
        const response = await axios.get(`${ip}/candidate/get-feedback-form`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Feedback Form:", response.data);
        setFeedbackForm(response.data);
      } catch (error) {
        // console.error(
        //   "Error fetching feedback form:",
        //   error.response.data.error
        // );
        Alert.alert("Error", error.response.data.error);
      }
    };

    getFeedbackForm();
  }, [ip]);

  const handleResponseChange = (questionId, response) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: response,
    }));
  };

  const handleSubmitFeedback = async () => {
    const feedbacks = Object.entries(responses).map(
      ([questionId, response]) => ({
        questionId,
        response,
      })
    );

    console.log("Feedbacks to submit:", feedbacks);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        Alert.alert(
          "Error",
          "You are not Authorized to submit feedback. Please log in again."
        );
        return;
      }

      await axios.post(
        `${ip}/candidate/submit-feedback-form`,
        { feedbacks },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("Success", "Thank you for your feedback!");
      router.push("/");
    } catch (error) {
      // console.error(
      //   "Error submitting feedback:",
      //   error.response?.data?.error || error.message
      // );
      Alert.alert("Error", error.response?.data?.error || error.message, [
        { text: "OK", onPress: () => router.push("/") },
      ]);
    }
  };
  return (
    <View className="flex-1 bg-white px-4 sm:px-6 md:px-8">
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <ScrollView>
        <View className="bg-green-50 p-2 rounded-3xl shadow-lg w-full max-w-md mx-auto">
          <View className="items-center mb-6">
            <MaterialIcons name="celebration" size={48} color="#15803d" />
            <Text className="text-2xl font-bold text-green-700 text-center mt-2">
              Exam Completed!
            </Text>
            <Text className="text-gray-600 text-center mt-2 leading-relaxed">
              Your responses have been submitted successfully.
            </Text>
          </View>

          <View className="bg-white p-3 rounded-xl border border-green-100 mb-6 space-y-4">
            <Text className="text-lg font-bold text-gray-800">
              Please provide your feedback:
            </Text>
            {feedbackForm && feedbackForm.length > 0 ? (
              feedbackForm.map((question) => (
                <View key={question._id} className="mb-3">
                  <Text className="text-base text-gray-800 mb-2">
                    {question.question}
                  </Text>
                  <View className="flex-row justify-between gap-1">
                    {["very good", "good", "average", "poor", "very poor"].map(
                      (option) => (
                        <Pressable
                          key={option}
                          onPress={() =>
                            handleResponseChange(question._id, option)
                          }
                          className={`px-2 py-1.5 rounded-md ${
                            responses[question._id] === option
                              ? "bg-green-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              responses[question._id] === option
                                ? "text-white"
                                : "text-gray-800"
                            }`}
                          >
                            {option
                              .split(" ")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-center text-gray-600">
                Feedback form is not available at the moment.
              </Text>
            )}
          </View>

          {/* Submit Feedback Button */}
          <Pressable
            android_ripple={{ color: "#166534" }}
            onPress={handleSubmitFeedback}
            className="bg-green-600 py-3 px-6 rounded-full shadow-md flex-row items-center justify-center"
          >
            <MaterialIcons name="send" size={20} color="#ffffff" />
            <Text className="ml-2 text-white text-lg font-semibold">
              Submit Feedback
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default ExamComplete;
