// pages/index.js
import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout>
      <div className='space-y-6'>
        <h1 className='text-2xl font-bold'>Welcome to RITUALWARE</h1>
        <p>Select an option from the sidebar to get started.</p>
      </div>
    </Layout>
  );
}