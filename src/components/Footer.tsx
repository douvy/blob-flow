"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

function GitHubStarLink() {
  return (
    <Link
      href="https://github.com/douvy/blob-flow"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center"
    >
      <span className="decoration-[#4a5568] underline underline-offset-2 hover:text-[#d9d9d9] hover:decoration-[#d9d9d9]">
        Star on GitHub <ArrowUpRight className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
      </span>
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="relative z-10 w-full py-6 border-t border-divider bg-[#101114]">
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
            <p className="mb-3 md:mb-2">
              Real-time metrics for Ethereum blob data by{' '}
              <Link href="https://x.com/douvy_" target="_blank" rel="noopener noreferrer" className="decoration-[#4a5568] hover:text-[#d9d9d9] hover:decoration-[#d9d9d9] underline underline-offset-2">
                @douvy_
              </Link>{' '}
              and{' '}
              <Link href="https://github.com/a-thomas-22" target="_blank" rel="noopener noreferrer" className="decoration-[#4a5568] hover:text-[#d9d9d9] hover:decoration-[#d9d9d9] underline underline-offset-2">
                a-thomas-22
              </Link>
            </p>

            {/* Meta line: version and GitHub star, kept together so neither is orphaned */}
            <p className="flex flex-wrap items-center gap-2 text-xs text-[#7d8590] justify-start md:justify-end">
              <Link
                href={`https://github.com/douvy/blob-flow/releases/tag/v${process.env.NEXT_PUBLIC_APP_VERSION}`}
                target="_blank"
                rel="noopener noreferrer"
                className="decoration-[#4a5568] underline underline-offset-2 hover:text-[#d9d9d9] hover:decoration-[#d9d9d9]"
              >
                v{process.env.NEXT_PUBLIC_APP_VERSION}
              </Link>
              <span aria-hidden="true">•</span>
              <GitHubStarLink />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
