import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './GlobalTrading.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://investment-academy1-backend.onrender.com';

function GlobalTrading({ user }) {
  const navigate = useNavigate();
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [source, setSource] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMarketAnalysis();
    
    // 5분마다 자동 갱신
    const interval = setInterval(loadMarketAnalysis, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadMarketAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/market/analysis`);
      console.log('시황 데이터:', response.data);
      
      if (response.data.success) {
        setMarketData(response.data.data || []);
        setUpdatedAt(response.data.updated_at);
        setSource(response.data.source);
      } else {
        setError(response.data.error || '데이터를 불러올 수 없습니다');
      }
    } catch (err) {
      console.error('시황 로딩 실패:', err);
      setError('서버 연결 실패');
    } finally {
      setLoading(false);
    }
  };

  const refreshMarketAnalysis = async () => {
    if (!user || user.role !== 'admin') return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/market/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setMarketData(response.data.data || []);
        setUpdatedAt(response.data.updated_at);
        setSource(response.data.source);
      }
    } catch (err) {
      console.error('갱신 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDirectionStyle = (direction) => {
    switch (direction) {
      case 'BUY': return 'direction-buy';
      case 'SELL': return 'direction-sell';
      default: return 'direction-neutral';
    }
  };

  const getDirectionText = (direction) => {
    switch (direction) {
      case 'BUY': return '📈 매수 관점';
      case 'SELL': return '📉 매도 관점';
      default: return '⏸️ 중립';
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="global-trading-container">
      <header className="global-trading-header">
        <button className="back-button" onClick={() => navigate('/chat')}>
          ← 뒤로
        </button>
        <h1>📊 오늘의 글로벌 매매</h1>
        <div className="header-actions">
          {user?.role === 'admin' && (
            <button 
              className="refresh-button"
              onClick={refreshMarketAnalysis}
              disabled={loading}
            >
              🔄
            </button>
          )}
        </div>
      </header>

      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">데이터 소스:</span>
          <span className={`status-value ${source === 'mt4' ? 'source-mt4' : 'source-fallback'}`}>
            {source === 'mt4' ? '🟢 MT4 실시간' : '🟡 기본값'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">업데이트:</span>
          <span className="status-value">{formatTime(updatedAt)}</span>
        </div>
      </div>

      <div className="market-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>시황 분석 로딩 중...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-icon">⚠️</p>
            <p className="error-text">{error}</p>
            <button className="retry-button" onClick={loadMarketAnalysis}>
              다시 시도
            </button>
          </div>
        ) : marketData.length === 0 ? (
          <div className="empty-container">
            <p>📭 분석 데이터가 없습니다</p>
            <p className="empty-hint">MT4 EA가 실행 중인지 확인하세요</p>
          </div>
        ) : (
          <div className="market-cards">
            {marketData.map((item, index) => (
              <div key={index} className={`market-card ${getDirectionStyle(item.direction)}`}>
                <div className="card-header">
                  <span className="symbol-name">{item.symbol}</span>
                  <span className="symbol-code">{item.symbol_code}</span>
                </div>
                
                <div className="card-direction">
                  {getDirectionText(item.direction)}
                </div>
                
                <div className="card-price">
                  <span className="price-label">현재가</span>
                  <span className="price-value">
                    {item.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                  </span>
                </div>
                
                <div className="card-indicators">
                  <div className="indicator">
                    <span className="indicator-label">RSI</span>
                    <span className={`indicator-value ${item.rsi > 70 ? 'high' : item.rsi < 30 ? 'low' : ''}`}>
                      {item.rsi?.toFixed(1)}
                    </span>
                  </div>
                  <div className="indicator">
                    <span className="indicator-label">점수</span>
                    <span className={`indicator-value ${item.score > 0 ? 'positive' : item.score < 0 ? 'negative' : ''}`}>
                      {item.score > 0 ? '+' : ''}{item.score}
                    </span>
                  </div>
                </div>
                
                {item.reasons && item.reasons.length > 0 && (
                  <div className="card-reasons">
                    {item.reasons.map((reason, i) => (
                      <span key={i} className="reason-tag">{reason}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="disclaimer">
        ⚠️ 본 분석은 기술적 지표 기반 자동 분석이며, 투자 권유가 아닙니다.
        투자 판단은 본인 책임입니다.
      </div>
    </div>
  );
}

export default GlobalTrading;
