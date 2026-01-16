import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ChatRoom.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

// 이모티콘 목록
const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
  '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '☺️', '🙂',
  '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣',
  '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜',
  '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️',
  '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤝', '🙏',
  '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '❤️',
  '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️',
  '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️',
  '🔥', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '👁️',
  '🗨️', '🗯️', '💭', '💤', '👋', '🎉', '🎊', '🎈', '🎁', '🏆'
];

function ChatRoom({ user, onLogin, onLogout }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => {
    // 세션 스토리지에서 면책조항 확인 여부 가져오기
    return sessionStorage.getItem('disclaimerAccepted') === 'true';
  });
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // 면책조항 수락 시 세션 스토리지에 저장
  useEffect(() => {
    if (disclaimerAccepted) {
      sessionStorage.setItem('disclaimerAccepted', 'true');
    }
  }, [disclaimerAccepted]);

  useEffect(() => {
    // 페이지 로드 시 body 스크롤 리셋 (크롬 모바일 문제 해결)
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    // ChatRoom에서만 body 스크롤 방지
    document.body.style.overflow = 'hidden';
    
    loadRoomInfo();
    loadMessages();

    return () => {
      // 나갈 때 body 스크롤 복원
      document.body.style.overflow = '';
      
      // cleanup: WebSocket 연결 종료
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // 재연결 방지
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // user 변경 시 WebSocket 연결/해제 - 별도 useEffect
  useEffect(() => {
    // 이미 연결 중이면 무시
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      return;
    }
    
    if (user && !wsRef.current) {
      connectWebSocket();
    } else if (!user && wsRef.current) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
      setConnected(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadRoomInfo = async () => {
    try {
      // 무료방/유료방 모두 조회
      const freeRoomsRes = await axios.get(`${API_URL}/api/rooms/free`);
      const currentRoom = freeRoomsRes.data.find(r => r.id === parseInt(roomId));
      
      if (currentRoom) {
        setRoom(currentRoom);
        return;
      }

      // 유료방인 경우 로그인 필요
      if (user) {
        const token = localStorage.getItem('token');
        const paidRoomsRes = await axios.get(`${API_URL}/api/rooms/paid`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const paidRoom = paidRoomsRes.data.find(r => r.id === parseInt(roomId));
        setRoom(paidRoom);
      }
    } catch (error) {
      console.error('채팅방 정보 로딩 실패:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/rooms/${roomId}/messages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setMessages(response.data);
    } catch (error) {
      console.error('메시지 로딩 실패:', error);
      // 로그인 필요한 경우
      if (error.response?.status === 401) {
        setMessages([]);
      }
    }
  };

  const connectWebSocket = () => {
    if (!user) return;
    
    // 이미 연결되어 있거나 연결 중이면 새로 연결하지 않음
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || 
          wsRef.current.readyState === WebSocket.CONNECTING) {
        return;
      }
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    console.log('WebSocket 연결 시도...');
    const websocket = new WebSocket(`${WS_URL}/ws/chat/${roomId}?token=${token}`);

    websocket.onopen = () => {
      console.log('WebSocket 연결됨');
      setConnected(true);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message') {
        setMessages(prev => [...prev, {
          id: data.id,
          user_id: data.user_id,
          content: data.content,
          message_type: data.message_type,
          file_url: data.file_url,
          file_name: data.file_name,
          created_at: data.timestamp,
          user: {
            name: data.user_name,
            role: data.user_role
          }
        }]);
      } else if (data.type === 'system') {
        // 시스템 메시지는 더 이상 표시하지 않음
        console.log('System:', data.message);
      } else if (data.type === 'signal') {
        setMessages(prev => [...prev, {
          id: Date.now(),
          content: data.content,
          message_type: 'signal',
          created_at: data.timestamp,
          user: {
            name: 'MT4 시그널',
            role: 'system'
          }
        }]);
      } else if (data.type === 'delete') {
        // 메시지 삭제 처리
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
      }
    };

    websocket.onclose = (event) => {
      console.log('WebSocket 연결 종료:', event.code);
      setConnected(false);
      wsRef.current = null;
      
      // 정상 종료가 아닌 경우에만 재연결 (1000, 1001은 정상 종료)
      if (user && event.code !== 1000 && event.code !== 1001) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user) {
            connectWebSocket();
          }
        }, 5000); // 5초 후 재연결
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket 오류:', error);
    };

    wsRef.current = websocket;
    setWs(websocket);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    if (!newMessage.trim() || !ws || !connected) return;

    // 일반 회원은 메시지 전송 불가
    if (user.role === 'member') {
      alert('관리자와 직원만 메시지를 보낼 수 있습니다.');
      return;
    }

    ws.send(JSON.stringify({
      message: newMessage,
      type: 'text'
    }));

    setNewMessage('');
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // 메시지 삭제 함수
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('이 메시지를 삭제하시겠습니까?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 메시지 목록에서 제거
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      alert('메시지 삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
  };

  // 삭제 권한 확인 (관리자/서브관리자만)
  const canDeleteMessage = () => {
    return user && (user.role === 'admin' || user.role === 'subadmin');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/upload/image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // 이미지 메시지 전송
      if (ws && connected) {
        ws.send(JSON.stringify({
          message: `[이미지: ${response.data.filename}]`,
          type: 'image',
          file_url: response.data.url,
          file_name: response.data.filename
        }));
      }
    } catch (error) {
      alert('이미지 업로드 실패: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/upload/file`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // 파일 메시지 전송
      if (ws && connected) {
        ws.send(JSON.stringify({
          message: `[파일: ${response.data.filename}]`,
          type: 'file',
          file_url: response.data.url,
          file_name: response.data.filename
        }));
      }
    } catch (error) {
      alert('파일 업로드 실패: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // 검색 모드 토글
  const toggleSearchMode = () => {
    setSearchMode(!searchMode);
    setSearchQuery('');
    if (!searchMode) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  // 메시지 필터링
  const filteredMessages = searchQuery.trim() 
    ? messages.filter(msg => 
        msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // 검색어 하이라이트
  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="search-highlight">{part}</mark>
        : part
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getUserRoleBadge = (role) => {
    const badges = {
      admin: { text: '일타훈장님', class: 'admin' },
      subadmin: { text: '서브관리자', class: 'staff' },
      staff: { text: '서브관리자', class: 'staff' },
      member: { text: '회원', class: 'member' },
      system: { text: 'SYSTEM', class: 'system' }
    };
    return badges[role] || badges.member;
  };

  const canSendMessage = () => {
    if (!room || !user) return false;
    // 관리자와 직원(서브관리자)만 메시지 전송 가능
    if (user.role === 'member') return false;
    return true;
  };

  // URL 파싱 및 미리보기 생성
  const parseLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    
    return { text, urls };
  };

  // 링크 미리보기 컴포넌트 (로컬 캐시 사용)
  const LinkPreviewCard = ({ url }) => {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchPreview = async () => {
        try {
          // 백엔드 캐시만 사용 (DB에서 관리)
          const response = await axios.get(`${API_URL}/api/link-preview?url=${encodeURIComponent(url)}`);
          setPreview(response.data);
        } catch (error) {
          console.error('미리보기 로딩 실패:', error);
          setPreview({ url, title: new URL(url).hostname, description: '', image: '' });
        }
        setLoading(false);
      };
      fetchPreview();
    }, [url]);

    if (loading) {
      return (
        <div className="link-preview loading">
          <a href={url} target="_blank" rel="noopener noreferrer" className="link-card">
            <div className="link-info">
              <div className="link-title">⏳ 로딩 중...</div>
              <div className="link-url">{new URL(url).hostname}</div>
            </div>
          </a>
        </div>
      );
    }

    if (!preview) return null;

    return (
      <div className="link-preview">
        <a href={url} target="_blank" rel="noopener noreferrer" className="link-card">
          {preview.image && (
            <img src={preview.image} alt="" className="link-thumbnail" onError={(e) => e.target.style.display = 'none'} />
          )}
          <div className="link-info">
            <div className="link-title">{preview.title || new URL(url).hostname}</div>
            {preview.description && <div className="link-description">{preview.description}</div>}
            <div className="link-url">{new URL(url).hostname}</div>
          </div>
        </a>
      </div>
    );
  };

  const renderLinkPreview = (url) => {
    // 유튜브 감지
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
    const youtubeMatch = url.match(youtubeRegex);
    
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return (
        <div className="link-preview youtube-preview">
          <iframe
            width="100%"
            height="200"
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
          ></iframe>
        </div>
      );
    }
    
    // 일반 링크 미리보기
    return <LinkPreviewCard url={url} />;
  };

  const renderMessage = (message, query = '') => {
    if (message.message_type === 'image') {
      return (
        <div className="message-image">
          {canDeleteMessage() && (
            <button 
              className="delete-message-btn image-delete"
              onClick={() => handleDeleteMessage(message.id)}
              title="메시지 삭제"
            >
              🗑️
            </button>
          )}
          <img 
            src={`${API_URL}${message.file_url}`} 
            alt={message.file_name}
            onClick={() => window.open(`${API_URL}${message.file_url}`, '_blank')}
          />
          <div className="message-time">{formatTime(message.created_at)}</div>
        </div>
      );
    } else if (message.message_type === 'file') {
      return (
        <div className="message-file">
          {canDeleteMessage() && (
            <button 
              className="delete-message-btn file-delete"
              onClick={() => handleDeleteMessage(message.id)}
              title="메시지 삭제"
            >
              🗑️
            </button>
          )}
          <a 
            href={`${API_URL}${message.file_url}`} 
            download={message.file_name}
            target="_blank"
            rel="noopener noreferrer"
          >
            📎 {message.file_name}
          </a>
          <div className="message-time">{formatTime(message.created_at)}</div>
        </div>
      );
    } else {
      const { text, urls } = parseLinks(message.content);
      
      return (
        <>
          <div className="message-header">
            <span className="sender-name">{query ? highlightText(message.user?.name, query) : message.user?.name}</span>
            <span className={`role-badge ${getUserRoleBadge(message.user?.role).class}`}>
              {getUserRoleBadge(message.user?.role).text}
            </span>
            <span className="message-time">{formatTime(message.created_at)}</span>
            {canDeleteMessage() && (
              <button 
                className="delete-message-btn"
                onClick={() => handleDeleteMessage(message.id)}
                title="메시지 삭제"
              >
                🗑️
              </button>
            )}
          </div>
          <div className="message-content">
            {text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
              if (part.match(/^https?:\/\//)) {
                return (
                  <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="message-link">
                    {part}
                  </a>
                );
              }
              return <span key={i}>{query ? highlightText(part, query) : part}</span>;
            })}
          </div>
          {urls.length > 0 && (
            <div className="link-previews">
              {urls.slice(0, 2).map((url, i) => (
                <div key={i}>{renderLinkPreview(url)}</div>
              ))}
            </div>
          )}
        </>
      );
    }
  };

  return (
    <div className="chatroom-container">
      <header className="chatroom-header">
        <button className="back-button" onClick={() => navigate('/chat')}>
          ←
        </button>
        <div className="room-title">
          <h2>{room?.name || '채팅방'}</h2>
          {room?.is_free && <span className="free-badge">무료</span>}
          {user && (
            <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? '● 연결됨' : '○ 연결 안됨'}
            </span>
          )}
        </div>
        <div className="header-actions">
          <button className="search-toggle-btn" onClick={toggleSearchMode} title="검색">
            🔍
          </button>
          {user ? (
            <>
              <span className="user-name">{user.name}</span>
              <button className="icon-button logout-button" onClick={onLogout} title="로그아웃">
                🚪
              </button>
            </>
          ) : (
            <button className="icon-button login-button" onClick={() => navigate('/login')} title="로그인">
              👤
            </button>
          )}
        </div>
      </header>

      {/* 검색 바 */}
      {searchMode && (
        <div className="search-bar">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="메시지 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="search-count">
            {searchQuery.trim() ? `${filteredMessages.length}개 결과` : ''}
          </span>
          <button className="search-close-btn" onClick={toggleSearchMode}>✕</button>
        </div>
      )}

      <div className="messages-container" ref={messagesContainerRef}>
        {/* 면책조항 슬라이드 (로그인 안 한 경우) */}
        {!user && !disclaimerAccepted && (
          <div className="disclaimer-overlay">
            <div className="disclaimer-slide">
              <div className="disclaimer-content">
                <h2>⚠️ 투자 유의사항</h2>
                <div className="disclaimer-text">
                  <p>📌 본 채팅방의 모든 정보는 <strong>참고용</strong>이며, 투자 권유가 아닙니다.</p>
                  <p>📌 투자에 대한 모든 판단과 결정은 <strong>본인의 책임</strong>입니다.</p>
                  <p>📌 과거의 수익률이 미래의 수익률을 보장하지 않습니다.</p>
                  <p>📌 원금 손실의 위험이 있으므로 신중히 투자하시기 바랍니다.</p>
                </div>
                <button 
                  className="disclaimer-accept-btn"
                  onClick={() => setDisclaimerAccepted(true)}
                >
                  확인했습니다
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 검색 결과 안내 */}
        {searchQuery.trim() && (
          <div className="search-info">
            🔍 "{searchQuery}" 검색 결과: {filteredMessages.length}개
          </div>
        )}
        
        {/* 더보기 버튼 */}
        {!searchQuery.trim() && messages.length > 0 && messages.length >= 30 && (
          <div className="load-more-container">
            <button 
              className="load-more-button"
              onClick={() => {
                alert('이전 메시지는 스크롤하여 확인하세요!');
              }}
            >
              📜 최근 {messages.length}개 메시지 표시 중
            </button>
          </div>
        )}
        
        {filteredMessages.map((message, index) => (
          <div 
            key={message.id || index} 
            className={`message ${message.message_type} ${user && message.user_id === user.id ? 'own' : ''} ${searchQuery.trim() ? 'search-result' : ''}`}
          >
            {message.message_type === 'system' ? (
              <div className="system-message">{message.content}</div>
            ) : message.message_type === 'signal' ? (
              <div className="signal-message">
                <div className="signal-header">📊 트레이딩 시그널</div>
                <pre className="signal-content">{message.content}</pre>
                <div className="message-time">{formatTime(message.created_at)}</div>
              </div>
            ) : (
              renderMessage(message, searchQuery)
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력란 */}
      <form className="message-input-container" onSubmit={sendMessage}>
        {/* 로그인하지 않은 사용자 또는 일반 회원 - 투자 경고 슬라이드 */}
        {(!user || user.role === 'member') && (
          <div className="warning-slider-container">
            <div className="warning-slider">
              <div className="warning-slide">
                ⚠️ 본 채팅방의 모든 정보는 투자 참고용이며, 투자 권유가 아닙니다
              </div>
              <div className="warning-slide">
                📌 투자에 대한 모든 판단과 결정은 본인의 책임입니다
              </div>
              <div className="warning-slide">
                💰 과거의 수익률이 미래의 수익률을 보장하지 않습니다
              </div>
              <div className="warning-slide">
                🔔 원금 손실의 위험이 있으므로 신중히 투자하시기 바랍니다
              </div>
            </div>
          </div>
        )}
        
        {/* 관리자/직원만 입력란 표시 */}
        {user && user.role !== 'member' && (
          <>
            {/* 파일 업로드 버튼 */}
            {canSendMessage() && (
              <div className="upload-buttons">
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                
                <button
                  type="button"
                  className="upload-btn"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage || !connected}
                  title="이미지 업로드"
                >
                  {uploadingImage ? '⏳' : '🖼️'}
                </button>
                
                <button
                  type="button"
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile || !connected}
                  title="파일 업로드"
                >
                  {uploadingFile ? '⏳' : '📎'}
                </button>
                
                <button
                  type="button"
                  className="emoji-btn"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={!connected}
                  title="이모티콘"
                >
                  😊
                </button>
              </div>
            )}

            {/* 이모티콘 선택기 */}
            {showEmojiPicker && canSendMessage() && (
              <div className="emoji-picker">
                {EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    className="emoji-item"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                canSendMessage() 
                  ? "메시지를 입력하세요..." 
                  : "관리자와 서브관리자만 메시지를 보낼 수 있습니다"
              }
              disabled={!canSendMessage() || !connected}
              className="message-input"
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={!newMessage.trim() || !canSendMessage() || !connected}
            >
              전송
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default ChatRoom;
