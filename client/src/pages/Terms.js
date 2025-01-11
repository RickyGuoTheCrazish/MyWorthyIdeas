import React from 'react';
import styles from '../styles/Terms.module.css';
import { FaExternalLinkAlt } from 'react-icons/fa';

const Terms = () => {
    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Terms & Conditions</h1>
            
            <div className={styles.content}>
                {/* General Terms Section */}
                <section className={styles.section}>
                    <h2>General Terms</h2>
                    <p>
                        Welcome! By using our platform, you agree to these terms and conditions.
                        Please read them carefully before using our services.
                    </p>
                </section>

                {/* Seller Terms Section */}
                <section className={styles.section}>
                    <h2>For Sellers</h2>
                    <div className={styles.card}>
                        <h3>Pricing & Fees</h3>
                        <ul className={styles.list}>
                            <li>
                                When setting your idea price, remember to account for Stripe processing fees.
                                These fees will be deducted from your final payout.
                            </li>
                            <li>
                                Consider all fees carefully when pricing your ideas to ensure profitability.
                            </li>
                            <li>
                                <a 
                                    href="#" // TODO: Add Stripe fee structure link
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.link}
                                >
                                    View detailed Stripe fee structure
                                    <FaExternalLinkAlt className={styles.linkIcon} />
                                </a>
                            </li>
                        </ul>

                        <h3>Disputes & Resolution</h3>
                        <ul className={styles.list}>
                            <li>
                                In case of disputes, our team will mediate between you and the buyer.
                            </li>
                            <li>
                                You are expected to provide clear and accurate descriptions of your ideas
                                to minimize potential disputes.
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Buyer Terms Section */}
                <section className={styles.section}>
                    <h2>For Buyers</h2>
                    <div className={styles.card}>
                        <h3>Pricing & Fees</h3>
                        <ul className={styles.list}>
                            <li>
                                The displayed price while checkout with stripe includes both the idea cost and our platform fee.
                            </li>
                            <li>
                                The final amount shown during checkout is the total amount you will be charged.
                            </li>
                        </ul>

                        <h3>Refund Policy</h3>
                        <ul className={styles.list}>
                            <li>
                                <strong>All purchases are non-refundable.</strong>
                            </li>
                            <li>
                                If you have concerns about a purchased idea, please contact our support team
                                to initiate a dispute resolution process.
                            </li>
                            <li>
                                We will review each case individually and work with both parties to reach
                                a fair resolution.
                            </li>
                        </ul>

                        <div className={styles.contact}>
                            <h3>Need Help?</h3>
                            <p>
                                For any questions or to report an issue, please contact our support team at:{' '}
                                <a href="mailto:support@ideasforce.com" className={styles.link}>
                                    support@ideasforce.com
                                </a>
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Terms;
