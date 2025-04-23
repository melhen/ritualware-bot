// pages/rituals.js
import { useState } from 'react';
import Layout from '../components/Layout';

export default function Rituals() {
  const [userType, setUserType] = useState('submissive');
  
  return (
    <Layout>
      {userType === 'submissive' ? <SubmissiveRituals /> : <DommeRituals />}
    </Layout>
  );
}

const SubmissiveRituals = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">My Rituals</h1>
    </div>
    
    {/* Active Rituals */}
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-2 font-semibold">Active Rituals</div>
      <div className="divide-y divide-gray-700">
        <div className="p-4">
          <h3 className="text-xl font-bold mb-1">Morning Devotion</h3>
          <div className="text-sm text-gray-400 mb-2">Daily - 6:00 AM - 10:00 AM</div>
          <div className="mb-4">
            <div className="text-sm mb-1">Progress: 1/3 tasks completed</div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{width: '33%'}}></div>
            </div>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded">Continue Ritual</button>
        </div>
      </div>
    </div>
    
    {/* Completed Rituals */}
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-2 font-semibold">Completed Rituals</div>
      <div className="divide-y divide-gray-700">
        <div className="p-4 flex justify-between items-center">
          <div>
            <div className="font-medium">Evening Reflection</div>
            <div className="text-sm text-gray-400">Completed yesterday</div>
          </div>
          <div className="flex space-x-2">
            <div className="px-2 py-1 bg-green-900 rounded text-xs">100% Complete</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const DommeRituals = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Ritual Management</h1>
      <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded">Create New Ritual</button>
    </div>
    
    {/* Active Rituals */}
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-2 font-semibold">Active Rituals</div>
      <div className="divide-y divide-gray-700">
        <div className="p-4">
          <div className="flex justify-between mb-2">
            <h3 className="text-xl font-bold">Morning Devotion</h3>
            <div className="text-sm bg-green-900 px-2 py-1 rounded">Active</div>
          </div>
          <div className="text-sm text-gray-400 mb-2">Daily ritual - 3 tasks</div>
          <div className="mb-4">
            <div className="text-sm mb-1">Assigned to: 3 submissives</div>
            <div className="text-sm mb-1">Average compliance: 87%</div>
          </div>
          <div className="flex space-x-2">
            <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded">Edit</button>
            <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">View Submissions</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);