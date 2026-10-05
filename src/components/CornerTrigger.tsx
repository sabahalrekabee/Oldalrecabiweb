import React, { useRef } from 'react';

interface CornerTriggerProps {
  onTrigger: () => void;
  isAdminUnlocked?: boolean;
}

export const CornerTrigger: React.FC<CornerTriggerProps> = ({ onTrigger }) => {
  const lastTapRef = useRef<number>(0);

  // Handle double click or double tap for touch devices
  const handleTouchEnd = () => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapRef.current;
    if (tapLength < 350 && tapLength > 0) {
      onTrigger();
    }
    lastTapRef.current = currentTime;
  };

  return (
    <div
      id="top-right-secret-corner"
      className="fixed top-0 right-0 z-50 select-none w-14 h-14 sm:w-16 sm:h-16 bg-transparent"
      onDoubleClick={onTrigger}
      onTouchEnd={handleTouchEnd}
      aria-hidden="true"
    />
  );
};

