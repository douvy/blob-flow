"use client";

import React from 'react';

export default function ExplainerSection() {
  return (
    <section className="bg-[#171a22]/60 rounded-lg p-6 shadow-md border border-dividerBlue">
      
      <div className="prose prose-invert max-w-none">
        <p className="text-[#b8bdc7]">
        Blobs are data structures introduced in Ethereum's EIP-4844 ("Proto-Danksharding") that provide cost-efficient storage for Layer 2 rollups, reducing fees compared to traditional calldata. These temporary structures attach to blocks without affecting Ethereum's state.
        </p>
        
        <p className="text-[#b8bdc7] mt-4">
        Key benefits:
        </p>
        
        <ul className="list-disc pl-5 mt-2 text-[#b8bdc7]">
          <li>Lower transaction costs for rollup users</li>
          <li>Increased data throughput for Layer 2 solutions</li>
          <li>Progress toward Ethereum's full sharding</li>
          <li>Data availability without permanent state bloat</li>
        </ul>
        
        <p className="text-[#b8bdc7] mt-4">
        This dashboard tracks blob usage, costs, and attribution across rollup providers.
        </p>
        
        <div className="mt-6">
          <a 
            href="https://eips.ethereum.org/EIPS/eip-4844" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-lightBlue hover:text-lightBlue/80 inline-flex items-center"
          >
            Read EIP-4844 Specification
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}