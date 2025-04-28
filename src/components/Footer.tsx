"use client";

import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-10 pt-8 border-t border-gray-800">
      <div className="bg-container p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-titleText mb-4">About EIP-4844 Blobs</h3>
        <p className="mb-4 text-bodyText">
          EIP-4844 introduces "blob-carrying transactions" to Ethereum, which provide temporary data storage for 
          Layer 2 rollups. This significantly reduces costs for rollup solutions by enabling them to post data 
          to the Ethereum chain more efficiently.
        </p>
        <p className="mb-4 text-bodyText">
          Blobs are a new transaction type in Ethereum that contain a large amount of data that is not 
          accessible to the EVM but is committed to by the consensus layer. This data is only guaranteed to be 
          available for a short period of time, after which it can be pruned from the network.
        </p>
        <div className="mt-6">
          <a 
            href="https://eips.ethereum.org/EIPS/eip-4844" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Read the EIP-4844 Specification →
          </a>
        </div>
      </div>
      <div className="mt-8 text-center text-sm text-bodyText opacity-70">
        <p>BlobFlow Dashboard &copy; {new Date().getFullYear()} - Real-time metrics for Ethereum blob data</p>
      </div>
    </footer>
  );
}