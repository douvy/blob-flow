/**
 * Application constants
 */

export const APP_NAME = 'Blob Flow';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://blob-indexer.ahkc.win/api';

/**
 * Network configuration
 */
export const NETWORKS = {
  MAINNET: {
    name: 'Mainnet',
    apiParam: 'mainnet',
    icon: '/images/logo.png',
  },
  SEPOLIA: {
    name: 'Sepolia',
    apiParam: 'sepolia',
    icon: '/images/logo.png',
  }
};

export const DEFAULT_NETWORK = NETWORKS.MAINNET;

export const ROUTES = {
  HOME: '/',
  BLOCKS: '/blocks',
  TRANSACTIONS: '/transactions',
  ADDRESSES: '/addresses',
  ABOUT: '/about',
};

export const THEME = {
  PRIMARY: '#3498db',
  SECONDARY: '#66CC99',
  BACKGROUND: '#f8f9fa',
  TEXT: '#333333',
  ERROR: '#FF6B6B',
};
