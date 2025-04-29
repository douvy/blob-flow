"use client";

import React, { useState } from 'react';

export default function ExplainerSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="bg-container rounded-lg p-6 shadow-md border border-divider">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-windsor-bold text-white">What are blobs?</h2>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-400 hover:text-blue-300 transition-colors focus:outline-none"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      </div>
      
      <div className="prose prose-invert max-w-none">
        <p className="text-white">
          <strong>Blobs</strong> (Binary Large Objects) were introduced in Ethereum's EIP-4844 (also known as "Proto-Danksharding"). 
          They provide a new, more cost-efficient way for Layer 2 rollups to store data on Ethereum, reducing fees 
          by up to 10x compared to traditional calldata.
        </p>
        
        {isExpanded && (
          <>
            <p className="text-white mt-4">
              Blobs are temporary data structures attached to blocks that don't affect Ethereum's state directly. 
              They're specifically designed for rollups, which previously had to use expensive calldata to submit 
              batches of transactions to Ethereum.
            </p>
            
            <p className="text-white mt-4">
              Key benefits include:
            </p>
            
            <ul className="list-disc pl-5 mt-2 text-white">
              <li>Lower transaction costs for rollup users</li>
              <li>Increased data throughput for Layer 2 solutions</li>
              <li>Step toward Ethereum's full sharding implementation</li>
              <li>Data availability without permanent state bloat</li>
            </ul>
            
            <p className="text-white mt-4">
              This dashboard tracks blob usage, costs, and attribution to different rollup providers, 
              offering insights into how this new technology is being adopted.
            </p>
          </>
        )}
        
        <div className="mt-6">
          <a 
            href="https://eips.ethereum.org/EIPS/eip-4844" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center"
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