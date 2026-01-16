import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ThreadList.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ThreadList({ user }) {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedThread, setExpandedThread] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !(user.is_approved || user.role === 'admin' || user.role === 'staff')) {
      alert('승인된 회원만 이용할 수 있습니다.');
      navigate('/chat');
      return;
    }
    loadThreads();
  }, [user, navigate]);

  const loadThreads = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/threads`);
      const sortedThreads = response.data.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setThreads(sortedThreads);
    } catch (error) {
      console.error('로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (threadId) => {
    try {
      const response = await axios.get(`${API_URL}/api/threads/${threadId}/comments`);
      setComments(prev => ({ ...prev, [threadId]: response.data }));
    } catch (error) {
      console.error('댓글 로딩 실패:', error);
    }
  };

  const toggleThread = async (threadId) => {
    if (expandedThread === threadId) {
      setExpandedThread(null);
    } else {
      setExpandedThread(threadId);
      if (!comments[threadId]) {
        loadComments(threadId);
      }
      try {
        await axios.get(`${API_URL}/api/threads/${threadId}`);
      } catch (e) {}
    }
  };

  const submitComment = async (threadId) => {
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/threads/${threadId}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(prev => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), response.data]
      }));
      setNewComment('');
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, comment_count: (t.comment_count || 0) + 1 } : t
      ));
    } catch (error) {
      alert(error.response?.data?.detail || '댓글 작성에 실패했습니다.');
    }
    setSubmitting(false);
  };

  const deleteComment = async (commentId, threadId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/threads/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(prev => ({
        ...prev,
        [threadId]: prev[threadId].filter(c => c.id !== commentId)
      }));
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, comment_count: Math.max((t.comment_count || 1) - 1, 0) } : t
      ));
    } catch (error) {
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60 * 1000) return '방금';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}분`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}시간`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}일`;
    
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { text: '훈장님', class: 'admin' },
      staff: { text: '스태프', class: 'staff' },
      member: { text: '', class: 'member' }
    };
    return badges[role] || { text: '', class: 'member' };
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // 유튜브 URL에서 비디오 ID 추출
  const getYoutubeVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
      /youtube\.com\/shorts\/([^&\s?]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // 내용 렌더링
  const renderContent = (content) => {
    if (!content) return null;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const lines = content.split('\n');
    
    return lines.map((line, lineIndex) => {
      const parts = line.split(urlRegex);
      
      return (
        <div key={lineIndex} className="content-line">
          {parts.map((part, partIndex) => {
            if (urlRegex.test(part)) {
              const cleanUrl = part.replace(/[.,!?;:]+$/, '');
              const youtubeId = getYoutubeVideoId(cleanUrl);
              
              if (youtubeId) {
                return (
                  <div key={partIndex} className="youtube-embed">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title="YouTube video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
              
              return (
                <a 
                  key={partIndex}
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="content-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  {cleanUrl}
                </a>
              );
            }
            return part || null;
          })}
        </div>
      );
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
        <h1>훈장님 한마디</h1>
        <div className="header-spacer"></div>
      </header>

      <div className="thread-list-content">
        {threads.length === 0 ? (
          <div className="no-threads">
            <p>아직 게시글이 없습니다.</p>
          </div>
        ) : (
          <div className="threads">
            {threads.map(thread => (
              <div key={thread.id} className={`thread-item ${thread.is_pinned ? 'pinned' : ''}`}>
                {/* 헤더 - 프로필 스타일 */}
                <div className="thread-header" onClick={() => toggleThread(thread.id)}>
                  <div className="author-avatar">
                    {getInitial(thread.author?.name)}
                  </div>
                  <div className="thread-header-content">
                    <div className="thread-author-row">
                      <span className="thread-author">{thread.author?.name}</span>
                      {thread.author?.role === 'admin' && <span className="verified-badge">✓</span>}
                      <span className="thread-date">{formatDate(thread.created_at)}</span>
                      {thread.is_pinned && <span className="pin-icon">📌</span>}
                    </div>
                    <h3 className="thread-title">{thread.title}</h3>
                  </div>
                </div>

                {/* 내용 */}
                <div className="thread-content">
                  {renderContent(thread.content)}
                </div>

                {/* 액션 버튼들 */}
                <div className="thread-actions">
                  <button className="action-btn" onClick={() => toggleThread(thread.id)}>
                    <span className="action-icon">💬</span>
                    <span>{thread.comment_count || 0}</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">👁</span>
                    <span>{thread.view_count || 0}</span>
                  </button>
                </div>

                {/* 댓글 섹션 */}
                {expandedThread === thread.id && (
                  <div className="comments-section">
                    {/* 댓글 목록 */}
                    {comments[thread.id]?.length > 0 && (
                      <div className="comments-list">
                        {comments[thread.id].map(comment => (
                          <div key={comment.id} className="comment-item">
                            <div className="comment-avatar">
                              {getInitial(comment.user?.name)}
                            </div>
                            <div className="comment-body">
                              <div className="comment-header">
                                <span className="comment-author">{comment.user?.name}</span>
                                {getRoleBadge(comment.user?.role).text && (
                                  <span className={`role-badge ${getRoleBadge(comment.user?.role).class}`}>
                                    {getRoleBadge(comment.user?.role).text}
                                  </span>
                                )}
                                <span className="comment-date">{formatDate(comment.created_at)}</span>
                                {user && (user.id === comment.user_id || user.role === 'admin') && (
                                  <button 
                                    className="delete-btn"
                                    onClick={() => deleteComment(comment.id, thread.id)}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                              <div className="comment-content">{comment.content}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 댓글 입력 */}
                    <div className="comment-form">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={`${user?.name}(으)로 댓글 달기...`}
                        onKeyPress={(e) => e.key === 'Enter' && submitComment(thread.id)}
                        disabled={submitting}
                      />
                      <button 
                        onClick={() => submitComment(thread.id)}
                        disabled={submitting || !newComment.trim()}
                      >
                        게시
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ThreadList;
