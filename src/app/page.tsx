"use client";

import React, { useState } from 'react';
import Header from '@/components/Header';
import LiveMetrics from '@/components/LiveMetrics';
import MetricsCharts from '@/components/MetricsCharts';
import LatestBlocksTable from '@/components/LatestBlocksTable';
import TopUsersTable from '@/components/TopUsersTable';
import MempoolTable from '@/components/MempoolTable';
import ExplainerSection from '@/components/ExplainerSection';
import UserDetailView from '@/components/UserDetailView';
import Footer from '@/components/Footer';

export default function Home() {
  const [selectedUser, setSelectedUser] = useState<{id: number, name: string} | null>(null);

  // Sample user data mapping - in a real app, this would come from an API
  const users = {
    1: 'Arbitrum',
    2: 'Optimism',
    3: 'Base',
    4: 'zkSync',
    5: 'Unknown'
  };

  const handleUserClick = (userId: number) => {
    setSelectedUser({
      id: userId,
      // @ts-ignore - We know these IDs exist in our sample data
      name: users[userId]
    });
  };

  const handleCloseDetail = () => {
    setSelectedUser(null);
  };

  return (
    <main className="min-h-screen bg-background bg-grid-pattern bg-grid-size">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column (60%) */}
          <div className="lg:col-span-3 space-y-8">
            <LiveMetrics />
            <TopUsersTable onUserClick={handleUserClick} />
            <LatestBlocksTable />
          </div>
          
          {/* Right Column (40%) */}
          <div className="lg:col-span-2 space-y-8">
            <MetricsCharts />
            <ExplainerSection />
            <MempoolTable />
          </div>
        </div>
        
        {selectedUser && (
          <UserDetailView 
            userId={selectedUser.id}
            userName={selectedUser.name}
            onClose={handleCloseDetail}
          />
        )}
        
        <Footer />
      </div>
    </main>
  );
}