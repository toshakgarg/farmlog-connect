import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Platform,
  StatusBar,
  BackHandler,
  Linking,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import * as Location from "expo-location";
import { Camera } from "expo-camera";

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_URL;

export default function App() {
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
        setHasPermissions(locationStatus === "granted" && cameraStatus === "granted");
      } else {
        setHasPermissions(true);
      }
    })();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // prevent default back button behavior
      }
      return false; // allow default (app exit)
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => {
      subscription.remove();
    };
  }, [canGoBack]);

  const onNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleShouldStartLoadWithRequest = (request: ShouldStartLoadRequest) => {
    if (!WEB_APP_URL) return false;

    // Only allow HTTPS or local dev environments
    if (
      !request.url.startsWith("https://") &&
      !request.url.startsWith("http://localhost") &&
      !request.url.startsWith("http://10.")
    ) {
      return false;
    }

    try {
      const requestUrl = new URL(request.url);
      const appUrl = new URL(WEB_APP_URL);

      // Prevent unauthorized access to arbitrary origins
      // If it's a different origin, attempt to open in the system browser
      if (requestUrl.hostname !== appUrl.hostname) {
        Linking.openURL(request.url).catch(() => {});
        return false;
      }
    } catch (e) {
      // Return false for invalid URLs
      return false;
    }

    return true;
  };

  if (!WEB_APP_URL || (!WEB_APP_URL.startsWith("https://") && !__DEV__)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Configuration Error</Text>
          <Text style={styles.errorText}>
            EXPO_PUBLIC_WEB_URL must be configured with a valid HTTPS URL.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermissions === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={{ marginTop: 10 }}>Requesting permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* @ts-expect-error React 19 typing compatibility for react-native-webview */}
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        onNavigationStateChange={onNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        )}
        renderError={(errorDomain: string, errorCode: number, errorDesc: string) => (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorText}>{errorDesc}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  webview: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 10,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
  },
});
