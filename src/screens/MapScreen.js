import React, { useState, useEffect, useRef } from 'react';
import { View, Alert, TextInput, Text, TouchableOpacity, Platform, BackHandler } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { useMapStore } from '../store/useMapStore';
import { CustomMarker } from '../components/CustomMarker';
import { CreatePostModal } from '../components/modals/CreatePostModal';
import { ViewPostModal } from '../components/modals/ViewPostModal';
import { AddBoardPostModal } from '../components/modals/AddBoardPostModal';
import { styles } from '../styles/globalStyles';
import { customMapStyle } from '../styles/mapStyles';
import { INITIAL_REGION } from '../utils/constants';

export default function MapScreen() {
  const [myLocation, setMyLocation] = useState(null);
  
  const {
    posts,
    modalVisible,
    isAddingPost,
    newPost,
    selectedPost,
    viewModalVisible,
    searchQuery,
    selectedBoardPost,
    selectedBoardPostBoardId,
    addBoardPostModalVisible,
    setIsAddingPost,
    setNewPost,
    setSelectedPost,
    setViewModalVisible,
    setSearchQuery,
    setSelectedBoardPost,
    setSelectedBoardPostBoardId,
    handleBackNavigation,
    setModalVisible
  } = useMapStore();

  const locationSubscription = useRef(null);
  const mapRef = useRef(null);
  const mapRegionRef = useRef(INITIAL_REGION);

  useEffect(() => {
    startTracking();

    return () => {
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onHardwareBackPress = () => handleBackNavigation();

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, [selectedBoardPost, selectedBoardPostBoardId, addBoardPostModalVisible, viewModalVisible, modalVisible]);

  const startTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 거부', '위치 권한이 필요합니다.');
      return;
    }

    // 위치 추적 시작
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 1,
      },
      (loc) => {
        setMyLocation(loc.coords);
      }
    );
  };

  const handleMapPress = (e) => {
    if (isAddingPost) {
      setNewPost({ ...newPost, coordinate: e.nativeEvent.coordinate });
      setIsAddingPost(false);
      setModalVisible(true);
    }
  };

  const handleMarkerPress = (post) => {
    setSelectedPost(post);
    setSelectedBoardPost(null);
    setSelectedBoardPostBoardId(null);
    setViewModalVisible(true);
    const { latitudeDelta, longitudeDelta } = mapRegionRef.current;
    mapRef.current?.animateToRegion({
      latitude: post.coordinate.latitude,
      longitude: post.coordinate.longitude,
      latitudeDelta,
      longitudeDelta,
    }, 500);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const item = viewableItems[0].item;
      setSelectedPost(item);
      setSelectedBoardPost(null);
      setSelectedBoardPostBoardId(null);
      const { latitudeDelta, longitudeDelta } = mapRegionRef.current;
      mapRef.current?.animateToRegion({
        latitude: item.coordinate.latitude,
        longitude: item.coordinate.longitude,
        latitudeDelta,
        longitudeDelta,
      }, 500);
    }
  }).current;

  const filteredPosts = posts.filter(p => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return true;
    return (
      p.title.toLowerCase().includes(keyword) ||
      (p.content && p.content.toLowerCase().includes(keyword)) ||
      (p.description && p.description.toLowerCase().includes(keyword))
    );
  });

  const selectedPostIndexInFiltered = selectedPost
    ? filteredPosts.findIndex(p => p.id === selectedPost.id)
    : 0;

  const safeInitialIndex = selectedPostIndexInFiltered >= 0 ? selectedPostIndexInFiltered : 0;
  const viewablePosts = filteredPosts;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="스팟/스테이션 검색"
          placeholderTextColor="#8b8b8b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onPress={handleMapPress}
        onRegionChangeComplete={(region) => {
          mapRegionRef.current = region;
        }}
        customMapStyle={customMapStyle}
      >
        {myLocation && (
          <Marker
            coordinate={{ latitude: myLocation.latitude, longitude: myLocation.longitude }}
            title="내 위치"
          />
        )}
        {filteredPosts.map(post => (
          <CustomMarker
            key={post.id}
            post={post}
            onPress={() => handleMarkerPress(post)}
          />
        ))}
      </MapView>

      {isAddingPost && (
        <View style={styles.instructionBanner}>
          <Text style={styles.instructionText}>지도를 터치하여 점을 추가할 위치를 선택하세요</Text>
        </View>
      )}

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
            400
          );
        }}
      >
        <Ionicons name="locate" size={22} color="#0d6efd" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => setIsAddingPost(!isAddingPost)}
      >
        <Ionicons name={isAddingPost ? "close" : "add"} size={22} color="white" />
      </TouchableOpacity>

      <CreatePostModal />

      <ViewPostModal
        viewablePosts={viewablePosts}
        safeInitialIndex={safeInitialIndex}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      <AddBoardPostModal />

    </View>
  );
}
