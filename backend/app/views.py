from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from .models import User, Friendship, Message
from .serializers import UserSerializer, FriendshipSerializer, MessageSerializer

class SignupView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        preferred_language = request.data.get('preferred_language', 'en')
        
        # Validation
        if not username or not email or not password:
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        if preferred_language not in ['en', 'fr', 'es']:
            preferred_language = 'en'
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                preferred_language=preferred_language
            )
            return Response({'message': 'User created', 'id': user.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        search = request.query_params.get('search', '').strip()
        # Exclude current user
        users = User.objects.exclude(id=request.user.id)
        
        if search:
            users = users.filter(
                Q(username__icontains=search) | Q(email__icontains=search)
            )
        
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

class FriendsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get all friendships where user is involved and accepted
        friendships = Friendship.objects.filter(
            (Q(from_user=request.user) | Q(to_user=request.user)),
            accepted=True
        )
        serializer = FriendshipSerializer(friendships, many=True)
        # Return list of friend user objects
        friends = []
        for friendship in friendships:
            friend = friendship.to_user if friendship.from_user == request.user else friendship.from_user
            friends.append(UserSerializer(friend).data)
        return Response(friends)

class FriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get pending friend requests sent TO the current user
        pending_requests = Friendship.objects.filter(
            to_user=request.user,
            accepted=False
        )
        
        requests_data = []
        for friendship in pending_requests:
            requests_data.append({
                'id': friendship.id,
                'from_user': UserSerializer(friendship.from_user).data,
                'timestamp': friendship.timestamp.isoformat()
            })
        
        return Response(requests_data)

class FriendRequestView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if target_user == request.user:
            return Response({'error': 'Cannot send friend request to yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if friendship already exists
        existing = Friendship.objects.filter(
            (Q(from_user=request.user, to_user=target_user) | Q(from_user=target_user, to_user=request.user))
        ).first()
        
        if existing:
            if existing.accepted:
                return Response({'error': 'Already friends'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # If request exists but not accepted, accept it if from target_user
                if existing.from_user == target_user:
                    existing.accepted = True
                    existing.save()
                    return Response({'message': 'Friend request accepted'}, status=status.HTTP_200_OK)
                else:
                    return Response({'error': 'Friend request already sent'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new friendship request
        friendship = Friendship.objects.create(
            from_user=request.user,
            to_user=target_user,
            accepted=False
        )
        
        # Send WebSocket notification to target user
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'user_{target_user.id}',
                {
                    'type': 'friend_request_notification',
                    'message': {
                        'type': 'friend_request',
                        'from_user': UserSerializer(request.user).data,
                        'friendship_id': friendship.id,
                    }
                }
            )
        
        return Response({'message': 'Friend request sent'}, status=status.HTTP_201_CREATED)

class MessagesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, friend_id):
        try:
            friend = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response({'error': 'Friend not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if users are friends
        friendship = Friendship.objects.filter(
            (Q(from_user=request.user, to_user=friend) | Q(from_user=friend, to_user=request.user)),
            accepted=True
        ).first()
        
        if not friendship:
            return Response({'error': 'Users are not friends'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get messages between users
        messages = Message.objects.filter(
            (Q(sender=request.user, receiver=friend) | Q(sender=friend, receiver=request.user))
        ).order_by('timestamp')
        
        serializer = MessageSerializer(messages, many=True)
        # Add display content based on sender
        data = []
        for msg in serializer.data:
            msg_data = dict(msg)
            if msg['sender']['id'] == request.user.id:
                msg_data['displayContent'] = msg['content']
            else:
                msg_data['displayContent'] = msg['translated_content']
            data.append(msg_data)
        
        return Response(data)