import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './StripeConnect.css';

const StripeConnectButton = () => {
    const { stripeConnectStatus, getStripeConnectLink } = useAuth();

    const handleConnect = async () => {
        try {
            const connectUrl = await getStripeConnectLink();
            window.location.href = connectUrl;
        } catch (error) {
            console.error('Failed to get connect link:', error);
            // You might want to show an error message to the user
        }
    };

    if (!stripeConnectStatus) {
        return (
            <button 
                className="stripe-connect-button"
                onClick={handleConnect}
            >
                Connect with Stripe to Start Selling
            </button>
        );
    }

    if (stripeConnectStatus.accountStatus === 'pending') {
        return (
            <div className="stripe-connect-status pending">
                <p>Your Stripe account setup is pending. Please complete the onboarding process.</p>
                <button 
                    className="stripe-connect-button"
                    onClick={handleConnect}
                >
                    Complete Stripe Onboarding
                </button>
            </div>
        );
    }

    if (stripeConnectStatus.accountStatus === 'active') {
        return (
            <div className="stripe-connect-status active">
                <p>✓ Your Stripe account is connected and ready to receive payments</p>
                <div className="stripe-account-details">
                    <p>Payouts: {stripeConnectStatus.payoutsEnabled ? '✓ Enabled' : '✗ Disabled'}</p>
                    <p>Charges: {stripeConnectStatus.chargesEnabled ? '✓ Enabled' : '✗ Disabled'}</p>
                </div>
            </div>
        );
    }

    return null;
};

export default StripeConnectButton;
