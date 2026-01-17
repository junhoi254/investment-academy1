import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ChatList.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace('http', 'ws');

// 오디오 컨텍스트 (전역)
let audioContext = null;
let audioEnabled = false;

// 오디오 활성화 (사용자 클릭 필요)
const enableAudio = () => {
  if (!audioEnabled) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      audioEnabled = true;
      console.log('🔊 오디오 활성화됨');
    } catch (e) {
      console.log('오디오 활성화 실패:', e);
    }
  }
};

// 사이렌 소리 생성 (Web Audio API)
const playAlertSound = () => {
  try {
    if (!audioContext || audioContext.state === 'suspended') {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // 사이렌 소리 (상승-하강 반복)
    const duration = 2;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    
    // 사이렌 주파수 변화
    const now = audioContext.currentTime;
    for (let i = 0; i < 4; i++) {
      oscillator.frequency.setValueAtTime(600, now + i * 0.5);
      oscillator.frequency.linearRampToValueAtTime(1000, now + i * 0.5 + 0.25);
      oscillator.frequency.linearRampToValueAtTime(600, now + i * 0.5 + 0.5);
    }
    
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
    
    console.log('🔊 사이렌 재생');
  } catch (e) {
    console.log('소리 재생 실패:', e);
  }
};

// 진동 (모바일)
const vibrate = (pattern = [200, 100, 200, 100, 200]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

// 브라우저 알림
const showNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '📈',
      tag: 'signal-alert',
      requireInteraction: true
    });
  }
};

// 기술적분석 교육 데이터
const EDUCATION_DATA = {
  beginner: {
    title: '초급',
    icon: '🌱',
    lessons: [
      { title: '캔들차트 기초', description: '양봉, 음봉의 의미와 해석법', content: '캔들차트는 시가, 고가, 저가, 종가를 한눈에 볼 수 있는 차트입니다. 양봉(상승)은 종가가 시가보다 높을 때, 음봉(하락)은 종가가 시가보다 낮을 때 형성됩니다.' },
      { title: '지지선과 저항선', description: '가격이 멈추는 구간 찾기', content: '지지선은 가격이 하락하다 멈추는 구간, 저항선은 가격이 상승하다 멈추는 구간입니다. 이 구간들은 매매의 중요한 기준점이 됩니다.' },
      { title: '추세선 그리기', description: '상승/하락 추세 파악하기', content: '추세선은 저점과 저점(상승추세) 또는 고점과 고점(하락추세)을 연결한 선입니다. 추세의 방향을 파악하는 기본 도구입니다.' },
      { title: '거래량 분석', description: '거래량과 가격의 관계', content: '거래량은 시장의 관심도를 나타냅니다. 가격 상승 + 거래량 증가는 강한 상승 신호, 가격 상승 + 거래량 감소는 약한 상승입니다.' },
      { title: '손절과 익절', description: '리스크 관리의 기초', content: '손절은 손실을 제한하고, 익절은 이익을 확정하는 것입니다. 진입 전에 반드시 손절 라인을 정해두세요.' },
    ]
  },
  intermediate: {
    title: '중급',
    icon: '🌿',
    lessons: [
      { title: '이동평균선 활용', description: 'MA, EMA 크로스 전략', content: '이동평균선(MA)은 일정 기간의 평균 가격입니다. 단기 MA가 장기 MA를 상향 돌파하면 골든크로스(매수), 하향 돌파하면 데드크로스(매도) 신호입니다.' },
      { title: 'RSI 지표', description: '과매수/과매도 구간 파악', content: 'RSI는 0-100 사이의 값으로 표시됩니다. 70 이상은 과매수(매도 고려), 30 이하는 과매도(매수 고려) 구간입니다.' },
      { title: 'MACD 지표', description: '추세의 강도와 방향 분석', content: 'MACD는 두 이동평균선의 차이를 나타냅니다. MACD선이 시그널선을 상향 돌파하면 매수, 하향 돌파하면 매도 신호입니다.' },
      { title: '볼린저 밴드', description: '변동성과 추세 분석', content: '볼린저 밴드는 이동평균선과 표준편차로 구성됩니다. 밴드가 좁아지면 큰 움직임 예고, 가격이 밴드를 벗어나면 과매수/과매도 신호입니다.' },
      { title: '피보나치 되돌림', description: '지지/저항 레벨 예측', content: '피보나치 비율(23.6%, 38.2%, 50%, 61.8%)은 가격 되돌림의 주요 레벨입니다. 추세 방향으로 진입할 때 활용합니다.' },
      { title: '다이버전스', description: '추세 반전 신호 포착', content: '가격은 신고가를 기록하는데 RSI/MACD가 신고가를 못 만들면 하락 다이버전스(매도), 반대는 상승 다이버전스(매수)입니다.' },
    ]
  },
  advanced: {
    title: '고급',
    icon: '🌳',
    lessons: [
      { title: '엘리어트 파동이론', description: '5파 상승, 3파 조정 패턴', content: '엘리어트 파동은 시장이 5개의 상승파(충격파)와 3개의 조정파로 움직인다는 이론입니다. 3파가 가장 강력한 상승을 보입니다.' },
      { title: '하모닉 패턴', description: 'AB=CD, 가틀리, 박쥐 패턴', content: '하모닉 패턴은 피보나치 비율을 기반으로 한 고급 패턴입니다. 정확한 진입점과 손절점을 제공합니다.' },
      { title: 'ICT 개념', description: 'Order Block, FVG, Liquidity', content: 'ICT(Inner Circle Trader) 개념은 기관의 매매 방식을 분석합니다. 유동성 확보(스탑헌팅) 후 진입하는 전략입니다.' },
      { title: '멀티타임프레임 분석', description: '큰 그림에서 작은 그림으로', content: '상위 타임프레임에서 방향을 정하고, 하위 타임프레임에서 진입점을 찾습니다. 예: 일봉 추세 → 4시간 구조 → 15분 진입' },
      { title: '포지션 사이징', description: '자금관리와 리스크 계산', content: '한 번 거래에 총 자금의 1-2%만 위험에 노출시킵니다. 레버리지를 고려한 정확한 포지션 크기 계산이 필수입니다.' },
      { title: '심리 관리', description: '감정 컨트롤과 매매 일지', content: '공포와 탐욕을 컨트롤하는 것이 가장 중요합니다. 매매 일지를 작성하고 자신의 패턴을 분석하세요.' },
    ]
  }
};

function ChatList({ user, onLogout }) {
  const navigate = useNavigate();
  const [freeRooms, setFreeRooms] = useState([]);
  const [paidRooms, setPaidRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  
  // 교육 섹션 상태
  const [showGlobalTrading, setShowGlobalTrading] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  
  // 시장 분석 상태
  const [marketData, setMarketData] = useState([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketUpdatedAt, setMarketUpdatedAt] = useState(null);
  
  // 알림 상태
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('signalSoundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [lastSignal, setLastSignal] = useState(null);
  const [showSignalPopup, setShowSignalPopup] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);  // 새 메시지 개수
  const [wsConnected, setWsConnected] = useState(false);  // 연결 상태
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // 페이지 클릭 시 오디오 활성화
  useEffect(() => {
    const handleClick = () => {
      enableAudio();
    };
    document.addEventListener('click', handleClick, { once: true });
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // 소리 설정 저장
  useEffect(() => {
    localStorage.setItem('signalSoundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 메시지 수신 처리
  const handleSignal = useCallback((data) => {
    console.log('📩 메시지 수신:', data);
    
    // 모든 메시지 카운트 증가
    setNewMessageCount(prev => prev + 1);
    
    // 시그널 메시지인지 확인 (시그널만 소리)
    const content = data.content || '';
    const isSignal = data.message_type === 'signal' || 
                     content.includes('BUY') || 
                     content.includes('SELL') ||
                     content.includes('OPEN') ||
                     content.includes('진입') ||
                     content.includes('포지션');
    
    // 시그널일 때만 팝업 + 소리
    if (isSignal) {
      setLastSignal({
        content,
        time: new Date().toLocaleTimeString('ko-KR'),
        room: data.room_name || '리딩방'
      });
      setShowSignalPopup(true);
      
      // 소리 또는 진동
      if (soundEnabled) {
        playAlertSound();
        showNotification('🚨 시그널 알림', content.substring(0, 100));
      } else {
        vibrate([200, 100, 200, 100, 200]);
      }
      
      // 5초 후 팝업 자동 닫기
      setTimeout(() => setShowSignalPopup(false), 5000);
    }
  }, [soundEnabled]);

  // WebSocket 연결 (유료방 시그널 수신)
  useEffect(() => {
    if (!user || !paidRooms.length) {
      console.log('⚠️ WebSocket 연결 불가: user=', !!user, 'paidRooms=', paidRooms.length);
      return;
    }
    
    const connectWebSocket = (roomId) => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      console.log('🔌 WebSocket 연결 시도:', roomId);
      const ws = new WebSocket(`${WS_URL}/ws/chat/${roomId}?token=${token}`);
      
      ws.onopen = () => {
        console.log('✅ WebSocket 연결됨');
        setWsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket 데이터:', data);
          
          // type이 message인 경우 처리
          if (data.type === 'message') {
            handleSignal({
              content: data.content,
              message_type: data.message_type,
              user_name: data.user_name,
              room_name: data.room_name
            });
          } else if (data.type === 'signal') {
            handleSignal({
              content: data.content,
              message_type: 'signal'
            });
          }
        } catch (e) {
          console.log('메시지 파싱 오류:', e);
        }
      };
      
      ws.onclose = () => {
        console.log('❌ WebSocket 연결 종료');
        setWsConnected(false);
        
        // 5초 후 재연결
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user && paidRooms.length) {
            wsRef.current = connectWebSocket(paidRooms[0].id);
          }
        }, 5000);
      };
      
      ws.onerror = (error) => {
        console.log('WebSocket 오류:', error);
        setWsConnected(false);
      };
      
      return ws;
    };
    
    // 첫 번째 유료방에 연결 (시그널 수신용)
    const firstPaidRoom = paidRooms[0];
    if (firstPaidRoom) {
      wsRef.current = connectWebSocket(firstPaidRoom.id);
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, paidRooms, handleSignal]);

  useEffect(() => {
    loadFreeRooms();
    if (user) {
      loadPaidRooms();
    }
  }, [user]);

  // 시장 분석 데이터 로드
  const loadMarketAnalysis = async () => {
    setMarketLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/market/analysis`);
      if (response.data.success) {
        setMarketData(response.data.data);
        setMarketUpdatedAt(response.data.updated_at);
      }
    } catch (error) {
      console.error('시장 분석 로딩 실패:', error);
    } finally {
      setMarketLoading(false);
    }
  };

  // 시장 분석 강제 갱신 (관리자)
  const refreshMarketAnalysis = async () => {
    if (!user || user.role !== 'admin') return;
    
    setMarketLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/market/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setMarketData(response.data.data);
        setMarketUpdatedAt(response.data.updated_at);
      }
    } catch (error) {
      console.error('시장 분석 갱신 실패:', error);
    } finally {
      setMarketLoading(false);
    }
  };

  const loadFreeRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rooms/free`);
      setFreeRooms(response.data);
    } catch (error) {
      console.error('무료방 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaidRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/rooms/paid`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setPaidRooms(response.data);
    } catch (error) {
      console.error('유료방 로딩 실패:', error);
    }
  };

  const handleRoomClick = (roomId, isFree) => {
    if (!isFree && !user) {
      setShowLogin(true);
      return;
    }
    navigate(`/chat/${roomId}`);
  };

  const handleThreadBoardClick = () => {
    if (!user || !(user.is_approved || user.role === 'admin' || user.role === 'staff')) {
      alert('승인된 회원만 이용할 수 있습니다.');
      return;
    }
    navigate('/threads');
  };

  const getRoomIcon = (roomType) => {
    const icons = {
      notice: '📢',
      stock: '📈',
      futures: '🌎',
      crypto: '₿'
    };
    return icons[roomType] || '💬';
  };

  const getDaysRemaining = () => {
    if (!user || !user.expiry_date) return null;
    
    const expiry = new Date(user.expiry_date);
    const now = new Date();
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    return diff > 0 ? diff : 0;
  };

  // 레벨 선택
  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
    setSelectedLesson(null);
  };

  // 레슨 선택
  const handleLessonSelect = (lesson) => {
    setSelectedLesson(selectedLesson?.title === lesson.title ? null : lesson);
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="chat-list-container">
      {/* 상단 알림 바 - 항상 표시 */}
      {user && (
        <div className="notification-bar">
          <div className="notification-bar-left">
            <button 
              className={`sound-toggle-btn ${soundEnabled ? 'on' : 'off'}`}
              onClick={() => {
                enableAudio();
                setSoundEnabled(!soundEnabled);
              }}
            >
              {soundEnabled ? '🔔 소리 ON' : '🔕 소리 OFF'}
            </button>
            <span className={`ws-status ${wsConnected ? 'connected' : 'disconnected'}`}>
              {wsConnected ? '● 연결됨' : '○ 대기중'}
            </span>
          </div>
          <div className="notification-bar-right">
            {newMessageCount > 0 ? (
              <div className="new-message-alert" onClick={() => {
                setNewMessageCount(0);
                if (paidRooms[0]) navigate(`/chat/${paidRooms[0].id}`);
              }}>
                <span className="alert-icon">🚨</span>
                <span className="alert-text">새 메시지 {newMessageCount}개</span>
              </div>
            ) : (
              <span className="no-message">메시지 없음</span>
            )}
          </div>
        </div>
      )}
      
      <header className="chat-header">
        <h1>투자학당</h1>
        <div className="header-actions">
          {user && (
            <>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                {user.role !== 'member' && (
                  <span className="user-role">
                    {user.role === 'admin' ? '교장쌤' : '스태프'}
                  </span>
                )}
                {user.role === 'member' && getDaysRemaining() !== null && (
                  <span className="days-remaining">
                    D-{getDaysRemaining()}
                  </span>
                )}
              </div>
              {user.role === 'admin' && (
                <button 
                  className="icon-button admin-button"
                  onClick={() => navigate('/admin')}
                  title="관리자 페이지"
                >
                  ⚙️
                </button>
              )}
              <button className="icon-button logout-button" onClick={onLogout} title="로그아웃">
                🚪
              </button>
            </>
          )}
          {!user && (
            <button 
              className="icon-button login-button"
              onClick={() => navigate('/login')}
              title="로그인"
            >
              👤
            </button>
          )}
        </div>
      </header>
      
      {/* 시그널 알림 팝업 */}
      {showSignalPopup && lastSignal && (
        <div className="signal-popup" onClick={() => setShowSignalPopup(false)}>
          <div className="signal-popup-content">
            <div className="signal-popup-header">
              <span className="signal-icon">🚨</span>
              <span className="signal-title">시그널 알림</span>
              <span className="signal-time">{lastSignal.time}</span>
            </div>
            <div className="signal-popup-body">
              {lastSignal.content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <button 
              className="signal-popup-button"
              onClick={() => {
                setShowSignalPopup(false);
                // 해당 방으로 이동
                if (paidRooms[0]) {
                  navigate(`/chat/${paidRooms[0].id}`);
                }
              }}
            >
              채팅방 가기
            </button>
          </div>
        </div>
      )}

      <div className="rooms-container">
        
        {/* 1. VVIP 프로젝트반 - 맨 위 (마케팅 강조) */}
        {user && (
          <section className="room-section vvip-section">
            <h2>💎 VVIP 프로젝트반</h2>
            <div className="room-list">
              {paidRooms.map(room => (
                <div 
                  key={room.id} 
                  className="room-card paid-room"
                  onClick={() => handleRoomClick(room.id, false)}
                >
                  <div className="room-icon">{getRoomIcon(room.room_type)}</div>
                  <div className="room-info">
                    <h3>{room.name}</h3>
                    <p>{room.description}</p>
                  </div>
                  <div className="room-badge premium">프리미엄</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 로그인 유도 - 비로그인 시 VVIP 자리에 */}
        {!user && (
          <section className="room-section vvip-section">
            <h2>💎 VVIP 프로젝트반</h2>
            <div className="login-prompt">
              <p>로그인 후 이용하실 수 있습니다</p>
              <button 
                className="prompt-login-button"
                onClick={() => navigate('/login')}
              >
                로그인하기
              </button>
            </div>
          </section>
        )}

        {/* 2. 교장쌤 한마디 - 승인된 회원만 */}
        {user && (user.is_approved || user.role === 'admin' || user.role === 'staff') && (
          <section className="room-section compact-section">
            <div className="room-list">
              <div 
                className="room-card notice-board"
                onClick={handleThreadBoardClick}
              >
                <div className="room-icon">💬</div>
                <div className="room-info">
                  <h3>교장쌤 한마디</h3>
                  <p>교장쌤의 소중한 한마디</p>
                </div>
                <div className="room-badge notice">NEW</div>
              </div>
            </div>
          </section>
        )}

        {/* 3. 투자 교육 - 무료 미끼 */}
        <section className="room-section compact-section">
          <div className="room-list education-buttons">
            <div 
              className="room-card education-card"
              onClick={() => navigate('/global-trading')}
            >
              <div className="room-icon">📊</div>
              <div className="room-info">
                <h3>오늘의 글로벌 매매</h3>
                <p>주요 종목별 매매 방향</p>
              </div>
              <div className="room-badge global">시황</div>
            </div>
            
            <div 
              className="room-card education-card"
              onClick={() => navigate('/tech-analysis')}
            >
              <div className="room-icon">📖</div>
              <div className="room-info">
                <h3>기술적분석</h3>
                <p>초급 / 중급 / 고급 교육</p>
              </div>
              <div className="room-badge education">교육</div>
            </div>
          </div>
        </section>

        {/* 4. 교장쌤 소식방 - 맨 아래 */}
        <section className="room-section compact-section">
          <div className="room-list">
            {freeRooms.map(room => (
              <div 
                key={room.id} 
                className="room-card free-room"
                onClick={() => handleRoomClick(room.id, true)}
              >
                <div className="room-icon">{getRoomIcon(room.room_type)}</div>
                <div className="room-info">
                  <h3>{room.name}</h3>
                  <p>{room.description}</p>
                </div>
                <div className="room-badge">무료</div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* 로그인 모달 */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>로그인이 필요합니다</h3>
            <p>VVIP 프로젝트반은 로그인 후 이용하실 수 있습니다.</p>
            <div className="modal-buttons">
              <button onClick={() => navigate('/login')}>로그인</button>
              <button onClick={() => setShowLogin(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatList;
