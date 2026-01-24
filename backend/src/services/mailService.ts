import { Resend } from 'resend';
import config from '../config/env';

const resend = new Resend(config.RESEND_API_KEY);

export const sendOrderConfirmationEmail = async (orderData: any) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder' || config.RESEND_API_KEY === 're_your_api_key_here') {
            console.warn('⚠️  RESEND_API_KEY not configured. Skipping email sending.');
            return;
        }

        console.log('📧 Starting sendOrderConfirmationEmail for order:', orderData.orderNumber);
        console.log('📧 Customer email:', orderData.customer?.email);

        const { customer, items, orderNumber, total_amount, items_total, shipping_cost } = orderData;
        const customerEmail = customer?.email;
        const customerName = `${customer?.firstName} ${customer?.lastName}`;

        if (!customerEmail) {
            console.error('❌ Cannot send email: No customer email found.');
            return;
        }

        const itemsHtml = items.map((item: any) => `
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee;">
                    <div style="font-weight: bold; color: #333;">${item.album}</div>
                    <div style="font-size: 12px; color: #666; text-transform: uppercase;">${item.artist}</div>
                </td>
                <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eeeeee; color: #666;">
                    ${item.quantity || item.qty}
                </td>
                <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eeeeee; font-weight: bold; color: #333;">
                    DKK ${(item.unitPrice || item.priceAtSale).toFixed(2)}
                </td>
            </tr>
        `).join('');

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: `Confirmation of Order ${orderNumber} - El Cuartito Records`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0;">EL CUARTITO RECORDS</h1>
                        <p style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Copenhagen, Denmark</p>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">¡Gracias por tu compra, ${customer?.firstName}!</h2>
                        <p style="color: #666; line-height: 1.5;">Hemos recibido tu pedido <strong>${orderNumber}</strong> y ya estamos trabajando en él. Te notificaremos en cuanto sea enviado.</p>
                    </div>

                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                        <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 15px; letter-spacing: 1px;">Resumen del Pedido</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; font-size: 12px; color: #999; text-transform: uppercase; padding-bottom: 10px; border-bottom: 2px solid #eeeeee;">Artículo</th>
                                    <th style="text-align: center; font-size: 12px; color: #999; text-transform: uppercase; padding-bottom: 10px; border-bottom: 2px solid #eeeeee;">Cant.</th>
                                    <th style="text-align: right; font-size: 12px; color: #999; text-transform: uppercase; padding-bottom: 10px; border-bottom: 2px solid #eeeeee;">Precio</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>

                        <div style="margin-top: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #666; font-size: 14px;">
                                <span>Subtotal:</span>
                                <span>DKK ${items_total.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #666; font-size: 14px;">
                                <span>Envío:</span>
                                <span>DKK ${shipping_cost.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #eeeeee; font-weight: 900; font-size: 18px;">
                                <span>Total:</span>
                                <span>DKK ${total_amount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 40px;">
                        <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 10px; letter-spacing: 1px;">Dirección de Envío</h3>
                        <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 0;">
                            ${customerName}<br>
                            ${customer?.address}<br>
                            ${customer?.postalCode} ${customer?.city}<br>
                            ${customer?.country}
                        </p>
                    </div>

                    <div style="text-align: center; padding-top: 40px; border-top: 1px solid #eeeeee; color: #999; font-size: 12px;">
                        <p>&copy; ${new Date().getFullYear()} El Cuartito Records. Todos los derechos reservados.</p>
                        <p>Copenhagen, Denmark</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('❌ Error sending confirmation email via Resend:', error);
            return;
        }

        console.log('✅ Order confirmation email sent successfully:', data?.id);
    } catch (error) {
        console.error('❌ Exception in sendOrderConfirmationEmail:', error);
    }
};

export const sendShippingNotificationEmail = async (orderData: any, shipmentInfo: any) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder' || config.RESEND_API_KEY === 're_your_api_key_here') {
            console.warn('⚠️  RESEND_API_KEY not configured. Skipping shipping notification.');
            return;
        }

        console.log('📧 Starting sendShippingNotificationEmail for order:', orderData.orderNumber);

        const customerEmail = orderData.customer?.email;
        const customerName = orderData.customer?.firstName || 'Cliente';

        if (!customerEmail) {
            console.error('❌ Cannot send email: No customer email found.');
            return;
        }

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: `Tu pedido ${orderData.orderNumber} ha sido enviado - El Cuartito Records`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0;">EL CUARTITO RECORDS</h1>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">¡Buenas noticias, ${customerName}!</h2>
                        <p style="color: #666; line-height: 1.5;">Tu pedido <strong>${orderData.orderNumber}</strong> ya está en camino.</p>
                    </div>

                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                        <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 15px; letter-spacing: 1px;">Información de Envío</h3>
                        <p style="margin-bottom: 10px; font-size: 16px;">
                            <strong>Transportista:</strong> ${shipmentInfo.carrier}<br>
                            <strong>Número de Seguimiento:</strong> <span style="color: #f97316; font-weight: bold;">${shipmentInfo.tracking_number}</span>
                        </p>
                        <p style="font-size: 12px; color: #666;">Puedes seguir tu paquete usando el número de seguimiento en la web del transportista.</p>
                    </div>

                    <div style="text-align: center; padding-top: 40px; border-top: 1px solid #eeeeee; color: #999; font-size: 12px;">
                        <p>&copy; ${new Date().getFullYear()} El Cuartito Records. Todos los derechos reservados.</p>
                        <p>Copenhagen, Denmark</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('❌ Error sending shipping notification via Resend:', error);
            return;
        }

        console.log('✅ Shipping notification sent successfully:', data?.id);
    } catch (error) {
        console.error('❌ Exception in sendShippingNotificationEmail:', error);
    }
};

export const sendShipOrderEmail = async (orderData: any, shipmentInfo: any) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder') {
            return;
        }

        const customerEmail = orderData.customer?.email || orderData.customerEmail;
        const customerName = orderData.customer?.firstName || orderData.customerName || 'Cliente';

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>', // Professional domain email
            to: [customerEmail],
            subject: "¡Tu pedido va en camino! 🚚",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>¡Buenas noticias, ${customerName}!</h2>
                    <p>Tu pedido ha salido y ya está en manos del transportista.</p>
                    <p><strong>Número de Seguimiento:</strong> ${shipmentInfo.tracking_number}</p>
                    <div style="margin: 30px 0;">
                        <a href="https://app.shipmondo.com/tracking/${shipmentInfo.tracking_number}" 
                           style="background: #e67e22; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                           Seguir mi Pedido 🚚
                        </a>
                    </div>
                    ${shipmentInfo.label_url ? `
                        <p>También puedes descargar tu etiqueta de envío aquí:</p>
                        <a href="${shipmentInfo.label_url}" style="color: #e67e22;">Descargar Etiqueta PDF</a>
                    ` : ''}
                    <p style="margin-top: 40px; color: #7f8c8d; font-size: 12px;">El Cuartito Records</p>
                </div>
            `
        });

        if (error) console.error('❌ Resend Error:', error);
    } catch (error) {
        console.error('❌ Exception in sendShipOrderEmail:', error);
    }
};

export const sendPickupReadyEmail = async (orderData: any) => {
    try {
        if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_placeholder') {
            return;
        }

        const customerEmail = orderData.customer?.email || orderData.customerEmail;
        const customerName = orderData.customer?.firstName || orderData.customerName || 'Cliente';

        const { data, error } = await resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: [customerEmail],
            subject: "¡Tu pedido está listo para retirar! 💿",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>¡Hola, ${customerName}!</h2>
                    <p>¡Buenas noticias! Tu pedido <strong>${orderData.orderNumber || orderData.id.slice(0, 8)}</strong> ya está preparado y listo para que pases a buscarlo.</p>
                    
                    <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #eee;">
                        <h3 style="margin-top: 0; color: #f97316;">📍 Punto de Retiro</h3>
                        <p style="margin-bottom: 5px;"><strong>El Cuartito Records</strong></p>
                        <p style="margin-bottom: 5px;">Dybbølsgade 14</p>
                        <p style="margin-bottom: 5px;">1721 København V, Denmark</p>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #666; font-size: 14px; text-transform: uppercase;">Horarios de Atención</h3>
                        <p style="font-size: 14px; color: #444;">Lunes a Viernes: 11:00 - 18:00<br>Sábados: 11:00 - 16:00</p>
                    </div>

                    <p>Por favor, recuerda traer tu número de pedido o el nombre de quien realizó la compra.</p>
                    
                    <p style="margin-top: 40px; color: #7f8c8d; font-size: 12px;">¡Te esperamos!<br>El Cuartito Records</p>
                </div>
            `
        });

        if (error) console.error('❌ Resend Error (Pickup):', error);
    } catch (error) {
        console.error('❌ Exception in sendPickupReadyEmail:', error);
    }
};
