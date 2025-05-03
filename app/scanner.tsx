// @ts-nocheck
import { Link, Stack, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  Dimensions,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { Camera, CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";

const WINDOW_HEIGHT = Dimensions.get("window").height;
const WINDOW_WIDTH = Dimensions.get("window").width;
const scannerSize = WINDOW_WIDTH * 0.7;

export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerIp, setScannerIp] = useState();
  const isPermissionGranted = Boolean(permission?.granted);
  const router = useRouter();

  useEffect(() => {
    if (!isPermissionGranted) {
      requestPermission();
    }
  }, []);

  const isValidUrl = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return (
        url.protocol === "http:" &&
        /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname) &&
        !isNaN(Number(url.port))
      );
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (scannerIp) {
      if (isValidUrl(scannerIp)) {
        router.push({
          pathname: "/candidate_login",
          params: { ip: scannerIp },
        });
      } else {
        Alert.alert(
          "Invalid URL",
          "Please scan a valid URL with format: http://IP:PORT",
          [{ text: "OK" }]
        );
      }
    }
  }, [scannerIp]);

  if (!isPermissionGranted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text className="text-xl">Camera permission not granted</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1">
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={(barcode) => {
            setScannerIp(barcode.data);
            console.log("Scanner IP:", scannerIp);
          }}
        />
        <View style={styles.overlay}>
          <View style={styles.unfilled} />
          <View style={styles.rowContainer}>
            <View style={styles.unfilled} />
            <View style={styles.scanner} />
            <View style={styles.unfilled} />
          </View>
          <View style={styles.unfilled} />
          <Text style={styles.text}>Position QR code within frame</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  camera: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    position: "absolute",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  unfilled: {
    flex: 1,
  },
  rowContainer: {
    flexDirection: "row",
    height: scannerSize,
  },
  scanner: {
    width: scannerSize,
    height: scannerSize,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "transparent",
  },
  text: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
});
