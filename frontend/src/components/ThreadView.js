import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ThreadView.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ThreadView({ user }) {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    // 승인된 회원 + 관리자/스태프만 접근 가능
    if (!user || !(user.is_approved || user.role === 'admin' || user.role === 'staff')) {
      alert('승인된 회원만 이용할 수 있습니다.');
      navigate('/chat');
      return;
    }
    loadThread();
  }, [threadId, user, navigate]);

  const loadThread = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/threads/${threadId}`);
      setThread(response.data);
    } catch (error) {
      console.error('쓰레드 로딩 실패:', error);
      alert('게시글을 찾을 수 없습니다.');
      navigate('/threads');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/threads/${threadId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('댓글 로딩 실패:', error);
    }
  };

  const toggleComments = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/threads/${threadId}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([...comments, response.data]);
      setNewComment('');
      // 댓글 수 업데이트
      setThread(prev => ({
        ...prev,
        comment_count: (prev.comment_count || 0) + 1
      }));
    } catch (error) {
      alert(error.response?.data?.detail || '댓글 작성에 실패했습니다.');
    }
    setSubmitting(false);
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/threads/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(comments.filter(c => c.id !== commentId));
      // 댓글 수 업데이트
      setThread(prev => ({
        ...prev,
        comment_count: Math.max((prev.comment_count || 1) - 1, 0)
      }));
    } catch (error) {
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { text: '일타훈장님', class: 'admin' },
      staff: { text: '서브관리자', class: 'staff' },
      member: { text: '회원', class: 'member' }
    };
    return badges[role] || { text: '회원', class: 'member' };
  };

  // URL을 링크로 변환하는 함수
  const renderContentWithLinks = (content) => {
    if (!content) return null;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const lines = content.split('\n');
    
    return lines.map((line, lineIndex) => {
      const parts = line.split(urlRegex);
      
      return (
        <p key={lineIndex}>
          {parts.map((part, partIndex) => {
            if (urlRegex.test(part)) {
              // URL 끝에 붙은 특수문자 제거
              const cleanUrl = part.replace(/[.,!?;:]+$/, '');
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
          {parts.length === 0 && <br />}
        </p>
      );
    });
  };

  if (loading) {
    return (
      <div className="thread-view-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="thread-view-container">
        <div className="error">게시글을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="thread-view-container">
      <header className="thread-header">
        <button className="back-button" onClick={() => navigate('/threads')}>
          ← 목록
        </button>
        <div className="thread-stats-header">
          <span>👁 {thread.view_count}</span>
        </div>
      </header>

      <article className="thread-content">
        <div className="thread-title-area">
          {thread.is_pinned && <span className="pinned-badge">📌 고정글</span>}
          <h1>{thread.title}</h1>
        </div>
        
        <div className="thread-meta">
          <div className="author-info">
            <span className="author-name">{thread.author?.name}</span>
            <span className={`role-badge ${getRoleBadge(thread.author?.role).class}`}>
              {getRoleBadge(thread.author?.role).text}
            </span>
          </div>
          <span className="thread-date">{formatDate(thread.created_at)}</span>
        </div>

        <div className="thread-body">
          {renderContentWithLinks(thread.content)}
        </div>
      </article>

      {/* 댓글 토글 버튼 */}
      <div className="comments-toggle-container">
        <button 
          className={`comments-toggle-btn ${showComments ? 'active' : ''}`}
          onClick={toggleComments}
        >
          💬 댓글 {thread.comment_count || 0}개 {showComments ? '접기 ▲' : '보기 ▼'}
        </button>
      </div>

      {/* 댓글 섹션 - 토글 시에만 표시 */}
      {showComments && (
        <section className="comments-section">
          {comments.length === 0 ? (
            <div className="no-comments">
              아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
            </div>
          ) : (
            <div className="comments-list">
              {comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <div className="comment-author">
                      <span className="author-name">{comment.user?.name}</span>
                      <span className={`role-badge small ${getRoleBadge(comment.user?.role).class}`}>
                        {getRoleBadge(comment.user?.role).text}
                      </span>
                    </div>
                    <div className="comment-actions">
                      <span className="comment-date">{formatDate(comment.created_at)}</span>
                      {user && (user.id === comment.user_id || user.role === 'admin') && (
                        <button 
                          className="delete-comment-btn"
                          onClick={() => deleteComment(comment.id)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="comment-content">
                    {comment.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 댓글 작성 폼 */}
          <form className="comment-form" onSubmit={submitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              rows={3}
              disabled={submitting}
            />
            <button type="submit" disabled={submitting || !newComment.trim()}>
              {submitting ? '등록 중...' : '댓글 등록'}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

export default ThreadView;
