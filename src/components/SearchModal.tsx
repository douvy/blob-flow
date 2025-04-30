"use client";

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import useScrollLock from '../hooks/useScrollLock';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchType = 'blocks' | 'blobs' | 'transactions' | 'rollups' | null;

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SearchType>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Lock scrolling when the modal is open
  useScrollLock(isOpen);

  // Reset search query and selected type when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedType(null);
      
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        onClose();
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handler for type selection
  const handleTypeSelect = (type: SearchType, prefix: string) => {
    setSelectedType(type);
    setSearchQuery(prefix);
    
    // Focus the search input and position cursor at the end
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      
      // Using setTimeout to ensure focus happens after state update
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.selectionStart = searchInputRef.current.value.length;
          searchInputRef.current.selectionEnd = searchInputRef.current.value.length;
        }
      }, 0);
    }
  };

  // Handle search submission
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // In a real implementation, you would process the search request here
      // based on the query and selected type
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-32 px-4 overflow-y-auto bg-black/50 backdrop-blur-[1px]">
      <div 
        ref={modalRef}
        className="w-full bg-[#14161a] border border-[#23252a] rounded-md shadow-lg flex flex-col max-h-[80vh] md:max-h-[70vh]"
        style={{ maxWidth: '600px' }}
      >
        {/* Fixed Header */}
        <form onSubmit={handleSearchSubmit} className="sticky top-0 z-10 bg-[#14161a] border-b border-[#23252a] p-3 flex items-center">
          <div className="flex-grow flex items-center gap-2 text-bodyText">
            <i className="fa-regular fa-magnifying-glass" aria-hidden="true"></i>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-grow bg-transparent border-none focus:outline-none text-bodyText placeholder-bodyText/50 text-sm"
            />
          </div>
          <div className="flex items-center">
            <div className="hidden sm:block h-5 px-1.5 max-w-max rounded-sm flex items-center gap-0.5 text-[.6875rem] font-bold text-gray-500 border border-gray-500/20 bg-gray-50/5">
              Esc
            </div>
            <button 
              type="button"
              className="sm:hidden text-bodyText/70 hover:text-bodyText p-1"
              onClick={onClose}
            >
              <i className="fa-regular fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        </form>
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-grow">
          {/* SEARCH BY TYPE Section */}
          <div className="p-2">
            <h3 className="text-xs uppercase text-[#6e7687] px-2 py-1.5">Search by type</h3>
            <div className="mt-1 space-y-0.5">
              <div 
                className={`px-2 py-2 rounded text-sm cursor-pointer ${selectedType === 'blocks' ? 'bg-[#23252a]' : 'hover:bg-[#23252a]'}`}
                onClick={() => handleTypeSelect('blocks', 'block:')}
              >
                <i className="fa-regular fa-cube text-blue mr-2"></i>
                Blocks
              </div>
              <div 
                className={`px-2 py-2 rounded text-sm cursor-pointer ${selectedType === 'blobs' ? 'bg-[#23252a]' : 'hover:bg-[#23252a]'}`}
                onClick={() => handleTypeSelect('blobs', 'blob:')}
              >
                <i className="fa-regular fa-fingerprint text-blue mr-2"></i>
                Blob IDs
              </div>
              <div 
                className={`px-2 py-2 rounded text-sm cursor-pointer ${selectedType === 'transactions' ? 'bg-[#23252a]' : 'hover:bg-[#23252a]'}`}
                onClick={() => handleTypeSelect('transactions', 'tx:')}
              >
                <i className="fa-regular fa-exchange-alt text-blue mr-2"></i>  
                Transactions with blobs
              </div>
              <div 
                className={`px-2 py-2 rounded text-sm cursor-pointer ${selectedType === 'rollups' ? 'bg-[#23252a]' : 'hover:bg-[#23252a]'}`}
                onClick={() => handleTypeSelect('rollups', 'rollup:')}
              >
                <i className="fa-regular fa-layer-group text-blue mr-2"></i>  
                Rollups
              </div>
            </div>
          </div>
          
          <div className="border-t border-[#23252a] w-full"></div>
          
          {/* LATEST BLOB ACTIVITY Section */}
          <div className="p-2 text-sm">
            <h3 className="text-xs uppercase text-[#6e7687] px-2 py-1.5">Latest blob activity</h3>
            <div className="mt-1 space-y-0.5">
              <div 
                className="px-2 py-2.5 rounded flex items-center cursor-pointer hover:bg-[#23252a]"
                onClick={() => {
                  handleTypeSelect('blocks', 'block:9274612');
                }}
              >
                <i className="fa-regular fa-rotate-right text-blue mr-2"></i>
                <span className="text-white">Block #9274612 - 8 blobs added by Arbitrum (3 min ago)</span>
              </div>
              <div 
                className="px-2 py-2.5 rounded flex items-center cursor-pointer hover:bg-[#23252a]"
                onClick={() => {
                  setSearchQuery('12 pending blobs from Optimism');
                  searchInputRef.current?.focus();
                }}
              >
                <i className="fa-regular fa-timer text-blue mr-2"></i>
                <span className="text-white">12 pending blobs in mempool from Optimism (waiting for confirmation)</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-[#23252a] w-full"></div>
          
          {/* BLOB STATS SUMMARY Section */}
          <div className="p-2 text-sm">
            <h3 className="text-xs uppercase text-[#6e7687] px-2 py-1.5">Blob stats summary</h3>
            <div className="mt-1 space-y-0.5">
              <div className="px-2 py-2.5 rounded flex items-center cursor-pointer hover:bg-[#23252a]">
                <i className="fa-regular fa-arrow-up-right text-blue mr-2"></i>
                <span className="text-white">Current Blob Base Fee: 0.00042 ETH (↑12% in 24h)</span>
              </div>
              <div className="px-2 py-2.5 rounded flex items-center cursor-pointer hover:bg-[#23252a]">
                <i className="fa-regular fa-scale-unbalanced-flip text-blue mr-2"></i>
                <span className="text-white">Blob Cost vs Calldata: 3.2x cheaper for rollups today</span>
              </div>
            </div>
          </div>
          
          <div className="h-2"></div> {/* Bottom spacing */}
        </div>
      </div>
    </div>
  );
}