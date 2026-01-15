import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Register from './components/Register';
import ChatRoom from './components/ChatRoom';
import ChatList from './components/ChatList';
import AdminPanel from './components/AdminPanel';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 저장된 토큰으로 자동 로그인
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 메인 페이지 → 무료 채팅방 (room id 1) 바로 표시 */}
          <Route 
            path="/" 
            element={<ChatRoom user={user} onLogout={handleLogout} />} 
          />
          
          {/* 로그인 */}
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/rooms" /> : <Login onLogin={handleLogin} />
            } 
          />
          
          {/* 회원가입 */}
          <Route 
            path="/register" 
            element={
              user ? <Navigate to="/rooms" /> : <Register />
            } 
          />
          
          {/* 유료 채팅방 목록 (로그인 후) */}
          <Route 
            path="/rooms" 
            element={<ChatList user={user} onLogout={handleLogout} />} 
          />
          
          {/* 특정 채팅방 */}
          <Route 
            path="/chat/:roomId" 
            element={<ChatRoom user={user} onLogout={handleLogout} />} 
          />
          
          {/* 관리자 페이지 */}
          <Route 
            path="/admin" 
            element={
              user && user.role === 'admin' 
                ? <AdminPanel user={user} onLogout={handleLogout} />
                : <Navigate to="/" />
            } 
          />
          
          {/* 기타 → 메인으로 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
