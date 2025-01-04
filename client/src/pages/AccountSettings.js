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
    const [transactionType, setTransactionType] = useState('deposit');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('transactions');
    const [billingHistory, setBillingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [clientSecret, setClientSecret] = useState('');

    const isSeller = user?.subscription === 'seller';
    const balance = isSeller ? user?.earnings || 0 : user?.credits || 0;

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
            if (transactionType === 'deposit') {
                console.log('Initializing deposit with amount:', amount);
                const response = await paymentService.initializeDeposit(Number(amount));
                console.log('Deposit initialization response:', response);
                const { clientSecret } = response;
                
                if (!clientSecret) {
                    throw new Error('Failed to initialize payment');
                }
                
                console.log('Setting client secret:', clientSecret);
                setClientSecret(clientSecret);
                setShowPaymentForm(true);
            } else {
                await paymentService.processWithdrawal(Number(amount));
                setSuccess('Withdrawal processed successfully');
                try {
                    const updatedUser = await paymentService.getUserProfile();
                    setUser(updatedUser);
                } catch (err) {
                    console.error('Error updating user data:', err);
                }
                fetchTransactionHistory();
                setAmount('');
            }
        } catch (err) {
            setError(err.message);
            if (err.code === 'NO_PAYMENT_METHOD') {
                setShowPaymentForm(true);
            }
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
                    <div className={styles.transactionSection}>
                        <h2>{isSeller ? 'Withdraw Earnings' : 'Make a Transaction'}</h2>
                        {error && <div className={styles.error}>{error}</div>}
                        {success && <div className={styles.success}>{success}</div>}
                        
                        {showPaymentForm ? (
                            <Elements 
                                stripe={stripePromise} 
                                options={{
                                    clientSecret,
                                    appearance: {
                                        theme: 'stripe',
                                    },
                                }}
                            >
                                <PaymentMethodForm 
                                    onSuccess={handlePaymentSuccess}
                                    type={transactionType}
                                    clientSecret={clientSecret}
                                />
                            </Elements>
                        ) : (
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
                                        max={transactionType === 'withdraw' ? balance / 10 : undefined}
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
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className={styles.billingHistory}>
                        <h2>Billing History</h2>
                        {loadingHistory ? (
                            <div className={styles.loading}>Loading history...</div>
                        ) : billingHistory.length === 0 ? (
                            <div className={styles.emptyState}>No transaction history yet</div>
                        ) : (
                            <div className={styles.historyList}>
                                {billingHistory.map((transaction) => (
                                    <div key={transaction._id} className={styles.historyItem}>
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
                                            <span className={styles.date}>{formatDate(transaction.createdAt)}</span>
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
                )}
            </div>
        </div>
    );
};

export default AccountSettings;
