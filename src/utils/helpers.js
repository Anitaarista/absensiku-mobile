import moment from 'moment';
import 'moment/locale/id';

moment.locale('id');

export const formatDate = (date) => {
  if (!date) return '-';
  return moment(date).format('DD MMMM YYYY');
};

export const formatDateShort = (date) => {
  if (!date) return '-';
  return moment(date).format('DD/MM/YYYY');
};

export const formatTime = (date) => {
  if (!date) return '-';
  return moment(date).format('HH:mm');
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return moment(date).format('DD MMM YYYY, HH:mm');
};

export const getGreeting = () => {
  const hour = moment().hour();
  if (hour < 12) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
};

export const getToday = () => {
  return moment().format('YYYY-MM-DD');
};

export const getCurrentTime = () => {
  return moment().format('HH:mm:ss');
};

export const getDayName = (date) => {
  return moment(date).format('dddd');
};

export const statusColors = {
  hadir: '#10B981',
  izin: '#F59E0B',
  sakit: '#EF4444',
  alpha: '#6B7280',
};

export const statusLabels = {
  hadir: 'Hadir',
  izin: 'Izin',
  sakit: 'Sakit',
  alpha: 'Alpha',
};

export const statusIcons = {
  hadir: 'checkmark-circle',
  izin: 'information-circle',
  sakit: 'medkit',
  alpha: 'close-circle',
};

export const statusBgColors = {
  hadir: '#D1FAE5',
  izin: '#FEF3C7',
  sakit: '#FEE2E2',
  alpha: '#F3F4F6',
};

export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
};

export const getMonthRange = (month, year) => {
  const start = moment({ year, month: month - 1 }).startOf('month');
  const end = moment({ year, month: month - 1 }).endOf('month');
  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
    label: start.format('MMMM YYYY'),
  };
};

export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const truncate = (str, length = 20) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const getRandomColor = (name) => {
  const colors = ['#0D9488', '#7C3AED', '#DB2777', '#EA580C', '#2563EB', '#059669', '#DC2626', '#9333EA'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
