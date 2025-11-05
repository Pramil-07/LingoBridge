import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings
from .models import Message, Friendship
from django.db.models import Q
from langdetect import detect
from transformers import pipeline
import asyncio

User = get_user_model()

# Initialize translation pipelines (lazy loading)
# Helsinki-NLP has separate models for different language pairs
_translators = {}

def get_translator(source_lang, target_lang):
    """Get or create translation pipeline for specific language pair"""
    global _translators
    
    # Map language codes
    lang_map = {
        'en': 'en',
        'fr': 'fr',
        'es': 'es'
    }
    
    source_code = lang_map.get(source_lang, 'en')
    target_code = lang_map.get(target_lang, 'en')
    
    if source_code == target_code:
        return None
    
    # Create cache key
    cache_key = f"{source_code}-{target_code}"
    
    if cache_key not in _translators:
        try:
            # Map to Helsinki-NLP model names
            model_map = {
                'en-fr': 'Helsinki-NLP/opus-mt-en-fr',
                'en-es': 'Helsinki-NLP/opus-mt-en-es',
                'fr-en': 'Helsinki-NLP/opus-mt-fr-en',
                'es-en': 'Helsinki-NLP/opus-mt-es-en',
                'fr-es': 'Helsinki-NLP/opus-mt-fr-es',
                'es-fr': 'Helsinki-NLP/opus-mt-es-fr',
            }
            
            model_name = model_map.get(cache_key)
            if model_name:
                print(f"Loading translation model: {model_name}")
                _translators[cache_key] = pipeline('translation', model=model_name)
            else:
                print(f"No model found for {cache_key}, using original text")
                return None
        except Exception as e:
            print(f"Error loading translation model {cache_key}: {e}")
            return None
    
    return _translators.get(cache_key)

def _translate_sync(text, source_lang, target_lang):
    """Synchronous translation function to run in thread pool"""
    translator = get_translator(source_lang, target_lang)
    if translator is None:
        return text
    
    try:
        result = translator(text, max_length=512)
        if isinstance(result, list) and len(result) > 0:
            translated_text = result[0].get('translation_text', text)
            return translated_text
        return text
    except Exception as e:
        print(f"Translation error: {e}")
        return text

async def translate_text(text, target_lang):
    """Translate text to target language using transformers"""
    try:
        # Detect source language
        source_lang = detect(text)
        
        # Normalize language codes
        lang_map = {
            'en': 'en',
            'fr': 'fr',
            'es': 'es'
        }
        
        source_code = lang_map.get(source_lang, 'en')
        target_code = lang_map.get(target_lang, 'en')
        
        # If same language, no translation needed
        if source_code == target_code:
            return text
        
        # Run translation in thread pool to avoid blocking the async event loop
        loop = asyncio.get_event_loop()
        translated_text = await loop.run_in_executor(
            None, 
            _translate_sync, 
            text, 
            source_code, 
            target_code
        )
        
        return translated_text
    except Exception as e:
        print(f"Translation error: {e}")
        # Return original text on error
        return text


@database_sync_to_async
def are_friends(user1, user2):
    """Check if two users are friends"""
    return Friendship.objects.filter(
        (Q(from_user=user1, to_user=user2) | Q(from_user=user2, to_user=user1)),
        accepted=True
    ).exists()

@database_sync_to_async
def save_message(sender, receiver, content, translated_content, original_language):
    """Save message to database"""
    return Message.objects.create(
        sender=sender,
        receiver=receiver,
        content=content,
        translated_content=translated_content,
        original_language=original_language
    )

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # User is already authenticated by JWTAuthMiddleware
        self.user = self.scope.get('user')
        
        if not self.user:
            await self.close(code=4001)  # Unauthorized
            return
        
        await self.accept()
        self.room_group_name = f'user_{self.user.id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'send_message':
                receiver_id = data.get('receiver_id')
                content = data.get('content')
                
                if not receiver_id or not content:
                    await self.send(text_data=json.dumps({'error': 'Missing receiver_id or content'}))
                    return
                
                try:
                    receiver = await database_sync_to_async(User.objects.get)(id=receiver_id)
                except User.DoesNotExist:
                    await self.send(text_data=json.dumps({'error': 'Receiver not found'}))
                    return
                
                # Check if users are friends
                if not await are_friends(self.user, receiver):
                    await self.send(text_data=json.dumps({'error': 'Users are not friends'}))
                    return
                
                # Detect original language
                original_language = detect(content)
                
                # Translate message to receiver's preferred language
                translated_content = await translate_text(content, receiver.preferred_language)
                
                # Save message to database
                message = await save_message(
                    self.user, receiver, content, translated_content, original_language
                )
                
                # Send to receiver
                receiver_group = f'user_{receiver.id}'
                await self.channel_layer.group_send(
                    receiver_group,
                    {
                        'type': 'chat_message',
                        'message': {
                            'id': message.id,
                            'sender': self.user.id,
                            'receiver': receiver.id,
                            'content': content,
                            'translated_content': translated_content,
                            'original_language': original_language,
                            'timestamp': message.timestamp.isoformat(),
                        }
                    }
                )
                
                # Send confirmation to sender
                await self.send(text_data=json.dumps({
                    'id': message.id,
                    'sender': self.user.id,
                    'receiver': receiver.id,
                    'content': content,
                    'translated_content': translated_content,
                    'original_language': original_language,
                    'timestamp': message.timestamp.isoformat(),
                }))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'error': 'Invalid JSON'}))
        except Exception as e:
            await self.send(text_data=json.dumps({'error': str(e)}))

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))
    
    async def friend_request_notification(self, event):
        """Handle friend request notifications"""
        message = event['message']
        await self.send(text_data=json.dumps(message))

