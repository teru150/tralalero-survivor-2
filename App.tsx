
import React, { useState, useCallback } from 'react';
import GameScreen from './components/GameScreen';
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';
import GameClearScreen from './components/GameClearScreen';
import { GameStatus, DevConfig } from './types';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.START_SCREEN);
  const [finalTime, setFinalTime] = useState<number>(0);
  const [devConfig, setDevConfig] = useState<DevConfig | undefined>();

  const handleStartGame = useCallback((config?: DevConfig) => {
    setDevConfig(config);
    setGameStatus(GameStatus.PLAYING);
  }, []);

  const handleGameOver = useCallback((time: number) => {
    setFinalTime(time);
    setGameStatus(GameStatus.GAME_OVER);
  }, []);

  const handleGameClear = useCallback((time: number) => {
    setFinalTime(time);
    setGameStatus(GameStatus.GAME_CLEAR);
  }, []);

  const handleRestart = useCallback(() => {
    setDevConfig(undefined);
    setGameStatus(GameStatus.START_SCREEN);
  }, []);

  const renderContent = () => {
    switch (gameStatus) {
      case GameStatus.PLAYING:
        return <GameScreen onGameOver={handleGameOver} onGameClear={handleGameClear} devConfig={devConfig} />;
      case GameStatus.GAME_OVER:
        return <GameOverScreen time={finalTime} onRestart={handleRestart} />;
      case GameStatus.GAME_CLEAR:
        return <GameClearScreen time={finalTime} onRestart={handleRestart} />;
      case GameStatus.START_SCREEN:
      default:
        return <StartScreen onStart={handleStartGame} />;
    }
  };

  return (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center font-mono">
      {renderContent()}
    </div>
  );
};

export default App;
