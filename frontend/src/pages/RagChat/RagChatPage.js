import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Paper,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  SmartToy as SmartToyIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

const docTypeOptions = [
  { label: 'Tất cả', value: '' },
  { label: 'Thông báo', value: 'announcement' },
  { label: 'Bài tập', value: 'assignment' },
  { label: 'Kỳ thi', value: 'exam' },
  { label: 'Lớp học', value: 'class' },
  { label: 'Tài liệu', value: 'document' },
  { label: 'Bình luận', value: 'comment' },
  { label: 'Người dùng', value: 'user' },
  { label: 'Đăng ký', value: 'enrollment' },
  { label: 'Bài nộp', value: 'submission' },
  { label: 'Thông báo hệ thống', value: 'notification' },
  { label: 'Phiên thi', value: 'exam_session' },
];

export default function RagChatPage() {
  const { currentUser } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [classId, setClassId] = useState('');
  const [docType, setDocType] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const resizeStartX = useRef(null);

  const role = currentUser?.role;
  const canChooseClass = role === 'teacher' || role === 'student' || role === 'admin';

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        if (role === 'teacher') {
          const data = await api.teacherClasses();
          setAvailableClasses(data || []);
        } else if (role === 'student') {
          const data = await api.studentClasses();
          setAvailableClasses(data || []);
        } else if (role === 'admin') {
          const data = await api.adminClasses();
          setAvailableClasses(data || []);
        }
      } catch (err) {
        console.error('Failed to load classes for RAG chat', err);
      }
    };
    fetchClasses();
    loadConversations();
  }, [role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sidebar resize handlers
  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (e) => {
      const delta = e.clientX - (resizeStartX.current || e.clientX);
      resizeStartX.current = e.clientX;
      setSidebarWidth((prev) => Math.max(200, Math.min(420, prev + delta)));
    };
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      resizeStartX.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  const loadConversations = async () => {
    try {
      const data = await api.ragGetConversations();
      setConversations(data || []);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.ragGetConversation(id);
      setCurrentConversationId(id);
      setMessages(conv.messages || []);
      setSidebarOpen(false);
    } catch (err) {
      console.error('Failed to load conversation', err);
    }
  };

  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await api.ragDeleteConversation(id);
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setQuestion('');
      setSidebarOpen(false);
  };

  const handleAsk = async () => {
    setError('');
    const q = question.trim();
    if (!q) {
      setError('Vui lòng nhập câu hỏi');
      return;
    }

    // Add user message immediately
    const userMessage = { role: 'user', content: q, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const payload = { query: q, topK: 15 };
      if (classId) payload.classId = classId;
      if (docType) payload.docTypes = [docType];
      if (currentConversationId) payload.conversationId = currentConversationId;

      const res = await api.ragQuery(payload);
      
      // Add assistant message
      const assistantMessage = {
        role: 'assistant',
        content: res?.answer || '',
        sources: res?.sources || [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update conversation ID if new conversation
      if (!currentConversationId && res?.conversationId) {
        setCurrentConversationId(res.conversationId);
        loadConversations();
      } else if (currentConversationId) {
        loadConversations();
      }
    } catch (err) {
      setError(err?.message || 'Có lỗi xảy ra');
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) handleAsk();
    }
  };

  const classOptions = useMemo(() => availableClasses || [], [availableClasses]);

  return (
    <>
      <Tooltip title="Chat AI">
        <IconButton
          onClick={() => setChatOpen(true)}
          sx={{
            position: 'fixed',
            right: 21,
            bottom: 100,
            zIndex: 1300,
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg,rgb(237, 31, 31) 0%,rgb(226, 58, 29) 100%)',
            color: '#fff',
            boxShadow: '0 10px 30px rgba(224, 32, 32, 0.95)',
            border: '2px solidrgb(240, 19, 19)',
            borderRadius: '50%',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px) scale(1.05)',
              boxShadow: '0 14px 34px rgba(246, 17, 17, 0.73)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: '2px solid rgb(226, 166, 166)',
              animation: 'ragPulse 2.4s ease-out infinite',
              pointerEvents: 'none',
            },
            '@keyframes ragPulse': {
              '0%': { transform: 'scale(0.9)', opacity: 0.9 },
              '70%': { transform: 'scale(1.3)', opacity: 0 },
              '100%': { transform: 'scale(1.3)', opacity: 0 },
            },
          }}
        >
          <SmartToyIcon sx={{ fontSize: 28 }} />
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 360, md: 600 },
            maxWidth: 'calc(100% - 48px)',
            mr: { sm: 50, md: 12 },
            height: { xs: '100%', sm: '85vh' },
            mt: { xs: 0, sm: 14 },
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: { sm: '0 16px 36px rgba(0,0,0,0.18)' },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Paper elevation={0} sx={{ p: 2, borderRadius: 0, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={() => setSidebarOpen(!sidebarOpen)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Trợ lý AI
            </Typography>
            <IconButton onClick={() => setChatOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Paper>

        <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
          {sidebarOpen && (
            <Box
              sx={{
                width: sidebarWidth,
                minWidth: 50,
                flexShrink: 0,
                borderRight: '1px solid',
                borderColor: 'divider',
                overflow: 'auto',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              <Box sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <SmartToyIcon color="primary" />
                  <Typography variant="subtitle1">Cuộc trò chuyện</Typography>
                </Stack>
                <Button variant="contained" fullWidth onClick={startNewConversation} sx={{ mb: 2 }}>
                  Cuộc trò chuyện mới
                </Button>
                <Divider sx={{ my: 2 }} />
                <List>
                  {conversations.map((conv) => (
                    <ListItem key={conv._id} disablePadding>
                      <ListItemButton
                        selected={currentConversationId === conv._id}
                        onClick={() => loadConversation(conv._id)}
                        sx={{ borderRadius: 1 }}
                      >
                        <ListItemText
                          primary={conv.title || 'Cuộc trò chuyện'}
                          secondary={new Date(conv.updatedAt).toLocaleDateString('vi-VN')}
                          primaryTypographyProps={{ noWrap: true }}
                        />
                        <IconButton size="small" onClick={(e) => deleteConversation(conv._id, e)} sx={{ ml: 1 }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    </ListItem>
                  ))}
                  {conversations.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                      Chưa có cuộc trò chuyện nào
                    </Typography>
                  )}
                </List>
              </Box>
            </Box>
          )}

          {sidebarOpen && (
            <Box
              onMouseDown={(e) => {
                setIsResizingSidebar(true);
                resizeStartX.current = e.clientX;
              }}
              sx={{
                width: 8,
                flexShrink: 0,
                cursor: 'col-resize',
                display: { xs: 'none', sm: 'block' },
                '&:hover': { bgcolor: 'action.hover' },
                bgcolor: isResizingSidebar ? 'action.selected' : 'transparent',
              }}
            />
          )}

          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
              {messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Chào bạn! Tôi là trợ lý AI của hệ thống
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bạn có thể hỏi tôi về bất kỳ thông tin nào trong hệ thống
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {messages.map((msg, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '80%',
                          bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                          color: msg.role === 'user' ? 'white' : 'text.primary',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <Avatar
                            sx={{
                              bgcolor: msg.role === 'user' ? 'white' : 'primary.main',
                              color: msg.role === 'user' ? 'primary.main' : 'white',
                              width: 32,
                              height: 32,
                            }}
                          >
                            {msg.role === 'user' ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  Nguồn tham khảo:
                                </Typography>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                  {msg.sources.slice(0, 3).map((src, sidx) => (
                                    <Chip
                                      key={sidx}
                                      size="small"
                                      label={src.title || `Nguồn ${sidx + 1}`}
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  ))}
                                  {msg.sources.length > 3 && (
                                    <Chip size="small" label={`+${msg.sources.length - 3}`} sx={{ fontSize: '0.7rem', height: 20 }} />
                                  )}
                                </Stack>
                              </Box>
                            )}
                          </Box>
                        </Stack>
                      </Paper>
                    </Box>
                  ))}
                  {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Paper sx={{ p: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                            <SmartToyIcon fontSize="small" />
                          </Avatar>
                          <CircularProgress size={20} />
                        </Stack>
                      </Paper>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </Box>

            <Paper sx={{ p: 2, borderRadius: 0, borderTop: '1px solid', borderColor: 'divider' }}>
              {error && (
                <Typography color="error" variant="caption" sx={{ display: 'block', mb: 1 }}>
                  {error}
                </Typography>
              )}
              <Stack direction="row" spacing={1}>
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  multiline
                  maxRows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập câu hỏi của bạn..."
                  disabled={loading}
                  variant="outlined"
                  size="small"
                />
                <IconButton
                  color="primary"
                  onClick={handleAsk}
                  disabled={loading || !question.trim()}
                  sx={{ alignSelf: 'flex-end' }}
                >
                  {loading ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
