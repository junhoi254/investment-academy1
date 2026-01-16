import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import ThreadList from './components/ThreadList';
import ThreadView from './components/ThreadView';
import AdminPanel from './components/AdminPanel';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 토큰 확인
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 공개 라우트 - 로그인 전에도 접근 가능 */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/chat" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/chat" /> : <Register />} 
          />
          
          {/* 채팅 라우트 - 로그인 없이도 무료방 접근 가능 */}
          <Route 
            path="/chat" 
            element={<ChatList user={user} onLogin={handleLogin} onLogout={handleLogout} />} 
          />
          <Route 
            path="/chat/:roomId" 
            element={<ChatRoom user={user} onLogin={handleLogin} onLogout={handleLogout} />} 
          />
          
          {/* 쓰레드(공지게시판) 라우트 */}
          <Route 
            path="/threads" 
            element={<ThreadList user={user} />} 
          />
          <Route 
            path="/thread/:threadId" 
            element={<ThreadView user={user} />} 
          />
          
          {/* 관리자 라우트 */}
          <Route 
            path="/admin" 
            element={
              user && user.role === 'admin' 
                ? <AdminPanel user={user} onLogout={handleLogout} /> 
                : <Navigate to="/chat" />
            } 
          />
          
          {/* 기본 라우트 - 바로 무료 채팅방으로 */}
          <Route path="/" element={<Navigate to="/chat/1" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
