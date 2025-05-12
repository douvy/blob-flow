"use client";

import React from 'react';

interface DataStateWrapperProps {
  isLoading: boolean;
  error: Error | null;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode | ((error: Error) => React.ReactNode);
}

/**
 * Wrapper component to handle loading and error states for data fetching components
 */
export default function DataStateWrapper({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent
}: DataStateWrapperProps) {
  // Default loading component
  const defaultLoadingComponent = (
    <div className="w-full flex items-center justify-center p-8">
      <div className="animate-pulse flex flex-col w-full gap-4">
        <div className="h-8 bg-[#202538] rounded-md w-1/4"></div>
        <div className="h-48 bg-[#202538] rounded-md w-full"></div>
      </div>
    </div>
  );

  // Default error component
  const defaultErrorComponent = (error: Error) => (
    <div className="w-full flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-red-400 text-lg mb-2">Error loading data</div>
        <div className="text-white/60 text-sm">{error.message}</div>
        <button 
          className="mt-4 bg-[#1d1f23] border border-divider px-4 py-2 rounded-md text-white text-sm hover:bg-[#2a2e37] transition-colors"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return <>{loadingComponent || defaultLoadingComponent}</>;
  }

  if (error) {
    if (errorComponent) {
      return <>{typeof errorComponent === 'function' ? errorComponent(error) : errorComponent}</>;
    }
    return <>{defaultErrorComponent(error)}</>;
  }

  return <>{children}</>;
}