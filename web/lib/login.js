// pages/login.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (error) {
      setError('Failed to log in: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-purple-500">RITUALWARE</h1>
          <p className="text-gray-300 mt-2">Sign in to your account</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          {error && <p className="text-red-500 mb-4">{error}</p>}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2" htmlFor="email">Email</label>
              <input 
                id="email"
                type="email" 
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-2" htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}