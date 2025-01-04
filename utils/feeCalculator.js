/**
 * Calculate processing fee based on amount
 * @param {number} amount Amount in USD
 * @returns {{percentage: number, fee: number}} Fee percentage and amount
 */
function calculateProcessingFee(amount) {
    const numAmount = Number(amount);
    let feePercentage;
    
    // Tiered fee structure
    if (numAmount < 20) {
        feePercentage = 0.03; // 3% for small amounts
    } else if (numAmount < 50) {
        feePercentage = 0.02; // 2% for medium amounts
    } else if (numAmount < 100) {
        feePercentage = 0.015; // 1.5% for larger amounts
    } else {
        feePercentage = 0.01; // 1% for very large amounts
    }

    const fee = Math.min(numAmount * feePercentage, 2); // Cap at $2 USD
    return {
        percentage: feePercentage * 100, // Return as percentage (e.g., 3 for 3%)
        fee: Number(fee.toFixed(2))
    };
}

/**
 * Get fee description based on amount
 * @param {number} amount Amount in USD
 * @returns {string} Fee description
 */
function getFeeDescription(amount) {
    const { percentage } = calculateProcessingFee(amount);
    if (percentage === 3) return "3% fee for small amounts";
    if (percentage === 2) return "2% fee for medium amounts";
    if (percentage === 1.5) return "1.5% fee for larger amounts";
    return "1% fee for bulk purchase";
}

module.exports = {
    calculateProcessingFee,
    getFeeDescription
};
