"use client";

import React from 'react';

export default function ExplainerSection() {
  return (
    <section className="bg-[#171a22]/60 rounded-lg p-6 shadow-md border border-dividerBlue">
      
      <div className="prose prose-invert max-w-none">
        <p className="text-[#b8bdc7]">
          Blobs (Binary Large Objects) were introduced in Ethereum's EIP-4844 (also known as "Proto-Danksharding"). They provide a more cost-efficient way for Layer 2 rollups to store data on Ethereum, reducing fees compared to traditional calldata.
        </p>
        
        <p className="text-[#b8bdc7] mt-4">
          Blobs are temporary data structures attached to blocks that don't affect Ethereum's state directly. They're designed for rollups, which previously had to use expensive calldata to submit transaction batches.
        </p>
        
        <p className="text-[#b8bdc7] mt-4">
          Key benefits include:
        </p>
        
        <ul className="list-disc pl-5 mt-2 text-[#b8bdc7]">
          <li>Lower transaction costs for rollup users</li>
          <li>Increased data throughput for Layer 2 solutions</li>
          <li>Step toward Ethereum's full sharding implementation</li>
          <li>Data availability without permanent state bloat</li>
        </ul>
        
        <p className="text-[#b8bdc7] mt-4">
          This dashboard tracks blob usage, costs, and attribution to different rollup providers.
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