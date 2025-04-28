/**
 * Application constants
 */

export const APP_NAME = 'Blob Flow';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com';

export const ROUTES = {
  HOME: '/',
  BLOCKS: '/blocks',
  TRANSACTIONS: '/transactions',
  ADDRESSES: '/addresses',
  ABOUT: '/about',
};

export const THEME = {
  PRIMARY: '#3498db',
  SECONDARY: '#2ecc71',
  BACKGROUND: '#f8f9fa',
  TEXT: '#333333',
  ERROR: '#e74c3c',
};