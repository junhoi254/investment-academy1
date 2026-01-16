import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ChatList.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ChatList({ user, onLogout }) {
  const navigate = useNavigate();
  const [freeRooms, setFreeRooms] = useState([]);
  const [paidRooms, setPaidRooms] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    loadFreeRooms();
    loadThreads();
    if (user) {
      loadPaidRooms();
    }
  }, [user]);

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

  const loadThreads = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/threads`);
      setThreads(response.data);
    } catch (error) {
      console.error('쓰레드 로딩 실패:', error);
    }
  };

  const handleRoomClick = (roomId, isFree) => {
    if (!isFree && !user) {
      setShowLogin(true);
      return;
    }
    navigate(`/chat/${roomId}`);
  };

  const handleThreadClick = (threadId) => {
    navigate(`/thread/${threadId}`);
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

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="chat-list-container">
      <header className="chat-header">
        <h1>투자학당</h1>
        <div className="header-actions">
          {user && (
            <>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role">
                  {user.role === 'admin' ? '일타훈장님' : user.role === 'staff' ? '서브관리자' : '회원'}
                </span>
                {user.role === 'member' && getDaysRemaining() !== null && (
                  <span className="days-remaining">
                    {getDaysRemaining()}일 남음
                  </span>
                )}
              </div>
              {user.role === 'admin' && (
                <button 
                  className="admin-button"
                  onClick={() => navigate('/admin')}
                >
                  관리자 페이지
                </button>
              )}
              <button className="logout-button" onClick={onLogout}>
                로그아웃
              </button>
            </>
          )}
          {!user && (
            <button 
              className="login-button"
              onClick={() => navigate('/login')}
            >
              로그인
            </button>
          )}
        </div>
      </header>

      <div className="rooms-container">
        {/* 무료 채팅방 */}
        <section className="room-section">
          <h2>📌 무료 채팅방</h2>
          <p className="section-description">누구나 볼 수 있습니다 (일타훈장님/서브관리자만 메시지 작성)</p>
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

        {/* 쓰레드 (게시판) */}
        {threads.length > 0 && (
          <section className="room-section thread-section">
            <h2>📋 공지 & 게시판</h2>
            <p className="section-description">중요 공지사항 및 정보 (회원은 댓글 작성 가능)</p>
            <div className="thread-list">
              {threads.map(thread => (
                <div 
                  key={thread.id} 
                  className={`thread-card ${thread.is_pinned ? 'pinned' : ''}`}
                  onClick={() => handleThreadClick(thread.id)}
                >
                  <div className="thread-icon">
                    {thread.is_pinned ? '📌' : '📄'}
                  </div>
                  <div className="thread-info">
                    <h3>
                      {thread.is_pinned && <span className="pin-label">[고정]</span>}
                      {thread.title}
                    </h3>
                    <p className="thread-meta">
                      <span className="thread-author">{thread.author?.name}</span>
                      <span className="thread-date">
                        {new Date(thread.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </p>
                  </div>
                  <div className="thread-stats">
                    <span className="comment-count">💬 {thread.comment_count}</span>
                    <span className="view-count">👁 {thread.view_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 유료 채팅방 */}
        {user && (
          <section className="room-section">
            <h2>💎 유료 채팅방</h2>
            <p className="section-description">회원 전용 리딩방 (일타훈장님/서브관리자만 메시지 작성)</p>
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

        {/* 로그인 유도 */}
        {!user && (
          <section className="room-section">
            <div className="login-prompt">
              <h2>🔒 유료 채팅방을 이용하시려면</h2>
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
      </div>

      {/* 로그인 모달 */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>로그인이 필요합니다</h3>
            <p>유료 채팅방은 로그인 후 이용하실 수 있습니다.</p>
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
