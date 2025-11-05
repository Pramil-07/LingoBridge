import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState([]);  // For checking if already friends

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchData = async () => {
      try {
        const usersRes = await axios.get(`/api/users/?search=${search}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(usersRes.data);

        const friendsRes = await axios.get('/api/friends/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFriends(friendsRes.data.map(f => f.id));
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    };
    fetchData();
  }, [search]);

  const handleSendRequest = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(`/api/friend-request/${userId}/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const message = res.data.message || 'Friend request sent';
      alert(message);
      // Refresh friends list
      const friendsRes = await axios.get('/api/friends/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriends(friendsRes.data.map(f => f.id));
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Request failed. Please try again.';
      alert(errorMsg);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="h4 mb-3">Search Users</h2>
      <input type="text" placeholder="Search by username or email" value={search} onChange={(e) => setSearch(e.target.value)} className="form-control mb-3" />
      <ul className="list-group">
        {users.map(user => (
          <li key={user.id} className="list-group-item d-flex justify-content-between align-items-center">
            {user.username} ({user.email})
            {!friends.includes(user.id) ? (
              <button onClick={() => handleSendRequest(user.id)} className="btn btn-sm btn-outline-primary">Send Request</button>
            ) : (
              <span className="badge bg-success">Friend</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;