import { Resend } from 'resend';
import config from '../config/env';

const resend = new Resend(config.RESEND_API_KEY);

const LOGO_URL = 'https://el-cuartito-admin-records.web.app/logo.jpg';

export const sendOrderConfirmationEmail = async (orderData: any) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder' || config.RESEND_API_KEY === 're_your_api_key_here') {
            console.warn('⚠️  [MAIL-SERVICE] RESEND_API_KEY is not configured or is using placeholder.');
            return { success: false, error: 'Resend API Key missing' };
        } else {
            console.log(`✅ [MAIL-SERVICE] API Key detected (Starts with: ${config.RESEND_API_KEY.substring(0, 7)}...)`);
        }

        console.log('📧 Starting sendOrderConfirmationEmail for order:', orderData.orderNumber);

        const { customer, items, orderNumber, total_amount, items_total, shipping_cost } = orderData;
        const customerEmail = customer?.email;
        const customerName = `${customer?.firstName} ${customer?.lastName}`;

        if (!customerEmail) {
            console.error('❌ Cannot send email: No customer email found.');
            return;
        }

        // Separate items by product condition for VAT display
        const newItems = items.filter((item: any) => item.productCondition === 'New');
        const usedItems = items.filter((item: any) => item.productCondition !== 'New');

        // Calculate VAT totals
        let totalNewItemsPrice = 0;
        let totalNewItemsVAT = 0;
        let totalUsedItemsPrice = 0;

        // Generate HTML for New items (with VAT breakdown)
        const newItemsHtml = newItems.map((item: any) => {
            const price = item.unitPrice || item.priceAtSale || 0;
            const qty = item.quantity || item.qty || 1;
            const lineTotal = price * qty;
            const lineVAT = lineTotal * 0.20; // 25% VAT extracted
            totalNewItemsPrice += lineTotal;
            totalNewItemsVAT += lineVAT;
            return `
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; width: 60px;">
                    <img src="${item.image || 'https://elcuartito.dk/default-vinyl.png'}" alt="${item.album}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; display: block;">
                </td>
                <td style="padding: 12px 0 12px 12px; border-bottom: 1px solid #eeeeee;">
                    <div style="font-weight: bold; color: #333;">${item.album}</div>
                    <div style="font-size: 12px; color: #666; text-transform: uppercase;">${item.artist}</div>
                    <div style="font-size: 11px; color: #2563eb; margin-top: 4px;">✓ Moms (25%): DKK ${lineVAT.toFixed(2)}</div>
                </td>
                <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eeeeee; color: #666;">
                    ${qty}
                </td>
                <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eeeeee; font-weight: bold; color: #333;">
                    DKK ${price.toFixed(2)}
                </td>
            </tr>`;
        }).join('');

        // Generate HTML for Used items (with Brugtmoms text)
        const usedItemsHtml = usedItems.map((item: any) => {
            const price = item.unitPrice || item.priceAtSale || 0;
            const qty = item.quantity || item.qty || 1;
            totalUsedItemsPrice += price * qty;
            return `
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; width: 60px;">
                    <img src="${item.image || 'https://elcuartito.dk/default-vinyl.png'}" alt="${item.album}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; display: block;">
                </td>
                <td style="padding: 12px 0 12px 12px; border-bottom: 1px solid #eeeeee;">
                    <div style="font-weight: bold; color: #333;">${item.album}</div>
                    <div style="font-size: 12px; color: #666; text-transform: uppercase;">${item.artist}</div>
                    <div style="font-size: 10px; color: #d97706; margin-top: 4px; font-style: italic;">Brugtmoms - Køber har ikke fradrag for momsen</div>
                </td>
                <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eeeeee; color: #666;">
                    ${qty}
                </td>
                <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eeeeee; font-weight: bold; color: #333;">
                    DKK ${price.toFixed(2)}
                </td>
            </tr>`;
        }).join('');

        // Build combined items HTML with section headers for mixed orders
        let itemsHtml = '';
        if (newItems.length > 0 && usedItems.length > 0) {
            // Mixed order - show sections
            itemsHtml = `
                <tr><td colspan="4" style="padding: 15px 0 8px 0; font-size: 12px; font-weight: bold; color: #2563eb; text-transform: uppercase; letter-spacing: 1px;">🆕 Productos Nuevos (IVA Deducible)</td></tr>
                ${newItemsHtml}
                <tr><td colspan="4" style="padding: 20px 0 8px 0; font-size: 12px; font-weight: bold; color: #d97706; text-transform: uppercase; letter-spacing: 1px;">📦 Productos Usados (Régimen Brugtmoms)</td></tr>
                ${usedItemsHtml}
            `;
        } else {
            itemsHtml = newItemsHtml + usedItemsHtml;
        }

        // Build totals section with VAT breakdown
        const totalsHtml = `
            <div style="margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #666; font-size: 14px;">
                    <span style="flex: 1;">Subtotal:</span>
                    <span>DKK ${items_total.toFixed(2)}</span>
                </div>
                ${totalNewItemsVAT > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #2563eb; font-size: 13px;">
                    <span style="flex: 1;">   ↳ Heraf moms (25%):</span>
                    <span>DKK ${totalNewItemsVAT.toFixed(2)}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #666; font-size: 14px;">
                    <span style="flex: 1;">Shipping:</span>
                    <span>DKK ${shipping_cost.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #eeeeee; font-weight: 900; font-size: 18px; color: #f97316;">
                    <span style="flex: 1;">Total:</span>
                    <span>DKK ${total_amount.toFixed(2)}</span>
                </div>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: `Order Confirmation ${orderNumber} - El Cuartito Records`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <img src="${LOGO_URL}" alt="El Cuartito Records" style="width: 120px; height: 120px; border-radius: 60px; margin-bottom: 15px; border: 4px solid #f9f9f9;">
                        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0;">EL CUARTITO RECORDS</h1>
                        <p style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Copenhagen, Denmark</p>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Thanks for your purchase, ${customer?.firstName}!</h2>
                        <p style="color: #666; line-height: 1.5;">We have received your order <strong>${orderNumber}</strong> and are preparing it for shipment. We will notify you as soon as it is on its way.</p>
                    </div>

                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                        <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 15px; letter-spacing: 1px;">Order Summary</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; font-size: 11px; color: #999; text-transform: uppercase; padding-bottom: 10px; border-bottom: 2px solid #eeeeee; width: 60px;"></th>
                                    <th style="text-align: left; font-size: 11px; color: #999; text-transform: uppercase; padding-bottom: 10px; border-bottom: 2px solid #eeeeee;">Item</th>
                                    <th style="text-align: center; font-size: 11px; color: #999; text-transform: uppercase; padding-bottom: 10px; border-bottom: 2px solid #eeeeee;">Qty</th>
                                    <th style="text-align: right; font-size: 11px; color: #999; text-transform: uppercase; padding-bottom: 10px; border-bottom: 2px solid #eeeeee;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        ${totalsHtml}
                    </div>

                    <div style="margin-bottom: 40px;">
                        <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 10px; letter-spacing: 1px;">Shipping Address</h3>
                        <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 0;">
                            ${customerName}<br>
                            ${customer?.address}<br>
                            ${customer?.postalCode} ${customer?.city}<br>
                            ${customer?.country}
                        </p>
                    </div>

                    <div style="text-align: center; padding-top: 40px; border-top: 1px solid #eeeeee; color: #999; font-size: 12px;">
                        <p>&copy; ${new Date().getFullYear()} El Cuartito Records. All rights reserved.</p>
                        <p>Dybbølsgade 14, 1721 København V, Denmark</p>
                        <p style="font-size: 10px; margin-top: 10px;">CVR: 45943216</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('❌ Resend Error (Order Confirmation):', JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        console.log('✅ Order confirmation email sent successfully:', data?.id);
        return { success: true, id: data?.id };
    } catch (error: any) {
        console.error('❌ [MAIL-SERVICE] Exception in sendOrderConfirmationEmail:', error);
        return { success: false, error: error.message };
    }
};

export const sendShippingNotificationEmail = async (orderData: any, shipmentInfo: any) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder' || config.RESEND_API_KEY === 're_your_api_key_here') {
            console.warn('⚠️  RESEND_API_KEY not configured. Skipping shipping notification.');
            return { success: false, error: 'Resend API Key missing' };
        }

        console.log('📧 Starting sendShippingNotificationEmail for order:', orderData.orderNumber);

        const customerEmail = orderData.customer?.email || orderData.customerEmail || orderData.email;
        const customerName = orderData.customer?.firstName || orderData.customerName || 'Customer';

        if (!customerEmail) {
            console.error('❌ Cannot send email: No customer email found.');
            return { success: false, error: 'No customer email found' };
        }

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail.trim().toLowerCase()],
            subject: `Your order is on its way! 🚚 - El Cuartito Records`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <img src="${LOGO_URL}" alt="El Cuartito Records" style="width: 100px; height: 100px; border-radius: 50px; margin-bottom: 15px;">
                        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0;">EL CUARTITO RECORDS</h1>
                    </div>

                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Great news, ${customerName}!</h2>
                        <p style="color: #666; line-height: 1.5;">Your order <strong>${orderData.orderNumber || (orderData.id ? orderData.id.slice(0, 8) : 'Pending')}</strong> has been dispatched via ${shipmentInfo.carrier} and is now with the carrier.</p>
                    </div>

                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
                        <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 15px; letter-spacing: 1px;">Tracking Information</h3>
                        <p style="margin-bottom: 20px; font-size: 18px;">
                            <strong>Tracking Number:</strong> <br>
                            <span style="color: #f97316; font-weight: bold; font-size: 24px; display: block; margin: 10px 0;">${shipmentInfo.tracking_number}</span>
                        </p>
                        <a href="https://app.shipmondo.com/tracking/${shipmentInfo.tracking_number}" 
                           style="background: #f97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 900; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                           Track My Order 🚚
                        </a>
                    </div>

                    <div style="text-align: center; padding-top: 40px; border-top: 1px solid #eeeeee; color: #999; font-size: 12px;">
                        <p>&copy; ${new Date().getFullYear()} El Cuartito Records. All rights reserved.</p>
                        <p>Dybbølsgade 14, 1721 København V, Denmark</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('❌ Resend Error (Shipping Notification):', JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        console.log('✅ Shipping notification sent successfully:', data?.id);
        return { success: true, id: data?.id };
    } catch (error: any) {
        console.error('❌ [MAIL-SERVICE] Exception in sendShippingNotificationEmail:', error);
        return { success: false, error: error.message };
    }
};

export const sendShipOrderEmail = async (orderData: any, shipmentInfo: any) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder' || config.RESEND_API_KEY === 're_your_api_key_here') {
            console.warn('⚠️  RESEND_API_KEY not configured. Skipping sendShipOrderEmail.');
            return { success: false, error: 'Resend API Key missing' };
        }

        // Robust customer extraction
        const customer = orderData.customer;
        let customerEmail = orderData.customerEmail || orderData.email || orderData.stripe_info?.email;

        if (customer) {
            if (typeof customer === 'string') {
                if (customer.includes('@')) customerEmail = customer;
            } else if (typeof customer === 'object') {
                customerEmail = customer.email || customerEmail;
            }
        }

        const customerName = (typeof customer === 'object' ? (customer.firstName || customer.name) : null)
            || orderData.customerName
            || orderData.name
            || 'Customer';

        console.log(`📧 [DEBUG-MAIL] orderData ID: ${orderData.id || 'N/A'}`);
        console.log(`📧 [DEBUG-MAIL] orderData keys: ${Object.keys(orderData).join(', ')}`);
        console.log(`📧 [DEBUG-MAIL] Detected email: "${customerEmail}"`);
        console.log(`📧 [DEBUG-MAIL] Detected name: "${customerName}"`);

        if (!customerEmail || customerEmail === '-' || customerEmail === 'null' || customerEmail === 'null@null.com') {
            console.warn('⚠️  No valid customer email found. Skipping tracking email.');
            return { success: false, error: 'No valid customer email found' };
        }

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail.trim().toLowerCase()],
            subject: `Your order is on its way! 🚚 - El Cuartito Records`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <img src="${LOGO_URL}" alt="El Cuartito Records" style="width: 100px; height: 100px; border-radius: 50px; margin-bottom: 15px;">
                        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0;">EL CUARTITO RECORDS</h1>
                    </div>

                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Great news, ${customerName}!</h2>
                        <p style="color: #666; line-height: 1.5;">Your order <strong>${orderData.orderNumber || (orderData.id ? orderData.id.slice(0, 8) : 'Pending')}</strong> has been dispatched and is now with the carrier.</p>
                    </div>

                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
                        <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 15px; letter-spacing: 1px;">Tracking Information</h3>
                        <p style="margin-bottom: 20px; font-size: 18px;">
                            <strong>Tracking Number:</strong> <br>
                            <span style="color: #f97316; font-weight: bold; font-size: 24px; display: block; margin: 10px 0;">${shipmentInfo.tracking_number}</span>
                        </p>
                        <a href="https://app.shipmondo.com/tracking/${shipmentInfo.tracking_number}" 
                           style="background: #f97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 900; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                           Track My Order 🚚
                        </a>
                    </div>

                    <div style="text-align: center; padding-top: 40px; border-top: 1px solid #eeeeee; color: #999; font-size: 12px;">
                        <p>&copy; ${new Date().getFullYear()} El Cuartito Records. All rights reserved.</p>
                        <p>Dybbølsgade 14, 1721 København V, Denmark</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('❌ Resend Error in sendShipOrderEmail:', JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        console.log('✅ Tracking notification sent successfully:', data?.id);
        return { success: true, id: data?.id };
    } catch (error: any) {
        console.error('❌ [MAIL-SERVICE] Exception in sendShipOrderEmail:', error);
        return { success: false, error: error.message };
    }
};

export const sendPickupReadyEmail = async (orderData: any) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder') {
            return { success: false, error: 'Resend API Key missing' };
        }

        const customerEmail = orderData.customer?.email || orderData.customerEmail;
        const customerName = orderData.customer?.firstName || orderData.customerName || 'Customer';

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: "Your order is ready for pickup! 💿",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="${LOGO_URL}" alt="El Cuartito" style="width: 100px; height: 100px; border-radius: 50px;">
                        <h2 style="margin-top: 20px;">Hi, ${customerName}!</h2>
                        <p style="color: #666; font-size: 16px;">Good news! Your order <strong>${orderData.orderNumber || (orderData.id ? orderData.id.slice(0, 8) : 'Pending')}</strong> is now prepared and ready for you to pick it up.</p>
                    </div>
                    
                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #eee;">
                        <h3 style="margin-top: 0; color: #f97316; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📍 Pickup Location</h3>
                        <p style="margin-bottom: 5px; font-weight: bold;">El Cuartito Records</p>
                        <p style="margin-bottom: 5px;">Dybbølsgade 14</p>
                        <p style="margin-bottom: 5px;">1721 København V, Denmark</p>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #999; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Opening Hours</h3>
                        <p style="font-size: 14px; color: #444; line-height: 1.6;">
                            Monday to Friday: 11:00 - 18:00<br>
                            Saturday: 11:00 - 16:00
                        </p>
                    </div>

                    <div style="padding: 20px; background-color: #fff8f1; border-radius: 8px; border-left: 4px solid #f97316;">
                        <p style="margin: 0; font-size: 14px; color: #854d0e;">Please remember to bring your order number or the name used for the purchase.</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 40px;">
                        <p style="color: #999; font-size: 12px;">We are looking forward to seeing you!<br><strong>El Cuartito Records</strong></p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('❌ Resend Error (Pickup):', JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        console.log('✅ Pickup ready email sent successfully:', data?.id);
        return { success: true, id: data?.id };
    } catch (error: any) {
        console.error('❌ [MAIL-SERVICE] Exception in sendPickupReadyEmail:', error);
        return { success: false, error: error.message };
    }
};
