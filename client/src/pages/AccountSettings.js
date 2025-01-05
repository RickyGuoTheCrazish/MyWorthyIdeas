import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaCoins, FaExchangeAlt, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentMethodForm from '../components/payment/PaymentMethodForm';
import paymentService from '../services/paymentService';
import styles from '../styles/AccountSettings.module.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDate } from '../utils/dateFormatter';

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Q5RUIAsYE98T3GkgOFSy5Qtd48bhQ5j9GDYL7Hv9OHJ3FNhn1kiBGWbBBrcruuCQv0NrdveXBZiOquWHAZpA8rV00di6ErAjb';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const CREDIT_MULTIPLIER = 10;

const AccountSettings = () => {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('transactions');
    const [billingHistory, setBillingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [clientSecret, setClientSecret] = useState('');
    const [customCredits, setCustomCredits] = useState('');
    const [withdrawCredits, setWithdrawCredits] = useState('');
    const [isInternationalCard, setIsInternationalCard] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const balance = user?.credits || 0;

    useEffect(() => {
        if (!user) {
            navigate('/recommendations');
        }
        fetchTransactionHistory();
    }, [user, navigate]);

    if (!user) return null;

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

    const handleCheckout = (amount) => {
        setAmount(amount.toString());
        handleTransaction();
    };

    const getFeeInfo = (amount) => {
        if (!amount || isNaN(amount)) return { fee: 0, percentage: 0 };
        return paymentService.calculateProcessingFee(Number(amount));
    };

    const handleAmountChange = (e) => {
        // Only allow integers
        const value = e.target.value.replace(/[^0-9]/g, '');
        setAmount(value);
    };

    const { fee: processingFee, percentage: feePercentage } = getFeeInfo(amount);
    const totalAmount = amount ? Number(amount) + processingFee : 0;
    const creditsToReceive = amount ? Number(amount) * CREDIT_MULTIPLIER : 0;

    const calculateWithdrawFee = (credits) => {
        const audAmount = Number(credits) / 10;
        const baseRate = isInternationalCard ? 0.05 : 0.03; // 5% for international, 3% for domestic
        const baseFee = audAmount * baseRate;
        const fixedFee = 0.50; // $0.50 AUD fixed fee
        
        let totalFee = baseFee + fixedFee;
        
        if (isInternationalCard) {
            // Add 2% for currency conversion if international
            totalFee += audAmount * 0.02;
        }
        
        return totalFee;
    };

    const calculateEstimatedAUD = (credits) => {
        if (!credits) return 0;
        const audAmount = Number(credits) / 10;
        const fee = calculateWithdrawFee(credits);
        return Math.max(0, audAmount - fee);
    };

    const handleWithdraw = async () => {
        // Implement withdraw logic here
    };

    const handlePackageSelect = (audAmount) => {
        setAmount(audAmount);
        setCustomCredits(audAmount * 10); // Convert AUD to credits
    };

    const handleCustomCreditsChange = (e) => {
        const credits = e.target.value;
        setCustomCredits(credits);
        setAmount((Number(credits) / 10).toFixed(2)); // Convert credits to AUD
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Account Settings</h1>
                <div className={styles.creditsSection}>
                    <div className={styles.creditsSummary}>
                        <div className={styles.creditsLabel}>Your Credits</div>
                        <div className={styles.creditsAmount}>
                            <FaCoins className={styles.coinsIcon} />
                            <span className={styles.amount}>{user.credits?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className={styles.conversionRate}>
                            <FaExchangeAlt className={styles.exchangeIcon} />
                            <span>10 Credits = 1 AUD</span>
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
                        className={`${styles.tab} ${activeTab === 'withdraw' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('withdraw')}
                    >
                        Withdraw
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'history' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </button>
                </div>

                <div className={styles.content}>
                    {successMessage && (
                        <div className={styles.successMessage}>
                            {successMessage}
                        </div>
                    )}
                    
                    {activeTab === 'transactions' && (
                        <div className={styles.transactionSection}>
                            <h2>Select Credit Package</h2>
                            <div className={styles.feeInfo}>
                                <FaExchangeAlt className={styles.exchangeIcon} />
                                <div className={styles.feeDescription}>
                                    <div className={styles.feePrimary}>Processing fee: 1-3% (max $2 AUD)</div>
                                    <div className={styles.feeSecondary}>Add more credits to enjoy lower processing fees standard</div>
                                </div>
                            </div>
                            <div className={styles.packageGrid}>
                                <div 
                                    className={`${styles.packageCard} ${amount === '10' ? styles.selectedPackage : ''}`}
                                    onClick={() => handlePackageSelect('10')}
                                >
                                    <div className={styles.packageHeader}>
                                        <FaCoins className={styles.packageIcon} />
                                        <h3>Starter</h3>
                                    </div>
                                    <div className={styles.packagePrice}>$10 AUD</div>
                                    <div className={styles.packageCredits}>100 Credits</div>
                                    <div className={styles.packageFeatures}>
                                        <div>Perfect for trying out</div>
                                        <div>Instant delivery</div>
                                        <div className={styles.processingFee}>
                                            + ${getFeeInfo(10).fee.toFixed(2)} AUD processing fee
                                            <div className={styles.feeNote}>
                                                Save on fees with larger amounts
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div 
                                    className={`${styles.packageCard} ${amount === '50' ? styles.selectedPackage : ''}`}
                                    onClick={() => handlePackageSelect('50')}
                                >
                                    <div className={styles.packageHeader}>
                                        <FaCoins className={styles.packageIcon} />
                                        <h3>Popular</h3>
                                    </div>
                                    <div className={styles.packagePrice}>$50 AUD</div>
                                    <div className={styles.packageCredits}>500 Credits</div>
                                    <div className={styles.packageFeatures}>
                                        <div>Most popular choice</div>
                                        <div>Instant delivery</div>
                                        <div className={styles.processingFee}>
                                            + ${getFeeInfo(50).fee.toFixed(2)} AUD processing fee
                                            <div className={styles.feeNote}>
                                                Better processing fee rate
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div 
                                    className={`${styles.packageCard} ${amount === '100' ? styles.selectedPackage : ''}`}
                                    onClick={() => handlePackageSelect('100')}
                                >
                                    <div className={styles.packageHeader}>
                                        <FaCoins className={styles.packageIcon} />
                                        <h3>Pro</h3>
                                    </div>
                                    <div className={styles.packagePrice}>$100 AUD</div>
                                    <div className={styles.packageCredits}>1000 Credits</div>
                                    <div className={styles.packageFeatures}>
                                        <div>Best value</div>
                                        <div>Instant delivery</div>
                                        <div className={styles.processingFee}>
                                            + ${getFeeInfo(100).fee.toFixed(2)} AUD processing fee
                                            <div className={styles.feeNote}>
                                                Lowest processing fee rate
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.customAmount}>
                                <div className={styles.customAmountHeader}>
                                    <h3>Custom Amount</h3>
                                    <div className={styles.conversionRate}>
                                        <FaExchangeAlt className={styles.exchangeIcon} />
                                        <span>1 AUD = {CREDIT_MULTIPLIER} Credits</span>
                                    </div>
                                </div>
                                <div className={styles.customAmountInput}>
                                    <div className={styles.inputWrapper}>
                                        <span className={styles.currencySymbol}>$</span>
                                        <input
                                            type="text"
                                            value={amount}
                                            onChange={handleAmountChange}
                                            placeholder="Enter whole number in AUD"
                                            className={styles.amountInput}
                                        />
                                        <span className={styles.currencyCode}>AUD</span>
                                    </div>
                                </div>
                                <div className={styles.creditPreview}>
                                    <div className={styles.creditAmount}>
                                        ≈ {creditsToReceive.toLocaleString()} Credits
                                    </div>
                                    <div className={styles.processingFee}>
                                        + ${processingFee.toFixed(2)} AUD processing fee ({feePercentage}%)
                                    </div>
                                </div>
                            </div>

                            {error && <div className={styles.error}>{error}</div>}
                            {success && <div className={styles.success}>{success}</div>}

                            <button 
                                className={`${styles.checkoutButton} ${(!amount || isNaN(amount) || Number(amount) <= 0) ? styles.disabled : ''}`}
                                onClick={handleTransaction}
                                disabled={!amount || isNaN(amount) || Number(amount) <= 0}
                            >
                                {loading ? (
                                    <span className={styles.loadingText}>Processing...</span>
                                ) : (
                                    <span className={styles.buttonContent}>
                                        Proceed to Checkout
                                        <span className={styles.buttonAmount}>
                                            ${totalAmount.toFixed(2)} AUD
                                        </span>
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                    
                    {activeTab === 'withdraw' && (
                        <div className={styles.withdrawSection}>
                            <div className={styles.withdrawHeader}>
                                <h2>Withdraw Credits</h2>
                                <div className={styles.cardToggle}>
                                    <label className={styles.toggleLabel}>
                                        <input
                                            type="checkbox"
                                            checked={isInternationalCard}
                                            onChange={(e) => setIsInternationalCard(e.target.checked)}
                                            className={styles.toggleInput}
                                        />
                                        <span className={styles.toggleSlider}></span>
                                        <span className={styles.toggleText}>
                                            {isInternationalCard ? 'International Card' : 'Domestic Card'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className={styles.withdrawContent}>
                                <div className={styles.balanceCard}>
                                    <div className={styles.balanceIcon}>
                                        <FaCoins />
                                    </div>
                                    <div className={styles.balanceInfo}>
                                        <div className={styles.balanceLabel}>Available Balance</div>
                                        <div className={styles.balanceAmount}>
                                            <span className={styles.creditAmount}>{user.credits || 0}</span>
                                            <span className={styles.creditLabel}>Credits</span>
                                        </div>
                                        <div className={styles.audValue}>
                                            ≈ ${((user.credits || 0) / 10).toFixed(2)} AUD
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.withdrawForm}>
                                    <div className={styles.inputGroup}>
                                        <div className={styles.inputWrapper}>
                                            <input
                                                type="number"
                                                value={withdrawCredits}
                                                onChange={(e) => setWithdrawCredits(e.target.value)}
                                                placeholder="Enter amount in Credits"
                                                className={styles.input}
                                                min="100"
                                                step="10"
                                            />
                                            <span className={styles.inputSuffix}>Credits</span>
                                        </div>
                                        {withdrawCredits && (
                                            <div className={styles.conversionPreview}>
                                                <div className={styles.previewItem}>
                                                    <span>Amount in AUD:</span>
                                                    <span>${(Number(withdrawCredits) / 10).toFixed(2)} AUD</span>
                                                </div>
                                                <div className={styles.previewItem}>
                                                    <span>Processing Fee:</span>
                                                    <span className={styles.feeAmount}>
                                                        ${calculateWithdrawFee(withdrawCredits).toFixed(2)} AUD
                                                    </span>
                                                </div>
                                                <div className={styles.previewItem}>
                                                    <span>You'll Receive:</span>
                                                    <span className={styles.finalAmount}>
                                                        ${calculateEstimatedAUD(withdrawCredits).toFixed(2)} AUD
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.feeInfo}>
                                        <div className={styles.feeHeader}>
                                            <FaInfoCircle className={styles.infoIcon} />
                                            <span>Processing Fees</span>
                                        </div>
                                        <div className={styles.feeDetails}>
                                            <div className={styles.feeItem}>
                                                • Base fee: {isInternationalCard ? '5%' : '3%'} + $0.50 AUD
                                            </div>
                                            {isInternationalCard && (
                                                <div className={styles.feeItem}>
                                                    • Currency conversion: +2%
                                                </div>
                                            )}
                                            <div className={styles.feeItem}>
                                                • Minimum withdrawal: 100 credits ($10 AUD)
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        className={styles.withdrawButton}
                                        disabled={!withdrawCredits || Number(withdrawCredits) < 100}
                                        onClick={handleWithdraw}
                                    >
                                        {loading ? (
                                            <span className={styles.loadingText}>
                                                <FaSpinner className={styles.spinner} /> Processing...
                                            </span>
                                        ) : (
                                            'Withdraw Credits'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'history' && (
                        <div className={styles.historySection}>
                            <div className={styles.historyHeader}>
                                <h2>Transaction History</h2>
                                <div className={styles.historySummary}>
                                    <div className={styles.summaryItem}>
                                        <FaCoins className={styles.summaryIcon} />
                                        <div className={styles.summaryText}>
                                            <div className={styles.summaryLabel}>Current Balance</div>
                                            <div className={styles.summaryValue}>{user.credits?.toFixed(0)} Credits</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {loadingHistory ? (
                                <div className={styles.loadingState}>
                                    <FaSpinner className={styles.spinner} />
                                    <span>Loading your transaction history...</span>
                                </div>
                            ) : billingHistory.length > 0 ? (
                                <div className={styles.transactionList}>
                                    {billingHistory.map((transaction, index) => (
                                        <div key={index} className={`${styles.transactionItem} ${styles[transaction.status]}`}>
                                            <div className={styles.transactionIcon}>
                                                {transaction.status === 'complete' ? (
                                                    <div className={styles.successIcon}><FaCoins /></div>
                                                ) : transaction.status === 'pending' ? (
                                                    <div className={styles.pendingIcon}><FaSpinner /></div>
                                                ) : (
                                                    <div className={styles.failedIcon}><FaInfoCircle /></div>
                                                )}
                                            </div>
                                            <div className={styles.transactionContent}>
                                                <div className={styles.transactionMain}>
                                                    <div className={styles.transactionLeft}>
                                                        <div className={styles.transactionTitle}>
                                                            Credit Purchase
                                                            <span className={`${styles.statusBadge} ${styles[transaction.status]}`}>
                                                                {transaction.status}
                                                            </span>
                                                        </div>
                                                        <div className={styles.transactionDate}>
                                                            {formatDate(transaction.createdAt)}
                                                        </div>
                                                    </div>
                                                    <div className={styles.transactionRight}>
                                                        <div className={styles.amountDetails}>
                                                            <div className={styles.creditAmount}>
                                                                +{(transaction.amount * CREDIT_MULTIPLIER).toFixed(0)} Credits
                                                            </div>
                                                            <div className={styles.moneyAmount}>
                                                                ${transaction.amount.toFixed(2)} USD
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {transaction.processingFee > 0 && (
                                                    <div className={styles.transactionFee}>
                                                        <div className={styles.feeLabel}>Processing Fee:</div>
                                                        <div className={styles.feeAmount}>
                                                            ${transaction.processingFee.toFixed(2)} USD
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyIcon}>
                                        <FaCoins />
                                    </div>
                                    <h3>No Transactions Yet</h3>
                                    <p>Your purchase history will appear here once you buy credits.</p>
                                    <button 
                                        className={styles.emptyStateAction}
                                        onClick={() => setActiveTab('transactions')}
                                    >
                                        Buy Credits Now
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
