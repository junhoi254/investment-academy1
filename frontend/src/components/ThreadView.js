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

  useEffect(() => {
    loadThread();
    loadComments();
  }, [threadId]);

  const loadThread = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/threads/${threadId}`);
      setThread(response.data);
    } catch (error) {
      console.error('쓰레드 로딩 실패:', error);
      alert('쓰레드를 찾을 수 없습니다.');
      navigate('/chat');
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

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    
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
        <div className="error">쓰레드를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="thread-view-container">
      <header className="thread-header">
        <button className="back-button" onClick={() => navigate('/chat')}>
          ← 목록으로
        </button>
        <div className="thread-stats-header">
          <span>👁 {thread.view_count}</span>
          <span>💬 {comments.length}</span>
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
          {thread.content.split('\n').map((line, i) => (
            <p key={i}>{line || <br />}</p>
          ))}
        </div>
      </article>

      <section className="comments-section">
        <h2>💬 댓글 ({comments.length})</h2>
        
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
        {user ? (
          user.is_approved ? (
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
          ) : (
            <div className="comment-notice warning">
              ⚠️ 승인된 회원만 댓글을 작성할 수 있습니다.
            </div>
          )
        ) : (
          <div className="comment-notice">
            💡 댓글을 작성하려면 <a href="/login">로그인</a>이 필요합니다.
          </div>
        )}
      </section>
    </div>
  );
}

export default ThreadView;
