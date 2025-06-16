// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import { CameraView, useCameraPermissions } from "expo-camera";
import { replaceBaseUrl } from "../utils";
import { captureRef } from "react-native-view-shot";

const DocumentScreen = () => {
  const [userName, setUserName] = useState("");

  const [candidatePhoto, setCandidatePhoto] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationPermission, requestLocationPermission] =
    Location.useForegroundPermissions();
  const [permission, requestPermission] = useCameraPermissions();

  const [loading, setLoading] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [aadharPhoto, setAadharPhoto] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [batchDetails, setBatchDetails] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [timestamp, setTimestamp] = useState("");
  const candidateOverlayRef = useRef(null);
  const aadharOverlayRef = useRef(null);
  const { ip } = useLocalSearchParams();
  const router = useRouter();
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const name = await SecureStore.getItemAsync("name");
      if (name) setUserName(name);
    })();
  }, []);
  const fetchBatchDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const response = await axios.get(`${ip}/candidate/batch-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Batch Details:", response.data);
      setBatchDetails(response.data);
    } catch (error) {
      console.error("Batch Details Error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to fetch batch details"
      );
    }
  };
  useEffect(() => {
    fetchBatchDetails();
  }, []);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
      if (!locationPermission?.granted) {
        await requestLocationPermission();
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const locStatus = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === "granted" && locStatus.status === "granted");
    })();
  }, []);

  const capturePhoto = async () => {
    if (cameraRef.current && cameraReady) {
      setIsCapturing(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Location permission is required to capture coordinates."
          );
          setIsCapturing(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        setCandidatePhoto(photo.uri);
        setShowCamera(false);
        setLocation(currentLocation);

        // Set timestamp
        const now = new Date().toLocaleString();
        setTimestamp(now);

        // Wait for overlay to render
        await new Promise((res) => setTimeout(res, 500));

        // Capture overlay view as image
        const capturedUri = await captureRef(candidateOverlayRef, {
          format: "jpg",
          quality: 0.8,
        });

        setCandidatePhoto(capturedUri);

        Alert.alert("Success", "Location Captured Successfully");
      } catch (error) {
        console.error("Capture Error:", error);
        Alert.alert("Error", "Failed to capture photo");
      } finally {
        setIsCapturing(false);
      }
    }
  };

  if (!permission || !locationPermission) {
    return (
      <View>
        <Text>Requesting permissions...</Text>
      </View>
    );
  }
  if (!permission.granted || !locationPermission.granted) {
    return (
      <View>
        <Text>No access to camera or location</Text>
      </View>
    );
  }
  const captureAadharPhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        cameraType: ImagePicker.CameraType.back,
        quality: 0.7,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        setAadharPhoto(result.assets[0].uri);
        setAadharFile(null);

        // Set timestamp
        const now = new Date().toLocaleString();
        setTimestamp(now);

        // Wait for overlay to render
        await new Promise((res) => setTimeout(res, 500));

        // Capture overlay view as image
        const capturedUri = await captureRef(aadharOverlayRef, {
          format: "jpg",
          quality: 0.8,
        });

        setAadharPhoto(capturedUri);
      }
    } catch (error) {
      console.error("Aadhar Photo Error:", error);
      Alert.alert("Error", "Failed to capture Aadhar photo");
    }
  };

  const pickAadhar = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setAadharFile(result.assets[0]);
      }
    } catch (error) {
      console.error("Aadhar Upload Error:", error);
      Alert.alert("Error", "Failed to upload Aadhar");
    }
  };

  const handleSubmit = async () => {
    if (!candidatePhoto || (!aadharFile && !aadharPhoto) || !location) {
      Alert.alert("Error", "Please complete all steps first");
      return;
    }

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const formData = new FormData();

      const selfieExt = candidatePhoto.split(".").pop() || "jpg";
      console.log("Adding selfie:", { uri: candidatePhoto, ext: selfieExt });
      formData.append("selfie", {
        uri: candidatePhoto,
        type: `image/${selfieExt}`,
        name: `selfie.${selfieExt}`,
      });

      if (aadharPhoto) {
        const aadharExt = aadharPhoto.split(".").pop() || "jpg";
        console.log("Adding Aadhar photo:", {
          uri: aadharPhoto,
          ext: aadharExt,
        });
        formData.append("adhar", {
          uri: aadharPhoto,
          type: `image/${aadharExt}`,
          name: `aadhar.${aadharExt}`,
        });
      } else if (aadharFile) {
        console.log("Adding Aadhar file:", aadharFile);
        formData.append("adhar", {
          uri: aadharFile.uri,
          type: aadharFile.mimeType || "image/jpeg",
          name: aadharFile.name,
        });
      }

      console.log("Adding location:", location.coords);
      formData.append(
        "location",
        JSON.stringify({
          lat: location.coords.latitude,
          long: location.coords.longitude,
        })
      );

      console.log(
        "Sending request to:",
        `${ip}/candidate/upload-onboarding-evidences`
      );

      const response = await axios.post(
        `${ip}/candidate/upload-onboarding-evidences`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response.status === 200) {
        router.push({
          pathname: "/exam",
          params: {
            examType: "theory",
            ip: ip,
            duration: batchDetails?.durationInMin,
            isCandidatePhotosRequired: batchDetails?.isCandidatePhotosRequired,
            isCandidateVideoRequired: batchDetails?.isCandidateVideoRequired,
            isSuspiciousActivityDetectionRequired:
              batchDetails?.isSuspiciousActivityDetectionRequired,
            sscLogo: batchDetails?.sscLogo,
          },
        });
      }
    } catch (error) {
      console.error("Upload Error:", error.response.data.error);
      Alert.alert("Error", error.response.data.error);
    } finally {
      setLoading(false);
    }
  };

  const isReady = candidatePhoto && location && (aadharPhoto || aadharFile);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Document Verification",
          headerTitle: () =>
            batchDetails?.sscLogo ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Image
                  source={require("../assets/images/demorgia.png")}
                  style={{ width: 80, height: 40, resizeMode: "contain" }}
                />
                <Image
                  source={{
                    uri: replaceBaseUrl(batchDetails.sscLogo, ip),
                  }}
                  style={{ width: 60, height: 40, resizeMode: "contain" }}
                />
                <Image
                  source={require("../assets/images/skill-india.png")}
                  style={{ width: 60, height: 40, resizeMode: "contain" }}
                />
              </View>
            ) : (
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                Document Verification
              </Text>
            ),
          headerTitleAlign: "center",
        }}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-gray-600">Uploading documents...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 py-5 space-y-8">
          <Text className="text-lg font-semibold text-center">
            Welcome,{" "}
            <Text className="text-green-700">{userName || "Candidate"}!</Text>
          </Text>
          <Text className="text-2xl font-bold text-center">
            Document Verification
          </Text>

          <View className="items-center space-y-4">
            <Text className="text-sm text-gray-700 text-center mt-4">
              Please capture your photo for identity verification.
            </Text>
            {showCamera ? (
              <CameraView
                ref={cameraRef}
                facing="front"
                style={{ width: "100%", height: 400 }}
                onCameraReady={() => setCameraReady(true)}
                enableZoomGesture
              >
                <View className="flex-1 justify-end items-center pb-6">
                  <Pressable
                    onPress={capturePhoto}
                    disabled={isCapturing}
                    className={`px-6 py-3 rounded-full ${
                      isCapturing ? "bg-gray-400" : "bg-blue-600"
                    }`}
                  >
                    <Text className="text-white font-medium">
                      {isCapturing ? "Capturing..." : "Take Photo"}
                    </Text>
                  </Pressable>
                </View>
              </CameraView>
            ) : candidatePhoto ? (
              <View className="items-center mt-4">
                <Image
                  source={{ uri: candidatePhoto }}
                  className="w-60 h-40 rounded-xl"
                />
                <Pressable
                  onPress={() => {
                    setCandidatePhoto(null);
                    setShowCamera(true);
                  }}
                  className="bg-red-600 px-6 py-3 mt-2 rounded-full"
                >
                  <Text className="text-white font-medium">Retake Photo</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowCamera(true)}
                className="bg-blue-600 px-6 py-3 mt-2 rounded-full"
              >
                <Text className="text-white font-medium">Capture Photo</Text>
              </Pressable>
            )}
          </View>

          <View className="items-center gap-4">
            <Text className="text-sm text-gray-700 text-center mt-4">
              Please upload or capture your Aadhar card image.
            </Text>
            {aadharPhoto || aadharFile ? (
              <View className="items-center space-y-1">
                <Image
                  source={{ uri: aadharPhoto || aadharFile.uri }}
                  className="w-60 h-40 rounded-xl"
                />
                <Pressable
                  onPress={() => {
                    setAadharPhoto(null);
                    setAadharFile(null);
                  }}
                  className="bg-red-600 px-6 py-3 mt-2 rounded-full"
                >
                  <Text className="text-white font-medium">Retake Aadhar</Text>
                </Pressable>
              </View>
            ) : (
              <View className="gap-y-4">
                <Pressable
                  onPress={captureAadharPhoto}
                  className="bg-blue-600 px-6 py-3 rounded-full"
                >
                  <Text className="text-white font-medium">Capture Aadhar</Text>
                </Pressable>

                <Text className="text-sm text-gray-700 text-center">OR</Text>
                <Pressable
                  onPress={pickAadhar}
                  className="bg-blue-600 px-6 py-3 rounded-full"
                >
                  <Text className="text-white font-medium">Upload Aadhar</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View className="mt-10">
            <Text className="text-sm text-gray-600 text-center px-4 mb-6">
              Once you've uploaded both documents, start the exam.
            </Text>

            <View className="flex-row justify-between gap-4 px-4 mb-10">
              <Pressable
                onPress={async () => {
                  await handleSubmit();
                }}
                disabled={!isReady}
                className={`flex-1 py-3 rounded-md ${
                  isReady ? "bg-blue-600" : "bg-gray-400"
                }`}
              >
                <Text className="text-white text-lg font-bold text-center">
                  Start Theory
                </Text>
              </Pressable>

              {batchDetails?.isPracticalVisibleToCandidate && (
                <Pressable
                  onPress={() => {
                    router.push({
                      pathname: "/exam",
                      params: {
                        examType: "practical",
                        ip: ip,
                        duration: batchDetails.durationInMin,
                        isCandidatePhotosRequired:
                          batchDetails?.isCandidatePhotosRequired,
                        isCandidateVideoRequired:
                          batchDetails?.isCandidateVideoRequired,
                        isSuspiciousActivityDetectionRequired:
                          batchDetails?.isSuspiciousActivityDetectionRequired,
                        sscLogo: batchDetails?.sscLogo,
                      },
                    });
                  }}
                  disabled={!isReady}
                  className={`flex-1 py-3 rounded-md ${
                    isReady ? "bg-green-600" : "bg-gray-400"
                  }`}
                >
                  <Text className="text-white text-lg font-bold text-center">
                    Start Practical
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      <View
        ref={candidateOverlayRef}
        collapsable={false}
        style={{
          position: "absolute",
          left: -9999,
          width: 300,
          height: 400,
          backgroundColor: "#000",
        }}
      >
        {candidatePhoto && (
          <>
            <Image
              source={{ uri: candidatePhoto }}
              style={{ width: "100%", height: "100%" }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                backgroundColor: "rgba(0,0,0,0.6)",
                padding: 6,
                borderRadius: 5,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12 }}>{timestamp}</Text>
            </View>
          </>
        )}
      </View>

      <View
        ref={aadharOverlayRef}
        collapsable={false}
        style={{
          position: "absolute",
          left: -9999,
          width: 300,
          height: 400,
          backgroundColor: "#000",
        }}
      >
        {aadharPhoto && (
          <>
            <Image
              source={{ uri: aadharPhoto }}
              style={{ width: "100%", height: "100%" }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                backgroundColor: "rgba(0,0,0,0.6)",
                padding: 6,
                borderRadius: 5,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12 }}>{timestamp}</Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default DocumentScreen;
