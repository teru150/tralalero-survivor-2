import * as React from 'react';
import { useState } from 'react';
import { TralaleroPlayerIcon } from './icons';
import type { DevConfig } from '../types';

interface StartScreenProps {
  onStart: (config?: DevConfig) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [devConfig, setDevConfig] = useState<DevConfig>({
      playerSpeed: 450,
      forkProjectileCount: 1,
      forkCooldown: 0.75,
      garlicArea: 120,
      playerRegenRate: 0,
      invincible: false,
      disableFork: false,
  });

  const handleDevChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      setDevConfig(prev => ({
          ...prev,
          [name]: type === 'checkbox' ? checked : parseFloat(value) || 0,
      }));
  }

  const handleStartBoss = () => {
    onStart({
      startAtBoss: true,
      playerSpeed: 600,
      forkProjectileCount: 5,
      forkCooldown: 0.3,
      garlicArea: 250,
      playerRegenRate: 0.1,
      invincible: devConfig.invincible,
      disableFork: devConfig.disableFork,
    });
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 md:p-8 bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4">
      <h1 className="text-4xl md:text-6xl font-bold text-yellow-300 drop-shadow-lg" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
        Tralalero Survivor
      </h1>
      <div className="my-8">
        <TralaleroPlayerIcon isDamaged={false} />
      </div>
      <p className="max-w-md text-lg text-slate-300 mb-8">
        You are Tralalero Tralala, a shark with three Nikes. Survive the onslaught of derpy sea creatures.
        <br />
        <span className="font-bold text-white">Use WASD Keys or Touch Controls to move.</span> Attacks are automatic.
      </p>
      <button
        onClick={() => onStart()}
        className="px-8 py-4 bg-green-500 text-white font-bold text-xl md:text-2xl rounded-lg hover:bg-green-600 transition-transform transform hover:scale-105 shadow-lg touch-manipulation"
      >
        Start Survival
      </button>

      {/* Developer Mode */}
      <div className="mt-8 w-full max-w-lg">
        <button onClick={() => setShowDevPanel(!showDevPanel)} className="text-sm text-slate-400 hover:text-white p-2">
          {showDevPanel ? '▼ Hide' : '▶ Show'} Developer Mode
        </button>
        {showDevPanel && (
          <div className="mt-2 p-4 border border-dashed border-slate-600 rounded-lg text-left grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/50">
            <div className="md:col-span-2 text-center text-lg font-bold text-slate-200">Customize Stats</div>
            <div>
                <label className="block text-sm font-medium text-slate-300">Player Speed</label>
                <input type="number" name="playerSpeed" value={devConfig.playerSpeed} onChange={handleDevChange} className="bg-slate-700 w-full p-1 rounded mt-1" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300">Fork Count</label>
                <input type="number" name="forkProjectileCount" value={devConfig.forkProjectileCount} onChange={handleDevChange} className="bg-slate-700 w-full p-1 rounded mt-1" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300">Fork Cooldown (s)</label>
                <input type="number" step="0.05" name="forkCooldown" value={devConfig.forkCooldown} onChange={handleDevChange} className="bg-slate-700 w-full p-1 rounded mt-1" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300">Garlic Area (radius)</label>
                <input type="number" name="garlicArea" value={devConfig.garlicArea} onChange={handleDevChange} className="bg-slate-700 w-full p-1 rounded mt-1" />
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-300">HP Regen Rate (0.05=5%)</label>
                <input type="number" step="0.01" name="playerRegenRate" value={devConfig.playerRegenRate} onChange={handleDevChange} className="bg-slate-700 w-full p-1 rounded mt-1" />
            </div>
            <div className="flex flex-col gap-2 justify-center">
                 <label className="flex items-center gap-2 text-sm font-medium text-slate-300 cursor-pointer">
                    <input type="checkbox" name="invincible" checked={!!devConfig.invincible} onChange={handleDevChange} className="bg-slate-700 w-4 h-4 rounded text-blue-500 focus:ring-blue-500 border-slate-500" />
                    <span>Invincible Mode</span>
                </label>
                 <label className="flex items-center gap-2 text-sm font-medium text-slate-300 cursor-pointer">
                    <input type="checkbox" name="disableFork" checked={!!devConfig.disableFork} onChange={handleDevChange} className="bg-slate-700 w-4 h-4 rounded text-red-500 focus:ring-red-500 border-slate-500" />
                    <span>Disable Fork</span>
                </label>
            </div>
            <button
              onClick={() => onStart(devConfig)}
              className="mt-2 md:col-span-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors transform hover:scale-105 shadow-md touch-manipulation">
              Start with Custom Stats
            </button>
            <button
              onClick={handleStartBoss}
              className="mt-2 md:col-span-2 px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors transform hover:scale-105 shadow-md touch-manipulation">
              Start Boss Fight
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StartScreen;