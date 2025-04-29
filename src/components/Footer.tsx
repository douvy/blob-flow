"use client";

import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-10 pt-8 border-t border-gray-800">
      <div className="mt-8 text-center text-sm text-bodyText opacity-70">
        <p>BlobFlow Dashboard &copy; {new Date().getFullYear()} - Real-time metrics for Ethereum blob data</p>
      </div>
    </footer>
  );
}