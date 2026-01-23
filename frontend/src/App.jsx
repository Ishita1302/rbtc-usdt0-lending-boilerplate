import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Lending Boilerplate</h1>
          <ConnectButton />
        </header>
        <main>
           <Dashboard />
        </main>
      </div>
    </div>
  )
}

export default App
