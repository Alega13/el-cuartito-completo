import { Resend } from 'resend';
import config from '../config/env';

const resend = new Resend(config.RESEND_API_KEY);

const LOGO_URL = 'https://el-cuartito-admin-records.web.app/logo.jpg';

const generateOrderItemsHtml = (items: any[]) => {
    return items.map((item: any) => `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; width: 60px;">
                <img src="${item.cover_image || item.image || 'https://elcuartito.dk/default-vinyl.png'}" alt="${item.album}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; display: block;">
            </td>
            <td style="padding: 12px 0 12px 12px; border-bottom: 1px solid #eeeeee;">
                <div style="font-weight: bold; color: #333;">${item.album}</div>
                <div style="font-size: 12px; color: #666; text-transform: uppercase;">${item.artist}</div>
            </td>
            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eeeeee; color: #666;">
                ${item.quantity || item.qty}
            </td>
        </tr>
    `).join('');
};

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
        const newItemsList = items.filter((item: any) => item.productCondition === 'New');
        const usedItemsList = items.filter((item: any) => item.productCondition && item.productCondition !== 'New');
        const hasNew = newItemsList.length > 0;
        const hasUsed = usedItemsList.length > 0;
        const isMixed = hasNew && hasUsed;

        // Calculate VAT totals (Only for 'New' items as per requirement)
        let totalNewItemsVAT = 0;
        
        // Items HTML generation
        const itemsHtml = items.map((item: any) => {
            const price = item.unitPrice || item.priceAtSale || 0;
            const qty = item.quantity || item.qty || 1;
            const isItemNew = item.productCondition === 'New';
            const lineTotal = price * qty;
            
            let vatInfoHtml = '';
            let asterisk = '';

            if (isItemNew) {
                const lineVAT = lineTotal * 0.20; // 25% VAT extracted
                totalNewItemsVAT += lineVAT;
                if (!hasUsed) {
                    // Scenario A: All new - show VAT per line too (optional but helpful)
                    vatInfoHtml = `<div style="font-size: 11px; color: #2563eb; margin-top: 4px;">✓ Moms (25%): DKK ${lineVAT.toFixed(2)}</div>`;
                }
            } else {
                if (isMixed) {
                    asterisk = ' *';
                }
            }

            return `
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; width: 60px;">
                    <img src="${item.cover_image || item.image || 'https://elcuartito.dk/default-vinyl.png'}" alt="${item.album}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; display: block;">
                </td>
                <td style="padding: 12px 0 12px 12px; border-bottom: 1px solid #eeeeee;">
                    <div style="font-weight: bold; color: #333;">${item.album}${asterisk}</div>
                    <div style="font-size: 12px; color: #666; text-transform: uppercase;">${item.artist}</div>
                    ${vatInfoHtml}
                </td>
                <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eeeeee; color: #666;">
                    ${qty}
                </td>
                <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eeeeee; font-weight: bold; color: #333;">
                    DKK ${price.toFixed(2)}
                </td>
            </tr>`;
        }).join('');

        // Build totals section with VAT breakdown
        let vatBreakdownHtml = '';
        if (hasNew) {
            let finalVatAmount = totalNewItemsVAT;
            if (!hasUsed && shipping_cost > 0) {
                // Scenario A: Include shipping VAT in the total breakdown
                finalVatAmount += shipping_cost * 0.20;
            }
            vatBreakdownHtml = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #2563eb; font-size: 13px;">
                    <span style="flex: 1;">   ↳ Heraf moms (25%):</span>
                    <span>DKK ${finalVatAmount.toFixed(2)}</span>
                </div>
            `;
        }

        // Legends
        let legendHtml = '';
        if (hasUsed) {
            const legendText = isMixed 
                ? "* Varen sælges efter de særlige regler for brugte varer - køber har ikke fradrag for momsen for disse varer."
                : "Varen sælges efter de særlige regler for brugte varer - køber har ikke fradrag for momsen.";
            
            legendHtml = `
                <div style="margin-top: 20px; padding: 15px; background-color: #fffaf0; border: 1px solid #fbd38d; border-radius: 8px; font-size: 12px; color: #7b341e;">
                    <strong>BRUGTMOMS / MARGIN SCHEME</strong><br>
                    <p style="margin: 5px 0 0 0;">${legendText}</p>
                </div>
            `;
        }

        const totalsHtml = `
            <div style="margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #666; font-size: 14px;">
                    <span style="flex: 1;">Subtotal:</span>
                    <span>DKK ${items_total.toFixed(2)}</span>
                </div>
                ${vatBreakdownHtml}
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #666; font-size: 14px;">
                    <span style="flex: 1;">Shipping:</span>
                    <span>DKK ${shipping_cost.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #eeeeee; font-weight: 900; font-size: 18px; color: #f97316;">
                    <span style="flex: 1;">${(!hasNew && hasUsed) ? 'Total inkl. moms:' : 'Total:'}</span>
                    <span>DKK ${total_amount.toFixed(2)}</span>
                </div>
                ${legendHtml}
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
                        ${shipmentInfo.tracking_link ? `
                        <a href="${shipmentInfo.tracking_link}" 
                           style="background: #f97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 900; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                           Track My Order 🚚
                        </a>
                        ` : `
                        <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 20px;">
                            Please track your shipment on the shipping provider's website using the tracking number above.
                        </p>
                        `}
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

        const customerEmail = orderData.customer?.email || orderData.customerEmail || orderData.email || orderData.customer_email;
        const customerName = orderData.customer?.firstName || orderData.customerName || 'Customer';
        const items = orderData.items || [];
        const itemsHtml = generateOrderItemsHtml(items);

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
                        <h3 style="margin-top: 0; color: #f97316; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Order Summary</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th style="padding-bottom: 10px; width: 60px;"></th>
                                    <th style="text-align: left; padding-bottom: 10px; font-size: 11px; color: #999; text-transform: uppercase;">Item</th>
                                    <th style="text-align: center; padding-bottom: 10px; font-size: 11px; color: #999; text-transform: uppercase;">Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
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
                            Tuesday to Saturday: 11:00 - 17:00
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



export const sendDiscogsOrderPreparingEmail = async (orderData: any) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder') {
            return { success: false, error: 'Resend API Key missing' };
        }

        const customerEmail = orderData.customerEmail || orderData.email || orderData.customer_email;
        const customerName = orderData.customerName || 'Customer';
        const items = orderData.items || [];
        const itemsHtml = generateOrderItemsHtml(items);

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: `We are preparing your Discogs order - El Cuartito Records`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <img src="${LOGO_URL}" alt="El Cuartito Records" style="width: 100px; height: 100px; border-radius: 50px; margin-bottom: 15px;">
                        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0;">EL CUARTITO RECORDS</h1>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Hi ${customerName}!</h2>
                        <p style="color: #666; line-height: 1.5;">We wanted to let you know that we are already preparing your order from <strong>Discogs</strong>.</p>
                        <p style="color: #666; line-height: 1.5;">We will send you another email with the tracking number as soon as the package is dispatched.</p>
                    </div>

                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                        <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 15px; letter-spacing: 1px;">Order Summary</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th style="padding-bottom: 10px; width: 60px;"></th>
                                    <th style="text-align: left; padding-bottom: 10px; font-size: 11px; color: #999; text-transform: uppercase;">Item</th>
                                    <th style="text-align: center; padding-bottom: 10px; font-size: 11px; color: #999; text-transform: uppercase;">Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>

                    <div style="text-align: center; padding-top: 40px; border-top: 1px solid #eeeeee; color: #999; font-size: 12px;">
                        <p>&copy; ${new Date().getFullYear()} El Cuartito Records. All rights reserved.</p>
                        <p>Dybbølsgade 14, 1721 København V, Denmark</p>
                    </div>
                </div>
            `
        });

        if (error) return { success: false, error };
        return { success: true, id: data?.id };
    } catch (error: any) {
        console.error('❌ [MAIL-SERVICE] Exception in sendDiscogsOrderPreparingEmail:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send sale notification email to the store owner.
 * Triggered after every confirmed sale (POS, Webshop, Discogs).
 */
export const sendSaleNotificationEmail = async (saleData: {
    channel: string;
    items: any[];
    totalAmount: number;
    paymentMethod: string;
    customerName?: string;
    saleId?: string;
    date?: string;
}) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder' || config.RESEND_API_KEY === 're_your_api_key_here') {
            console.warn('⚠️  [MAIL-SERVICE] RESEND_API_KEY not configured. Skipping sale notification.');
            return { success: false, error: 'Resend API Key missing' };
        }

        const OWNER_EMAIL = 'el.cuartito.cph@gmail.com';
        const now = new Date();
        const saleDate = saleData.date || now.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const saleTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        const totalItems = saleData.items.reduce((sum: number, item: any) => sum + (item.qty || item.quantity || 1), 0);

        const channelLabels: Record<string, string> = {
            'local': '🏪 Tienda (POS)',
            'online': '🌐 Webshop',
            'discogs': '📀 Discogs',
        };
        const channelLabel = channelLabels[saleData.channel] || saleData.channel;

        const itemsRowsHtml = saleData.items.map((item: any) => {
            const price = item.priceAtSale || item.price || item.unitPrice || 0;
            const qty = item.qty || item.quantity || 1;
            const lineTotal = price * qty;
            return `
                <tr>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #eee; color: #333;">
                        <strong>${item.album || 'Unknown'}</strong><br>
                        <span style="font-size: 12px; color: #888;">${item.artist || ''}</span>
                    </td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: center; color: #333;">${qty}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right; color: #333;">DKK ${price.toFixed(2)}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #333;">DKK ${lineTotal.toFixed(2)}</td>
                </tr>`;
        }).join('');

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [OWNER_EMAIL],
            subject: `Nueva venta registrada - ${saleDate}`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; color: #333; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="${LOGO_URL}" alt="El Cuartito Records" style="width: 80px; height: 80px; border-radius: 40px; margin-bottom: 10px;">
                        <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0; color: #333;">NUEVA VENTA 🎉</h1>
                    </div>

                    <div style="background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 12px; padding: 20px; margin-bottom: 25px; color: white; text-align: center;">
                        <div style="font-size: 32px; font-weight: 900;">DKK ${saleData.totalAmount.toFixed(2)}</div>
                        <div style="font-size: 13px; margin-top: 5px; opacity: 0.9;">${channelLabel}</div>
                    </div>

                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 6px 0; color: #888;">📅 Fecha</td>
                                <td style="padding: 6px 0; text-align: right; font-weight: bold;">${saleDate} - ${saleTime}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #888;">💳 Método de pago</td>
                                <td style="padding: 6px 0; text-align: right; font-weight: bold;">${saleData.paymentMethod}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #888;">📦 Artículos</td>
                                <td style="padding: 6px 0; text-align: right; font-weight: bold;">${totalItems}</td>
                            </tr>
                            ${saleData.customerName ? `
                            <tr>
                                <td style="padding: 6px 0; color: #888;">👤 Cliente</td>
                                <td style="padding: 6px 0; text-align: right; font-weight: bold;">${saleData.customerName}</td>
                            </tr>` : ''}
                        </table>
                    </div>

                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="font-size: 13px; font-weight: 900; text-transform: uppercase; color: #999; margin: 0 0 15px 0; letter-spacing: 1px;">Discos vendidos</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; padding-bottom: 8px; font-size: 11px; color: #999; text-transform: uppercase; border-bottom: 2px solid #eee;">Disco</th>
                                    <th style="text-align: center; padding-bottom: 8px; font-size: 11px; color: #999; text-transform: uppercase; border-bottom: 2px solid #eee;">Cant.</th>
                                    <th style="text-align: right; padding-bottom: 8px; font-size: 11px; color: #999; text-transform: uppercase; border-bottom: 2px solid #eee;">P. Unit.</th>
                                    <th style="text-align: right; padding-bottom: 8px; font-size: 11px; color: #999; text-transform: uppercase; border-bottom: 2px solid #eee;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsRowsHtml}
                            </tbody>
                        </table>
                        <div style="margin-top: 15px; padding-top: 12px; border-top: 2px solid #eee; text-align: right; font-size: 18px; font-weight: 900; color: #f97316;">
                            Total: DKK ${saleData.totalAmount.toFixed(2)}
                        </div>
                    </div>

                    <div style="text-align: center; padding-top: 20px; color: #ccc; font-size: 11px;">
                        <p>Notificación automática de El Cuartito Records</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('❌ Resend Error (Sale Notification):', JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        console.log('✅ Sale notification email sent to owner:', data?.id);
        return { success: true, id: data?.id };
    } catch (error: any) {
        console.error('❌ [MAIL-SERVICE] Exception in sendSaleNotificationEmail:', error);
        return { success: false, error: error.message };
    }
};

export const sendDiscogsShippingNotificationEmail = async (orderData: any, trackingNumber: string) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder') {
            return { success: false, error: 'Resend API Key missing' };
        }

        const customerEmail = orderData.customerEmail || orderData.email || orderData.customer_email;
        const customerName = orderData.customerName || 'Customer';
        const items = orderData.items || [];
        const itemsHtml = generateOrderItemsHtml(items);

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: `Your Discogs order is on its way! 🚚 - El Cuartito Records`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <img src="${LOGO_URL}" alt="El Cuartito Records" style="width: 100px; height: 100px; border-radius: 50px; margin-bottom: 15px;">
                        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0;">EL CUARTITO RECORDS</h1>
                    </div>

                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Great news, ${customerName}!</h2>
                        <p style="color: #666; line-height: 1.5;">Your order has been dispatched and is now on its way.</p>
                    </div>

                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
                        <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 15px; letter-spacing: 1px;">Tracking Information</h3>
                        <p style="margin-bottom: 10px; font-size: 18px;">
                            <strong>Tracking Number:</strong> <br>
                            <span style="color: #f97316; font-weight: bold; font-size: 24px; display: block; margin: 10px 0;">${trackingNumber}</span>
                        </p>
                        ${orderData.tracking_link ? `
                        <p style="margin-top: 20px;">
                            <a href="${orderData.tracking_link}" 
                               style="background: #f97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 900; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                               Track My Order 🚚
                            </a>
                        </p>
                        ` : `
                        <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 20px;">
                            Please track your shipment on the shipping provider's website using the tracking number above.
                        </p>
                        `}
                    </div>

                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                        <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 15px; letter-spacing: 1px;">Order Summary</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th style="padding-bottom: 10px; width: 60px;"></th>
                                    <th style="text-align: left; padding-bottom: 10px; font-size: 11px; color: #999; text-transform: uppercase;">Item</th>
                                    <th style="text-align: center; padding-bottom: 10px; font-size: 11px; color: #999; text-transform: uppercase;">Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>

                    <div style="text-align: center; padding-top: 40px; border-top: 1px solid #eeeeee; color: #999; font-size: 12px;">
                        <p>&copy; ${new Date().getFullYear()} El Cuartito Records. All rights reserved.</p>
                        <p>Dybbølsgade 14, 1721 København V, Denmark</p>
                    </div>
                </div>
            `
        });

        if (error) return { success: false, error };
        return { success: true, id: data?.id };
    } catch (error: any) {
        console.error('❌ [MAIL-SERVICE] Exception in sendDiscogsShippingNotificationEmail:', error);
        return { success: false, error: error.message };
    }
};
