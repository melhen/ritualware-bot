// pages/dashboard.js
import { useState } from 'react';
import Layout from '../components/Layout';

export default function Dashboard() {
  // In a real app, fetch this from your auth state
  const [userType, setUserType] = useState('submissive');
  
  return (
    <Layout>
      {userType === 'submissive' ? <SubmissiveDashboard /> : <DommeDashboard />}
    </Layout>
  );
}

const SubmissiveDashboard = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold">Submissive Dashboard</h1>
    
    {/* Current Task Card */}
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-purple-900">
      <div className="bg-purple-900 px-4 py-2 font-semibold">Current Ritual Task</div>
      <div className="p-4">
        <h3 className="text-xl font-bold mb-2">Morning Devotion</h3>
        <p className="mb-4">Kneel for 10 minutes and contemplate your service. Take a photo as evidence of your position.</p>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs bg-purple-900 px-2 py-1 rounded">Due: 10:00 AM</span>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded">Submit Evidence</button>
        </div>
      </div>
    </div>
    
    {/* Compliance Stats */}
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-sm text-gray-400">Current Streak</div>
        <div className="text-2xl font-bold">7 Days</div>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-sm text-gray-400">Compliance Rate</div>
        <div className="text-2xl font-bold">92%</div>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-sm text-gray-400">Token Balance</div>
        <div className="text-2xl font-bold">125</div>
      </div>
    </div>
    
    {/* Recent Activities */}
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-2 font-semibold">Recent Activity</div>
      <div className="divide-y divide-gray-700">
        <div className="p-4 flex justify-between">
          <div>
            <div className="font-medium">Evening Report Submitted</div>
            <div className="text-sm text-gray-400">Yesterday, 9:45 PM</div>
          </div>
          <div className="text-green-500">+15 tokens</div>
        </div>
        <div className="p-4 flex justify-between">
          <div>
            <div className="font-medium">Meditation Task Completed</div>
            <div className="text-sm text-gray-400">Yesterday, 7:30 AM</div>
          </div>
          <div className="text-green-500">+10 tokens</div>
        </div>
      </div>
    </div>
  </div>
);

const DommeDashboard = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold">Domme Dashboard</h1>
    
    {/* Stats Overview */}
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-sm text-gray-400">Active Submissives</div>
        <div className="text-2xl font-bold">4</div>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-sm text-gray-400">Rituals Created</div>
        <div className="text-2xl font-bold">12</div>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-sm text-gray-400">Avg. Compliance</div>
        <div className="text-2xl font-bold">87%</div>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-sm text-gray-400">Token Balance</div>
        <div className="text-2xl font-bold">380</div>
      </div>
    </div>
    
    {/* Submissive Overview */}
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-2 font-semibold">Submissives</div>
      <div className="divide-y divide-gray-700">
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center mr-3">
              <span>JD</span>
            </div>
            <div>
              <div className="font-medium">devotedOne</div>
              <div className="text-sm text-gray-400">Last active: 2 hours ago</div>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="px-2 py-1 bg-green-900 rounded text-xs">96% Compliant</div>
            <button className="px-3 py-1 bg-gray-700 rounded text-xs">View</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);