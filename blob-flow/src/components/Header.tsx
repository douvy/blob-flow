import React from 'react';

export default function Header() {
  return (
    <header className="mb-8">
      <h1 className="text-4xl font-bold text-titleText mb-2">BlobFlow</h1>
      <p className="text-lg text-bodyText">
        Real-time metrics and analytics for Ethereum EIP-4844 blob data
      </p>
    </header>
  );
}