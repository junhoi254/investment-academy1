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
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤝', '🙏',
  '💪', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔',
  '🔥', '💯', '💢', '💥', '💫', '💦', '💨', '🎉', '🎊', '🏆'
];

function ChatRoom({ user, onLogout }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  // roomId가 없으면 무료방(1번)으로
  const currentRoomId = roomId || '1';
  
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    loadRoomInfo();
    loadMessages();
    
    // 로그인한 사용자만 WebSocket 연결
    if (user) {
      connectWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [currentRoomId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 접속자 수 설정
  useEffect(() => {
    if (room) {
      // 무료방: 2354명부터, 유료방: 465명부터
      const baseCount = room.is_free ? 2354 : 465;
      // 랜덤하게 0~5명 추가
      const randomAdd = Math.floor(Math.random() * 6);
      setViewerCount(baseCount + randomAdd);
      
      // 30초마다 1명씩 증가 (시뮬레이션)
      const interval = setInterval(() => {
        setViewerCount(prev => prev + 1);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [room]);

  const loadRoomInfo = async () => {
    try {
      // 무료방 조회
      const freeRoomsRes = await axios.get(`${API_URL}/api/rooms/free`);
      const currentRoom = freeRoomsRes.data.find(r => r.id === parseInt(currentRoomId));
      
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
        const paidRoom = paidRoomsRes.data.find(r => r.id === parseInt(currentRoomId));
        if (paidRoom) {
          setRoom(paidRoom);
        }
      }
    } catch (error) {
      console.error('채팅방 정보 로딩 실패:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/rooms/${currentRoomId}/messages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setMessages(response.data);
    } catch (error) {
      console.error('메시지 로딩 실패:', error);
      if (error.response?.status === 401) {
        setMessages([]);
      }
    }
  };

  const connectWebSocket = () => {
    if (!user) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const websocket = new WebSocket(`${WS_URL}/ws/chat/${currentRoomId}?token=${token}`);

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
        setMessages(prev => [...prev, {
          id: Date.now(),
          content: data.message,
          message_type: 'system',
          created_at: data.timestamp
        }]);
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
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket 연결 종료');
      setConnected(false);
      
      // 재연결 시도
      if (user) {
        setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket 오류:', error);
    };

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
      alert('관리자와 서브관리자만 메시지를 보낼 수 있습니다.');
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!user || user.role === 'member') {
      alert('관리자와 서브관리자만 업로드할 수 있습니다.');
      return;
    }

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

    if (!user || user.role === 'member') {
      alert('관리자와 서브관리자만 업로드할 수 있습니다.');
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    if (canDeleteMessage()) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!canDeleteMessage()) {
      alert('관리자와 서브관리자만 파일을 업로드할 수 있습니다.');
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    
    // 이미지인지 확인
    if (file.type.startsWith('image/')) {
      await uploadDroppedImage(file);
    } else {
      await uploadDroppedFile(file);
    }
  };

  const uploadDroppedImage = async (file) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      alert('지원하지 않는 이미지 형식입니다.');
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
    }
  };

  const uploadDroppedFile = async (file) => {
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      alert('지원하지 않는 파일 형식입니다.');
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
    }
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
      staff: { text: '일타훈장님', class: 'admin' },
      member: { text: '회원', class: 'member' },
      system: { text: 'SYSTEM', class: 'system' }
    };
    return badges[role] || badges.member;
  };

  const canSendMessage = () => {
    if (!room || !user) return false;
    if (user.role === 'member') return false;
    return true;
  };

  const canDeleteMessage = () => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'staff';
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('이 메시지를 삭제하시겠습니까?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 메시지 목록에서 제거
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      alert('삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
  };

  const renderMessage = (message) => {
    if (message.message_type === 'image') {
      return (
        <div className="message-image">
          <img 
            src={`${API_URL}${message.file_url}`} 
            alt={message.file_name}
            onClick={() => window.open(`${API_URL}${message.file_url}`, '_blank')}
          />
          <div className="message-footer">
            <span className="message-time">{formatTime(message.created_at)}</span>
            {canDeleteMessage() && (
              <button 
                className="delete-btn"
                onClick={() => deleteMessage(message.id)}
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      );
    } else if (message.message_type === 'file') {
      return (
        <div className="message-file">
          <a 
            href={`${API_URL}${message.file_url}`} 
            download={message.file_name}
            target="_blank"
            rel="noopener noreferrer"
          >
            📎 {message.file_name}
          </a>
          <div className="message-footer">
            <span className="message-time">{formatTime(message.created_at)}</span>
            {canDeleteMessage() && (
              <button 
                className="delete-btn"
                onClick={() => deleteMessage(message.id)}
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <>
          <div className="message-header">
            <span className="sender-name">{message.user?.name}</span>
            <span className={`role-badge ${getUserRoleBadge(message.user?.role).class}`}>
              {getUserRoleBadge(message.user?.role).text}
            </span>
            <span className="message-time">{formatTime(message.created_at)}</span>
            {canDeleteMessage() && (
              <button 
                className="delete-btn"
                onClick={() => deleteMessage(message.id)}
              >
                🗑️
              </button>
            )}
          </div>
          <div className="message-content">{message.content}</div>
        </>
      );
    }
  };

  return (
    <div className="chatroom-container">
      <header className="chatroom-header">
        {/* 유료방이면 뒤로 버튼 표시 */}
        {room && !room.is_free ? (
          <button className="back-button" onClick={() => navigate('/rooms')}>
            ← 뒤로
          </button>
        ) : (
          <div className="header-spacer"></div>
        )}
        
        <div className="room-title">
          <h2>{room?.name || '무료 공지방'}</h2>
          <div className="room-badges">
            {room?.is_free && <span className="free-badge">무료</span>}
            <span className="viewer-count">👥 {viewerCount.toLocaleString()}명 시청 중</span>
          </div>
        </div>
        
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-name">{user.name}</span>
              {user.role === 'admin' && (
                <button className="admin-btn" onClick={() => navigate('/admin')}>
                  관리자
                </button>
              )}
              <button className="rooms-btn" onClick={() => navigate('/rooms')}>
                채팅방 목록
              </button>
              <button className="logout-button" onClick={onLogout}>로그아웃</button>
            </>
          ) : (
            <button className="login-button" onClick={() => navigate('/login')}>
              로그인
            </button>
          )}
        </div>
      </header>

      <div 
        className={`messages-container ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 드래그 오버레이 */}
        {isDragging && (
          <div className="drag-overlay">
            <div className="drag-content">
              <span>📁</span>
              <p>파일을 여기에 놓으세요</p>
            </div>
          </div>
        )}
        {/* 메시지가 없을 때 */}
        {messages.length === 0 && (
          <div className="empty-message">
            <p>📢 {room?.is_free ? '무료' : '유료'} 채팅방입니다</p>
            <p>일타훈장님과 서브관리자의 리딩을 확인하세요!</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div 
            key={message.id || index} 
            className={`message ${message.message_type} ${user && message.user_id === user.id ? 'own' : ''}`}
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
              renderMessage(message)
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력란 */}
      <form className="message-input-container" onSubmit={sendMessage}>
        {/* 일반 회원 또는 비로그인 - 면책 슬라이드 */}
        {(!user || user.role === 'member') && (
          <div className="disclaimer-slide">
            <div className="disclaimer-track">
              <span className="disclaimer-text">
                ⚠️ 당사는 투자 정보 제공에 최선을 다하지만, 투자 결정에 따른 결과에 대해서는 책임지지 않습니다. 투자에 대한 책임은 전적으로 투자자 본인에게 있습니다. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </span>
              <span className="disclaimer-text">
                ⚠️ 당사는 투자 정보 제공에 최선을 다하지만, 투자 결정에 따른 결과에 대해서는 책임지지 않습니다. 투자에 대한 책임은 전적으로 투자자 본인에게 있습니다. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </span>
            </div>
          </div>
        )}
        
        {/* 관리자/서브관리자인 경우 */}
        {user && (user.role === 'admin' || user.role === 'staff') && (
          <>
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

            {showEmojiPicker && (
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
              placeholder="메시지를 입력하세요..."
              disabled={!connected}
              className="message-input"
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={!newMessage.trim() || !connected}
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
