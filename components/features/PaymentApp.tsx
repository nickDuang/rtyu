
import React, { useState, useEffect } from 'react';

interface PaymentAppProps {
  onBack: () => void;
  isOpen: boolean;
}

interface Transaction {
    id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
}

const PaymentApp: React.FC<PaymentAppProps> = ({ onBack, isOpen }) => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  
  // --- View State ---
  const [activeModal, setActiveModal] = useState<'none' | 'setBalance' | 'setPassword' | 'transfer'>('none');
  const [inputValue, setInputValue] = useState('');
  const [transferNote, setTransferNote] = useState(''); // For transfer payee/reason

  useEffect(() => {
      if (isOpen) {
          // Load Data
          const savedBalance = localStorage.getItem('ephone_wallet_balance');
          const savedPass = localStorage.getItem('ephone_wallet_password');
          const savedTxs = localStorage.getItem('ephone_wallet_transactions');

          if (savedBalance) setBalance(parseFloat(savedBalance));
          else {
              // Default init
              setBalance(10000.00);
              localStorage.setItem('ephone_wallet_balance', '10000');
          }

          if (savedPass) setHasPassword(true);
          if (savedTxs) setTransactions(JSON.parse(savedTxs));
      }
  }, [isOpen]);

  const updateBalance = (newBalance: number) => {
      setBalance(newBalance);
      localStorage.setItem('ephone_wallet_balance', newBalance.toString());
  };

  const handleSetBalance = () => {
      const amount = parseFloat(inputValue);
      if (!isNaN(amount)) {
          updateBalance(amount);
          // Add system record
          const newTx: Transaction = {
              id: `tx_${Date.now()}`,
              title: '余额调整',
              amount: amount,
              type: 'income',
              date: new Date().toLocaleString()
          };
          const newTxs = [newTx, ...transactions];
          setTransactions(newTxs);
          localStorage.setItem('ephone_wallet_transactions', JSON.stringify(newTxs));
          
          setActiveModal('none');
          setInputValue('');
      } else {
          alert("请输入有效的数字");
      }
  };

  const handleSetPassword = () => {
      if (inputValue.length < 4) {
          alert("密码至少需要4位");
          return;
      }
      localStorage.setItem('ephone_wallet_password', inputValue);
      setHasPassword(true);
      setActiveModal('none');
      setInputValue('');
      alert("支付密码设置成功！");
  };

  const handleTransfer = () => {
      const amount = parseFloat(inputValue);
      if (isNaN(amount) || amount <= 0) {
          alert("请输入有效的转账金额");
          return;
      }
      if (amount > balance) {
          alert("余额不足");
          return;
      }
      if (!transferNote.trim()) {
          alert("请输入对方姓名或备注");
          return;
      }

      // Deduct
      const newBalance = balance - amount;
      updateBalance(newBalance);

      // Record
      const newTx: Transaction = {
          id: `tx_${Date.now()}`,
          title: `转账给 ${transferNote}`,
          amount: amount,
          type: 'expense',
          date: new Date().toLocaleString()
      };
      const newTxs = [newTx, ...transactions];
      setTransactions(newTxs);
      localStorage.setItem('ephone_wallet_transactions', JSON.stringify(newTxs));

      alert("转账成功！");
      setActiveModal('none');
      setInputValue('');
      setTransferNote('');
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-[#f5f5f5] z-50 flex flex-col app-transition text-gray-800">
        
        {/* Header */}
        <div className="bg-[#4a90e2] h-48 rounded-b-[40px] px-6 pt-12 relative shadow-lg">
            <div className="flex justify-between items-center text-white mb-6">
                <button onClick={onBack} className="text-2xl">‹</button>
                <span className="font-bold tracking-wide">我的钱包</span>
                <button onClick={() => { setInputValue(''); setActiveModal('setPassword'); }} className="text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    {hasPassword ? '修改密码' : '设置密码'}
                </button>
            </div>
            
            <div className="text-white text-center">
                <div className="text-sm opacity-80 mb-1">总资产 (元)</div>
                <div className="text-5xl font-bold font-mono tracking-tight">{balance.toFixed(2)}</div>
            </div>

            {/* Floating Card */}
            <div className="absolute -bottom-10 left-6 right-6 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-around text-center">
                <div onClick={() => { setInputValue(''); setActiveModal('setBalance'); }} className="active:opacity-50 cursor-pointer">
                    <div className="text-2xl text-[#4a90e2]">💰</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">设置余额</div>
                </div>
                <div className="w-[1px] h-8 bg-gray-100"></div>
                <div className="active:opacity-50 cursor-pointer" onClick={() => { setInputValue(''); setTransferNote(''); setActiveModal('transfer'); }}>
                    <div className="text-2xl text-[#f5a623]">💸</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">转账</div>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 mt-14 px-6 overflow-y-auto no-scrollbar pb-10">
            <h3 className="font-bold text-gray-700 mb-4 text-sm">最近交易</h3>
            
            <div className="space-y-3">
                {transactions.length === 0 ? (
                    <div className="text-center text-gray-400 py-10 text-xs">暂无交易记录</div>
                ) : (
                    transactions.map(tx => (
                        <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${tx.type === 'expense' ? 'bg-orange-400' : 'bg-green-400'}`}>
                                    {tx.type === 'expense' ? '🛒' : '💰'}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-gray-800">{tx.title}</div>
                                    <div className="text-[10px] text-gray-400">{tx.date}</div>
                                </div>
                            </div>
                            <div className={`font-bold ${tx.type === 'expense' ? 'text-black' : 'text-green-600'}`}>
                                {tx.type === 'expense' ? '-' : '+'}{tx.amount.toFixed(2)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Modals */}
        {activeModal !== 'none' && (
            <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
                <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-[scaleIn_0.2s_ease-out]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                        {activeModal === 'setBalance' ? '修改钱包余额' : activeModal === 'transfer' ? '转账' : '设置支付密码'}
                    </h3>
                    
                    {activeModal === 'setPassword' && (
                        <p className="text-xs text-red-500 mb-2 text-center bg-red-50 p-2 rounded">
                            购物时将需要输入此密码验证
                        </p>
                    )}

                    {activeModal === 'transfer' && (
                        <input 
                            type="text"
                            value={transferNote}
                            onChange={(e) => setTransferNote(e.target.value)}
                            placeholder="对方姓名 / 备注"
                            className="w-full bg-gray-100 p-3 rounded-xl outline-none mb-3 text-center text-sm"
                        />
                    )}

                    <input 
                        type={activeModal === 'setBalance' || activeModal === 'transfer' ? 'number' : 'text'}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={activeModal === 'setBalance' ? '输入金额' : activeModal === 'transfer' ? '输入转账金额' : '输入新密码'}
                        className="w-full bg-gray-100 p-3 rounded-xl outline-none mb-6 text-center font-bold text-lg"
                        autoFocus
                    />

                    <div className="flex gap-3">
                        <button onClick={() => setActiveModal('none')} className="flex-1 bg-gray-200 text-gray-600 py-3 rounded-xl font-bold text-sm">取消</button>
                        <button 
                            onClick={activeModal === 'setBalance' ? handleSetBalance : activeModal === 'transfer' ? handleTransfer : handleSetPassword}
                            className="flex-1 bg-[#4a90e2] text-white py-3 rounded-xl font-bold text-sm shadow-md"
                        >
                            确认
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default PaymentApp;
