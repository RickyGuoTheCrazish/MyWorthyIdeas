import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaCoins, FaExchangeAlt } from 'react-icons/fa';
import axios from 'axios';
import styles from '../styles/AccountSettings.module.css';

const AccountSettings = () => {
    const { user, refreshUser } = useAuth();
    const [amount, setAmount] = useState('');
    const [transactionType, setTransactionType] = useState('deposit');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('transactions');
    const [billingHistory, setBillingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const isSeller = user?.subscription === 'seller';
    const balance = isSeller ? user?.earnings || 0 : user?.credits || 0;

    useEffect(() => {
        fetchBillingHistory();
    }, []);

    const fetchBillingHistory = async () => {
        setLoadingHistory(true);
        try {
            const response = await axios.get('/api/users/billing-history');
            setBillingHistory(response.data.history);
        } catch (err) {
            console.error('Error fetching billing history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleTransaction = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await axios.post(`/api/users/${transactionType}`, {
                amount: parseFloat(amount)
            });

            setSuccess(`${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} successful!`);
            setAmount('');
            refreshUser();
            fetchBillingHistory(); // Refresh history after transaction
        } catch (err) {
            setError(err.response?.data?.message || 'Transaction failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderTransactionForm = () => (
        <div className={styles.transactionSection}>
            <h2>{isSeller ? 'Withdraw Earnings' : 'Make a Transaction'}</h2>
            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}
            
            <form onSubmit={handleTransaction}>
                {!isSeller && (
                    <div className={styles.transactionType}>
                        <button 
                            type="button"
                            className={`${styles.typeButton} ${transactionType === 'deposit' ? styles.active : ''}`}
                            onClick={() => setTransactionType('deposit')}
                        >
                            Deposit
                        </button>
                        <button 
                            type="button"
                            className={`${styles.typeButton} ${transactionType === 'withdraw' ? styles.active : ''}`}
                            onClick={() => setTransactionType('withdraw')}
                        >
                            Withdraw
                        </button>
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label htmlFor="amount" className={styles.amountLabel}>
                        Amount <FaCoins className={styles.coinIcon} />
                    </label>
                    <input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        max={transactionType === 'withdraw' ? balance : undefined}
                    />
                </div>

                <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={loading || (transactionType === 'withdraw' && balance <= 0)}
                >
                    {loading ? 'Processing...' : (
                        <span className={styles.buttonContent}>
                            {isSeller ? 'Withdraw' : `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}`}
                            <FaCoins className={styles.buttonIcon} />
                        </span>
                    )}
                </button>
            </form>
        </div>
    );

    const renderBillingHistory = () => (
        <div className={styles.billingHistory}>
            <h2>Billing History</h2>
            {loadingHistory ? (
                <div className={styles.loading}>Loading history...</div>
            ) : billingHistory.length === 0 ? (
                <div className={styles.emptyState}>No transaction history yet</div>
            ) : (
                <div className={styles.historyList}>
                    {billingHistory.map((transaction) => (
                        <div key={transaction.id} className={styles.historyItem}>
                            <div className={styles.historyItemHeader}>
                                <span className={styles.transactionType}>
                                    {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                                </span>
                                <span className={`${styles.amount} ${transaction.type === 'deposit' ? styles.positive : styles.negative}`}>
                                    {transaction.type === 'deposit' ? '+' : '-'}
                                    <FaCoins className={styles.coinIcon} />
                                    {transaction.amount.toFixed(2)}
                                </span>
                            </div>
                            <div className={styles.historyItemDetails}>
                                <span className={styles.date}>{formatDate(transaction.date)}</span>
                                <span className={styles.status}>{transaction.status}</span>
                            </div>
                            {transaction.description && (
                                <div className={styles.description}>{transaction.description}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Account Settings</h1>
                <div className={styles.balanceCard}>
                    <h2>{isSeller ? 'Your Earnings' : 'Your Credits'}</h2>
                    <div className={styles.balanceWrapper}>
                        <p className={styles.balance}>
                            <FaCoins className={styles.coinIcon} />
                            <span>{balance.toFixed(2)}</span>
                        </p>
                        <div className={styles.conversionRate}>
                            <FaExchangeAlt className={styles.exchangeIcon} />
                            <span>1 USD = 10 Credits</span>
                        </div>
                    </div>
                    {isSeller && (
                        <p className={styles.subtitle}>
                            Total earnings from sold ideas
                        </p>
                    )}
                </div>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'transactions' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('transactions')}
                >
                    {isSeller ? 'Withdraw' : 'Transactions'}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'history' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    History
                </button>
            </div>

            <div className={styles.content}>
                {activeTab === 'transactions' && (
                    renderTransactionForm()
                )}
                {activeTab === 'history' && (
                    renderBillingHistory()
                )}
            </div>
        </div>
    );
};

export default AccountSettings;
