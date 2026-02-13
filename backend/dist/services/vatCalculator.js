"use strict";
/**
 * Denmark VAT Calculator (Calculadora_VAT_Dinamarca)
 * Implements Danish VAT rules including Brugtmoms (margin scheme) for used goods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDenmarkVAT = calculateDenmarkVAT;
exports.calculateShippingVAT = calculateShippingVAT;
exports.calculateSaleVATLiability = calculateSaleVATLiability;
/**
 * Calculate VAT liability based on Danish tax rules.
 *
 * Case A: New products - Standard 25% VAT on full sales price
 *   VAT = salesPrice × 0.20 (extracting 25% from gross)
 *
 * Case B: Used products (Brugtmoms/Margin Scheme)
 *   Margin = salesPrice - costPrice
 *   VAT = max(0, margin × 0.20)
 *
 * @param salesPrice - The gross sale price (includes VAT)
 * @param costPrice - The acquisition cost (what was paid to acquire)
 * @param productCondition - 'New' or 'Second-hand'
 * @returns VAT calculation result with liability amount
 */
function calculateDenmarkVAT(salesPrice, costPrice, productCondition) {
    const price = salesPrice || 0;
    const cost = costPrice || 0;
    const isNew = productCondition === 'New';
    if (isNew) {
        // Standard VAT: Extract 25% VAT from gross price
        // Formula: grossPrice / 1.25 = netPrice, VAT = grossPrice - netPrice = grossPrice × 0.20
        const vatLiability = price * 0.20;
        return {
            vatLiability: Math.round(vatLiability * 100) / 100,
            vatRate: 0.25,
            margin: null,
            method: 'standard'
        };
    }
    else {
        // Brugtmoms (Margin Scheme) for used goods
        const margin = price - cost;
        if (margin <= 0) {
            // No profit = no VAT liability
            return {
                vatLiability: 0,
                vatRate: 0.25,
                margin: margin,
                method: 'brugtmoms'
            };
        }
        // VAT on margin only
        const vatLiability = margin * 0.20;
        return {
            vatLiability: Math.round(vatLiability * 100) / 100,
            vatRate: 0.25,
            margin: margin,
            method: 'brugtmoms'
        };
    }
}
/**
 * Calculate VAT for shipping income.
 * According to Danish rules, shipping always has 25% standard VAT.
 *
 * @param shippingIncome - The gross income from shipping fees
 * @returns VAT liability (20% of gross)
 */
function calculateShippingVAT(shippingIncome) {
    const income = shippingIncome || 0;
    const vatLiability = income * 0.20;
    return Math.round(vatLiability * 100) / 100;
}
/**
 * Calculate total VAT liability for a sale with multiple items and shipping.
 *
 * @param items - Array of sale items with price, cost, qty, and condition
 * @param shippingIncome - Optional shipping revenue
 * @returns Total VAT liability for the sale
 */
function calculateSaleVATLiability(items, shippingIncome = 0) {
    let totalVAT = 0;
    for (const item of items) {
        const result = calculateDenmarkVAT(item.priceAtSale, item.costAtSale, item.productCondition || 'Second-hand' // Default to used if not specified
        );
        totalVAT += result.vatLiability * item.qty;
    }
    // Add Shipping VAT (Always 25% / 0.20 extract)
    if (shippingIncome > 0) {
        totalVAT += calculateShippingVAT(shippingIncome);
    }
    return Math.round(totalVAT * 100) / 100;
}
