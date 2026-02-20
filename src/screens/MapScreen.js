import React, { useState, useEffect, useRef } from 'react';
import { View, Alert, TextInput, Text, TouchableOpacity, Platform, Dimensions, BackHandler } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { initialPosts } from '../../dummyData';
import { CustomMarker } from '../components/CustomMarker';
import { CreatePostModal } from '../components/modals/CreatePostModal';
import { ViewPostModal } from '../components/modals/ViewPostModal';
import { AddBoardPostModal } from '../components/modals/AddBoardPostModal';
import { styles } from '../styles/globalStyles';
import { customMapStyle } from '../styles/mapStyles';
import { INITIAL_REGION } from '../utils/constants';

const screenWidth = Dimensions.get('window').width;

export default function MapScreen() {
  const [myLocation, setMyLocation] = useState(null);
  
  // 게시물(점) 및 게시판 관련 상태
  const [posts, setPosts] = useState(initialPosts);
  const [modalVisible, setModalVisible] = useState(false);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [newPost, setNewPost] = useState({ coordinate: null, emoji: '📍', title: '', content: '', description: '', photo: null, type: 'post' });
  
  // 선택된 게시물 보기 상태
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');

  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('');

  // 게시판 관련 상태
  const [selectedBoardPost, setSelectedBoardPost] = useState(null);
  const [selectedBoardPostBoardId, setSelectedBoardPostBoardId] = useState(null);
  const [addBoardPostModalVisible, setAddBoardPostModalVisible] = useState(false);
  const [newBoardPost, setNewBoardPost] = useState({ emoji: '📝', title: '', content: '', photo: null });
  const [targetBoardId, setTargetBoardId] = useState(null);

  const locationSubscription = useRef(null);
  const mapRef = useRef(null);
  const mapRegionRef = useRef(INITIAL_REGION);

  const handleBackNavigation = () => {
    if (selectedBoardPost && selectedBoardPostBoardId) {
      setSelectedBoardPost(null);
      setSelectedBoardPostBoardId(null);
      setNewComment('');
      return true;
    }

    if (addBoardPostModalVisible) {
      setAddBoardPostModalVisible(false);
      setTargetBoardId(null);
      return true;
    }

    if (viewModalVisible) {
      setViewModalVisible(false);
      setSelectedBoardPost(null);
      setSelectedBoardPostBoardId(null);
      return true;
    }

    if (modalVisible) {
      setModalVisible(false);
      return true;
    }

    return false;
  };

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

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setNewPost({ ...newPost, photo: result.assets[0].uri });
    }
  };

  const handleSavePost = () => {
    if (newPost.type === 'post') {
      if (!newPost.title || !newPost.content) {
        Alert.alert('오류', '제목과 내용을 입력해주세요.');
        return;
      }
      setPosts([...posts, { ...newPost, id: Date.now().toString(), comments: [], createdAt: Date.now() }]);
    } else {
      if (!newPost.title || !newPost.description) {
        Alert.alert('오류', '스테이션 이름과 설명을 입력해주세요.');
        return;
      }
      setPosts([...posts, { ...newPost, id: Date.now().toString(), boardPosts: [], createdAt: Date.now() }]);
    }
    setModalVisible(false);
    setNewPost({ coordinate: null, emoji: '📍', title: '', content: '', description: '', photo: null, type: 'post' });
  };

  const handleAddComment = (postId) => {
    if (!newComment.trim()) return;
    
    const comment = {
      id: Date.now().toString(),
      text: newComment,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const updatedPost = { ...post, comments: [...(post.comments || []), comment] };
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(updatedPost);
        }
        return updatedPost;
      }
      return post;
    });

    setPosts(updatedPosts);
    setNewComment('');
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

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

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

  const handleAddBoardPostComment = (boardId, boardPostId) => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now().toString(),
      text: newComment,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedPosts = posts.map(p => {
      if (p.id === boardId) {
        const updatedBoardPosts = (p.boardPosts || []).map(bp => {
          if (bp.id === boardPostId) {
            const updatedBp = { ...bp, comments: [...(bp.comments || []), comment] };
            setSelectedBoardPost(updatedBp);
            return updatedBp;
          }
          return bp;
        });
        const updatedBoard = { ...p, boardPosts: updatedBoardPosts };
        setSelectedPost(updatedBoard);
        return updatedBoard;
      }
      return p;
    });

    setPosts(updatedPosts);
    setNewComment('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="스팟/스테이션 검색"
          placeholderTextColor="#8b8b8b"
          value={searchQuery}
          onChangeText={handleSearch}
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

      <CreatePostModal
        visible={modalVisible}
        onClose={() => handleBackNavigation()}
        newPost={newPost}
        setNewPost={setNewPost}
        onSave={handleSavePost}
        onPickImage={pickImage}
      />

      <ViewPostModal
        visible={viewModalVisible}
        onClose={() => handleBackNavigation()}
        viewablePosts={viewablePosts}
        posts={posts}
        safeInitialIndex={safeInitialIndex}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        selectedBoardPost={selectedBoardPost}
        setSelectedBoardPost={setSelectedBoardPost}
        selectedBoardPostBoardId={selectedBoardPostBoardId}
        setSelectedBoardPostBoardId={setSelectedBoardPostBoardId}
        newComment={newComment}
        setNewComment={setNewComment}
        handleAddComment={handleAddComment}
        handleAddBoardPostComment={handleAddBoardPostComment}
        setTargetBoardId={setTargetBoardId}
        setAddBoardPostModalVisible={setAddBoardPostModalVisible}
      />

      <AddBoardPostModal
        visible={addBoardPostModalVisible}
        onClose={() => handleBackNavigation()}
        newBoardPost={newBoardPost}
        setNewBoardPost={setNewBoardPost}
        targetBoardId={targetBoardId}
        setTargetBoardId={setTargetBoardId}
        posts={posts}
        setPosts={setPosts}
        setSelectedPost={setSelectedPost}
      />

    </View>
  );
}
