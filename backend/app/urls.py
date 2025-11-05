from django.urls import path
from .views import SignupView, MeView, UserListView, FriendsView, FriendRequestView, MessagesView, FriendRequestsView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('me/', MeView.as_view(), name='me'),
    path('users/', UserListView.as_view(), name='users'),
    path('friends/', FriendsView.as_view(), name='friends'),
    path('friend-requests/', FriendRequestsView.as_view(), name='friend-requests'),
    path('friend-request/<int:user_id>/', FriendRequestView.as_view(), name='friend-request'),
    path('messages/<int:friend_id>/', MessagesView.as_view(), name='messages'),
]