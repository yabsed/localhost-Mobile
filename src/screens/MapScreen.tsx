import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
  ViewabilityConfig,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { Marker, Region } from "react-native-maps";

import { ViewPostModal } from "../components/modals/ViewPostModal";
import { MyActivitiesModal } from "../components/modals/MyActivitiesModal";
import { CustomMarker } from "../components/CustomMarker";
import { styles } from "../styles/globalStyles";
import { customMapStyle } from "../styles/mapStyles";
import { useMapStore } from "../store/useMapStore";
import { useAuthStore } from "../store/useAuthStore";
import { Board, Coordinate } from "../types/map";
import { INITIAL_REGION } from "../utils/constants";

export default function MapScreen() {
  const [myLocation, setMyLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordConfirmInput, setPasswordConfirmInput] = useState("");
  const [authPanelVisible, setAuthPanelVisible] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const isIOS = Platform.OS === "ios";

  const {
    boards,
    selectedBoard,
    viewModalVisible,
    searchQuery,
    myActivitiesModalVisible,
    setSelectedBoard,
    setViewModalVisible,
    setSearchQuery,
    setMyActivitiesModalVisible,
    handleBackNavigation,
  } = useMapStore();
  const { token, role, username, isLoading, login, signup, logout } = useAuthStore();
  const isAuthenticated = Boolean(token);
  const authPanelTranslateX = useRef(new Animated.Value(360)).current;

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const mapRegionRef = useRef<Region>(INITIAL_REGION);

  useEffect(() => {
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("위치 권한 필요", "위치 권한을 허용해주세요.");
        return;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (loc) => {
          setMyLocation(loc.coords);
        },
      );
    };

    void startTracking();

    return () => {
      locationSubscription.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onHardwareBackPress = () => {
      if (authPanelVisible) {
        setAuthPanelVisible(false);
        return true;
      }
      return handleBackNavigation();
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onHardwareBackPress);

    return () => subscription.remove();
  }, [authPanelVisible, viewModalVisible, myActivitiesModalVisible, handleBackNavigation]);

  useEffect(() => {
    Animated.timing(authPanelTranslateX, {
      toValue: authPanelVisible ? 0 : 360,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [authPanelVisible, authPanelTranslateX]);

  const handleMarkerPress = (board: Board) => {
    setSelectedBoard(board);
    setViewModalVisible(true);
    const { latitudeDelta, longitudeDelta } = mapRegionRef.current;
    mapRef.current?.animateToRegion(
      {
        latitude: board.coordinate.latitude,
        longitude: board.coordinate.longitude,
        latitudeDelta,
        longitudeDelta,
      },
      500,
    );
  };

  const openBoardActivities = (board: Board) => {
    setSearchQuery("");
    setSelectedBoard(board);
    setMyActivitiesModalVisible(false);
    setViewModalVisible(true);

    const { latitudeDelta, longitudeDelta } = mapRegionRef.current;
    mapRef.current?.animateToRegion(
      {
        latitude: board.coordinate.latitude,
        longitude: board.coordinate.longitude,
        latitudeDelta,
        longitudeDelta,
      },
      500,
    );
  };

  const openParticipatedStoreList = () => {
    if (!isAuthenticated) {
      Alert.alert("로그인 필요", "참여 기록은 로그인 후 확인할 수 있어요.");
      return;
    }
    setMyActivitiesModalVisible(true);
  };

  const handleAuthSubmit = async () => {
    if (authMode === "signup" && passwordInput !== passwordConfirmInput) {
      Alert.alert("회원가입 실패", "비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      if (authMode === "login") {
        await login(usernameInput, passwordInput);
      } else {
        await signup(usernameInput, passwordInput);
      }
      setPasswordInput("");
      setPasswordConfirmInput("");
      setAuthPanelVisible(false);
      Alert.alert(authMode === "login" ? "로그인 완료" : "회원가입 완료", "정상적으로 처리되었습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "처리에 실패했습니다.";
      Alert.alert(authMode === "login" ? "로그인 실패" : "회원가입 실패", message);
    }
  };

  const handleLogout = () => {
    logout();
    setPasswordInput("");
    setPasswordConfirmInput("");
    Alert.alert("로그아웃 완료", "로그아웃되었습니다.");
  };

  const openBoardFromMyActivities = (boardId: string) => {
    const board = boards.find((item) => item.id === boardId);
    if (!board) {
      Alert.alert("가게 찾기 실패", "해당 가게를 찾지 못했어요.");
      return;
    }

    openBoardActivities(board);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<ViewToken<Board>> }) => {
    const first = viewableItems[0]?.item;
    if (!first) return;
    setSelectedBoard(first);
    const { latitudeDelta, longitudeDelta } = mapRegionRef.current;
    mapRef.current?.animateToRegion(
      {
        latitude: first.coordinate.latitude,
        longitude: first.coordinate.longitude,
        latitudeDelta,
        longitudeDelta,
      },
      500,
    );
  }).current;

  const filteredBoards = boards.filter((board) => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return true;

    const boardTextMatch =
      board.title.toLowerCase().includes(keyword) || board.description.toLowerCase().includes(keyword);
    if (boardTextMatch) return true;

    return board.missions.some(
      (mission) =>
        mission.title.toLowerCase().includes(keyword) || mission.description.toLowerCase().includes(keyword),
    );
  });

  const selectedBoardIndex = selectedBoard ? filteredBoards.findIndex((board) => board.id === selectedBoard.id) : 0;
  const safeInitialIndex = selectedBoardIndex >= 0 ? selectedBoardIndex : 0;
  const viewableBoards = filteredBoards;
  const viewabilityConfig = useRef<ViewabilityConfig>({ itemVisiblePercentThreshold: 50 }).current;

  const currentCoordinate: Coordinate | null = myLocation
    ? { latitude: myLocation.latitude, longitude: myLocation.longitude }
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="게시판/활동 검색"
          placeholderTextColor="#8b8b8b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <Animated.View style={[styles.authSlidePanel, { transform: [{ translateX: authPanelTranslateX }] }]}>
        {!isAuthenticated ? (
          <View>
            <View style={styles.authModeTabs}>
              <TouchableOpacity
                style={[styles.authModeTab, authMode === "login" ? styles.authModeTabActive : null]}
                onPress={() => setAuthMode("login")}
              >
                <Text style={[styles.authModeTabText, authMode === "login" ? styles.authModeTabTextActive : null]}>
                  로그인
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authModeTab, authMode === "signup" ? styles.authModeTabActive : null]}
                onPress={() => setAuthMode("signup")}
              >
                <Text style={[styles.authModeTabText, authMode === "signup" ? styles.authModeTabTextActive : null]}>
                  회원가입
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.authInput}
              placeholder="아이디"
              placeholderTextColor="#8b8b8b"
              autoCapitalize="none"
              autoCorrect={false}
              value={usernameInput}
              onChangeText={setUsernameInput}
            />
            <TextInput
              style={styles.authInput}
              placeholder="비밀번호"
              placeholderTextColor="#8b8b8b"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={passwordInput}
              onChangeText={setPasswordInput}
            />
            {authMode === "signup" ? (
              <TextInput
                style={styles.authInput}
                placeholder="비밀번호 확인"
                placeholderTextColor="#8b8b8b"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                value={passwordConfirmInput}
                onChangeText={setPasswordConfirmInput}
              />
            ) : null}
            <TouchableOpacity
              style={[styles.authSubmitButton, isLoading ? styles.authSubmitButtonDisabled : null]}
              disabled={isLoading}
              onPress={() => {
                void handleAuthSubmit();
              }}
            >
              <Text style={styles.authSubmitButtonText}>
                {isLoading ? "처리 중..." : authMode === "login" ? "로그인" : "회원가입"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.authStatusCard}>
            <View>
              <Text style={styles.authStatusTitle}>로그인됨</Text>
              <Text style={styles.authStatusMeta}>
                {username ?? "사용자"} {role ? `(${role})` : ""}
              </Text>
            </View>
            <TouchableOpacity style={styles.authLogoutButton} onPress={handleLogout}>
              <Text style={styles.authLogoutButtonText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        mapType={isIOS ? "mutedStandard" : "standard"}
        showsPointsOfInterest={!isIOS}
        showsBuildings={!isIOS}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={(region) => {
          mapRegionRef.current = region;
        }}
        customMapStyle={customMapStyle}
      >
        {myLocation && (
          <Marker coordinate={{ latitude: myLocation.latitude, longitude: myLocation.longitude }} title="내 위치" />
        )}
        {filteredBoards.map((board) => (
          <CustomMarker key={board.id} post={board} onPress={() => handleMarkerPress(board)} />
        ))}
      </MapView>

      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={() => {
          if (!myLocation) return;
          const { latitudeDelta, longitudeDelta } = mapRegionRef.current;
          mapRef.current?.animateToRegion(
            {
              latitude: myLocation.latitude,
              longitude: myLocation.longitude,
              latitudeDelta,
              longitudeDelta,
            },
            400,
          );
        }}
      >
        <Ionicons name="locate" size={18} color="#0d6efd" />
        <Text style={styles.myLocationButtonText}>내 위치</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.authFloatingButton} onPress={() => setAuthPanelVisible((prev) => !prev)}>
        <Ionicons name={isAuthenticated ? "shield-checkmark" : "log-in"} size={18} color="white" />
        <Text style={styles.authFloatingButtonText}>{isAuthenticated ? "계정" : "인증"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.myActivitiesButton} onPress={openParticipatedStoreList}>
        <Ionicons name="person-circle" size={18} color="white" />
        <Text style={styles.myActivitiesButtonText}>참여 기록</Text>
      </TouchableOpacity>

      <ViewPostModal
        viewableBoards={viewableBoards}
        safeInitialIndex={safeInitialIndex}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        currentCoordinate={currentCoordinate}
      />

      <MyActivitiesModal onSelectStore={openBoardFromMyActivities} />
    </View>
  );
}
