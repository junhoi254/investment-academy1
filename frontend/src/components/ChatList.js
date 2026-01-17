import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ChatList.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ChatList({ user, onLogout }) {
  const navigate = useNavigate();
  const [freeRooms, setFreeRooms] = useState([]);
  const [paidRooms, setPaidRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    loadFreeRooms();
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
                {user.role !== 'member' && (
                  <span className="user-role">
                    {user.role === 'admin' ? '훈장님' : '스태프'}
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

      <div className="rooms-container">
        {/* 교장쌤 소식방 */}
        <section className="room-section">
          <h2>📌 교장쌤 소식방</h2>
          <p className="section-description">교장쌤만 메세지 작성</p>
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

        {/* 교장쌤 한마디 - 승인된 회원 + 관리자/스태프 */}
        {user && (user.is_approved || user.role === 'admin' || user.role === 'staff') && (
          <section className="room-section">
            <h2>💬 교장쌤 한마디</h2>
            <p className="section-description">중요 공지사항 및 정보</p>
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

        {/* VVIP 프로젝트반 */}
        {user && (
          <section className="room-section">
            <h2>💎 VVIP 프로젝트반</h2>
            <p className="section-description"></p>
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
              <h2>🔒 VVIP 프로젝트반을 이용하시려면</h2>
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
