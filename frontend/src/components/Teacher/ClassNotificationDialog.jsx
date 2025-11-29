import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';

const defaultForm = {
  title: '',
  content: '',
  type: 'general',
};

const ClassNotificationDialog = ({
  open,
  onClose,
  onSubmit,
  formState = defaultForm,
  setFormState = () => {},
  submitting = false,
  classNameLabel = '',
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gửi thông báo đến lớp {classNameLabel}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Tiêu đề thông báo"
          fullWidth
          variant="outlined"
          value={formState.title}
          onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Nhập tiêu đề thông báo..."
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Nội dung thông báo"
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={formState.content}
          onChange={(e) => setFormState(prev => ({ ...prev, content: e.target.value }))}
          placeholder="Nhập nội dung thông báo..."
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth>
          <InputLabel>Loại thông báo</InputLabel>
          <Select
            value={formState.type}
            label="Loại thông báo"
            onChange={(e) => setFormState(prev => ({ ...prev, type: e.target.value }))}
          >
            <MenuItem value="general">Thông báo chung</MenuItem>
            <MenuItem value="assignment">Bài tập</MenuItem>
            <MenuItem value="exam">Bài thi</MenuItem>
            <MenuItem value="important">Quan trọng</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={
            submitting ||
            !formState.title.trim() ||
            !formState.content.trim()
          }
        >
          {submitting ? 'Đang gửi...' : 'Gửi thông báo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClassNotificationDialog;

