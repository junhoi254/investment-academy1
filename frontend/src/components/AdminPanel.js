import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminPanel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function AdminPanel({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 직원 생성 폼
  const [staffForm, setStaffForm] = useState({
    name: '',
    phone: '',
    password: ''
  });

  // 채팅방 생성 폼
  const [roomForm, setRoomForm] = useState({
    name: '',
    room_type: 'notice',
    is_free: false,
    description: ''
  });

  // 쓰레드 생성 폼
  const [threadForm, setThreadForm] = useState({
    title: '',
    content: '',
    is_pinned: false
  });
  const [editingThread, setEditingThread] = useState(null);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'rooms') {
      loadRooms();
    } else if (activeTab === 'online') {
      loadOnlineUsers();
      // 5초마다 자동 새로고침
      const interval = setInterval(loadOnlineUsers, 5000);
      return () => clearInterval(interval);
    } else if (activeTab === 'threads') {
      loadThreads();
    }
  }, [activeTab]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/threads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThreads(response.data);
    } catch (error) {
      console.error('쓰레드 로딩 실패:', error);
    }
    setLoading(false);
  };

  const createThread = async (e) => {
    e.preventDefault();
    if (!threadForm.title.trim() || !threadForm.content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/admin/threads`, threadForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThreadForm({ title: '', content: '', is_pinned: false });
      loadThreads();
      alert('한마디가 등록되었습니다!');
    } catch (error) {
      alert('쓰레드 생성에 실패했습니다.');
    }
  };

  const updateThread = async (threadId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/threads/${threadId}`, editingThread, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingThread(null);
      loadThreads();
      alert('한마디가 수정되었습니다!');
    } catch (error) {
      alert('쓰레드 수정에 실패했습니다.');
    }
  };

  const deleteThread = async (threadId) => {
    if (!window.confirm('정말 삭제하시겠습니까? 모든 댓글도 함께 삭제됩니다.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadThreads();
      alert('한마디가 삭제되었습니다!');
    } catch (error) {
      alert('쓰레드 삭제에 실패했습니다.');
    }
  };

  const toggleThreadPin = async (thread) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/threads/${thread.id}`, 
        { is_pinned: !thread.is_pinned },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadThreads();
    } catch (error) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const toggleThreadActive = async (thread) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/threads/${thread.id}`, 
        { is_active: !thread.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadThreads();
    } catch (error) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/online-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOnlineUsers(response.data.users || []);
    } catch (error) {
      console.error('접속자 목록 로딩 실패:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      alert('사용자 목록 로딩 실패: ' + error.response?.data?.detail);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [freeRooms, paidRooms] = await Promise.all([
        axios.get(`${API_URL}/api/rooms/free`),
        axios.get(`${API_URL}/api/rooms/paid`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setRooms([...freeRooms.data, ...paidRooms.data]);
    } catch (error) {
      alert('채팅방 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/users/${userId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('승인되었습니다');
      loadUsers();
    } catch (error) {
      alert('승인 실패: ' + error.response?.data?.detail);
    }
  };

  const changePassword = async (userId) => {
    const newPassword = prompt('새 비밀번호를 입력하세요:');
    if (!newPassword) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/users/${userId}/password`, 
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert('비밀번호가 변경되었습니다');
    } catch (error) {
      alert('비밀번호 변경 실패: ' + error.response?.data?.detail);
    }
  };

  const updateExpiry = async (userId) => {
    const days = prompt('회원 기간 (일수)을 입력하세요:');
    if (!days) return;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/users/${userId}/expiry`,
        { expiry_date: expiryDate.toISOString() },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert('회원 기간이 설정되었습니다');
      loadUsers();
    } catch (error) {
      alert('기간 설정 실패: ' + error.response?.data?.detail);
    }
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`${userName}를 삭제하시겠습니까?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('삭제되었습니다');
      loadUsers();
    } catch (error) {
      alert('삭제 실패: ' + error.response?.data?.detail);
    }
  };

  const createStaff = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/admin/staff`, staffForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('직원이 생성되었습니다');
      setStaffForm({ name: '', phone: '', password: '' });
      loadUsers();
    } catch (error) {
      alert('직원 생성 실패: ' + error.response?.data?.detail);
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/rooms`, roomForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('채팅방이 생성되었습니다');
      setRoomForm({ name: '', room_type: 'notice', is_free: false, description: '' });
      loadRooms();
    } catch (error) {
      alert('채팅방 생성 실패: ' + error.response?.data?.detail);
    }
  };

  const deleteRoom = async (roomId, roomName) => {
    if (!window.confirm(`"${roomName}" 채팅방을 삭제하시겠습니까?\n\n⚠️ 모든 메시지도 함께 삭제됩니다!`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('채팅방이 삭제되었습니다');
      loadRooms();
    } catch (error) {
      alert('채팅방 삭제 실패: ' + error.response?.data?.detail);
    }
  };

  const getRoleName = (role) => {
    const roles = {
      admin: '일타훈장님',
      staff: '서브관리자',
      member: '회원'
    };
    return roles[role] || role;
  };

  const getRoomTypeName = (type) => {
    const types = {
      notice: '공지방',
      stock: '주식',
      futures: '해외선물',
      crypto: '코인선물'
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>관리자 페이지</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/chat')}>채팅방으로</button>
          <button onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <div className="admin-tabs">
        <button 
          className={activeTab === 'online' ? 'active' : ''}
          onClick={() => setActiveTab('online')}
        >
          🟢 접속 중 ({onlineUsers.length})
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          회원 관리
        </button>
        <button 
          className={activeTab === 'staff' ? 'active' : ''}
          onClick={() => setActiveTab('staff')}
        >
          서브관리자 관리
        </button>
        <button 
          className={activeTab === 'rooms' ? 'active' : ''}
          onClick={() => setActiveTab('rooms')}
        >
          채팅방 관리
        </button>
        <button 
          className={activeTab === 'threads' ? 'active' : ''}
          onClick={() => setActiveTab('threads')}
        >
          💬 훈장님 한마디
        </button>
      </div>

      <div className="admin-content">
        {/* 접속 중인 사용자 */}
        {activeTab === 'online' && (
          <div className="online-section">
            <h2>🟢 현재 접속 중인 사용자 <span className="online-count">{onlineUsers.length}명</span></h2>
            <p className="online-note">5초마다 자동 새로고침됩니다</p>
            {onlineUsers.length === 0 ? (
              <div className="no-online">현재 접속 중인 사용자가 없습니다</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>역할</th>
                    <th>채팅방</th>
                    <th>접속시간</th>
                  </tr>
                </thead>
                <tbody>
                  {onlineUsers.map((u, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="online-dot">●</span>
                        {u.name}
                      </td>
                      <td>{getRoleName(u.role)}</td>
                      <td>{u.room_id || '-'}번 방</td>
                      <td>{u.connected_at ? new Date(u.connected_at + 'Z').toLocaleTimeString('ko-KR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 회원 관리 */}
        {activeTab === 'users' && (
          <div className="users-section">
            <h2>회원 목록</h2>
            {loading ? (
              <div className="loading">로딩 중...</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>전화번호</th>
                    <th>역할</th>
                    <th>승인상태</th>
                    <th>만료일</th>
                    <th>가입일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'member').map(user => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.phone}</td>
                      <td>{getRoleName(user.role)}</td>
                      <td>
                        {user.is_approved ? (
                          <span className="badge approved">승인됨</span>
                        ) : (
                          <span className="badge pending">대기중</span>
                        )}
                      </td>
                      <td>{formatDate(user.expiry_date)}</td>
                      <td>{formatDate(user.created_at)}</td>
                      <td className="actions">
                        {!user.is_approved && (
                          <button 
                            className="btn-approve"
                            onClick={() => approveUser(user.id)}
                          >
                            승인
                          </button>
                        )}
                        <button 
                          className="btn-password"
                          onClick={() => changePassword(user.id)}
                        >
                          비밀번호
                        </button>
                        <button 
                          className="btn-expiry"
                          onClick={() => updateExpiry(user.id)}
                        >
                          기간설정
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => deleteUser(user.id, user.name)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 직원 관리 */}
        {activeTab === 'staff' && (
          <div className="staff-section">
            <h2>서브관리자 생성</h2>
            <form className="staff-form" onSubmit={createStaff}>
              <input
                type="text"
                placeholder="이름"
                value={staffForm.name}
                onChange={(e) => setStaffForm({...staffForm, name: e.target.value})}
                required
              />
              <input
                type="tel"
                placeholder="전화번호 (010-0000-0000)"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={staffForm.password}
                onChange={(e) => setStaffForm({...staffForm, password: e.target.value})}
                required
              />
              <button type="submit">서브관리자 생성</button>
            </form>

            <h2>서브관리자 목록</h2>
            {loading ? (
              <div className="loading">로딩 중...</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>전화번호</th>
                    <th>역할</th>
                    <th>가입일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'staff').map(staff => (
                    <tr key={staff.id}>
                      <td>{staff.name}</td>
                      <td>{staff.phone}</td>
                      <td>{getRoleName(staff.role)}</td>
                      <td>{formatDate(staff.created_at)}</td>
                      <td className="actions">
                        <button 
                          className="btn-password"
                          onClick={() => changePassword(staff.id)}
                        >
                          비밀번호
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => deleteUser(staff.id, staff.name)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 채팅방 관리 */}
        {activeTab === 'rooms' && (
          <div className="rooms-section">
            <h2>채팅방 생성</h2>
            <form className="room-form" onSubmit={createRoom}>
              <input
                type="text"
                placeholder="채팅방 이름"
                value={roomForm.name}
                onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
                required
              />
              <select
                value={roomForm.room_type}
                onChange={(e) => setRoomForm({...roomForm, room_type: e.target.value})}
              >
                <option value="notice">공지방</option>
                <option value="stock">주식</option>
                <option value="futures">해외선물</option>
                <option value="crypto">코인선물</option>
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={roomForm.is_free}
                  onChange={(e) => setRoomForm({...roomForm, is_free: e.target.checked})}
                />
                무료방
              </label>
              <textarea
                placeholder="설명"
                value={roomForm.description}
                onChange={(e) => setRoomForm({...roomForm, description: e.target.value})}
              />
              <button type="submit">채팅방 생성</button>
            </form>

            <h2>채팅방 목록</h2>
            {loading ? (
              <div className="loading">로딩 중...</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>타입</th>
                    <th>무료/유료</th>
                    <th>설명</th>
                    <th>생성일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(room => (
                    <tr key={room.id}>
                      <td>{room.name}</td>
                      <td>{getRoomTypeName(room.room_type)}</td>
                      <td>
                        {room.is_free ? (
                          <span className="badge free">무료</span>
                        ) : (
                          <span className="badge paid">유료</span>
                        )}
                      </td>
                      <td>{room.description}</td>
                      <td>{formatDate(room.created_at)}</td>
                      <td>
                        <button 
                          className="delete-btn"
                          onClick={() => deleteRoom(room.id, room.name)}
                        >
                          🗑️ 삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 쓰레드 관리 */}
        {activeTab === 'threads' && (
          <div className="threads-section">
            <h2>💬 훈장님 한마디 관리</h2>
            
            {/* 쓰레드 생성 폼 */}
            <div className="thread-form-container">
              <h3>새 한마디 작성</h3>
              <form onSubmit={createThread} className="thread-form">
                <input
                  type="text"
                  placeholder="제목"
                  value={threadForm.title}
                  onChange={(e) => setThreadForm({...threadForm, title: e.target.value})}
                  className="thread-title-input"
                />
                <textarea
                  placeholder="내용을 입력하세요..."
                  value={threadForm.content}
                  onChange={(e) => setThreadForm({...threadForm, content: e.target.value})}
                  className="thread-content-input"
                  rows={5}
                />
                <div className="thread-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={threadForm.is_pinned}
                      onChange={(e) => setThreadForm({...threadForm, is_pinned: e.target.checked})}
                    />
                    📌 상단 고정
                  </label>
                  <button type="submit" className="create-thread-btn">한마디 등록</button>
                </div>
              </form>
            </div>

            {/* 한마디 목록 */}
            <div className="thread-list-container">
              <h3>한마디 목록 ({threads.length}개)</h3>
              {loading ? (
                <p>로딩 중...</p>
              ) : threads.length === 0 ? (
                <p className="no-threads">작성된 한마디가 없습니다.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>상태</th>
                      <th>제목</th>
                      <th>댓글</th>
                      <th>조회</th>
                      <th>작성일</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threads.map(thread => (
                      <tr key={thread.id} className={!thread.is_active ? 'inactive-row' : ''}>
                        <td>
                          {thread.is_pinned && <span className="pin-badge">📌</span>}
                          {thread.is_active ? (
                            <span className="status-badge active">활성</span>
                          ) : (
                            <span className="status-badge inactive">비활성</span>
                          )}
                        </td>
                        <td className="thread-title-cell">
                          {editingThread?.id === thread.id ? (
                            <input
                              type="text"
                              value={editingThread.title}
                              onChange={(e) => setEditingThread({...editingThread, title: e.target.value})}
                              className="edit-input"
                            />
                          ) : (
                            thread.title
                          )}
                        </td>
                        <td>{thread.comment_count}</td>
                        <td>{thread.view_count}</td>
                        <td>{new Date(thread.created_at).toLocaleDateString('ko-KR')}</td>
                        <td className="action-cell">
                          {editingThread?.id === thread.id ? (
                            <>
                              <button className="save-btn" onClick={() => updateThread(thread.id)}>저장</button>
                              <button className="cancel-btn" onClick={() => setEditingThread(null)}>취소</button>
                            </>
                          ) : (
                            <>
                              <button className="edit-btn" onClick={() => setEditingThread({...thread})}>수정</button>
                              <button 
                                className="pin-btn" 
                                onClick={() => toggleThreadPin(thread)}
                              >
                                {thread.is_pinned ? '고정해제' : '고정'}
                              </button>
                              <button 
                                className="toggle-btn" 
                                onClick={() => toggleThreadActive(thread)}
                              >
                                {thread.is_active ? '비활성화' : '활성화'}
                              </button>
                              <button className="delete-btn" onClick={() => deleteThread(thread.id)}>삭제</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
