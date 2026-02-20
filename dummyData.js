export const initialPosts = [
  { id: 'd1', type: 'post', coordinate: { latitude: 37.471, longitude: 126.935 }, emoji: '🐟', title: '붕어빵 트럭 등장!', content: '슈크림 붕어빵 3개 2천원입니다. 줄 길어요!', createdAt: Date.now() - 100000, comments: [] },
  { id: 'd2', type: 'post', coordinate: { latitude: 37.469, longitude: 126.933 }, emoji: '🎸', title: '도림천 버스킹 중', content: '노래 엄청 잘 부르시네요. 구경 오세요~', createdAt: Date.now() - 300000, comments: [] },
  { id: 'd3', type: 'post', coordinate: { latitude: 37.472, longitude: 126.936 }, emoji: '🌧️', title: '갑자기 소나기', content: '우산 챙기세요! 갑자기 비가 쏟아집니다.', photo: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400', createdAt: Date.now() - 500000, comments: [] },
  { id: 'd4', type: 'post', coordinate: { latitude: 37.468, longitude: 126.934 }, emoji: '🐈', title: '고양이 찾아요', content: '노란색 치즈냥이 사람 손 엄청 잘 타요.', photo: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400', createdAt: Date.now() - 700000, comments: [] },
  { id: 'd5', type: 'post', coordinate: { latitude: 37.470, longitude: 126.937 }, emoji: '🚨', title: '사거리 교통사고', content: '차량 두 대 접촉사고 났어요. 차 많이 막힙니다.', photo: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=400', createdAt: Date.now() - 200000, comments: [] },
  { id: 'd6', type: 'post', coordinate: { latitude: 37.473, longitude: 126.932 }, emoji: '🎉', title: '편의점 마감세일', content: '도시락 반값 할인 중입니다. 빨리 오세요!', createdAt: Date.now() - 400000, comments: [] },
  { id: 'd7', type: 'post', coordinate: { latitude: 37.467, longitude: 126.938 }, emoji: '🔥', title: '불난 것 같아요', content: '저기 연기 엄청 나는데 119 불렀나요?', photo: 'https://images.unsplash.com/photo-1495556650867-99590cea3657?w=400', createdAt: Date.now() - 800000, comments: [] },
  { id: 'd8', type: 'post', coordinate: { latitude: 37.474, longitude: 126.935 }, emoji: '🎬', title: '드라마 촬영 중', content: '유명 배우 온 것 같아요. 사람 엄청 많음.', photo: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400', createdAt: Date.now() - 150000, comments: [] },
  { id: 'd9', type: 'post', coordinate: { latitude: 37.471, longitude: 126.931 }, emoji: '🚚', title: '이사차량 길막', content: '골목길 이사차량 때문에 못 지나갑니다. 우회하세요.', photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400', createdAt: Date.now() - 600000, comments: [] },
  { id: 'd10', type: 'post', coordinate: { latitude: 37.469, longitude: 126.939 }, emoji: '🌈', title: '무지개 떴어요', content: '하늘 보세요! 쌍무지개 떴습니다.', createdAt: Date.now() - 50000, comments: [] },
  { id: 'b1', type: 'board', coordinate: { latitude: 37.475, longitude: 126.936 }, emoji: '🏪', title: '동네 마트 소식', description: '매일매일 할인 정보가 올라옵니다!', createdAt: Date.now(), boardPosts: [
    { id: 'bp1', title: '오늘의 특가', content: '계란 한 판 4,000원!', createdAt: Date.now() - 100000, comments: [] },
    { id: 'bp1-2', title: '[테스트] 라면 행사', content: '봉지라면 5+1 행사 중입니다.', createdAt: Date.now() - 90000, comments: [] },
    { id: 'bp1-3', title: '[테스트] 과일 코너', content: '딸기/사과 시식 가능합니다.', createdAt: Date.now() - 80000, comments: [] },
    { id: 'bp1-4', title: '[테스트] 마감 임박', content: '유통기한 임박 상품 할인 중!', createdAt: Date.now() - 70000, comments: [] }
  ] },
  { id: 'b2', type: 'board', coordinate: { latitude: 37.465, longitude: 126.930 }, emoji: '☕', title: '카페 코딩', description: '조용하게 코딩하기 좋은 카페입니다. 오늘의 원두 라인업 공유해요.', createdAt: Date.now() - 86400000, boardPosts: [
    { id: 'bp2', title: '에티오피아 예가체프 입고', content: '산미 있는 커피 좋아하시는 분들 오세요!', createdAt: Date.now() - 50000, comments: [] },
    { id: 'bp2-2', title: '[테스트] 콘센트 좌석', content: '창가쪽 콘센트 좌석 3자리 비었습니다.', createdAt: Date.now() - 40000, comments: [] }
  ] },
  { id: 'b3', type: 'board', coordinate: { latitude: 37.478, longitude: 126.940 }, emoji: '🏋️', title: '득근 헬스장', description: '오운완 인증하고 정보 공유하는 스테이션', createdAt: Date.now() - 172800000, boardPosts: [
    { id: 'bp3', title: '오늘 하체 루틴', content: '스쿼트 100kg 달성했습니다.', createdAt: Date.now() - 200000, comments: [] },
    { id: 'bp3-2', title: '[테스트] PT 공지', content: '저녁 7시 그룹 PT 1자리 남음.', createdAt: Date.now() - 180000, comments: [] }
  ] },
  { id: 'd11', type: 'post', coordinate: { latitude: 37.476, longitude: 126.932 }, emoji: '🌸', title: '벚꽃 만개', content: '공원에 벚꽃이 예쁘게 피었어요. 사진 찍기 좋아요.', createdAt: Date.now() - 120000, comments: [] },
  { id: 'd12', type: 'post', coordinate: { latitude: 37.466, longitude: 126.935 }, emoji: '🍔', title: '수제버거 푸드트럭', content: '치즈버거 진짜 맛있어요. 한정수량 판매중!', createdAt: Date.now() - 450000, comments: [] },
  { id: 'd13', type: 'post', coordinate: { latitude: 37.472, longitude: 126.930 }, emoji: '⚽', title: '풋살 인원 모집', content: '오늘 저녁 8시 풋살 하실 분 2명 구합니다.', createdAt: Date.now() - 30000, comments: [] },
  { id: 'b4', type: 'board', coordinate: { latitude: 37.470, longitude: 126.942 }, emoji: '📚', title: '동네 도서관', description: '새로 들어온 신간 도서와 독서 모임 정보를 나눕니다.', createdAt: Date.now() - 259200000, boardPosts: [
    { id: 'bp4', title: '이번 주 신간', content: '베스트셀러 소설 3권 입고되었습니다.', createdAt: Date.now() - 10000, comments: [] },
    { id: 'bp4-2', title: '[테스트] 열람실 공지', content: '주말 운영시간 연장되었습니다.', createdAt: Date.now() - 9000, comments: [] }
  ] },
  { id: 'd14', type: 'post', coordinate: { latitude: 37.468, longitude: 126.938 }, emoji: '🎸', title: '기타 줄 끊어짐', content: '혹시 근처에 통기타 1번줄 파는 곳 아시나요?', createdAt: Date.now() - 600000, comments: [] },
  { id: 'b5', type: 'board', coordinate: { latitude: 37.474, longitude: 126.933 }, emoji: '🐾', title: '댕댕이 산책 모임', description: '강아지 산책 친구 구하는 스테이션입니다.', createdAt: Date.now() - 50000000, boardPosts: [
    { id: 'bp5', title: '오늘 저녁 산책', content: '보라매공원 쪽으로 같이 도실 분?', createdAt: Date.now() - 20000, comments: [] },
    { id: 'bp5-2', title: '[테스트] 산책 코스 추천', content: '도림천 코스가 강아지들 반응이 좋아요.', createdAt: Date.now() - 15000, comments: [] }
  ] },
  { id: 'd15', type: 'post', coordinate: { latitude: 37.477, longitude: 126.937 }, emoji: '🍦', title: '아이스크림 할인', content: '아이스크림 전품목 50% 세일합니다!', createdAt: Date.now() - 80000, comments: [] },
];
