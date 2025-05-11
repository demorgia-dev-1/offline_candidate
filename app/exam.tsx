// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Pressable,
  BackHandler,
  Image,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import RenderHtml, { RenderHTML } from "react-native-render-html";
import { useWindowDimensions } from "react-native";
import { Camera, CameraView } from "expo-camera";
import * as FaceDetector from "expo-face-detector";
import * as MediaLibrary from "expo-media-library";
import * as Location from "expo-location";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import HtmlRenderer from "@/components/HtmlRender";
import Toast from "react-native-toast-message";
import { replaceBaseUrl } from "./utils";

interface HtmlRendererProps {
  html?: string;
  width?: number;
  style?: object;
}
const Exam = () => {
  const { width } = useWindowDimensions();
  const {
    ip,
    examType,
    duration,
    isCandidatePhotosRequired,
    isCandidateVideoRequired,
    isSuspiciousActivityDetectionRequired,
    sscLogo,
  } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionStatus, setQuestionStatus] = useState([]);
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [questionStartTimes, setQuestionStartTimes] = useState({});
  const [questionEndTimes, setQuestionEndTimes] = useState({});
  const [isExamSubmitted, setIsExamSubmitted] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  // const [faceDetected, setFaceDetected] = useState(true);
  // const [faceCount, setFaceCount] = useState(0);
  const router = useRouter();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState(null);
  const cameraRef = useRef<CameraView>(null);
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const minutes = parseInt(duration as string);
    return isNaN(minutes) ? 3600 : minutes * 60;
  });

  const [cameraMode, setCameraMode] = useState("picture");
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!started || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } =
        await Camera.requestCameraPermissionsAsync();
      const { status: audioStatus } =
        await Camera.requestMicrophonePermissionsAsync();
      const { status: locationStatus } =
        await Location.requestForegroundPermissionsAsync();

      const hasPermissions =
        cameraStatus === "granted" &&
        audioStatus === "granted" &&
        locationStatus === "granted";

      console.log("Permissions Status:", {
        camera: cameraStatus,
        audio: audioStatus,
        location: locationStatus,
        hasPermissions,
      });

      setHasPermissions(hasPermissions);
    })();
  }, []);

  const switchCameraMode = async (mode) => {
    setCameraMode(mode);
    console.log("Switching camera mode to:", mode);

    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((res) => setTimeout(res, 300));
      if (isCameraReady) {
        console.log("Camera mode stabilized:", mode);
        return;
      }
      console.log(`Waiting for camera to be ready [${attempt + 1}]...`);
    }

    throw new Error("Camera not ready after switching mode");
  };

  const captureRandomPhoto = async () => {
    if (!cameraRef.current || !isCandidatePhotosRequired || isCapturing) return;
    setIsCapturing(true);
    try {
      console.log("Switching to Photo Mode...");
      setIsCameraReady(false);

      await switchCameraMode("picture");

      console.log("Capturing Photo...");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.2,
        shutterSound: false,
      });

      console.log("Photo captured:");
      const formData = new FormData();
      formData.append("photo", {
        uri: photo.uri,
        type: "image/jpeg",
        name: `random_photo${Date.now()}.jpg`,
      });
      formData.append("testType", examType.toUpperCase());

      const token = await SecureStore.getItemAsync("token");
      await axios.post(`${ip}/candidate/upload-random-photo`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Photo uploaded successfully");
    } catch (error) {
      console.error("Photo capture error:", {
        message: error.message,
        code: error.code,
        cameraReady: isCameraReady,
        mode: cameraMode,
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const captureRandomVideo = async () => {
    if (!cameraRef.current || !isCandidateVideoRequired || isCapturing) return;
    setIsCapturing(true);
    try {
      console.log("Switching to Video Mode...");
      await switchCameraMode("video");

      console.log("Recording Video...");
      const video = await cameraRef.current.recordAsync({
        maxDuration: 30,
        quality: "480p",
      });

      console.log("Video recorded:", video);
      const formData = new FormData();
      formData.append("video", {
        uri: video.uri,
        type: "video/mp4",
        name: `video_${Date.now()}.mp4`,
      });
      formData.append("testType", examType.toUpperCase());

      const token = await SecureStore.getItemAsync("token");
      await axios.post(`${ip}/candidate/upload-random-video`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Video uploaded successfully");
    } catch (error) {
      console.error("Video recording error:", error);
    }
    setIsCapturing(false);
  };

  const startMonitoring = async () => {
    if (!hasPermissions || !isCameraReady) {
      console.log("Monitoring Skipped:", { hasPermissions, isCameraReady });
      return;
    }

    try {
      if (isCandidatePhotosRequired && !isCapturing) {
        console.log("Starting Photo Capture");
        await captureRandomPhoto();
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));

      if (isCandidateVideoRequired && !isCapturing) {
        console.log("Starting Video Capture");
        await captureRandomVideo();
      }
      startMonitoring();
    } catch (error) {
      console.error("Monitoring Error:", error);

      setTimeout(startMonitoring, 5000);
    }
  };

  useEffect(() => {
    if (hasPermissions && isCameraReady) {
      console.log("Starting Monitoring Sequence");
      startMonitoring();

      const intervalId = setInterval(() => {
        const hasResponses = Object.keys(answers).length > 0;
        if (hasResponses) {
          submitResponsesPeriodically();
        } else {
          console.log("No responses to submit.");
        }
      }, 4000); //

      return () => {
        console.log("Stopping Monitoring Sequence");
        clearInterval(intervalId);
      };
    }
  }, [hasPermissions, isCameraReady]);

  const STATUS_COLORS = {
    current: "#2563eb",
    answered: "#16a34a",
    notAnswered: "#dc2626",
    markForReview: "#ca8a04",
    default: "#94a3b8",
  };

  const getExamEndpoint = () => {
    return examType === "theory"
      ? "/candidate/my-theory-test"
      : "/candidate/my-practical-test";
  };

  const fetchExamData = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const response = await axios.get(`${ip}${getExamEndpoint()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(`${examType} API Response:`, JSON.stringify(response.data));

      if (response.status === 200 && response.data.length > 0) {
        const examData = response.data[0];
        const questions = examData.questions;

        setQuestions(questions);
        setQuestionStatus(new Array(questions.length).fill("default"));
        const now = new Date().toISOString();
        setQuestionStartTimes({ [questions[0]._id]: now });
        setStarted(true);
        const backHandler = BackHandler.addEventListener(
          "hardwareBackPress",
          () => {
            Alert.alert(
              "Warning",
              "You cannot go back during the exam. Please complete and submit your exam.",
              [{ text: "OK" }]
            );
            return true;
          }
        );

        return () => backHandler.remove();
      }
    } catch (error) {
      console.error(`${examType} exam fetch error:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch exam data";

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamData();
  }, [examType]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-gray-600">Loading exam...</Text>
      </View>
    );
  }
  const setQuestionStart = (questionId) => {
    const now = new Date().toISOString();
    setQuestionStartTimes((prev) => ({
      ...prev,
      [questionId]: now,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      const nextQuestionId = questions[currentQuestion + 1]._id;
      setQuestionStart(nextQuestionId);
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      const prevQuestionId = questions[currentQuestion - 1]._id;
      setQuestionStart(prevQuestionId);
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleAnswer = (questionId, answerId) => {
    const now = new Date().toISOString();

    if (!questionStartTimes[questionId]) {
      setQuestionStart(questionId);
    }

    setQuestionEndTimes((prev) => ({
      ...prev,
      [questionId]: now,
    }));

    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  const handleMarkForReview = () => {
    const newStatus = [...questionStatus];
    newStatus[currentQuestion] =
      questionStatus[currentQuestion] === "markForReview"
        ? "default"
        : "markForReview";
    setQuestionStatus(newStatus);
  };

  const isAllAnsweredAndNotMarkedForReview = () => {
    return questions.every(
      (question, index) =>
        answers[question._id] && questionStatus[index] !== "markForReview"
    );
  };

  const goToNextUnansweredOrMarked = () => {
    const nextQuestionIndex = questions.findIndex(
      (question, index) =>
        !answers[question._id] || questionStatus[index] === "markForReview"
    );

    if (nextQuestionIndex !== -1) {
      setCurrentQuestion(nextQuestionIndex);
    }
  };

  const submitResponsesPeriodically = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        console.error("Authentication token not found");
        return;
      }

      const responses = Object.keys(answers).map((questionId) => ({
        questionId,
        answerId: answers[questionId],
        startedAt: questionStartTimes[questionId],
        endedAt: questionEndTimes[questionId],
      }));

      const responseEndpoint =
        examType === "theory"
          ? "/candidate/submit-theory-responses"
          : "/candidate/submit-practical-responses";

      console.log(
        "Submitting responses to endpoint:",
        `${ip}${responseEndpoint}`
      );

      const responsesResult = await axios.post(
        `${ip}${responseEndpoint}`,
        { responses },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "Periodic responses submission result:",
        responsesResult.data
      );
    } catch (error) {
      console.error(
        "Error during periodic response submission:",
        error.message
      );
    }
  };

  const handleSubmit = async () => {
    Alert.alert(
      "⚠️ Submit Exam",
      `Please review before final submission:

    📝 Exam Summary
    ---------------
    • Total Questions: ${questions.length}
    • Answered: ${Object.keys(answers).length}
    • Marked for Review: ${
      questionStatus.filter((s) => s === "markForReview").length
    }

    ⚠️ Warning: Once submitted, you cannot modify your answers.`,
      [
        {
          text: "Review Answers",
          style: "cancel",
        },
        {
          text: "Submit Exam",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              if (cameraRef.current) {
                if (isRecording) {
                  await cameraRef.current.stopRecording();
                }
                await cameraRef.current.pausePreview();
              }

              setIsCapturing(false);
              setIsCameraReady(false);
              setIsExamSubmitted(true);
              const token = await SecureStore.getItemAsync("token");

              if (!token) {
                Alert.alert("Error", "Authentication token not found");
                return;
              }

              const responses = Object.keys(answers).map((questionId) => ({
                questionId,
                answerId: answers[questionId],
                startedAt: questionStartTimes[questionId],
                endedAt: questionEndTimes[questionId],
              }));

              const responseEndpoint =
                examType === "theory"
                  ? "/candidate/submit-theory-responses"
                  : "/candidate/submit-practical-responses";

              console.log(
                "Submitting to endpoint:",
                `${ip}${responseEndpoint}`
              );

              const responsesResult = await axios.post(
                `${ip}${responseEndpoint}`,
                { responses },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              console.log("Responses submission result:", responsesResult);

              const testEndpoint =
                examType === "theory"
                  ? "/candidate/submit-theory-test"
                  : "/candidate/submit-practical-test";

              const testResult = await axios.post(
                `${ip}${testEndpoint}`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              console.log("Test submission result:", testResult.data);
              if (cameraRef.current) {
                cameraRef.current = null;
              }
              setHasPermissions(false);
              Alert.alert("Success", "Exam submitted successfully!", [
                { text: "OK", onPress: () => router.push("/exam_completed") },
              ]);
            } catch (error) {
              console.error(
                "Submit Error:",
                error.response?.data || error.message
              );
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to submit exam"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const LANGUAGES = {
    en: "English",
    hi: "Hindi",
    mr: "Marathi",
    ta: "Tamil",
    te: "Telugu",
    kn: "Kannada",
    gu: "Gujarati",
    bn: "Bengali",
    pa: "Punjabi",
    ml: "Malayalam",
    ur: "Urdu",
    or: "Odia",
    as: "Assamese",
  };

  const getAvailableLanguages = (questions) => {
    const availableLangs = new Set(["en"]);

    questions.forEach((question) => {
      if (question.translations) {
        Object.keys(question.translations).forEach((lang) => {
          availableLangs.add(lang);
        });
      }
    });

    return Object.fromEntries(
      Object.entries(LANGUAGES).filter(([code]) => availableLangs.has(code))
    );
  };

  const getTranslatedContent = (item, field, language, ip) => {
    if (!item) return "";
    const content =
      language === "en"
        ? item[field]
        : item.translations?.[language] || item[field];
    return replaceBaseUrl(content, ip);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true, // Show the header
          gestureEnabled: false,
          headerTitle: () =>
            sscLogo ? (
              <Image
                source={{
                  uri: replaceBaseUrl(sscLogo, ip),
                }}
                style={{ width: 120, height: 40, resizeMode: "contain" }}
              />
            ) : (
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>Exam</Text>
            ),
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: "#ffffff", // Optional: Set background color
          },
          headerBackVisible: false,
        }}
      />

      {hasPermissions &&
        (isCandidatePhotosRequired || isCandidateVideoRequired) && (
          <CameraView
            ref={cameraRef}
            facing="front"
            mode={cameraMode}
            className="h-0 w-0"
            onCameraReady={() => {
              console.log("Camera Ready in mode:", cameraMode);
              setIsCameraReady(true);
            }}
            onError={(error) => {
              console.error("Camera Error:", error);
              setIsCameraReady(false);
            }}
            onFacesDetected={({ faces }) => {
              setFaceDetected(faces.length > 0);
            }}
            faceDetectorSettings={{
              mode: FaceDetector.FaceDetectorMode.fast,
              detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
              runClassifications: FaceDetector.FaceDetectorClassifications.none,
              minDetectionInterval: 1000,
              tracking: true,
            }}
          />
        )}

      <ScrollView className="flex-1 p-4">
        <View className="flex-row items-center justify-between mb-4 gap-4">
          <View className="flex-1 w-[48%] bg-gray-50 rounded-md">
            <Picker
              selectedValue={selectedLanguage}
              onValueChange={setSelectedLanguage}
            >
              {Object.entries(getAvailableLanguages(questions)).map(
                ([code, name]) => (
                  <Picker.Item key={code} label={name} value={code} />
                )
              )}
            </Picker>
          </View>

          <View className="flex-1 w-[48%] bg-blue-100 p-3 rounded-md">
            <Text className="text-center text-xl font-bold text-blue-800">
              Time Left: {formatTime(timeRemaining)}
            </Text>
          </View>
        </View>
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-2">
            <View
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.answered }}
            />
            <Text className="text-sm text-gray-600">Attempted</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.default }}
            />
            <Text className="text-sm text-gray-600">Unattempted</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.markForReview }}
            />
            <Text className="text-sm text-gray-600">Reviewed</Text>
          </View>
        </View>
        <ScrollView className="flex-1 bg-gray-50 p-4 rounded-md mb-4">
          {questions[currentQuestion] && (
            <>
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-xl font-bold text-gray-800">
                      Q. {currentQuestion + 1} of {questions.length}
                    </Text>
                    <Text className="px-2 py-1 bg-blue-100 rounded-full text-blue-600 text-sm">
                      {questions[currentQuestion].marks} marks
                    </Text>
                    <Text className="px-2 py-1 bg-yellow-100 rounded-full text-yellow-600 text-sm">
                      {questions[currentQuestion].difficultyLevel}
                    </Text>
                  </View>
                </View>
                {questionStatus[currentQuestion] === "markForReview" ? (
                  <View className="bg-yellow-100 px-3 py-1 rounded-full">
                    <Text className="text-yellow-700 text-sm font-medium">
                      Marked for Review
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="mb-4">
                <HtmlRenderer
                  html={getTranslatedContent(
                    questions[currentQuestion],
                    "title",
                    selectedLanguage,
                    ip // Pass the IP to replace {{BASE_URL}}
                  )}
                  width={width - 40}
                />
              </View>

              <View className="space-y-3">
                {questions[currentQuestion].options.map((opt) => (
                  <Pressable
                    key={opt._id}
                    onPress={() => {
                      handleAnswer(questions[currentQuestion]._id, opt._id);
                      const newStatus = [...questionStatus];
                      newStatus[currentQuestion] = "answered";
                      setQuestionStatus(newStatus);
                    }}
                    className={`flex-row items-center p-4 rounded-lg border ${
                      answers[questions[currentQuestion]._id] === opt._id
                        ? "bg-blue-100 border-blue-500"
                        : "border-gray-200"
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                        answers[questions[currentQuestion]._id] === opt._id
                          ? "border-blue-500"
                          : "border-gray-400"
                      }`}
                    >
                      {answers[questions[currentQuestion]._id] === opt._id && (
                        <View className="w-3 h-3 rounded-full bg-blue-500" />
                      )}
                    </View>

                    <View className="flex-1">
                      <HtmlRenderer
                        html={getTranslatedContent(
                          opt,
                          "option",
                          selectedLanguage,
                          ip // Pass the IP to replace {{BASE_URL}}
                        )}
                        width={width - 80}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        <View className="flex-row justify-between items-center space-x-4 mt-5 mb-3">
          <Pressable
            onPress={handlePrev}
            disabled={currentQuestion === 0}
            className={`px-5 py-2.5 rounded-md ${
              currentQuestion === 0 ? "bg-gray-300" : "bg-blue-600"
            }`}
          >
            <Text className="text-white font-medium">Previous</Text>
          </Pressable>

          <Pressable
            onPress={handleMarkForReview}
            className={`px-5 py-2.5 rounded-md ${
              questionStatus[currentQuestion] === "markForReview"
                ? "bg-red-600"
                : "bg-yellow-600"
            }`}
          >
            <Text className="text-white font-medium">
              {questionStatus[currentQuestion] === "markForReview"
                ? "Unmark Review"
                : "Mark for Review"}
            </Text>
          </Pressable>

          {currentQuestion < questions.length - 1 ? (
            <Pressable
              onPress={handleNext}
              className="px-5 py-2.5 rounded-md bg-blue-600"
            >
              <Text className="text-white font-medium">Next</Text>
            </Pressable>
          ) : (
            <>
              {!isAllAnsweredAndNotMarkedForReview() ? (
                <Pressable
                  onPress={goToNextUnansweredOrMarked}
                  className="px-5 py-2.5 rounded-md bg-orange-600"
                >
                  <Text className="text-white font-medium">
                    Review Questions
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleSubmit}
                  className="px-5 py-2.5 rounded-md bg-green-600"
                >
                  <Text className="text-white font-medium">Submit</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
        <ScrollView
          horizontal={false}
          className="mb-4 border-b border-gray-200 pb-4"
          contentContainerStyle={{
            paddingBottom: 40,
          }}
        >
          <View
            className="flex-row gap-2 p-2"
            style={{
              flexWrap: "wrap",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {questions.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => setCurrentQuestion(index)}
                className={`w-10 h-10 rounded-full justify-center items-center ${
                  currentQuestion === index ? "border-2 border-blue-500" : ""
                }`}
                style={{
                  backgroundColor: STATUS_COLORS.default,
                  ...(currentQuestion === index && {
                    backgroundColor: STATUS_COLORS.current,
                  }),
                  ...(answers[questions[index]?._id] && {
                    backgroundColor: STATUS_COLORS.answered,
                  }),
                  ...(questionStatus[index] === "markForReview" && {
                    backgroundColor: STATUS_COLORS.markForReview,
                  }),
                }}
              >
                <Text className="text-white font-medium">{index + 1}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};
export default Exam;
