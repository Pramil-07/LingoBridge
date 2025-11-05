from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Friendship, Message

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'preferred_language', 'is_staff', 'date_joined')
    list_filter = ('preferred_language', 'is_staff', 'is_superuser')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('preferred_language',)}),
    )

@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ('from_user', 'to_user', 'accepted', 'timestamp')
    list_filter = ('accepted', 'timestamp')
    search_fields = ('from_user__username', 'to_user__username')

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'original_language', 'timestamp')
    list_filter = ('original_language', 'timestamp')
    search_fields = ('sender__username', 'receiver__username', 'content')
    readonly_fields = ('timestamp',)
