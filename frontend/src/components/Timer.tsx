import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  expiresAt: string | Date;
  onTimeout: () => void;
}

export const Timer: React.FC<TimerProps> = ({ expiresAt, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft(0);
        onTimeout();
      } else {
        setTimeLeft(Math.floor(difference / 1000));
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onTimeout]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

  const isLowTime = timeLeft < 60; // Less than 1 minute remaining

  return (
    <div 
      className="flex align-center gap-2" 
      style={{
        color: isLowTime ? 'var(--color-danger)' : 'var(--color-accent)',
        fontWeight: 'bold',
        fontSize: '1.1rem',
        backgroundColor: isLowTime ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${isLowTime ? 'var(--color-danger)' : 'var(--color-accent)'}`
      }}
    >
      <Clock size={16} />
      <span>Session Expires: {formattedTime}</span>
    </div>
  );
};
