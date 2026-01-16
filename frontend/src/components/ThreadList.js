import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ThreadList.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ThreadList({ user }) {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 승인된 회원만 접근 가능
    if (!user || !user.is_approved) {
      alert('승인된 회원만 이용할 수 있습니다.');
      navigate('/chat');
      return;
    }
    loadThreads();
  }, [user, navigate]);

  const loadThreads = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/threads`);
      // 최신글이 맨 위에 오도록 (고정글 우선, 그 다음 최신순)
      const sortedThreads = response.data.sort((a, b) => {
        // 고정글 우선
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        // 같은 카테고리면 최신순
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setThreads(sortedThreads);
    } catch (error) {
      console.error('쓰레드 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = (threadId) => {
    navigate(`/thread/${threadId}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // 24시간 이내면 시간으로 표시
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      if (hours === 0) {
        const minutes = Math.floor(diff / (60 * 1000));
        return minutes <= 0 ? '방금 전' : `${minutes}분 전`;
      }
      return `${hours}시간 전`;
    }
    
    // 그 외에는 날짜로 표시
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="thread-list-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="thread-list-container">
      <header className="thread-list-header">
        <button className="back-button" onClick={() => navigate('/chat')}>
          ← 뒤로
        </button>
        <h1>📋 투자학당 공지</h1>
        <div className="header-spacer"></div>
      </header>

      <div className="thread-list-content">
        {threads.length === 0 ? (
          <div className="no-threads">
            <p>📭 등록된 게시글이 없습니다.</p>
          </div>
        ) : (
          <div className="threads">
            {threads.map(thread => (
              <div 
                key={thread.id} 
                className={`thread-item ${thread.is_pinned ? 'pinned' : ''}`}
                onClick={() => handleThreadClick(thread.id)}
              >
                <div className="thread-main">
                  <div className="thread-title-row">
                    {thread.is_pinned && <span className="pin-icon">📌</span>}
                    <h3 className="thread-title">{thread.title}</h3>
                  </div>
                  <div className="thread-meta">
                    <span className="thread-author">{thread.author?.name}</span>
                    <span className="thread-date">{formatDate(thread.created_at)}</span>
                  </div>
                </div>
                <div className="thread-stats">
                  <div className="stat-item">
                    <span className="stat-icon">💬</span>
                    <span className="stat-value">{thread.comment_count || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">👁</span>
                    <span className="stat-value">{thread.view_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ThreadList;
