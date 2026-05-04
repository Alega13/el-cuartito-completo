"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSaleNotificationEmail = exports.sendDiscogsShippingNotificationEmail = exports.sendDiscogsOrderPreparingEmail = exports.sendPickupReadyEmail = exports.sendShipOrderEmail = exports.sendShippingNotificationEmail = exports.sendOrderConfirmationEmail = void 0;
const resend_1 = require("resend");
const env_1 = __importDefault(require("../config/env"));
const resend = new resend_1.Resend(env_1.default.RESEND_API_KEY);
const LOGO_URL = 'https://el-cuartito-admin-records.web.app/logo-label.png';
const DEFAULT_VINYL = 'https://el-cuartito-admin-records.web.app/default-vinyl.png';
// ─── shared template helpers ──────────────────────────────────────────────────
const emailOpen = (preheader = '') => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:#fafaf9;">${preheader}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafaf9;">
  <tr><td align="center" style="padding:48px 16px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #ececec;">

      <!-- HEADER -->
      <tr><td align="center" style="padding:40px 32px 32px 32px;">
        <img src="${LOGO_URL}" alt="El Cuartito Records" width="180"
             style="display:block;width:180px;height:auto;margin:0 auto;"/>
      </td></tr>

      <!-- DIVIDER -->
      <tr><td style="padding:0 32px;">
        <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
      </td></tr>`;
const emailClose = () => {
    const year = new Date().getFullYear();
    return `
      <!-- FOOTER -->
      <tr><td style="background-color:#fafaf9;padding:24px 32px;border-top:1px solid #ececec;" align="center">
        <p style="margin:0 0 4px 0;font-size:11px;color:#999999;letter-spacing:0.5px;">Dybbølsgade 14, 1721 København V · Denmark</p>
        <p style="margin:0;font-size:11px;color:#bbbbbb;">© ${year} El Cuartito Records</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
};
const inlineDivider = () => `<tr><td style="padding:0 32px;">
      <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
    </td></tr>`;
const signature = (line) => `<tr><td style="padding:32px 32px 40px 32px;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#555555;">
        ${line}<br/>
        <span style="color:#111111;font-weight:600;">The El Cuartito crew</span>
      </p>
    </td></tr>`;
const itemRow = (item, showPrice = false) => {
    const img = item.cover_image || item.image || DEFAULT_VINYL;
    const qty = item.quantity || item.qty || 1;
    const price = item.unitPrice || item.priceAtSale || 0;
    const priceCell = showPrice
        ? `<td align="right" style="padding:16px 0;border-top:1px solid #ececec;vertical-align:middle;font-size:14px;color:#555555;white-space:nowrap;">DKK ${price.toFixed(2)}</td>`
        : `<td align="right" style="padding:16px 0;border-top:1px solid #ececec;vertical-align:middle;font-size:14px;color:#555555;">× ${qty}</td>`;
    return `
    <tr>
      <td width="64" style="padding:16px 0;border-top:1px solid #ececec;vertical-align:middle;">
        <img src="${img}" alt="" width="56" height="56"
             style="display:block;width:56px;height:56px;border-radius:2px;object-fit:cover;"/>
      </td>
      <td style="padding:16px 12px;border-top:1px solid #ececec;vertical-align:middle;">
        <div style="font-size:15px;font-weight:600;color:#111111;line-height:1.3;">${item.album}</div>
        <div style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${item.artist}</div>
        ${showPrice ? `<div style="font-size:12px;color:#aaaaaa;margin-top:4px;">× ${qty}</div>` : ''}
      </td>
      ${priceCell}
    </tr>`;
};
const isKeyMissing = (key) => !key || key === 're_placeholder' || key === 're_your_api_key_here';
// ─── sendOrderConfirmationEmail ───────────────────────────────────────────────
const sendOrderConfirmationEmail = (orderData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (isKeyMissing(env_1.default.RESEND_API_KEY)) {
            console.warn('⚠️  [MAIL-SERVICE] RESEND_API_KEY is not configured or is using placeholder.');
            return { success: false, error: 'Resend API Key missing' };
        }
        console.log(`✅ [MAIL-SERVICE] API Key detected (Starts with: ${env_1.default.RESEND_API_KEY.substring(0, 7)}...)`);
        console.log('📧 Starting sendOrderConfirmationEmail for order:', orderData.orderNumber);
        const { customer, items, orderNumber, total_amount, items_total, shipping_cost } = orderData;
        const customerEmail = customer === null || customer === void 0 ? void 0 : customer.email;
        const customerName = `${customer === null || customer === void 0 ? void 0 : customer.firstName} ${customer === null || customer === void 0 ? void 0 : customer.lastName}`;
        const customerFirst = (customer === null || customer === void 0 ? void 0 : customer.firstName) || 'there';
        if (!customerEmail) {
            console.error('❌ Cannot send email: No customer email found.');
            return;
        }
        // VAT logic (unchanged)
        const newItemsList = items.filter((item) => item.productCondition === 'New');
        const usedItemsList = items.filter((item) => item.productCondition && item.productCondition !== 'New');
        const hasNew = newItemsList.length > 0;
        const hasUsed = usedItemsList.length > 0;
        const isMixed = hasNew && hasUsed;
        let totalNewItemsVAT = 0;
        const itemsHtml = items.map((item) => {
            const price = item.unitPrice || item.priceAtSale || 0;
            const qty = item.quantity || item.qty || 1;
            const isItemNew = item.productCondition === 'New';
            const lineTotal = price * qty;
            let vatInfoHtml = '';
            let asterisk = '';
            if (isItemNew) {
                const lineVAT = lineTotal * 0.20;
                totalNewItemsVAT += lineVAT;
                if (!hasUsed) {
                    vatInfoHtml = `<div style="font-size:11px;color:#2563eb;margin-top:4px;">✓ Moms (25%): DKK ${lineVAT.toFixed(2)}</div>`;
                }
            }
            else if (isMixed) {
                asterisk = ' *';
            }
            const img = item.cover_image || item.image || DEFAULT_VINYL;
            return `
    <tr>
      <td width="64" style="padding:16px 0;border-top:1px solid #ececec;vertical-align:middle;">
        <img src="${img}" alt="" width="56" height="56"
             style="display:block;width:56px;height:56px;border-radius:2px;object-fit:cover;"/>
      </td>
      <td style="padding:16px 12px;border-top:1px solid #ececec;vertical-align:middle;">
        <div style="font-size:15px;font-weight:600;color:#111111;line-height:1.3;">${item.album}${asterisk}</div>
        <div style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${item.artist}</div>
        <div style="font-size:12px;color:#aaaaaa;margin-top:4px;">× ${qty}</div>
        ${vatInfoHtml}
      </td>
      <td align="right" style="padding:16px 0;border-top:1px solid #ececec;vertical-align:middle;font-size:14px;color:#555555;white-space:nowrap;">DKK ${price.toFixed(2)}</td>
    </tr>`;
        }).join('');
        let vatBreakdownHtml = '';
        if (hasNew) {
            let finalVatAmount = totalNewItemsVAT;
            if (!hasUsed && shipping_cost > 0)
                finalVatAmount += shipping_cost * 0.20;
            vatBreakdownHtml = `
    <tr>
      <td colspan="2" style="padding:6px 0;font-size:12px;color:#2563eb;">↳ Heraf moms (25%)</td>
      <td align="right" style="padding:6px 0;font-size:12px;color:#2563eb;white-space:nowrap;">DKK ${finalVatAmount.toFixed(2)}</td>
    </tr>`;
        }
        let legendHtml = '';
        if (hasUsed) {
            const legendText = isMixed
                ? '* Varen sælges efter de særlige regler for brugte varer - køber har ikke fradrag for momsen for disse varer.'
                : 'Varen sælges efter de særlige regler for brugte varer - køber har ikke fradrag for momsen.';
            legendHtml = `
      <tr><td style="padding:24px 32px 0 32px;" colspan="3">
        <div style="padding:14px 16px;border:1px solid #fbd38d;background-color:#fffaf0;font-size:12px;color:#7b341e;">
          <strong>BRUGTMOMS / MARGIN SCHEME</strong><br/>
          <span style="margin-top:4px;display:block;">${legendText}</span>
        </div>
      </td></tr>`;
        }
        const html = emailOpen(`Order ${orderNumber} confirmed — your records are being packed.`) + `

      <!-- BODY -->
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order confirmed</p>
        <h1 style="margin:0 0 24px 0;font-size:26px;font-weight:500;color:#111111;line-height:1.25;">Hi ${customerFirst}, thanks for your order.</h1>
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#555555;">
          We've received order <strong style="color:#111111;">${orderNumber}</strong> and are already packing it for shipment.
        </p>
        <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#555555;">
          You'll receive another email with your tracking number as soon as the package leaves the shop.
        </p>
      </td></tr>

      <!-- ORDER SUMMARY -->
      <tr><td style="padding:0 32px 8px 32px;">
        <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order summary</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${itemsHtml}
          <tr><td colspan="3" style="padding-top:0;">
            <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
          </td></tr>
          <tr>
            <td colspan="2" style="padding:8px 0;font-size:13px;color:#888888;">Subtotal</td>
            <td align="right" style="padding:8px 0;font-size:13px;color:#555555;white-space:nowrap;">DKK ${items_total.toFixed(2)}</td>
          </tr>
          ${vatBreakdownHtml}
          <tr>
            <td colspan="2" style="padding:6px 0;font-size:13px;color:#888888;">Shipping</td>
            <td align="right" style="padding:6px 0;font-size:13px;color:#555555;white-space:nowrap;">DKK ${shipping_cost.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding-top:6px;">
              <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:10px 0 0 0;font-size:15px;font-weight:600;color:#111111;">${(!hasNew && hasUsed) ? 'Total inkl. moms' : 'Total'}</td>
            <td align="right" style="padding:10px 0 0 0;font-size:15px;font-weight:600;color:#111111;white-space:nowrap;">DKK ${total_amount.toFixed(2)}</td>
          </tr>
        </table>
      </td></tr>

      ${legendHtml}

      <!-- SHIPPING ADDRESS -->
      <tr><td style="padding:32px 32px 8px 32px;">
        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Shipping address</p>
        <p style="margin:0;font-size:14px;line-height:1.8;color:#555555;">
          ${customerName}<br/>
          ${customer === null || customer === void 0 ? void 0 : customer.address}<br/>
          ${customer === null || customer === void 0 ? void 0 : customer.postalCode} ${customer === null || customer === void 0 ? void 0 : customer.city}<br/>
          ${customer === null || customer === void 0 ? void 0 : customer.country}
        </p>
      </td></tr>

      ${inlineDivider()}
      ${signature('With love,')}
      ${emailClose()}`;
        const { data, error } = yield resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: `Order Confirmation ${orderNumber} — El Cuartito Records`,
            html,
        });
        if (error) {
            console.error('❌ Resend Error (Order Confirmation):', JSON.stringify(error, null, 2));
            return { success: false, error };
        }
        console.log('✅ Order confirmation email sent successfully:', data === null || data === void 0 ? void 0 : data.id);
        return { success: true, id: data === null || data === void 0 ? void 0 : data.id };
    }
    catch (error) {
        console.error('❌ [MAIL-SERVICE] Exception in sendOrderConfirmationEmail:', error);
        return { success: false, error: error.message };
    }
});
exports.sendOrderConfirmationEmail = sendOrderConfirmationEmail;
// ─── sendShippingNotificationEmail ───────────────────────────────────────────
const sendShippingNotificationEmail = (orderData, shipmentInfo) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (isKeyMissing(env_1.default.RESEND_API_KEY)) {
            console.warn('⚠️  RESEND_API_KEY not configured. Skipping shipping notification.');
            return { success: false, error: 'Resend API Key missing' };
        }
        console.log('📧 Starting sendShippingNotificationEmail for order:', orderData.orderNumber);
        const customerEmail = ((_a = orderData.customer) === null || _a === void 0 ? void 0 : _a.email) || orderData.customerEmail || orderData.email;
        const customerName = ((_b = orderData.customer) === null || _b === void 0 ? void 0 : _b.firstName) || orderData.customerName || 'there';
        if (!customerEmail) {
            console.error('❌ Cannot send email: No customer email found.');
            return { success: false, error: 'No customer email found' };
        }
        const orderRef = orderData.orderNumber || (orderData.id ? orderData.id.slice(0, 8) : '');
        const trackingLink = shipmentInfo.tracking_link || '';
        const trackButton = trackingLink
            ? `<a href="${trackingLink}" style="display:inline-block;background-color:#111111;color:#ffffff;padding:12px 24px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Track my order</a>`
            : '';
        const html = emailOpen(`Your order is on its way — tracking number: ${shipmentInfo.tracking_number}`) + `

      <!-- BODY -->
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">On its way</p>
        <h1 style="margin:0 0 24px 0;font-size:26px;font-weight:500;color:#111111;line-height:1.25;">Hi ${customerName}, your order is shipped.</h1>
        <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#555555;">
          Order <strong style="color:#111111;">${orderRef}</strong> has been dispatched via ${shipmentInfo.carrier} and is now with the carrier. Use the tracking number below to follow it along the way.
        </p>
      </td></tr>

      <!-- TRACKING -->
      <tr><td style="padding:0 32px 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ececec;">
          <tr><td style="padding:24px 24px 24px 24px;">
            <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Tracking number</p>
            <p style="margin:0 0 20px 0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:20px;color:#111111;letter-spacing:1px;">${shipmentInfo.tracking_number}</p>
            ${trackButton}
          </td></tr>
        </table>
      </td></tr>

      ${inlineDivider()}
      ${signature('Enjoy the spin,')}
      ${emailClose()}`;
        const { data, error } = yield resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail.trim().toLowerCase()],
            subject: `Your order is on its way — El Cuartito Records`,
            html,
        });
        if (error) {
            console.error('❌ Resend Error (Shipping Notification):', JSON.stringify(error, null, 2));
            return { success: false, error };
        }
        console.log('✅ Shipping notification sent successfully:', data === null || data === void 0 ? void 0 : data.id);
        return { success: true, id: data === null || data === void 0 ? void 0 : data.id };
    }
    catch (error) {
        console.error('❌ [MAIL-SERVICE] Exception in sendShippingNotificationEmail:', error);
        return { success: false, error: error.message };
    }
});
exports.sendShippingNotificationEmail = sendShippingNotificationEmail;
// ─── sendShipOrderEmail ───────────────────────────────────────────────────────
const sendShipOrderEmail = (orderData, shipmentInfo) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (isKeyMissing(env_1.default.RESEND_API_KEY)) {
            console.warn('⚠️  RESEND_API_KEY not configured. Skipping sendShipOrderEmail.');
            return { success: false, error: 'Resend API Key missing' };
        }
        const customer = orderData.customer;
        let customerEmail = orderData.customerEmail || orderData.email || ((_a = orderData.stripe_info) === null || _a === void 0 ? void 0 : _a.email);
        if (customer) {
            if (typeof customer === 'string') {
                if (customer.includes('@'))
                    customerEmail = customer;
            }
            else if (typeof customer === 'object') {
                customerEmail = customer.email || customerEmail;
            }
        }
        const customerName = (typeof customer === 'object' ? (customer.firstName || customer.name) : null)
            || orderData.customerName || orderData.name || 'there';
        console.log(`📧 [DEBUG-MAIL] orderData ID: ${orderData.id || 'N/A'}`);
        console.log(`📧 [DEBUG-MAIL] orderData keys: ${Object.keys(orderData).join(', ')}`);
        console.log(`📧 [DEBUG-MAIL] Detected email: "${customerEmail}"`);
        console.log(`📧 [DEBUG-MAIL] Detected name: "${customerName}"`);
        if (!customerEmail || customerEmail === '-' || customerEmail === 'null' || customerEmail === 'null@null.com') {
            console.warn('⚠️  No valid customer email found. Skipping tracking email.');
            return { success: false, error: 'No valid customer email found' };
        }
        const orderRef = orderData.orderNumber || (orderData.id ? orderData.id.slice(0, 8) : '');
        const trackingUrl = `https://app.shipmondo.com/tracking/${shipmentInfo.tracking_number}`;
        const html = emailOpen(`Your order is on its way — tracking: ${shipmentInfo.tracking_number}`) + `

      <!-- BODY -->
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">On its way</p>
        <h1 style="margin:0 0 24px 0;font-size:26px;font-weight:500;color:#111111;line-height:1.25;">Hi ${customerName}, your order is shipped.</h1>
        <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#555555;">
          ${orderRef ? `Order <strong style="color:#111111;">${orderRef}</strong> has been dispatched and is now with the carrier.` : 'Your order has been dispatched and is now with the carrier.'} Use the tracking number below to follow it along the way.
        </p>
      </td></tr>

      <!-- TRACKING -->
      <tr><td style="padding:0 32px 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ececec;">
          <tr><td style="padding:24px 24px 24px 24px;">
            <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Tracking number</p>
            <p style="margin:0 0 20px 0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:20px;color:#111111;letter-spacing:1px;">${shipmentInfo.tracking_number}</p>
            <a href="${trackingUrl}" style="display:inline-block;background-color:#111111;color:#ffffff;padding:12px 24px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Track my order</a>
          </td></tr>
        </table>
      </td></tr>

      ${inlineDivider()}
      ${signature('Enjoy the spin,')}
      ${emailClose()}`;
        const { data, error } = yield resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail.trim().toLowerCase()],
            subject: `Your order is on its way — El Cuartito Records`,
            html,
        });
        if (error) {
            console.error('❌ Resend Error in sendShipOrderEmail:', JSON.stringify(error, null, 2));
            return { success: false, error };
        }
        console.log('✅ Tracking notification sent successfully:', data === null || data === void 0 ? void 0 : data.id);
        return { success: true, id: data === null || data === void 0 ? void 0 : data.id };
    }
    catch (error) {
        console.error('❌ [MAIL-SERVICE] Exception in sendShipOrderEmail:', error);
        return { success: false, error: error.message };
    }
});
exports.sendShipOrderEmail = sendShipOrderEmail;
// ─── sendPickupReadyEmail ─────────────────────────────────────────────────────
const sendPickupReadyEmail = (orderData) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (isKeyMissing(env_1.default.RESEND_API_KEY)) {
            return { success: false, error: 'Resend API Key missing' };
        }
        const customerEmail = ((_a = orderData.customer) === null || _a === void 0 ? void 0 : _a.email) || orderData.customerEmail || orderData.email || orderData.customer_email;
        const customerName = ((_b = orderData.customer) === null || _b === void 0 ? void 0 : _b.firstName) || orderData.customerName || 'there';
        const items = orderData.items || [];
        const orderRef = orderData.orderNumber || (orderData.id ? orderData.id.slice(0, 8) : '');
        const itemsHtml = items.map((item) => itemRow(item)).join('');
        const html = emailOpen('Your order is ready — come by whenever you like!') + `

      <!-- BODY -->
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Ready for pickup</p>
        <h1 style="margin:0 0 24px 0;font-size:26px;font-weight:500;color:#111111;line-height:1.25;">Hi ${customerName}, your order is ready.</h1>
        <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#555555;">
          ${orderRef ? `Order <strong style="color:#111111;">${orderRef}</strong> is` : 'Your order is'} packed and waiting for you at the shop. Come by whenever you like during opening hours.
        </p>
      </td></tr>

      <!-- ORDER SUMMARY -->
      <tr><td style="padding:0 32px 8px 32px;">
        <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order summary</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${itemsHtml}
        </table>
        <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
      </td></tr>

      <!-- LOCATION -->
      <tr><td style="padding:24px 32px 8px 32px;">
        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Where to find us</p>
        <p style="margin:0 0 8px 0;font-size:15px;font-weight:600;color:#111111;">El Cuartito Records</p>
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.8;color:#555555;">
          Dybbølsgade 14<br/>
          1721 København V, Denmark
        </p>
        <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Opening hours</p>
        <p style="margin:0;font-size:14px;color:#555555;">Tuesday – Saturday: 11:00 – 17:00</p>
      </td></tr>

      ${inlineDivider()}
      ${signature('See you soon,')}
      ${emailClose()}`;
        const { data, error } = yield resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: `Your order is ready for pickup — El Cuartito Records`,
            html,
        });
        if (error) {
            console.error('❌ Resend Error (Pickup):', JSON.stringify(error, null, 2));
            return { success: false, error };
        }
        console.log('✅ Pickup ready email sent successfully:', data === null || data === void 0 ? void 0 : data.id);
        return { success: true, id: data === null || data === void 0 ? void 0 : data.id };
    }
    catch (error) {
        console.error('❌ [MAIL-SERVICE] Exception in sendPickupReadyEmail:', error);
        return { success: false, error: error.message };
    }
});
exports.sendPickupReadyEmail = sendPickupReadyEmail;
// ─── sendDiscogsOrderPreparingEmail ──────────────────────────────────────────
const sendDiscogsOrderPreparingEmail = (orderData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (isKeyMissing(env_1.default.RESEND_API_KEY)) {
            return { success: false, error: 'Resend API Key missing' };
        }
        const customerEmail = orderData.customerEmail || orderData.email || orderData.customer_email;
        const customerName = orderData.customerName || 'there';
        const items = orderData.items || [];
        const itemsHtml = items.map((item) => itemRow(item)).join('');
        const html = emailOpen("We're packing your Discogs order — tracking info coming soon.") + `

      <!-- BODY -->
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order received</p>
        <h1 style="margin:0 0 24px 0;font-size:26px;font-weight:500;color:#111111;line-height:1.25;">Hi ${customerName}, we're packing your order.</h1>
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#555555;">
          Thanks for shopping with us. We're already preparing your order from <strong style="color:#111111;">Discogs</strong>.
        </p>
        <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#555555;">
          You'll get another email with the tracking number as soon as your package leaves the shop.
        </p>
      </td></tr>

      <!-- ORDER SUMMARY -->
      <tr><td style="padding:0 32px 8px 32px;">
        <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order summary</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${itemsHtml}
        </table>
        <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
      </td></tr>

      ${inlineDivider()}
      ${signature('With love,')}
      ${emailClose()}`;
        const { data, error } = yield resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: `We are preparing your Discogs order — El Cuartito Records`,
            html,
        });
        if (error)
            return { success: false, error };
        return { success: true, id: data === null || data === void 0 ? void 0 : data.id };
    }
    catch (error) {
        console.error('❌ [MAIL-SERVICE] Exception in sendDiscogsOrderPreparingEmail:', error);
        return { success: false, error: error.message };
    }
});
exports.sendDiscogsOrderPreparingEmail = sendDiscogsOrderPreparingEmail;
// ─── sendDiscogsShippingNotificationEmail ─────────────────────────────────────
const sendDiscogsShippingNotificationEmail = (orderData, trackingNumber) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (isKeyMissing(env_1.default.RESEND_API_KEY)) {
            return { success: false, error: 'Resend API Key missing' };
        }
        const customerEmail = orderData.customerEmail || orderData.email || orderData.customer_email;
        const customerName = orderData.customerName || 'there';
        const items = orderData.items || [];
        const itemsHtml = items.map((item) => itemRow(item)).join('');
        const trackingLink = orderData.tracking_link || '';
        const trackButton = trackingLink
            ? `<a href="${trackingLink}" style="display:inline-block;background-color:#111111;color:#ffffff;padding:12px 24px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Track my order</a>`
            : `<p style="margin:0;font-size:14px;color:#555555;">Track your shipment on the carrier's website using the number above.</p>`;
        const html = emailOpen(`Your Discogs order is on its way — tracking: ${trackingNumber}`) + `

      <!-- BODY -->
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">On its way</p>
        <h1 style="margin:0 0 24px 0;font-size:26px;font-weight:500;color:#111111;line-height:1.25;">Hi ${customerName}, your order is shipped.</h1>
        <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#555555;">
          Your records have left the shop and are now travelling to you. Use the tracking number below to follow them along the way.
        </p>
      </td></tr>

      <!-- TRACKING -->
      <tr><td style="padding:0 32px 8px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ececec;">
          <tr><td style="padding:24px 24px 24px 24px;">
            <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Tracking number</p>
            <p style="margin:0 0 20px 0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:20px;color:#111111;letter-spacing:1px;">${trackingNumber}</p>
            ${trackButton}
          </td></tr>
        </table>
      </td></tr>

      <!-- ORDER SUMMARY -->
      <tr><td style="padding:32px 32px 8px 32px;">
        <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order summary</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${itemsHtml}
        </table>
        <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
      </td></tr>

      ${inlineDivider()}
      ${signature('Enjoy the spin,')}
      ${emailClose()}`;
        const { data, error } = yield resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: `Your Discogs order is on its way — El Cuartito Records`,
            html,
        });
        if (error)
            return { success: false, error };
        return { success: true, id: data === null || data === void 0 ? void 0 : data.id };
    }
    catch (error) {
        console.error('❌ [MAIL-SERVICE] Exception in sendDiscogsShippingNotificationEmail:', error);
        return { success: false, error: error.message };
    }
});
exports.sendDiscogsShippingNotificationEmail = sendDiscogsShippingNotificationEmail;
// ─── sendSaleNotificationEmail (owner internal) ───────────────────────────────
const sendSaleNotificationEmail = (saleData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (isKeyMissing(env_1.default.RESEND_API_KEY)) {
            console.warn('⚠️  [MAIL-SERVICE] RESEND_API_KEY not configured. Skipping sale notification.');
            return { success: false, error: 'Resend API Key missing' };
        }
        const OWNER_EMAIL = 'el.cuartito.cph@gmail.com';
        const now = new Date();
        const saleDate = saleData.date || now.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const saleTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        const totalItems = saleData.items.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
        const channelLabels = {
            'local': 'Tienda (POS)',
            'online': 'Webshop',
            'discogs': 'Discogs',
        };
        const channelLabel = channelLabels[saleData.channel] || saleData.channel;
        const itemsHtml = saleData.items.map((item) => {
            const price = item.priceAtSale || item.price || item.unitPrice || 0;
            const qty = item.qty || item.quantity || 1;
            const lineTotal = price * qty;
            return `
    <tr>
      <td style="padding:12px 0;border-top:1px solid #ececec;vertical-align:top;">
        <div style="font-size:15px;font-weight:600;color:#111111;line-height:1.3;">${item.album || 'Unknown'}</div>
        <div style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${item.artist || ''}</div>
        <div style="font-size:12px;color:#aaaaaa;margin-top:4px;">× ${qty}</div>
      </td>
      <td align="right" style="padding:12px 0;border-top:1px solid #ececec;vertical-align:top;font-size:14px;color:#555555;white-space:nowrap;">DKK ${lineTotal.toFixed(2)}</td>
    </tr>`;
        }).join('');
        const html = emailOpen() + `

      <!-- BODY -->
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Nueva venta</p>
        <h1 style="margin:0 0 8px 0;font-size:32px;font-weight:500;color:#111111;line-height:1.1;">DKK ${saleData.totalAmount.toFixed(2)}</h1>
        <p style="margin:0 0 32px 0;font-size:15px;color:#555555;">${channelLabel} · ${saleDate} ${saleTime}</p>
      </td></tr>

      <!-- META -->
      <tr><td style="padding:0 32px 8px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ececec;">
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #ececec;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;width:50%;">Canal</td>
            <td style="padding:16px 20px;border-bottom:1px solid #ececec;font-size:14px;color:#111111;font-weight:600;">${channelLabel}</td>
          </tr>
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #ececec;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Pago</td>
            <td style="padding:16px 20px;border-bottom:1px solid #ececec;font-size:14px;color:#111111;font-weight:600;">${saleData.paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding:16px 20px;${saleData.customerName ? 'border-bottom:1px solid #ececec;' : ''}font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Artículos</td>
            <td style="padding:16px 20px;${saleData.customerName ? 'border-bottom:1px solid #ececec;' : ''}font-size:14px;color:#111111;font-weight:600;">${totalItems}</td>
          </tr>
          ${saleData.customerName ? `
          <tr>
            <td style="padding:16px 20px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Cliente</td>
            <td style="padding:16px 20px;font-size:14px;color:#111111;font-weight:600;">${saleData.customerName}</td>
          </tr>` : ''}
        </table>
      </td></tr>

      <!-- ITEMS -->
      <tr><td style="padding:24px 32px 8px 32px;">
        <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Discos vendidos</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${itemsHtml}
          <tr>
            <td colspan="2" style="padding-top:0;">
              <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0 0 0;font-size:15px;font-weight:600;color:#111111;">Total</td>
            <td align="right" style="padding:10px 0 0 0;font-size:15px;font-weight:600;color:#111111;white-space:nowrap;">DKK ${saleData.totalAmount.toFixed(2)}</td>
          </tr>
        </table>
      </td></tr>

      ${inlineDivider()}

      <tr><td style="padding:24px 32px 32px 32px;">
        <p style="margin:0;font-size:13px;color:#999999;">Notificación automática · El Cuartito Records</p>
      </td></tr>

      ${emailClose()}`;
        const { data, error } = yield resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [OWNER_EMAIL],
            subject: `Nueva venta DKK ${saleData.totalAmount.toFixed(2)} — ${channelLabel} · ${saleDate}`,
            html,
        });
        if (error) {
            console.error('❌ Resend Error (Sale Notification):', JSON.stringify(error, null, 2));
            return { success: false, error };
        }
        console.log('✅ Sale notification email sent to owner:', data === null || data === void 0 ? void 0 : data.id);
        return { success: true, id: data === null || data === void 0 ? void 0 : data.id };
    }
    catch (error) {
        console.error('❌ [MAIL-SERVICE] Exception in sendSaleNotificationEmail:', error);
        return { success: false, error: error.message };
    }
});
exports.sendSaleNotificationEmail = sendSaleNotificationEmail;
