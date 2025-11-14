import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { getWebSocketURL, createWebSocket } from '../lib/websocket';
import {Button} from "./ui/button";
import {Plus , Smile , Send } from 'lucide-react'
import { Input } from "./ui/input";

const Chat = () => {
  const { friendId } = useParams();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [user, setUser] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const userIdRef = useRef(null);
  const scrollerRef = useRef(null);

  const onRetry =()=> console.log("retry");

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchData = async () => {
      try {
        const userRes = await axios.get('/api/me/', { headers: { Authorization: `Bearer ${token}` } });
        setUser(userRes.data);
        userIdRef.current = userRes.data.id;

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

          // ✅ Fixed duplication issue here
          if (data.receiver === parseInt(friendId) || data.sender === parseInt(friendId)) {
            const currentUserId = userIdRef.current;
            const displayContent =
              data.sender === currentUserId
                ? data.content
                : (data.translated_content || data.content);

            setMessages(prev => {
              // prevent duplicates by checking unique message id
              const exists = prev.some(m => m.id === data.id);
              if (exists) return prev;

              return [...prev, { ...data, displayContent }];
            });
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
  }, [friendId]);

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
                <div key={msg.id || `${msg.sender}-${msg.timestamp}`} className={`msg-row ${isCurrentUser ? 'me' : ''}`}>
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


      // <div className="flex flex-col h-screen bg-background">
      //   {/* Header */}
      //   <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm">
      //     <div>
      //       <h1 className="text-xl font-semibold text-foreground">Messages</h1>
      //       <p className="text-sm text-muted-foreground mt-0.5">AI Translator Chat</p>
      //     </div>
      //     <div className="flex items-center gap-3">
      //       <div className="flex items-center gap-2">
      //         <div className={`w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-green-500" : "bg-yellow-500"}`}></div>
      //         <span className="text-xs font-medium text-muted-foreground">
      //         {wsConnected ? "Connected" : "Connecting..."}
      //       </span>
      //       </div>
      //       {!wsConnected && (
      //           <Button onClick={onRetry} size="sm" variant="outline" className="text-xs bg-transparent">
      //             Retry
      //           </Button>
      //       )}
      //     </div>
      //   </div>
      //
      //   {/* Messages Container */}
      //   <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-background">
      //     {messages.length === 0 ? (
      //         <div className="flex items-center justify-center h-full">
      //           <div className="text-center">
      //             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
      //               <MessageCircleIcon className="w-8 h-8 text-primary"/>
      //             </div>
      //             <p className="text-foreground font-medium mb-1">No messages yet</p>
      //             <p className="text-sm text-muted-foreground">Start a conversation by sending a message</p>
      //           </div>
      //         </div>
      //     ) : (
      //         messages.map((msg) => {
      //           const isCurrentUser = msg.sender?.id === user?.id || msg.sender === user?.id
      //           const ts = msg.timestamp ? new Date(msg.timestamp) : null
      //           const timeStr = ts ? ts.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}) : ""
      //
      //           return (
      //               <div
      //                   key={msg.id || `${msg.sender}-${msg.timestamp}`}
      //                   className={`flex gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}
      //               >
      //                 {!isCurrentUser && (
      //                     <Avatar className="w-8 h-8 flex-shrink-0">
      //                       <AvatarImage src={msg.sender?.avatar || "/placeholder.svg"} alt={msg.sender?.username}/>
      //                       <AvatarFallback className="text-xs font-semibold">
      //                         {getInitials(msg.sender?.username)}
      //                       </AvatarFallback>
      //                     </Avatar>
      //                 )}
      //
      //                 <div className={`flex flex-col gap-1 max-w-xs ${isCurrentUser ? "items-end" : "items-start"}`}>
      //                   <div
      //                       className={`px-4 py-2.5 rounded-2xl break-words ${
      //                           isCurrentUser
      //                               ? "bg-primary text-primary-foreground rounded-br-none"
      //                               : "bg-muted text-foreground rounded-bl-none"
      //                       }`}
      //                   >
      //                     <p className="text-sm leading-relaxed">{msg.displayContent || msg.content}</p>
      //                   </div>
      //
      //                   <span className="text-xs text-muted-foreground px-2">{timeStr}</span>
      //                 </div>
      //
      //                 {isCurrentUser && (
      //                     <Avatar className="w-8 h-8 flex-shrink-0">
      //                       <AvatarImage src={msg.sender?.avatar || "/placeholder.svg"} alt="You"/>
      //                       <AvatarFallback
      //                           className="text-xs font-semibold">{getInitials(user?.username)}</AvatarFallback>
      //                     </Avatar>
      //                 )}
      //               </div>
      //           )
      //         })
      //     )}
      //   </div>
      //
      //   {/* Input Area */}
      //   <div className="px-6 py-4 border-t border-border bg-card">
      //     <div className="flex items-end gap-3">
      //       <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground">
      //         <Plus className="w-5 h-5"/>
      //       </Button>
      //
      //       <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
      //         <Input
      //             type="text"
      //             value={content}
      //             onChange={(e) => setContent(e.target.value)}
      //             onKeyDown={handleKeyDown}
      //             placeholder="Aa"
      //             className="bg-transparent border-0 focus-visible:ring-0 p-0 text-sm placeholder:text-muted-foreground"
      //         />
      //         <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground">
      //           <Smile className="w-5 h-5"/>
      //         </Button>
      //       </div>
      //
      //       <Button
      //           onClick={handleSend}
      //           size="icon"
      //           className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
      //           disabled={!content.trim()}
      //       >
      //         <Send className="w-5 h-5"/>
      //       </Button>
      //     </div>
      //   </div>
      // </div>
  );
};

export default Chat;
// function MessageCircleIcon(props) {
//   return (
//       <svg
//           {...props}
//           xmlns="http://www.w3.org/2000/svg"
//           viewBox="0 0 24 24"
//           fill="none"
//           stroke="currentColor"
//           strokeWidth="2"
//           strokeLinecap="round"
//           strokeLinejoin="round"
//       >
//         <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
//       </svg>
//   )
// }
