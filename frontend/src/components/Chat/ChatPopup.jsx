import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import {
  Box,
  Button,
  TextField,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Badge,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Send as SendIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  GroupAdd as GroupAddIcon,
  Class as ClassIcon,
  Done as DoneIcon,
  DoneAll as DoneAllIcon,
  EmojiEmotions as EmojiIcon,
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';

// Typing animation
const typingAnimation = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
`;

// Message status component
const MessageStatus = ({ status, isOwn }) => {
  if (!isOwn) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <CircularProgress size={12} />;
      case 'sent':
        return <DoneIcon sx={{ fontSize: 14, opacity: 0.7 }} />;
      case 'delivered':
        return <DoneAllIcon sx={{ fontSize: 14, opacity: 0.7 }} />;
      case 'read':
        return <DoneAllIcon sx={{ fontSize: 14, opacity: 0.7, color: 'primary.main' }} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
      {getStatusIcon()}
    </Box>
  );
};

// Styled components
const ChatFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 1000,
}));

const ChatWindow = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: 80,
  right: 20,
  width: 350,
  height: 500,
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: theme.shadows[8],
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}));

const MessageBubble = styled(Box)(({ theme, isOwn }) => ({
  maxWidth: '70%',
  alignSelf: isOwn ? 'flex-end' : 'flex-start',
  padding: theme.spacing(1, 1.5),
  borderRadius: theme.spacing(2),
  backgroundColor: isOwn ? theme.palette.primary.main : theme.palette.grey[200],
  color: isOwn ? theme.palette.primary.contrastText : theme.palette.text.primary,
  wordWrap: 'break-word',
}));

const ChatPopup = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // New conversation dialog
  const [newConvDialogOpen, setNewConvDialogOpen] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [newConvType, setNewConvType] = useState('direct');
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    if (currentUser && !socket) {
      const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000', {
        auth: {
          token: localStorage.getItem('accessToken')
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to chat server');
        newSocket.emit('join', currentUser.id);
      });

      newSocket.on('new_message', (data) => {
        const { conversationId, message } = data;
        if (currentConversation && currentConversation.id === conversationId) {
          setMessages(prev => [...prev, message]);
        }
        // Update conversations list
        loadConversations();
        setUnreadCount(prev => prev + 1);
      });

      // Typing indicators
      newSocket.on('user_typing', (data) => {
        if (currentConversation && currentConversation.id === data.conversationId) {
          setTypingUsers(prev => new Map(prev.set(data.userId, data.username)));
        }
      });

      newSocket.on('user_stopped_typing', (data) => {
        if (currentConversation && currentConversation.id === data.conversationId) {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        }
      });

      setSocket(newSocket);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUser]);

  // Load conversations
  const loadConversations = async () => {
    try {
      const convs = await api.chatConversations();
      setConversations(convs);
      // Calculate unread count
      const unread = convs.reduce((count, conv) => {
        // This is a simplified calculation - in reality you'd check message read status
        return count;
      }, 0);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  // Load messages for current conversation
  const loadMessages = async (conversationId) => {
    try {
      setLoading(true);
      const msgs = await api.chatMessages(conversationId);
      setMessages(msgs);

      // Join conversation room
      if (socket) {
        socket.emit('join_conversation', conversationId);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;

    try {
      const messageData = {
        conversationId: currentConversation.id,
        content: newMessage.trim(),
      };

      const result = await api.chatSendMessage(messageData);
      setMessages(prev => [...prev, result.message]);
      setNewMessage('');

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        socket?.emit('typing_stop', currentConversation.id);
      }

      // Emit via socket for real-time updates
      if (socket) {
        socket.emit('message_sent', {
          conversationId: currentConversation.id,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Load recipients for new conversation
  const loadRecipients = async () => {
    try {
      const recips = await api.chatRecipients();
      setRecipients(recips.recipients);
    } catch (error) {
      console.error('Failed to load recipients:', error);
    }
  };

  // Create new conversation
  const createConversation = async () => {
    try {
      const payload = {
        type: newConvType,
        participantIds: selectedRecipients.map(r => r._id),
      };

      const result = await api.chatCreateConversation(payload);

      // Format the conversation to match the structure from getConversations
      const formattedConversation = {
        id: result.conversation._id,
        type: result.conversation.type,
        name: result.conversation.name,
        avatar: result.conversation.type === 'class' ? 'C' : 'G',
        lastMessage: result.conversation.lastMessage,
        updatedAt: result.conversation.updatedAt,
        participants: result.conversation.participants
      };

      setConversations(prev => [formattedConversation, ...prev]);
      setCurrentConversation(formattedConversation);
      setNewConvDialogOpen(false);
      setSelectedRecipients([]);
      loadMessages(formattedConversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // Handle conversation selection
  const handleConversationSelect = async (conversation) => {
    setCurrentConversation(conversation);
    await loadMessages(conversation.id);

    // Mark messages as read
    try {
      await api.chatMarkAsRead(conversation.id);
      // Update local unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  // Handle key press in message input
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
      return;
    }

    // Handle typing indicator
    if (currentConversation && !isTyping) {
      setIsTyping(true);
      socket?.emit('typing_start', currentConversation.id);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket?.emit('typing_stop', currentConversation.id);
      }
    }, 1000);
  };

  // Handle input change
  const handleInputChange = (event) => {
    setNewMessage(event.target.value);
  };

  // Handle emoji selection
  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <>
      {/* Chat FAB */}
      <ChatFab
        color="primary"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="chat"
      >
        <Badge badgeContent={unreadCount} color="error">
          <ChatIcon />
        </Badge>
      </ChatFab>

      {/* Chat Window */}
      {isOpen && (
        <ChatWindow>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {currentConversation ? currentConversation.name : 'Chat'}
            </Typography>
            <Box>
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchorEl(e.currentTarget)}
                aria-label="new conversation"
              >
                <PersonAddIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setIsOpen(false)}
                aria-label="close chat"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Conversations List / Messages */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!currentConversation ? (
              // Conversations List
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <List>
                  {conversations.map((conv) => (
                    <ListItem
                      key={conv.id}
                      button
                      onClick={() => handleConversationSelect(conv)}
                    >
                      <ListItemAvatar>
                        <Avatar>{conv.avatar}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={conv.name}
                        secondary={conv.lastMessage ? conv.lastMessage.content : 'No messages yet'}
                      />
                    </ListItem>
                  ))}
                  {conversations.length === 0 && (
                    <ListItem>
                      <ListItemText primary="Chưa có cuộc trò chuyện nào" />
                    </ListItem>
                  )}
                </List>
              </Box>
            ) : (
              // Messages View
              <>
                {/* Back Button */}
                <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                  <Button
                    size="small"
                    onClick={() => setCurrentConversation(null)}
                  >
                    ← Quay lại
                  </Button>
                </Box>

                {/* Messages */}
                <MessagesContainer>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <>
                      {messages.map((msg) => (
                        <MessageBubble
                          key={msg._id}
                          isOwn={msg.senderId._id === currentUser.id}
                        >
                          <Typography variant="body2">
                            {msg.content}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </Typography>
                            <MessageStatus
                              status={msg.status}
                              isOwn={msg.senderId._id === currentUser.id}
                            />
                          </Box>
                        </MessageBubble>
                      ))}

                      {/* Typing indicator */}
                      {typingUsers.size > 0 && (
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          ml: 2,
                          mt: 1,
                          opacity: 0.7
                        }}>
                          <Box sx={{
                            display: 'flex',
                            gap: 1,
                            mr: 1
                          }}>
                            <Box sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            animation: `${typingAnimation} 1.4s infinite`
                            }} />
                            <Box sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            animation: `${typingAnimation} 1.4s infinite 0.2s`
                            }} />
                            <Box sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            animation: `${typingAnimation} 1.4s infinite 0.4s`
                            }} />
                          </Box>
                          <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                            {Array.from(typingUsers.values()).join(', ')} đang nhập...
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </MessagesContainer>

                {/* Message Input */}
                <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Nhập tin nhắn..."
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyUp={handleKeyPress}
                    multiline
                    maxRows={3}
                  />
                  <IconButton
                    color="primary"
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </>
            )}
          </Box>
        </ChatWindow>
      )}

      {/* New Conversation Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setNewConvType('direct');
          setNewConvDialogOpen(true);
          loadRecipients();
          setMenuAnchorEl(null);
        }}>
          <PersonAddIcon sx={{ mr: 1 }} />
          Trò chuyện trực tiếp
        </MenuItem>
        <MenuItem onClick={() => {
          setNewConvType('class');
          setNewConvDialogOpen(true);
          loadRecipients();
          setMenuAnchorEl(null);
        }}>
          <ClassIcon sx={{ mr: 1 }} />
          Tạo nhóm lớp
        </MenuItem>
      </Menu>

      {/* New Conversation Dialog */}
      <Dialog
        open={newConvDialogOpen}
        onClose={() => setNewConvDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Tạo cuộc trò chuyện mới
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Chọn người nhận:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {selectedRecipients.map((recipient) => (
              <Chip
                key={recipient._id}
                label={recipient.fullName}
                onDelete={() => setSelectedRecipients(prev => prev.filter(r => r._id !== recipient._id))}
              />
            ))}
          </Box>
          <List sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {recipients
              .filter(recipient => !selectedRecipients.find(sr => sr._id === recipient._id))
              .map((recipient) => (
                <ListItem
                  key={recipient._id}
                  button
                  onClick={() => setSelectedRecipients(prev => [...prev, recipient])}
                >
                  <ListItemAvatar>
                    <Avatar>{recipient.fullName.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={recipient.fullName}
                    secondary={`${recipient.role} - ${recipient.username}`}
                  />
                </ListItem>
              ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewConvDialogOpen(false)}>
            Hủy
          </Button>
          <Button
            onClick={createConversation}
            variant="contained"
            disabled={selectedRecipients.length === 0}
          >
            Tạo
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatPopup;
