import React from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import type { Upgrade, DevConfig, Weapon } from '../types';
import { GameStatus, EnemyType, PickupType, ProjectileType } from '../types';
import { GAME_WIDTH, GAME_HEIGHT, WORLD_WIDTH } from '../constants';
import { 
    TralaleroPlayerIcon, PufferFishIcon, OctopusIcon, RavioliIcon, ForkIcon, GarlicIcon, MagnetIcon, FreezeBombIcon, BombardiroCrocodiloIcon, BossMissileIcon 
} from './icons';
import { TrippiTroppiIcon, CrescentAuraIcon, ExplosionIcon } from './icons-2';

interface GameScreenProps {
  onGameOver: (time: number) => void;
  onGameClear: (time: number) => void;
  devConfig?: DevConfig;
}

const Player: React.FC<{ player: ReturnType<typeof useGameLogic>['gameState']['player'] }> = React.memo(({ player }) => {
    const healthPercentage = player.maxHealth > 0 ? (player.health / player.maxHealth) * 100 : 0;

    return (
        <div className="absolute" style={{ width: player.size, height: player.size, left: player.position.x - player.size / 2, top: player.position.y - player.size / 2, transition: 'opacity 150ms', opacity: player.iFrames > 0 ? 0.5 : 1 }}>
            {/* HP Bar */}
            <div className="absolute -top-4 w-full h-2.5 bg-gray-600 rounded-full overflow-hidden border-2 border-slate-900">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${healthPercentage}%` }}></div>
            </div>

            <TralaleroPlayerIcon isDamaged={player.iFrames > 0.8} />

            {player.weapons.find(w => w.name === "Garlic Aura") && 
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <GarlicIcon size={player.weapons.find(w => w.name === "Garlic Aura")!.area! * 2} />
                </div>
            }
        </div>
    );
});

const Enemy: React.FC<{ enemy: ReturnType<typeof useGameLogic>['gameState']['enemies'][0], isFrozen: boolean }> = React.memo(({ enemy, isFrozen }) => {
    const getIcon = () => {
        switch(enemy.type) {
            case EnemyType.PUFFERFISH: return <PufferFishIcon />;
            case EnemyType.OCTOPUS: return <OctopusIcon />;
            case EnemyType.MINI_BOSS: return <TrippiTroppiIcon />;
            case EnemyType.BOSS: return <BombardiroCrocodiloIcon />;
            default: return null;
        }
    }
    return (
        <div className="absolute transition-opacity duration-200" style={{ width: enemy.size, height: enemy.size, left: enemy.position.x - enemy.size / 2, top: enemy.position.y - enemy.size / 2, opacity: isFrozen ? 0.8 : 1 }}>
            <div className={isFrozen ? 'animate-pulse' : ''}>
                {getIcon()}
            </div>
            {isFrozen && <div className="absolute inset-0 bg-cyan-300/50 rounded-full z-10"></div>}
            
            {(enemy.type !== EnemyType.BOSS) && (
                 <div className="absolute -bottom-5 w-full">
                    <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-red-500" style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }}></div>
                    </div>
                    <div className="text-center text-xs text-white font-bold [text-shadow:1px_1px_2px_black]">
                        {`${Math.ceil(enemy.health)}/${enemy.maxHealth}`}
                    </div>
                </div>
            )}
        </div>
    );
});

const Projectile: React.FC<{ projectile: ReturnType<typeof useGameLogic>['gameState']['projectiles'][0] }> = React.memo(({ projectile }) => (
    <div className="absolute" style={{ width: projectile.size, height: projectile.size, left: projectile.position.x - projectile.size / 2, top: projectile.position.y - projectile.size / 2, transform: `rotate(${projectile.angle}deg)` }}>
        {projectile.type === ProjectileType.PLAYER 
            ? <ForkIcon angle={0} /> 
            : projectile.type === ProjectileType.BOSS 
                ? <BossMissileIcon />
                : <CrescentAuraIcon />
        }
    </div>
));

const Pickup: React.FC<{ pickup: ReturnType<typeof useGameLogic>['gameState']['pickups'][0] }> = React.memo(({ pickup }) => (
    <div className="absolute" style={{ width: pickup.size, height: pickup.size, left: pickup.position.x - pickup.size / 2, top: pickup.position.y - pickup.size / 2 }}>
        {pickup.type === PickupType.XP 
            ? <RavioliIcon /> 
            : pickup.type === PickupType.MAGNET 
                ? <MagnetIcon />
                : <FreezeBombIcon />
        }
    </div>
));

const Explosion: React.FC<{ explosion: ReturnType<typeof useGameLogic>['gameState']['explosions'][0] }> = React.memo(({ explosion }) => (
    <div className="absolute" style={{ width: explosion.size, height: explosion.size, left: explosion.position.x - explosion.size / 2, top: explosion.position.y - explosion.size / 2 }}>
        <ExplosionIcon />
    </div>
));

const TopLeftUI: React.FC<{ player: ReturnType<typeof useGameLogic>['gameState']['player'], time: number }> = React.memo(({ player, time }) => {
    const xpPercentage = player.xpToNextLevel > 0 ? (player.xp / player.xpToNextLevel) * 100 : 0;
    const minutes = String(Math.floor(time / 60)).padStart(2, '0');
    const seconds = String(Math.floor(time % 60)).padStart(2, '0');

    const getWeaponDPS = (weapon: Weapon) => {
        let dps = 0;
        if (weapon.name === "Spinning Fork") {
            dps = ((weapon.damage || 0) * (weapon.projectileCount || 1)) / (weapon.cooldown || 1);
        } else if (weapon.name === "Garlic Aura") {
            dps = (weapon.damage || 0) / (weapon.cooldown || 1);
        }
        return dps.toFixed(1);
    }

    return (
        <div className="absolute left-4 flex flex-col gap-2 w-80 text-white p-2 bg-black/40 rounded-lg shadow-xl border border-slate-700 z-20" style={{ top: '15%' }}>
            {/* Timer */}
            <div className="text-4xl font-bold [text-shadow:2px_2px_4px_black] text-center">{minutes}:{seconds}</div>
            {/* Level and XP */}
            <div className="flex items-center gap-3 mt-1">
                <div className="text-xl font-bold drop-shadow-md px-2">LVL {player.level}</div>
                <div className="w-full bg-slate-700 rounded-full h-5 border-2 border-slate-900">
                    <div className="bg-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${xpPercentage}%` }}></div>
                </div>
            </div>
            <div className="text-sm font-bold text-purple-200/90 drop-shadow-md px-2 text-center -mt-1">{Math.ceil(player.xp)} / {player.xpToNextLevel} XP</div>

            {/* Weapon Stats */}
            {player.weapons.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-600">
                    <h3 className="text-lg font-bold text-center mb-1 text-yellow-200">Firepower</h3>
                    {player.weapons.map(weapon => (
                        <div key={weapon.id} className="text-sm px-2 grid grid-cols-2">
                            <span className="font-bold text-green-300">{weapon.name} (L{weapon.level})</span>
                            <span className="text-right">{getWeaponDPS(weapon)} DPS</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

const BossHealthBar: React.FC<{ health: number; maxHealth: number }> = React.memo(({ health, maxHealth }) => {
    const healthPercentage = maxHealth > 0 ? (health / maxHealth) * 100 : 0;
    return (
        <div className="absolute right-4 w-1/2 text-white p-2 bg-black/50 rounded-lg shadow-2xl border-4 border-red-700/80 z-30" style={{ top: '15%' }}>
            <h3 className="text-center font-bold text-2xl text-red-300 [text-shadow:2px_2px_4px_black]">BOMBARDIRO CROCODILO</h3>
            <div className="w-full bg-slate-800 rounded-full h-8 mt-2 border-2 border-slate-900 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-400 via-red-500 to-red-800 h-full rounded-full transition-all duration-300" style={{ width: `${healthPercentage}%` }}></div>
            </div>
            <div className="text-center font-mono text-white text-lg mt-1">{Math.ceil(health)} / {maxHealth}</div>
        </div>
    );
});

const LevelUpModal: React.FC<{ options: Upgrade[], onSelect: (upgrade: Upgrade) => void, onSkip: () => void }> = ({ options, onSelect, onSkip }) => (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border-2 border-yellow-400 flex flex-col gap-6 w-full max-w-6xl">
            <h2 className="text-4xl text-center font-bold text-yellow-300">LEVEL UP!</h2>
            <p className="text-center text-slate-300">Choose your blessing!</p>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {options.map(opt => (
                    <button key={opt.id} onClick={() => onSelect(opt)} className="flex flex-col p-4 bg-slate-700 rounded-lg text-left hover:bg-slate-600 hover:border-yellow-400 border-2 border-slate-600 transition-all transform hover:scale-105 h-full">
                        <h3 className="text-xl font-bold text-green-400">{opt.title}</h3>
                        <p className="text-slate-300 mt-2 flex-grow">{opt.description}</p>
                    </button>
                ))}
            </div>
            <div className="text-center mt-2">
                <button onClick={() => onSkip()} className="px-6 py-2 bg-slate-600 text-slate-300 font-bold rounded-lg hover:bg-slate-500 transition-colors transform hover:scale-105 shadow-md">
                    I do not receive it this time
                </button>
            </div>
        </div>
    </div>
);

const BossWarning: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
        <h1 className="text-9xl font-extrabold text-red-500 animate-pulse [text-shadow:0_0_20px_white]">
            WARNING
        </h1>
    </div>
);


const GameScreen: React.FC<GameScreenProps> = ({ onGameOver, onGameClear, devConfig }) => {
  const { gameState, status, time, levelUpOptions, chooseUpgrade, skipUpgrade, cameraX, bossWarningActive } = useGameLogic(devConfig);
  const { player, enemies, projectiles, pickups, explosions } = gameState;
  const freezeTimer = gameState.freezeTimer || 0;
  const boss = enemies.find(e => e.type === EnemyType.BOSS);

  React.useEffect(() => {
    if (status === GameStatus.GAME_OVER) {
      onGameOver(time);
    } else if (status === GameStatus.GAME_CLEAR) {
      onGameClear(time);
    }
  }, [status, time, onGameOver, onGameClear]);

  return (
    <div className="relative overflow-hidden" style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'linear-gradient(to bottom, #87CEEB 60%, #F4E2C2 60%)' }}>
      
      <div className="absolute inset-0 transition-transform duration-100 ease-linear" style={{ transform: `translateX(-${cameraX}px)`, width: WORLD_WIDTH, height: GAME_HEIGHT }}>
          {enemies.map(enemy => {
            const isEnemyFrozen = freezeTimer > 0 && enemy.type !== EnemyType.BOSS && enemy.type !== EnemyType.MINI_BOSS;
            return <Enemy key={enemy.id} enemy={enemy} isFrozen={isEnemyFrozen}/>
          })}
          {projectiles.map(proj => <Projectile key={proj.id} projectile={proj} />)}
          {explosions.map(exp => <Explosion key={exp.id} explosion={exp} />)}
          {pickups.map(pickup => <Pickup key={pickup.id} pickup={pickup} />)}
          <Player player={player} />
      </div>
      
      <TopLeftUI player={player} time={time} />
      {boss && <BossHealthBar health={boss.health} maxHealth={boss.maxHealth} />}
      {bossWarningActive && <BossWarning />}


      {status === GameStatus.LEVEL_UP && levelUpOptions.length > 0 && <LevelUpModal options={levelUpOptions} onSelect={chooseUpgrade} onSkip={skipUpgrade} />}
    </div>
  );
};

export default GameScreen;