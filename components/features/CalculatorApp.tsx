
import React, { useState } from 'react';

interface CalculatorAppProps {
  onBack: () => void;
  isOpen: boolean;
}

const CalculatorApp: React.FC<CalculatorAppProps> = ({ onBack, isOpen }) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(display);
    } else if (operator) {
      const currentValue = prevValue ? parseFloat(prevValue) : 0;
      const newValue = calculate(currentValue, inputValue, operator);
      setPrevValue(String(newValue));
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (a: number, b: number, op: string) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return a / b;
      default: return b;
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleEqual = () => {
     if (operator && prevValue) {
        const inputValue = parseFloat(display);
        const result = calculate(parseFloat(prevValue), inputValue, operator);
        setDisplay(String(result));
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(true);
     }
  };

  if (!isOpen) return null;

  const btnClass = (color: string = 'bg-[#333]') => 
    `${color} text-white w-16 h-16 rounded-full text-2xl font-medium flex items-center justify-center active:opacity-70 transition-opacity`;

  return (
    <div className="absolute inset-0 bg-black text-white z-50 flex flex-col app-transition p-4 pb-12">
      <div className="flex justify-start pt-10 px-2">
           <button onClick={onBack} className="text-white text-xl">✕</button>
      </div>
      
      <div className="flex-1 flex items-end justify-end px-4 mb-4">
          <span className="text-7xl font-light tracking-tight truncate">{display}</span>
      </div>

      <div className="grid grid-cols-4 gap-4 px-2">
          <button onClick={handleClear} className="bg-[#a5a5a5] text-black w-16 h-16 rounded-full text-xl font-medium flex items-center justify-center active:opacity-70">AC</button>
          <button onClick={() => {}} className="bg-[#a5a5a5] text-black w-16 h-16 rounded-full text-xl font-medium flex items-center justify-center active:opacity-70">+/-</button>
          <button onClick={() => {}} className="bg-[#a5a5a5] text-black w-16 h-16 rounded-full text-xl font-medium flex items-center justify-center active:opacity-70">%</button>
          <button onClick={() => performOperation('÷')} className={btnClass('bg-[#ff9f0a]')}>÷</button>
          
          <button onClick={() => inputDigit('7')} className={btnClass()}>7</button>
          <button onClick={() => inputDigit('8')} className={btnClass()}>8</button>
          <button onClick={() => inputDigit('9')} className={btnClass()}>9</button>
          <button onClick={() => performOperation('×')} className={btnClass('bg-[#ff9f0a]')}>×</button>
          
          <button onClick={() => inputDigit('4')} className={btnClass()}>4</button>
          <button onClick={() => inputDigit('5')} className={btnClass()}>5</button>
          <button onClick={() => inputDigit('6')} className={btnClass()}>6</button>
          <button onClick={() => performOperation('-')} className={btnClass('bg-[#ff9f0a]')}>−</button>
          
          <button onClick={() => inputDigit('1')} className={btnClass()}>1</button>
          <button onClick={() => inputDigit('2')} className={btnClass()}>2</button>
          <button onClick={() => inputDigit('3')} className={btnClass()}>3</button>
          <button onClick={() => performOperation('+')} className={btnClass('bg-[#ff9f0a]')}>+</button>
          
          <button onClick={() => inputDigit('0')} className="bg-[#333] text-white w-[8.5rem] h-16 rounded-full text-2xl font-medium flex items-center pl-7 active:opacity-70 col-span-2">0</button>
          <button onClick={() => inputDigit('.')} className={btnClass()}>.</button>
          <button onClick={handleEqual} className={btnClass('bg-[#ff9f0a]')}>=</button>
      </div>
    </div>
  );
};

export default CalculatorApp;
