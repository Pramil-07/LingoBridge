from django.db import models
from django.db.models import Q
from django.contrib.auth import authenticate, get_user_model
User = get_user_model()


class Friendship(models.Model):
    from_user = models.ForeignKey(User, related_name='friend_requests_sent', on_delete=models.CASCADE)
    to_user = models.ForeignKey(User, related_name='friend_requests_received', on_delete=models.CASCADE)
    accepted = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    blocked = models.BooleanField(default=False)


    class Meta:
        unique_together = ('from_user', 'to_user')

class Conversation(models.Model):
    participants = models.ManyToManyField(User)
    created_at = models.DateTimeField(auto_now_add=True)

class Message(models.Model):
    sender = models.ForeignKey(User, related_name='messages_sent', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='messages_received', on_delete=models.CASCADE)
    conversation = models.ForeignKey(Conversation, related_name='messages', on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=[('sent', 'Sent'), ('delivered', 'Delivered'), ('read', 'Read')], default='sent')
    content = models.TextField()
    translated_content = models.TextField()
    original_language = models.CharField(max_length=5)
    timestamp = models.DateTimeField(auto_now_add=True)

