import Constants from "expo-constants";
import { Platform } from "react-native";

function getDevApiUrl(): string {
	const hostUri =
		Constants.expoConfig?.hostUri ??
		(Constants as any)?.manifest2?.extra?.expoClient?.hostUri ??
		(Constants as any)?.manifest?.debuggerHost;

	const host = typeof hostUri === "string" ? hostUri.split(":")[0] : undefined;

	if (host) {
		return `http://${host}:3000`;
	}

	return Platform.OS === "web" ? "http://localhost:3000" : "http://127.0.0.1:3000";
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || getDevApiUrl();
