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
                        <div className={styles.creditPackages}>
                            <h2>Select Credit Package</h2>
                            <div className={styles.feeInfo}>
                                <FaExchangeAlt className={styles.exchangeIcon} />
                                <span>Processing fee: 1% (max $2 USD)</span>
                            </div>
                            <div className={styles.packageGrid}>
                                <div 
                                    className={`${styles.packageCard} ${amount === '10' ? styles.selectedPackage : ''}`}
                                    onClick={() => setAmount('10')}
                                >
                                    <div className={styles.packageHeader}>
                                        <FaCoins className={styles.packageIcon} />
                                        <h3>Starter</h3>
                                    </div>
                                    <div className={styles.packagePrice}>$10</div>
                                    <div className={styles.packageCredits}>100 Credits</div>
                                    <div className={styles.packageFeatures}>
                                        <div>Perfect for trying out</div>
                                        <div>Instant delivery</div>
                                        <div className={styles.processingFee}>
                                            + ${(10 * 0.01).toFixed(2)} processing fee
                                        </div>
                                    </div>
                                </div>

                                <div 
                                    className={`${styles.packageCard} ${amount === '50' ? styles.selectedPackage : ''}`}
                                    onClick={() => setAmount('50')}
                                >
                                    <div className={styles.packageHeader}>
                                        <FaCoins className={styles.packageIcon} />
                                        <h3>Popular</h3>
                                    </div>
                                    <div className={styles.packagePrice}>$50</div>
                                    <div className={styles.packageCredits}>500 Credits</div>
                                    <div className={styles.packageFeatures}>
                                        <div>Most popular choice</div>
                                        <div>Instant delivery</div>
                                        <div className={styles.processingFee}>
                                            + ${(50 * 0.01).toFixed(2)} processing fee
                                        </div>
                                    </div>
                                </div>

                                <div 
                                    className={`${styles.packageCard} ${amount === '100' ? styles.selectedPackage : ''}`}
                                    onClick={() => setAmount('100')}
                                >
                                    <div className={styles.packageHeader}>
                                        <FaCoins className={styles.packageIcon} />
                                        <h3>Pro</h3>
                                    </div>
                                    <div className={styles.packagePrice}>$100</div>
                                    <div className={styles.packageCredits}>1000 Credits</div>
                                    <div className={styles.packageFeatures}>
                                        <div>Best value</div>
                                        <div>Instant delivery</div>
                                        <div className={styles.processingFee}>
                                            + $2.00 processing fee
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.customAmount}>
                                <div className={styles.customAmountHeader}>
                                    <h3>Custom Amount</h3>
                                    <div className={styles.conversionRate}>
                                        <FaExchangeAlt className={styles.exchangeIcon} />
                                        <span>1 USD = 10 Credits</span>
                                    </div>
                                </div>
                                <div className={styles.customAmountInput}>
                                    <div className={styles.inputWrapper}>
                                        <span className={styles.currencySymbol}>$</span>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="Enter amount"
                                            className={styles.input}
                                        />
                                    </div>
                                    <div className={styles.creditPreview}>
                                        <div>≈ {(Number(amount) || 0) * 10} Credits</div>
                                        <div className={styles.processingFee}>
                                            + ${Math.min((Number(amount) || 0) * 0.01, 2).toFixed(2)} processing fee
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && <div className={styles.error}>{error}</div>}
                            {success && <div className={styles.success}>{success}</div>}

                            <button
                                onClick={handleTransaction}
                                disabled={loading || !amount}
                                className={styles.checkoutButton}
                            >
                                {loading ? (
                                    <span className={styles.loadingText}>Processing...</span>
                                ) : (
                                    <span className={styles.buttonContent}>
                                        Proceed to Checkout
                                        <span className={styles.buttonAmount}>
                                            ${(Number(amount) + Math.min(Number(amount) * 0.01, 2)).toFixed(2)}
                                        </span>
                                    </span>
                                )}
                            </button>
                        </div>
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
