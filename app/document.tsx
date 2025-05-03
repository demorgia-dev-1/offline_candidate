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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import { CameraView, useCameraPermissions } from "expo-camera";

const DocumentScreen = () => {
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

  const { ip } = useLocalSearchParams();
  const router = useRouter();
  const cameraRef = useRef(null);

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
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        setCandidatePhoto(photo.uri);
        setShowCamera(false);

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentLocation);

        Alert.alert(
          "Location Captured",
          `Latitude: ${currentLocation.coords.latitude.toFixed(
            4
          )}\nLongitude: ${currentLocation.coords.longitude.toFixed(4)}`
        );
      } catch (error) {
        console.error("Capture Error:", error);
        Alert.alert("Error", "Failed to capture photo");
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
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        setAadharPhoto(result.assets[0].uri);
        setAadharFile(null);
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

      Alert.alert("Success", "Documents uploaded successfully");
    } catch (error) {
      console.error("Upload Error:", error.response.data.error);
      Alert.alert("Error", error.response.data.error);
    } finally {
      setLoading(false);
    }
  };

  const isReady = candidatePhoto && (aadharPhoto || aadharFile);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ title: "Document Verification" }} />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-gray-600">Uploading documents...</Text>
        </View>
      ) : (
        <View className="flex-1 px-6 py-8 space-y-8">
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
                    className="bg-blue-600 px-6 py-3 rounded-full"
                  >
                    <Text className="text-white font-medium">Take Photo</Text>
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

          <View className="mt-20">
            <Text className="text-sm text-gray-600 text-center px-4 mb-6">
              Once you've uploaded both documents, start the exam.
            </Text>

            <View className="flex-row justify-between gap-4 px-4">
              <Pressable
                onPress={async () => {
                  await handleSubmit();
                  router.push({
                    pathname: "/exam",
                    params: {
                      examType: "theory",
                      ip: ip,
                      duration: batchDetails?.durationInMin,
                      isCandidatePhotosRequired:
                        batchDetails?.isCandidatePhotosRequired,
                      isCandidateVideoRequired:
                        batchDetails?.isCandidateVideoRequired,
                      isSuspiciousActivityDetectionRequired:
                        batchDetails?.isSuspiciousActivityDetectionRequired,
                    },
                  });
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
        </View>
      )}
    </SafeAreaView>
  );
};

export default DocumentScreen;
