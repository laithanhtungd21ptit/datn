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
  ListItemAvatar,
  ListItemText,
  Paper,
  IconButton,
  Fab,
  Badge,
  Chip,
  CircularProgress,
  InputAdornment,
  ListItemButton,
  Collapse,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Send as SendIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  EmojiEmotions as EmojiIcon,
  Search as SearchIcon,
  Phone as PhoneIcon,
  Videocam as VideocamIcon,
  Info as InfoIcon,
  AttachFile as AttachFileIcon,
  Photo as PhotoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  School,
} from '@mui/icons-material';
import { styled, keyframes, alpha } from '@mui/material/styles';

// Typing animation
const typingAnimation = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
`;

// Styled components
const ChatFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 1000,
  backgroundColor: '#0084FF',
  color: 'white',
  '&:hover': {
    backgroundColor: '#0056CC',
  },
}));

const ChatWindow = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: 80,
  right: 20,
  width: 380,
  height: 600,
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 12px 28px 0 rgba(0, 0, 0, 0.2), 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  backgroundColor: '#0084FF',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  backgroundColor: '#f0f2f5',
}));

const MessageBubble = styled(Box)(({ theme, isOwn }) => ({
  maxWidth: '75%',
  alignSelf: isOwn ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(0.5),
  position: 'relative',
}));

const MessageContent = styled(Box)(({ theme, isOwn }) => ({
  padding: theme.spacing(0.75, 1.25),
  borderRadius: theme.spacing(1.5),
  backgroundColor: isOwn ? '#0084FF' : 'white',
  color: isOwn ? 'white' : theme.palette.text.primary,
  wordWrap: 'break-word',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  border: isOwn ? 'none' : '1px solid #e4e6ea',
}));

const MessageTime = styled(Typography)(({ theme }) => ({
  fontSize: '0.7rem',
  color: 'rgba(255, 255, 255, 0.7)',
  marginTop: theme.spacing(0.25),
  textAlign: 'right',
}));

const ContactItem = styled(ListItemButton)(({ theme }) => ({
  borderRadius: theme.spacing(0.5),
  margin: theme.spacing(0.25, 0.5),
  '&:hover': {
    backgroundColor: alpha(theme.palette.grey[500], 0.1),
  },
}));

const Sidebar = styled(Box)(({ theme }) => ({
  width: 380,
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: 'white',
  display: 'flex',
  flexDirection: 'column',
}));

const SidebarHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: '#f8f9fa',
}));

const SearchBox = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(2.5),
    backgroundColor: 'white',
  },
}));

const ChatPopup = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsExpanded, setContactsExpanded] = useState({
    classmates: true,
    teachers: true,
    admins: false,
  });

  const [recipients, setRecipients] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (currentUser && !socket) {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
      
      // Disable Socket.IO on Vercel production (not supported on serverless)
      const isProduction = backendUrl.includes('vercel.app');
      if (isProduction) {
        console.log('Socket.IO disabled on production (Vercel serverless limitation)');
        return;
      }
      
      const newSocket = io(backendUrl, {
        auth: {
          token: localStorage.getItem('accessToken')
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to chat server');
        newSocket.emit('join', currentUser.id);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
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

  // Load conversations and contacts on mount
  useEffect(() => {
    if (currentUser) {
      loadConversations();
      loadContacts();
    }
  }, [currentUser]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations and contacts
  const loadConversations = async () => {
    try {
      console.log('Loading conversations...');
      setIsLoading(true);
      const convs = await api.chatConversations();
      console.log('Conversations loaded:', convs);
      setConversations(convs);
      // Calculate unread count
      const unread = convs.reduce((count, conv) => {
        // This is a simplified calculation - in reality you'd check message read status
        return count;
      }, 0);
      setUnreadCount(unread);
      setError('');
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError('Không thể tải danh sách cuộc trò chuyện');
    } finally {
      setIsLoading(false);
    }
  };

  // Load contacts
  const loadContacts = async () => {
    try {
      console.log('Loading contacts...');
      const response = await api.chatRecipients();
      console.log('Contacts loaded:', response);
      // API returns { recipients: { classmates, teachers, admins } }
      const contacts = response.recipients || response;
      setRecipients(contacts);
      setError('');
    } catch (error) {
      console.error('Error loading contacts:', error);
      setError('Không thể tải danh sách liên hệ');
    }
  };

  // Load messages for current conversation
  const loadMessages = async (conversationId) => {
  try {
  setLoading(true);
  const msgs = await api.chatMessages(conversationId);
  setMessages(msgs.map(msg => ({
      ...msg,
    senderId: msg.senderId._id || msg.senderId,
      createdAt: msg.createdAt
  })));
  } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
  if (!newMessage.trim() || !currentConversation) {
      console.log('Cannot send: no message or no conversation', { newMessage, currentConversation });
    return;
  }

  try {
  const messageData = {
    conversationId: currentConversation.id,
        content: newMessage.trim(),
    messageType: 'text'
      };

      console.log('Sending message:', messageData);
      const response = await api.chatSendMessage(messageData);

      // Add actual message to UI
      const message = response.message || {
        _id: Date.now().toString(),
        senderId: currentUser.id,
        content: newMessage.trim(),
        createdAt: new Date().toISOString(),
        status: 'sent'
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // Broadcast via socket
      if (socket) {
      socket.emit('send_message', {
      conversationId: currentConversation.id,
      message
      });
      }

      // Stop typing indicator
      if (socket) {
      socket.emit('typing_stop', currentConversation.id);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle typing
  const handleTyping = () => {
  if (!socket || !currentConversation) return;

  setIsTyping(true);
  socket.emit('typing_start', currentConversation.id);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        conversationId: currentConversation.id,
        userId: currentUser.id
      });
      setIsTyping(false);
    }, 1000);
  };

  // Handle both formats: direct or nested in recipients
  const contactData = recipients?.recipients || recipients;

  const filteredContacts = contactData ? {
    classmates: contactData.classmates?.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [],
    teachers: contactData.teachers?.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [],
    admins: contactData.admins?.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [],
  } : { classmates: [], teachers: [], admins: [] };

  console.log('Filtered contacts:', filteredContacts);

  if (!currentUser) return null;

  return (
    <>
      {/* Chat FAB */}
      <ChatFab
        onClick={() => setIsOpen(!isOpen)}
        aria-label="chat"
      >
        <Badge badgeContent={unreadCount} color="error">
          <ChatIcon />
        </Badge>
      </ChatFab>

      {/* Chat Window */}
      <Fade in={isOpen}>
        <ChatWindow>
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Sidebar */}
            {showSidebar && (
              <Sidebar>
                <SidebarHeader>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: '#0084FF' }}>
                      Chat
                    </Typography>
                    <IconButton size="small" onClick={() => setIsOpen(false)}>
                      <CloseIcon />
                    </IconButton>
                  </Box>

                  <SearchBox
                    fullWidth
                    size="small"
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </SidebarHeader>

                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                  {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <>
                      {/* Recent Conversations */}
                      <Box sx={{ p: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', px: 1, py: 0.5, color: 'text.secondary' }}>
                          TIN NHẮN GẦN ĐÂY
                        </Typography>
                    <List>
                      {conversations.slice(0, 5).map((conv) => (
                        <ContactItem
                          key={conv.id}
                          sx={{
                            backgroundColor: currentConversation?.id === conv.id ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
                            '&:hover': {
                              backgroundColor: currentConversation?.id === conv.id ? 'rgba(25, 118, 210, 0.15)' : 'rgba(158, 158, 158, 0.1)',
                            }
                          }}
                          onClick={() => {
                            setCurrentConversation(conv);
                            setShowSidebar(false);
                            loadMessages(conv.id);
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#0084FF' }}>
                              {conv.name?.charAt(0)?.toUpperCase() || '?'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={conv.name}
                            secondary={conv.lastMessage?.content || 'Chưa có tin nhắn'}
                            primaryTypographyProps={{
                              variant: 'body2',
                              sx: { fontWeight: 600 }
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              sx: { color: 'text.secondary' }
                            }}
                          />
                        </ContactItem>
                      ))}
                    </List>
                  </Box>

                  {/* Contacts */}
                  <Box sx={{ p: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', px: 1, py: 0.5, color: 'text.secondary' }}>
                      DANH BẠ
                    </Typography>

                    {/* Classmates */}
                    <Box>
                      <Button
                        fullWidth
                        onClick={() => setContactsExpanded(prev => ({ ...prev, classmates: !prev.classmates }))}
                        sx={{
                          justifyContent: 'space-between',
                          textTransform: 'none',
                          py: 1,
                          color: 'text.primary'
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Bạn học ({filteredContacts.classmates.length})
                        </Typography>
                        {contactsExpanded.classmates ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </Button>
                      <Collapse in={contactsExpanded.classmates}>
                        <List>
                          {filteredContacts.classmates.map((contact) => (
                            <ContactItem
                            key={contact.id}
                            onClick={async () => {
                            try {
                              // Create or get existing direct conversation
                            const response = await api.chatCreateConversation({
                              type: 'direct',
                              participantIds: [contact.id]
                            });

                              const conversation = response.conversation || response;
                              setCurrentConversation({
                                  id: conversation._id,
                                    name: contact.name,
                                    type: 'direct',
                                    participants: conversation.participants
                                  });
                                  setShowSidebar(false);
                                  loadMessages(conversation._id);

                                  // Join conversation room for real-time updates
                                  if (socket) {
                                    socket.emit('join_conversation', conversation._id);
                                  }
                                } catch (error) {
                                  console.error('Error creating conversation:', error);
                                }
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: '#0084FF' }}>
                                  {contact.name.charAt(0).toUpperCase()}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={contact.name}
                                secondary={contact.studentId}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  sx: { fontWeight: 500 }
                                }}
                                secondaryTypographyProps={{
                                  variant: 'caption',
                                  sx: { color: 'text.secondary' }
                                }}
                              />
                            </ContactItem>
                          ))}
                        </List>
                      </Collapse>
                    </Box>

                    {/* Teachers */}
                    <Box>
                      <Button
                        fullWidth
                        onClick={() => setContactsExpanded(prev => ({ ...prev, teachers: !prev.teachers }))}
                        sx={{
                          justifyContent: 'space-between',
                          textTransform: 'none',
                          py: 1,
                          color: 'text.primary'
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Giảng viên ({filteredContacts.teachers.length})
                        </Typography>
                        {contactsExpanded.teachers ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </Button>
                      <Collapse in={contactsExpanded.teachers}>
                        <List>
                          {filteredContacts.teachers.map((contact) => (
                            <ContactItem
                            key={contact.id}
                            onClick={async () => {
                            try {
                            // Create or get existing direct conversation
                            const response = await api.chatCreateConversation({
                              type: 'direct',
                              participantIds: [contact.id]
                              });

                              const conversation = response.conversation || response;
                                setCurrentConversation({
                                    id: conversation._id,
                                    name: contact.name,
                                    type: 'direct',
                                    participants: conversation.participants
                                  });
                                  setShowSidebar(false);
                                  loadMessages(conversation._id);

                                  // Join conversation room for real-time updates
                                    if (socket) {
                                    socket.emit('join_conversation', conversation._id);
                                  }
                                } catch (error) {
                                  console.error('Error creating conversation:', error);
                                }
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: '#e3f2fd' }}>
                                  <School sx={{ color: '#0084FF' }} />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={contact.name}
                                secondary={contact.teacherId}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  sx: { fontWeight: 500 }
                                }}
                                secondaryTypographyProps={{
                                  variant: 'caption',
                                  sx: { color: 'text.secondary' }
                                }}
                              />
                            </ContactItem>
                          ))}
                        </List>
                      </Collapse>
                    </Box>
                      </Box>
                    </>
                  )}
                </Box>
              </Sidebar>
            )}

            {/* Chat Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {currentConversation ? (
                <>
                  {/* Chat Header */}
                  <ChatHeader>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {showSidebar && (
                        <IconButton
                          size="small"
                          onClick={() => setShowSidebar(false)}
                          sx={{ mr: 1, color: 'white' }}
                        >
                          <CloseIcon />
                        </IconButton>
                      )}
                      {!showSidebar && (
                        <IconButton
                          size="small"
                          onClick={() => setShowSidebar(true)}
                          sx={{ mr: 1, color: 'white' }}
                        >
                          <PersonAddIcon />
                        </IconButton>
                      )}
                      <Avatar sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.2)' }}>
                        {currentConversation.name?.charAt(0)?.toUpperCase() || '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {currentConversation.name}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          {currentConversation.type === 'direct' ? 'Trực tiếp' : 'Nhóm'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Cuộc gọi">
                        <IconButton size="small" sx={{ color: 'white' }}>
                          <PhoneIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cuộc gọi video">
                        <IconButton size="small" sx={{ color: 'white' }}>
                          <VideocamIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Thông tin">
                        <IconButton size="small" sx={{ color: 'white' }}>
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ChatHeader>

                  {/* Messages Area */}
                  <MessagesContainer>
                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <>
                        {messages.map((msg, index) => {
                          const isOwn = msg.senderId === currentUser.id || msg.senderId?._id === currentUser.id;
                          const showTimestamp = index === 0 ||
                            new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

                          return (
                            <React.Fragment key={msg._id || index}>
                              {showTimestamp && (
                                <Box sx={{ textAlign: 'center', my: 2 }}>
                                  <Chip
                                    label={new Date(msg.createdAt).toLocaleDateString('vi-VN')}
                                    size="small"
                                    sx={{ bgcolor: '#e4e6ea', color: 'text.secondary' }}
                                  />
                                </Box>
                              )}
                              <MessageBubble isOwn={isOwn}>
                                <MessageContent isOwn={isOwn}>
                                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                    {msg.content}
                                  </Typography>
                                </MessageContent>
                                {isOwn && (
                                  <MessageTime>
                                    {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </MessageTime>
                                )}
                              </MessageBubble>
                            </React.Fragment>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </MessagesContainer>

                  {/* Message Input */}
                  <Box sx={{ p: 2, borderTop: '1px solid #e4e6ea', bgcolor: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton size="small" sx={{ color: '#65676b' }}>
                        <AttachFileIcon />
                      </IconButton>
                      <IconButton size="small" sx={{ color: '#65676b' }}>
                        <PhotoIcon />
                      </IconButton>
                      <TextField
                        fullWidth
                        placeholder="Aa"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        multiline
                        maxRows={3}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '20px',
                            bgcolor: '#f0f2f5',
                            '& fieldset': {
                              border: 'none',
                            },
                          },
                        }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                sx={{ color: '#65676b' }}
                              >
                                <EmojiIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <IconButton
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        sx={{
                          bgcolor: '#0084FF',
                          color: 'white',
                          '&:hover': {
                            bgcolor: '#0056CC',
                          },
                          '&:disabled': {
                            bgcolor: '#e4e6ea',
                            color: '#bcc0c4',
                          },
                        }}
                      >
                        <SendIcon />
                      </IconButton>
                    </Box>

                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <Box sx={{ position: 'absolute', bottom: '60px', right: '20px' }}>
                        <EmojiPicker onEmojiClick={(emojiData) => {
                          setNewMessage(prev => prev + emojiData.emoji);
                          setShowEmojiPicker(false);
                        }} />
                      </Box>
                    )}
                  </Box>
                </>
                ) : error ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
                    <Typography variant="h6" color="error" gutterBottom>
                      Lỗi kết nối
                    </Typography>
                    <Typography variant="body2" textAlign="center" color="text.secondary">
                      {error}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setError('');
                        loadConversations();
                        loadContacts();
                      }}
                      sx={{ mt: 2 }}
                    >
                      Thử lại
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                    <ChatIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom>
                      Chào mừng đến với Chat
                    </Typography>
                    <Typography variant="body2" textAlign="center" sx={{ mb: 3 }}>
                      Chọn một cuộc trò chuyện hoặc bắt đầu cuộc trò chuyện mới
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={() => setShowSidebar(true)}
                      sx={{ bgcolor: '#0084FF', '&:hover': { bgcolor: '#0056CC' } }}
                    >
                      Bắt đầu trò chuyện
                    </Button>
                  </Box>
                )}
              )}
            </Box>
          </Box>
        </ChatWindow>
      </Fade>
    </>
  );
};

export default ChatPopup;
