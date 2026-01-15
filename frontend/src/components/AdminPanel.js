import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminPanel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function AdminPanel({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('approval');  // 기본 탭을 승인으로
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
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

  useEffect(() => {
    loadUsers();
    if (activeTab === 'rooms') {
      loadRooms();
    }
  }, [activeTab]);

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
      alert('서브관리자가 생성되었습니다');
      setStaffForm({ name: '', phone: '', password: '' });
      loadUsers();
    } catch (error) {
      alert('서브관리자 생성 실패: ' + error.response?.data?.detail);
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

  // 승인 대기 중인 회원 수
  const pendingCount = users.filter(u => u.role === 'member' && !u.is_approved).length;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>👨‍💼 관리자 페이지</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/')}>무료 채팅방</button>
          <button onClick={() => navigate('/rooms')}>채팅방 목록</button>
          <button onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <div className="admin-tabs">
        <button 
          className={activeTab === 'approval' ? 'active' : ''}
          onClick={() => setActiveTab('approval')}
        >
          🔔 승인 대기 {pendingCount > 0 && <span className="badge-count">{pendingCount}</span>}
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 회원 관리
        </button>
        <button 
          className={activeTab === 'staff' ? 'active' : ''}
          onClick={() => setActiveTab('staff')}
        >
          👔 서브관리자
        </button>
        <button 
          className={activeTab === 'rooms' ? 'active' : ''}
          onClick={() => setActiveTab('rooms')}
        >
          💬 채팅방 관리
        </button>
      </div>

      <div className="admin-content">
        {/* 승인 대기 탭 */}
        {activeTab === 'approval' && (
          <div className="approval-section">
            <h2>🔔 승인 대기 회원</h2>
            <p className="section-desc">회원가입 후 승인이 필요한 회원 목록입니다.</p>
            {loading ? (
              <div className="loading">로딩 중...</div>
            ) : (
              <>
                {users.filter(u => u.role === 'member' && !u.is_approved).length === 0 ? (
                  <div className="empty-state">
                    <p>✅ 승인 대기 중인 회원이 없습니다</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>이름</th>
                        <th>전화번호</th>
                        <th>가입일</th>
                        <th>승인</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.role === 'member' && !u.is_approved).map(pendingUser => (
                        <tr key={pendingUser.id}>
                          <td><strong>{pendingUser.name}</strong></td>
                          <td>{pendingUser.phone}</td>
                          <td>{formatDate(pendingUser.created_at)}</td>
                          <td className="actions">
                            <button 
                              className="btn-approve-large"
                              onClick={() => approveUser(pendingUser.id)}
                            >
                              ✅ 승인하기
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => deleteUser(pendingUser.id, pendingUser.name)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}

        {/* 회원 관리 */}
        {activeTab === 'users' && (
          <div className="users-section">
            <h2>👥 승인된 회원 목록</h2>
            {loading ? (
              <div className="loading">로딩 중...</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>전화번호</th>
                    <th>상태</th>
                    <th>만료일</th>
                    <th>가입일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'member' && u.is_approved).map(member => (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>{member.phone}</td>
                      <td><span className="badge approved">승인됨</span></td>
                      <td>{formatDate(member.expiry_date)}</td>
                      <td>{formatDate(member.created_at)}</td>
                      <td className="actions">
                        <button 
                          className="btn-password"
                          onClick={() => changePassword(member.id)}
                        >
                          비밀번호
                        </button>
                        <button 
                          className="btn-expiry"
                          onClick={() => updateExpiry(member.id)}
                        >
                          기간설정
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => deleteUser(member.id, member.name)}
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

        {/* 서브관리자 관리 */}
        {activeTab === 'staff' && (
          <div className="staff-section">
            <h2>👔 서브관리자 생성</h2>
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
            <h2>💬 채팅방 생성</h2>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
