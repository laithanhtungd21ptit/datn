/**
 * ViolationsPanel - Beautiful Violations Log Display
 * 
 * Features:
 * - Timeline view with icons
 * - Stats summary
 * - Collapsible panel
 * - Real-time updates
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Badge,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  ExpandMore,
  Warning,
  TabUnselected,
  Fullscreen,
  ContentCopy,
  Mouse,
  Keyboard,
  Code,
  Visibility,
  VisibilityOff,
  Face,
  PhoneAndroid,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const ViolationsPanel = ({ violations = [], maxAllowed = 10 }) => {
  const [expanded, setExpanded] = useState(true);

  // Violation type metadata
  const violationMeta = {
    tab_switch: {
      icon: <TabUnselected />,
      label: 'Chuyển Tab',
      color: '#f44336'
    },
    tab_hidden: {
      icon: <VisibilityOff />,
      label: 'Ẩn Tab',
      color: '#f44336'
    },
    fullscreen_exit: {
      icon: <Fullscreen />,
      label: 'Thoát Toàn Màn Hình',
      color: '#ff9800'
    },
    paste_detected: {
      icon: <ContentCopy />,
      label: 'Dán Nội Dung',
      color: '#ff9800'
    },
    copy_detected: {
      icon: <ContentCopy />,
      label: 'Copy Nội Dung',
      color: '#2196f3'
    },
    cut_detected: {
      icon: <ContentCopy />,
      label: 'Cut Nội Dung',
      color: '#2196f3'
    },
    right_click: {
      icon: <Mouse />,
      label: 'Click Chuột Phải',
      color: '#2196f3'
    },
    keyboard_shortcut: {
      icon: <Keyboard />,
      label: 'Phím Tắt',
      color: '#ff9800'
    },
    devtools_attempt: {
      icon: <Code />,
      label: 'Mở DevTools',
      color: '#f44336'
    },
    face_not_detected: {
      icon: <Face />,
      label: 'Không Phát Hiện Khuôn Mặt',
      color: '#f44336'
    },
    multiple_faces: {
      icon: <Face />,
      label: 'Nhiều Khuôn Mặt',
      color: '#f44336'
    },
    looking_away: {
      icon: <Visibility />,
      label: 'Nhìn Ra Ngoài',
      color: '#ff9800'
    },
    phone_detected: {
      icon: <PhoneAndroid />,
      label: 'Phát Hiện Điện Thoại',
      color: '#f44336'
    },
    object_detected: {
      icon: <PhoneAndroid />,
      label: 'Vật Thể',
      color: '#2196f3'
    }
  };

  // Calculate stats (only total count)
  const stats = useMemo(() => {
    return { total: violations.length };
  }, [violations]);

  // Format timestamp
  const formatTime = (timestamp) => {
    try {
      return dayjs(timestamp).fromNow();
    } catch (e) {
      return 'Vừa xong';
    }
  };

  // Get danger level
  const getDangerLevel = () => {
    const percentage = (stats.total / maxAllowed) * 100;
    if (percentage >= 80) return { level: 'error', message: 'Nguy hiểm!' };
    if (percentage >= 50) return { level: 'warning', message: 'Cảnh báo!' };
    return { level: 'success', message: 'Ổn định' };
  };

  const dangerLevel = getDangerLevel();

  return (
    <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Accordion 
        expanded={expanded} 
        onChange={() => setExpanded(!expanded)}
        sx={{ 
          boxShadow: 'none',
          '&:before': { display: 'none' }
        }}
      >
        {/* Header */}
        <AccordionSummary 
          expandIcon={<ExpandMore />}
          sx={{ 
            bgcolor: dangerLevel.level === 'error' ? '#ffebee' : 
                     dangerLevel.level === 'warning' ? '#fff3e0' : '#e8f5e9',
            '&:hover': { bgcolor: dangerLevel.level === 'error' ? '#ffcdd2' : 
                                  dangerLevel.level === 'warning' ? '#ffe0b2' : '#c8e6c9' }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
            <Badge 
              badgeContent={stats.total} 
              color={dangerLevel.level}
              max={99}
            >
              <Warning color={dangerLevel.level} />
            </Badge>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Nhật Ký Vi Phạm
              </Typography>
              
            </Box>
          </Box>
        </AccordionSummary>

        {/* Content */}
        <AccordionDetails sx={{ p: 0 }}>
          {/* Warning if close to limit */}
          {stats.total >= maxAllowed * 0.7 && (
            <Alert 
              severity={dangerLevel.level} 
              sx={{ m: 2, mb: 0 }}
            >
              <Typography variant="body2" fontWeight="bold">
                {'Lưu ý: Số vi phạm đang tăng cao!'}
              </Typography>
            </Alert>
          )}

          <Divider />

          {/* Violations List */}
          {violations.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Chưa có vi phạm nào
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto', p: 0 }}>
              {violations.map((violation, index) => {
                const meta = violationMeta[violation.type] || {};
                
                return (
                  <React.Fragment key={violation._id || index}>
                    <ListItem
                      sx={{
                        py: 1.5,
                        px: 2,
                        '&:hover': { bgcolor: 'action.hover' },
                        borderLeft: `4px solid ${meta.color || '#2196f3'}`,
                        bgcolor: index === violations.length - 1 ? '#f5f5f5' : 'transparent'
                      }}
                    >
                      <ListItemIcon>
                        <Avatar 
                          sx={{ 
                            bgcolor: meta.color || '#2196f3',
                            width: 36,
                            height: 36
                          }}
                        >
                          {meta.icon || <Warning />}
                        </Avatar>
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {meta.label || violation.type}
                            </Typography>
                            {index === violations.length - 1 && (
                              <Chip 
                                label="Mới nhất"
                                size="small"
                                color="primary"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                              {violation.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              🕐 {formatTime(violation.timestamp)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < violations.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default ViolationsPanel;
