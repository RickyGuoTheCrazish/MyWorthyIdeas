import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaCoins, FaExchangeAlt } from 'react-icons/fa';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentMethodForm from '../components/payment/PaymentMethodForm';
import paymentService from '../services/paymentService';
import styles from '../styles/AccountSettings.module.css';

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Q5RUIAsYE98T3GkgOFSy5Qtd48bhQ5j9GDYL7Hv9OHJ3FNhn1kiBGWbBBrcruuCQv0NrdveXBZiOquWHAZpA8rV00di6ErAjb';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const AccountSettings = () => {
    const { user, setUser } = useAuth();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('transactions');
    const [billingHistory, setBillingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [clientSecret, setClientSecret] = useState('');

    const balance = user?.credits || 0;

    useEffect(() => {
        fetchTransactionHistory();
    }, []);

    const fetchTransactionHistory = async () => {
        try {
            setLoadingHistory(true);
            const { transactions } = await paymentService.getTransactionHistory();
            setBillingHistory(transactions);
        } catch (error) {
            setError('Failed to load transaction history');
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleTransaction = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            console.log('Initializing deposit with amount:', amount);
            await paymentService.initializeDeposit(Number(amount));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = async () => {
        setShowPaymentForm(false);
        setSuccess('Payment processed successfully');
        try {
            const updatedUser = await paymentService.getUserProfile();
            setUser(updatedUser);
        } catch (err) {
            console.error('Error updating user data:', err);
        }
        fetchTransactionHistory();
        setAmount('');
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Account Settings</h1>
                <div className={styles.balanceCard}>
                    <h2>Your Credits</h2>
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
                </div>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'transactions' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('transactions')}
                >
                    Add Credits
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
                    <div className={styles.transactionSection}>
                        <h2>Add Credits</h2>
                        <p className={styles.conversionInfo}>
                            <FaExchangeAlt className={styles.exchangeIcon} />
                            1 USD = 10 Credits
                        </p>
                        
                        <form onSubmit={handleTransaction} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="amount">Amount (USD)</label>
                                <input
                                    type="number"
                                    id="amount"
                                    min="1"
                                    step="1"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    className={styles.input}
                                    placeholder="Enter amount in USD"
                                />
                            </div>
                            
                            {error && <div className={styles.error}>{error}</div>}
                            {success && <div className={styles.success}>{success}</div>}
                            
                            <button
                                type="submit"
                                disabled={loading || !amount}
                                className={styles.submitButton}
                            >
                                {loading ? 'Processing...' : 'Proceed to Checkout'}
                            </button>
                        </form>
                    </div>
                )}
                
                {activeTab === 'history' && (
                    <div className={styles.historySection}>
                        <h2>Transaction History</h2>
                        {loadingHistory ? (
                            <p>Loading history...</p>
                        ) : billingHistory.length === 0 ? (
                            <p>No transactions found</p>
                        ) : (
                            <div className={styles.transactionList}>
                                {billingHistory.map((transaction, index) => (
                                    <div key={index} className={styles.transactionItem}>
                                        <div className={styles.transactionInfo}>
                                            <span className={styles.transactionType}>
                                                {transaction.type === 'deposit' ? 'Added Credits' : 'Purchase'}
                                            </span>
                                            <span className={styles.transactionAmount}>
                                                {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                                            </span>
                                        </div>
                                        <span className={styles.transactionDate}>
                                            {formatDate(transaction.createdAt)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountSettings;
