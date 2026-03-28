export const calculateInterest = (transactions, config) => {
  if (!config || !config.rate || !transactions || transactions.length === 0) {
    const bal = calculateRawBalance(transactions);
    return { principal: bal, interest: 0, total: bal };
  }

  const rate = Number(config.rate);
  const freq = config.frequency || 'monthly'; // 'monthly', 'yearly', 'daily'

  // filter out deleted/uncleared if any, but assume input is clean
  const validTx = transactions.filter(t => !t.is_deleted);
  const sorted = [...validTx].sort((a, b) => new Date(a.transaction_at) - new Date(b.transaction_at));

  let balance = 0;
  let totalInterest = 0;
  let lastDate = sorted.length > 0 ? new Date(sorted[0].transaction_at) : new Date();

  sorted.forEach(t => {
    const currentTxDate = new Date(t.transaction_at);
    
    // Calculate interest from lastDate to currentTxDate on current balance
    const diffDays = (currentTxDate - lastDate) / (1000 * 60 * 60 * 24);
    if (diffDays > 0 && balance !== 0) {
      const calcAmount = Math.abs(balance);
      let interestPeriod = 0;
      
      if (freq === 'monthly') interestPeriod = diffDays / 30.416; // approx month length
      else if (freq === 'yearly') interestPeriod = diffDays / 365;
      else if (freq === 'daily') interestPeriod = diffDays;

      const accInterest = calcAmount * (rate / 100) * interestPeriod;
      
      // If balance is positive, interest is positive. If negative, negative.
      totalInterest += balance > 0 ? accInterest : -accInterest;
    }
    
    // Apply transaction
    if (t.type === 'receive') balance += Number(t.amount);
    if (t.type === 'give') balance -= Number(t.amount);
    
    lastDate = currentTxDate;
  });

  // Calculate interest from last transaction date to TODAY
  const now = new Date();
  const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);
  if (diffDays > 0 && balance !== 0) {
    const calcAmount = Math.abs(balance);
    let interestPeriod = 0;
    
    if (freq === 'monthly') interestPeriod = diffDays / 30.416;
    else if (freq === 'yearly') interestPeriod = diffDays / 365;
    else if (freq === 'daily') interestPeriod = diffDays;

    const accInterest = calcAmount * (rate / 100) * interestPeriod;
    totalInterest += balance > 0 ? accInterest : -accInterest;
  }

  return { 
    principal: balance, 
    interest: totalInterest, 
    total: balance + totalInterest 
  };
};

const calculateRawBalance = (transactions) => {
  let bal = 0;
  (transactions || []).forEach(t => {
    if (t.is_deleted) return;
    if (t.type === 'receive') bal += Number(t.amount);
    if (t.type === 'give') bal -= Number(t.amount);
  });
  return bal;
};
