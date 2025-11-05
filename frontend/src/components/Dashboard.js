import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { getWebSocketURL, createWebSocket } from '../utils/websocket';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const userRes = await axios.get('/api/me/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userRes.data);

        const friendsRes = await axios.get('/api/friends/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriends(friendsRes.data);

        const requestsRes = await axios.get('/api/friend-requests/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriendRequests(requestsRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };

    fetchData();

    // Setup WebSocket for real-time notifications
    const wsUrl = getWebSocketURL('/ws/chat/', token);
    const wsConnection = createWebSocket(
      wsUrl,
      (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'friend_request') {
            setNotifications(prev => [...prev, {
              id: Date.now(),
              message: `${data.from_user.username} sent you a friend request`,
              fromUser: data.from_user,
              friendshipId: data.friendship_id
            }]);
            // Refresh friend requests
            fetchData();
          }
        } catch (err) {
          console.error('Error parsing notification:', err);
        }
      },
      (error) => console.error('WebSocket error:', error),
      () => console.log('WebSocket connected for notifications'),
      (event) => console.log('WebSocket closed:', event.code)
    );
    
    wsRef.current = wsConnection;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [navigate]);

  const handleLogout = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleAcceptRequest = async (friendshipId, fromUserId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`/api/friend-request/${fromUserId}/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove notification
      setNotifications(prev => prev.filter(n => n.friendshipId !== friendshipId));
      // Refresh data
      const friendsRes = await axios.get('/api/friends/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(friendsRes.data);
      const requestsRes = await axios.get('/api/friend-requests/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriendRequests(requestsRes.data);
      alert('Friend request accepted!');
    } catch (err) {
      alert('Failed to accept friend request');
    }
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!user) {
    return <div className="container py-4">Loading...</div>;
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h4">Welcome, {user.username}!</h2>
        <button onClick={handleLogout} className="btn btn-outline-secondary">
          Logout
        </button>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="alert alert-info alert-dismissible fade show" role="alert">
          <strong>New Friend Requests:</strong>
          <ul className="mb-0 mt-2">
            {notifications.map(notif => (
              <li key={notif.id}>
                {notif.message}
                <button 
                  onClick={() => handleAcceptRequest(notif.friendshipId, notif.fromUser.id)}
                  className="btn btn-sm btn-success ms-2"
                >
                  Accept
                </button>
                <button 
                  onClick={() => dismissNotification(notif.id)}
                  className="btn btn-sm btn-secondary ms-1"
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pending Friend Requests */}
      {friendRequests.length > 0 && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Pending Friend Requests ({friendRequests.length})</h5>
            <ul className="list-group">
              {friendRequests.map(request => (
                <li key={request.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{request.from_user.username} ({request.from_user.email})</span>
                  <button 
                    onClick={() => handleAcceptRequest(request.id, request.from_user.id)}
                    className="btn btn-sm btn-success"
                  >
                    Accept Request
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Your Profile</h5>
              <p className="card-text">
                <strong>Username:</strong> {user.username}<br />
                <strong>Email:</strong> {user.email}<br />
                <strong>Preferred Language:</strong> {user.preferred_language}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Quick Actions</h5>
              <Link to="/users" className="btn btn-primary me-2 mb-2">
                Find Users
              </Link>
              <br />
              <Link to="/users" className="btn btn-outline-primary">
                Manage Friends
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Your Friends ({friends.length})</h5>
          {friends.length === 0 ? (
            <p className="text-muted">You don't have any friends yet. <Link to="/users">Find users</Link> to start chatting!</p>
          ) : (
            <ul className="list-group">
              {friends.map(friend => (
                <li key={friend.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{friend.username} ({friend.email})</span>
                  <Link to={`/chat/${friend.id}`} className="btn btn-sm btn-primary">
                    Chat
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

