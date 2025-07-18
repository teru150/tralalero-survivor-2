import React, { useCallback, useRef, useState, useEffect } from 'react';

interface TouchControlsProps {
  onMovementChange: (keys: Set<string>) => void;
}

const TouchControls: React.FC<TouchControlsProps> = ({ onMovementChange }) => {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  const updateMovement = useCallback((keys: Set<string>) => {
    setActiveKeys(keys);
    onMovementChange(keys);
  }, [onMovementChange]);

  const handleStart = useCallback((clientX: number, clientY: number, touchId?: number) => {
    if (!joystickRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance <= rect.width / 2) {
      setIsDragging(true);
      touchIdRef.current = touchId || null;
      handleMove(clientX, clientY);
    }
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current || !isDragging) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2 - 20;
    
    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > radius) {
      deltaX = (deltaX / distance) * radius;
      deltaY = (deltaY / distance) * radius;
    }
    
    setKnobPosition({ x: deltaX, y: deltaY });
    
    const newKeys = new Set<string>();
    const threshold = 20;
    
    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      if (deltaY < -threshold) newKeys.add('w');
      if (deltaY > threshold) newKeys.add('s');
      if (deltaX < -threshold) newKeys.add('a');
      if (deltaX > threshold) newKeys.add('d');
    }
    
    updateMovement(newKeys);
  }, [isDragging, updateMovement]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    touchIdRef.current = null;
    setKnobPosition({ x: 0, y: 0 });
    updateMovement(new Set());
  }, [updateMovement]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY, touch.identifier);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
    if (touch) {
      handleMove(touch.clientX, touch.clientY);
    }
  }, [handleMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
    if (touch) {
      handleEnd();
    }
  }, [handleEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    e.preventDefault();
    handleEnd();
  }, [handleEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="fixed bottom-8 left-8 z-50 md:hidden">
      <div
        ref={joystickRef}
        className="relative w-24 h-24 bg-black/40 rounded-full border-4 border-white/30 touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div
          ref={knobRef}
          className="absolute w-8 h-8 bg-white/80 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-100"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${knobPosition.x}px, ${knobPosition.y}px)`,
          }}
        />
      </div>
    </div>
  );
};

export default TouchControls;