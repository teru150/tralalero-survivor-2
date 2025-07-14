
import React from 'react';

interface GameOverScreenProps {
  time: number;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ time, onRestart }) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-red-900/50 backdrop-blur-sm border-2 border-red-500 rounded-xl shadow-2xl">
      <h1 className="text-7xl font-bold text-red-400 drop-shadow-lg">GAME OVER</h1>
      <p className="mt-4 text-2xl text-slate-200">You survived for:</p>
      <p className="text-5xl font-bold text-yellow-300 my-4">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </p>
      <button
        onClick={() => onRestart()}
        className="px-8 py-4 bg-blue-500 text-white font-bold text-2xl rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105 shadow-lg mt-4"
      >
        Play Again
      </button>
    </div>
  );
};

export default GameOverScreen;
