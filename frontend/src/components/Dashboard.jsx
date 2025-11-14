import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { getWebSocketURL, createWebSocket } from '../lib/websocket';
import { LogOut, MessageSquare, Users, UserPlus, Bell, Settings } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);
  const navigate = useNavigate();


  useEffect(() => {
    const token = localStorage.getItem('access_token');
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
      // <div className="container py-4">
      //   <div className="d-flex justify-content-between align-items-center mb-4">
      //     <h2 className="h4">Welcome, {user.username}!</h2>
      //     <button onClick={handleLogout} className="btn btn-outline-secondary">
      //       Logout
      //     </button>
      //   </div>
      //
      //   {/* Notifications */}
      //   {notifications.length > 0 && (
      //     <div className="alert alert-info alert-dismissible fade show" role="alert">
      //       <strong>New Friend Requests:</strong>
      //       <ul className="mb-0 mt-2">
      //         {notifications.map(notif => (
      //           <li key={notif.id}>
      //             {notif.message}
      //             <button
      //               onClick={() => handleAcceptRequest(notif.friendshipId, notif.fromUser.id)}
      //               className="btn btn-sm btn-success ms-2"
      //             >
      //               Accept
      //             </button>
      //             <button
      //               onClick={() => dismissNotification(notif.id)}
      //               className="btn btn-sm btn-secondary ms-1"
      //             >
      //               Dismiss
      //             </button>
      //           </li>
      //         ))}
      //       </ul>
      //     </div>
      //   )}
      //
      //   {/* Pending Friend Requests */}
      //   {friendRequests.length > 0 && (
      //     <div className="card mb-4">
      //       <div className="card-body">
      //         <h5 className="card-title">Pending Friend Requests ({friendRequests.length})</h5>
      //         <ul className="list-group">
      //           {friendRequests.map(request => (
      //             <li key={request.id} className="list-group-item d-flex justify-content-between align-items-center">
      //               <span>{request.from_user.username} ({request.from_user.email})</span>
      //               <button
      //                 onClick={() => handleAcceptRequest(request.id, request.from_user.id)}
      //                 className="btn btn-sm btn-success"
      //               >
      //                 Accept Request
      //               </button>
      //             </li>
      //           ))}
      //         </ul>
      //       </div>
      //     </div>
      //   )}
      //
      //   <div className="row mb-4">
      //     <div className="col-md-6 mb-3">
      //       <div className="card">
      //         <div className="card-body">
      //           <h5 className="card-title">Your Profile</h5>
      //           <p className="card-text">
      //             <strong>Username:</strong> {user.username}<br />
      //             <strong>Email:</strong> {user.email}<br />
      //             <strong>Preferred Language:</strong> {user.preferred_language}
      //           </p>
      //         </div>
      //       </div>
      //     </div>
      //     <div className="col-md-6 mb-3">
      //       <div className="card">
      //         <div className="card-body">
      //           <h5 className="card-title">Quick Actions</h5>
      //           <Link to="/users" className="btn btn-primary me-2 mb-2">
      //             Find Users
      //           </Link>
      //           <br />
      //           <Link to="/users" className="btn btn-outline-primary">
      //             Manage Friends
      //           </Link>
      //         </div>
      //       </div>
      //     </div>
      //   </div>
      //
      //   <div className="card">
      //     <div className="card-body">
      //       <h5 className="card-title">Your Friends ({friends.length})</h5>
      //       {friends.length === 0 ? (
      //         <p className="text-muted">You don't have any friends yet. <Link to="/users">Find users</Link> to start chatting!</p>
      //       ) : (
      //         <ul className="list-group">
      //           {friends.map(friend => (
      //             <li key={friend.id} className="list-group-item d-flex justify-content-between align-items-center">
      //               <span>{friend.username} ({friend.email})</span>
      //               <Link to={`/chat/${friend.id}`} className="btn btn-sm btn-primary">
      //                 Chat
      //               </Link>
      //             </li>
      //           ))}
      //         </ul>
      //       )}
      //     </div>
      //   </div>
      // </div>

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/5">
        {/* Header */}
        <header
            className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white"/>
              </div>
              <h1 className="text-xl font-semibold text-foreground">TranslateChat</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.username}</span>
              <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2 bg-transparent">
                <LogOut className="w-4 h-4"/>
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Notifications */}
          {notifications.length > 0 && (
              <div
                  className="mb-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <div className="flex gap-3 items-start">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"/>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                      Friend Requests ({notifications.length})
                    </h3>
                    <ul className="space-y-2">
                      {notifications.map((notif) => (
                          <li
                              key={notif.id}
                              className="flex items-center justify-between bg-white dark:bg-background p-3 rounded-lg border border-blue-100 dark:border-blue-900"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{notif.fromUser.username[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground">{notif.message}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                  onClick={() => handleAcceptRequest(notif.friendshipId, notif.fromUser.id)}
                                  size="sm"
                                  className="gap-1"
                              >
                                <UserPlus className="w-3 h-3"/>
                                Accept
                              </Button>
                              <Button onClick={() => dismissNotification(notif.id)} variant="ghost" size="sm">
                                Dismiss
                              </Button>
                            </div>
                          </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
          )}

          {/* Profile & Quick Actions Grid */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Profile Card */}
            <Card className="lg:col-span-1 border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Username</p>
                  <p className="text-sm font-medium text-foreground">{user.username}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                  <p className="text-sm font-medium text-foreground break-all">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Preferred Language</p>
                  <Badge variant="secondary">{user.preferred_language}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="lg:col-span-2 border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5"/>
                  Quick Actions
                </CardTitle>
                <CardDescription>Manage your connections and explore features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Link href="/users" className="block">
                    <Button
                        className="w-full gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                      <Users className="w-4 h-4"/>
                      Find Users
                    </Button>
                  </Link>
                  <Link href="/users" className="block">
                    <Button variant="outline" className="w-full gap-2 bg-transparent">
                      <Users className="w-4 h-4"/>
                      Manage Friends
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Requests */}
          {friendRequests.length > 0 && (
              <Card className="mb-8 border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5"/>
                  Pending Friend Requests
                </span>
                    <Badge variant="outline">{friendRequests.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {friendRequests.map((request) => (
                        <div
                            key={request.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="h-9 w-9 flex-shrink-0">
                              <AvatarFallback>{request.from_user.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{request.from_user.username}</p>
                              <p className="text-xs text-muted-foreground truncate">{request.from_user.email}</p>
                            </div>
                          </div>
                          <Button
                              onClick={() => handleAcceptRequest(request.id, request.from_user.id)}
                              size="sm"
                              className="gap-1 flex-shrink-0"
                          >
                            <UserPlus className="w-3 h-3"/>
                            Accept
                          </Button>
                        </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
          )}

          {/* Friends List */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5"/>
                Your Friends
              </span>
                <Badge variant="outline">{friends.length}</Badge>
              </CardTitle>
              <CardDescription>
                {friends.length === 0
                    ? "No friends yet. Find users to start chatting!"
                    : "Start a conversation with your friends"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4"/>
                    <p className="text-muted-foreground mb-4">You don't have any friends yet.</p>
                    <Link href="/users">
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2"/>
                        Find Users to Connect
                      </Button>
                    </Link>
                  </div>
              ) : (
                  <div className="grid gap-2">
                    {friends.map((friend) => (
                        <div
                            key={friend.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarFallback
                                  className="bg-gradient-to-br from-purple-500 to-pink-600 text-white font-medium">
                                {friend.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{friend.username}</p>
                              <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                            </div>
                          </div>
                          <Link href={`/chat/${friend.id}`} className="flex-shrink-0">
                            <Button size="sm" className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MessageSquare className="w-3 h-3"/>
                              Chat
                            </Button>
                          </Link>
                        </div>
                    ))}
                  </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
  );
};

export default Dashboard;

