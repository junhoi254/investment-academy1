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

  useEffect(() => {
    loadRooms();
  }, [user]);

  const loadRooms = async () => {
    try {
      // 무료방 로드
      const freeResponse = await axios.get(`${API_URL}/api/rooms/free`);
      setFreeRooms(freeResponse.data);

      // 로그인한 경우 유료방도 로드
      if (user) {
        const token = localStorage.getItem('token');
        const paidResponse = await axios.get(`${API_URL}/api/rooms/paid`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPaidRooms(paidResponse.data);
      }
    } catch (error) {
      console.error('채팅방 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = (roomId) => {
    navigate(`/chat/${roomId}`);
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
          {user ? (
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
          ) : (
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
                onClick={() => handleRoomClick(room.id)}
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

        {/* 유료 채팅방 (로그인 후에만) */}
        {user ? (
          <section className="room-section">
            <h2>💎 유료 채팅방</h2>
            <p className="section-description">회원 전용 리딩방 (일타훈장님/서브관리자만 메시지 작성)</p>
            <div className="room-list">
              {paidRooms.map(room => (
                <div 
                  key={room.id} 
                  className="room-card paid-room"
                  onClick={() => handleRoomClick(room.id)}
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
        ) : (
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

        {/* 무료방 바로가기 */}
        <section className="room-section">
          <button 
            className="goto-free-button"
            onClick={() => navigate('/')}
          >
            📺 무료 공지방 바로가기
          </button>
        </section>
      </div>
    </div>
  );
}

export default ChatList;
