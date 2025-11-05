import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { getWebSocketURL, createWebSocket } from '../utils/websocket';

const Chat = () => {
  const { friendId } = useParams();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [user, setUser] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const userIdRef = useRef(null); // Store user ID in ref for WebSocket handler
  const scrollerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchData = async () => {
      try {
        const userRes = await axios.get('/api/me/', { headers: { Authorization: `Bearer ${token}` } });
        setUser(userRes.data);
        userIdRef.current = userRes.data.id; // Store in ref for WebSocket handler

        const messagesRes = await axios.get(`/api/messages/${friendId}/`, { headers: { Authorization: `Bearer ${token}` } });
        setMessages(messagesRes.data.map(msg => ({
          ...msg,
          displayContent: msg.sender.id === userRes.data.id ? msg.content : msg.translated_content
        })));
      } catch (err) {
        console.error('Error fetching chat data:', err);
      }
    };
    fetchData();

    // Setup WebSocket connection with retry logic
    const wsUrl = getWebSocketURL('/ws/chat/', token);
    const wsConnection = createWebSocket(
      wsUrl,
      (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.error) {
            console.error('WebSocket error:', data.error);
            alert(`Error: ${data.error}`);
            return;
          }
          // Check if message is for this chat
          if (data.receiver === parseInt(friendId) || data.sender === parseInt(friendId)) {
            // Use ref to get current user ID (avoids closure issue)
            const currentUserId = userIdRef.current;
            const displayContent = data.sender === currentUserId ? data.content : data.translated_content;
            setMessages(prev => [...prev, { ...data, displayContent }]);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      },
      (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      },
      () => {
        setWsConnected(true);
      },
      (event) => {
        setWsConnected(false);
        if (event.code !== 1000 && event.code !== 1001) {
          console.error('WebSocket closed unexpectedly:', event.code, event.reason);
        }
      }
    );
    
    wsRef.current = wsConnection;
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [friendId]); // Remove user?.id from dependencies to avoid reconnection loop

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const ws = wsRef.current?.ws();
    if (ws && ws.readyState === WebSocket.OPEN && content.trim()) {
      try {
        ws.send(JSON.stringify({ action: 'send_message', receiver_id: parseInt(friendId), content: content.trim() }));
        setContent('');
      } catch (err) {
        console.error('Error sending message:', err);
        alert('Failed to send message. Please try again.');
      }
    } else if (!content.trim()) {
      alert('Please enter a message');
    } else {
      alert('WebSocket not connected. Please wait for connection or refresh the page.');
      // Try to reconnect
      if (wsRef.current) {
        wsRef.current.reconnect();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="container py-4">
      <div className="chat-wrapper fade-in-up">
        <div className="chat-header">
          <h2 className="h5 mb-0">Chat</h2>
          <div className="d-flex align-items-center">
            <span className={`badge ${wsConnected ? 'bg-success' : 'bg-warning'} me-2`}>
              {wsConnected ? 'Connected' : 'Connecting...'}
            </span>
            {!wsConnected && (
              <button
                onClick={() => wsRef.current?.reconnect()}
                className="btn btn-sm btn-outline-primary"
              >
                Retry
              </button>
            )}
          </div>
        </div>

        <div className="chat-scroller" ref={scrollerRef}>
          {messages.map(msg => {
            const isCurrentUser = msg.sender?.id === user?.id || msg.sender === user?.id;
            const ts = msg.timestamp ? new Date(msg.timestamp) : null;
            const timeStr = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div key={msg.id} className={`msg-row ${isCurrentUser ? 'me' : ''}`}>
                <div className={`msg-bubble ${isCurrentUser ? 'me' : ''}`}>
                  <div>{msg.displayContent || msg.content}</div>
                  <span className="msg-meta">{timeStr}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="chat-input">
          <div className="input-group">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="form-control"
              placeholder="Type a message and press Enter"
            />
            <button onClick={handleSend} className="btn btn-primary">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;