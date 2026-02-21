import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { AuthModal } from "../components/modals/AuthModal";
import { CustomMarker } from "../components/CustomMarker";
import { styles } from "../styles/globalStyles";
import { customMapStyle } from "../styles/mapStyles";
import { useMapStore } from "../store/useMapStore";
import { useAuthStore } from "../store/useAuthStore";
import { Board, Coordinate } from "../types/map";
import { INITIAL_REGION } from "../utils/constants";

export default function MapScreen() {
  const [myLocation, setMyLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const isIOS = Platform.OS === "ios";

  const {
    boards,
    isLoadingBoards,
    boardsLoadError,
    loadBoards,
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
  const { token } = useAuthStore();
  const isAuthenticated = Boolean(token);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const mapRegionRef = useRef<Region>(INITIAL_REGION);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    if (!boardsLoadError) return;
    Alert.alert("매장 데이터 안내", boardsLoadError);
  }, [boardsLoadError]);

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
      if (authModalVisible) {
        setAuthModalVisible(false);
        return true;
      }
      return handleBackNavigation();
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onHardwareBackPress);

    return () => subscription.remove();
  }, [authModalVisible, viewModalVisible, myActivitiesModalVisible, handleBackNavigation]);

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
      setAuthModalVisible(true);
      return;
    }
    setMyActivitiesModalVisible(true);
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
      {isLoadingBoards ? (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingOverlayText}>매장/미션 불러오는 중...</Text>
        </View>
      ) : null}

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

      <TouchableOpacity style={styles.authFloatingButton} onPress={() => setAuthModalVisible(true)}>
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
      <AuthModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} />
    </View>
  );
}
