import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaCoins, FaExchangeAlt, FaSpinner, FaInfoCircle, FaCreditCard } from 'react-icons/fa';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentMethodForm from '../components/payment/PaymentMethodForm';
import paymentService from '../services/paymentService';
import styles from '../styles/AccountSettings.module.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDate } from '../utils/dateFormatter';
import StripeConnectButton from '../components/StripeConnect/StripeConnectButton';
import StripeConnectSection from '../components/stripe/StripeConnectSection';

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
    const [subscription, setSubscription] = useState(user?.subscription || 'buyer');
    const [showStripeConnect, setShowStripeConnect] = useState(false);
    const token = user?.token;

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

    const subscriptionOptions = [
        { value: 'buyer', label: 'Buyer - Purchase and collect great ideas' },
        { value: 'seller', label: 'Seller - Create and sell your ideas' }
    ];

    const handleSubscriptionChange = async (e) => {
        const newSubscription = e.target.value;
        try {
            const response = await fetch('http://localhost:6001/api/users/subscription', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ subscription: newSubscription })
            });

            if (!response.ok) {
                throw new Error('Failed to update subscription');
            }

            setSubscription(newSubscription);
            // showToast('Subscription updated successfully', 'success');

            // If changing to seller, show Stripe Connect section
            if (newSubscription === 'seller') {
                setShowStripeConnect(true);
            }
        } catch (error) {
            console.error('Error updating subscription:', error);
            // showToast('Failed to update subscription', 'error');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Account Settings</h1>
            </div>

            <div className={styles.settingsGrid}>
                {/* Profile Section */}
                <div className={styles.section}>
                    <h2>Profile</h2>
                    <div className={styles.profileInfo}>
                        <p><strong>Username:</strong> {user.username}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Account Type:</strong> {user.subscription}</p>
                    </div>
                </div>

                {/* Subscription Type */}
                <div className={styles.section}>
                    <h3>Account Type</h3>
                    <select 
                        value={subscription} 
                        onChange={handleSubscriptionChange}
                        className={styles.select}
                    >
                        {subscriptionOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <p className={styles.hint}>
                        {subscription === 'buyer' 
                            ? 'As a buyer, you can purchase and collect great ideas from our marketplace.'
                            : 'As a seller, you can create and sell your ideas. You\'ll need to set up Stripe Connect to receive payments.'}
                    </p>
                </div>

                {/* Stripe Connect Section - Only show for sellers */}
                {subscription === 'seller' && (
                    <StripeConnectSection 
                        stripeConnectStatus={user.stripeConnectStatus}
                        onStatusChange={(status) => setUser({ ...user, stripeConnectStatus: status })}
                    />
                )}

                {/* Ideas Section */}
                <div className={styles.section}>
                    <h2>Your Ideas</h2>
                    <div className={styles.ideasStats}>
                        <p>Posted Ideas: {user.postedIdeas?.length || 0}</p>
                        <p>Purchased Ideas: {user.boughtIdeas?.length || 0}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
