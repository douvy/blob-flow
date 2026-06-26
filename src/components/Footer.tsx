"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full p-6 px-0 border-t border-gray-800 bg-[#19202f] mt-4 md:mt-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          {/* Left side with logo and name */}
          <div className="flex items-center mb-6 md:mb-0">
            <div className="flex-shrink-0 mr-2">
              <Image
                src="/images/logo.png"
                alt="BlobFlow Logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
            </div>
            <span className="text-lg font-windsor-bold text-[#f0f6fe] ml-2 leading-none translate-y-[1px] pt-[3px]">BlobFlow</span>
          </div>
          
          {/* Right side with credits and GitHub link */}
          <div className="text-sm text-[#f0f6fe] flex flex-col md:block text-left md:text-right">
            <p className="mb-6 md:mb-0 md:inline">
              Real-time metrics for Ethereum blob data by 
              <Link href="https://x.com/douvy_" target="_blank" rel="noopener noreferrer" className="decoration-[#4a5568] hover:text-[#d9d9d9] hover:decoration-[#d9d9d9] underline underline-offset-2 ml-1 mr-1">
                @douvy_
              </Link> and 
              <Link href="https://x.com/at4z" target="_blank" rel="noopener noreferrer" className="decoration-[#4a5568] hover:text-[#d9d9d9] hover:decoration-[#d9d9d9] underline underline-offset-2 ml-1">
                @at4z
              </Link>
              <span className="hidden md:inline mx-4">•</span>
            </p>
            
            {/* Mobile GitHub link */}
            <div className="block md:hidden text-left">
              <Link 
                href="https://github.com/douvy/blob-flow" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center"
              >
                <span className="decoration-[#4a5568] underline underline-offset-2 hover:text-[#d9d9d9] hover:decoration-[#d9d9d9]">
                  Star on GitHub <ArrowUpRight className="inline h-4 w-4 align-[-2px]" aria-hidden="true" />
                </span>
              </Link>
            </div>
            
            {/* Desktop GitHub link */}
            <div className="hidden md:inline">
              <Link 
                href="https://github.com/douvy/blob-flow" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center"
              >
                <span className="decoration-[#4a5568] underline underline-offset-2 hover:text-[#d9d9d9] hover:decoration-[#d9d9d9]">
                  Star on GitHub <ArrowUpRight className="inline h-4 w-4 align-[-2px]" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
