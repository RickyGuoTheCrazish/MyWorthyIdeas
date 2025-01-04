import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styles from '../styles/AccountSettings.module.css';

const AccountSettings = () => {
    const { user, refreshUser } = useAuth();
    const [amount, setAmount] = useState('');
    const [transactionType, setTransactionType] = useState('deposit');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
            refreshUser(); // Refresh user data to update balance
        } catch (err) {
            setError(err.response?.data?.message || 'Transaction failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1>Account Settings</h1>
            
            <div className={styles.balanceCard}>
                <h2>Your Balance</h2>
                <p className={styles.balance}>${user?.credits || 0}</p>
            </div>

            <div className={styles.transactionSection}>
                <h2>Make a Transaction</h2>
                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}
                
                <form onSubmit={handleTransaction}>
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

                    <div className={styles.inputGroup}>
                        <label htmlFor="amount">Amount ($)</label>
                        <input
                            id="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}`}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AccountSettings;
