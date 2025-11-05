from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models import Q

class User(AbstractUser):
    preferred_language = models.CharField(
        max_length=5,
        choices=(('en', 'English'), ('fr', 'French'), ('es', 'Spanish')),
        default='en'
    )
    # Comments: Preferred language for receiving translations. Sending defaults to this but can be detected.

class Friendship(models.Model):
    from_user = models.ForeignKey(User, related_name='friend_requests_sent', on_delete=models.CASCADE)
    to_user = models.ForeignKey(User, related_name='friend_requests_received', on_delete=models.CASCADE)
    accepted = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    # Comments: Models friend requests. Accepted=True means friends. Symmetrical check in queries.

class Message(models.Model):
    sender = models.ForeignKey(User, related_name='messages_sent', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='messages_received', on_delete=models.CASCADE)
    content = models.TextField()  # Original content from sender
    translated_content = models.TextField()  # Translated to receiver's preferred language at send time
    original_language = models.CharField(max_length=5)
    timestamp = models.DateTimeField(auto_now_add=True)

    # Comments: Stores messages with original and translated versions for personalized display.