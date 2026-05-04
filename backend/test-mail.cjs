// Run with: node test-mail.cjs
// Fetches a real recent sale from Firestore, enriches items with cover images,
// and sends all email types to your personal address for preview.

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Resend } = require('resend');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

// Fetch cover_image for each item from the products collection
async function enrichItemImages(items) {
  return Promise.all(items.map(async (item) => {
    if (item.cover_image) return item;
    try {
      let cover_image = '';
      if (item.productId) {
        const doc = await db.collection('products').doc(item.productId).get();
        cover_image = doc.data()?.cover_image || '';
      }
      if (!cover_image && item.discogs_listing_id) {
        const snap = await db.collection('products')
          .where('discogs_listing_id', '==', String(item.discogs_listing_id))
          .limit(1).get();
        if (!snap.empty) cover_image = snap.docs[0].data().cover_image || '';
      }
      return { ...item, cover_image };
    } catch { return item; }
  }));
}

// Fetch the most recent sale that has items
async function fetchRealSale() {
  const snap = await db.collection('sales')
    .orderBy('timestamp', 'desc')
    .limit(20)
    .get();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.items && data.items.length > 0) return { id: doc.id, ...data };
  }
  return null;
}

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = 'alejogalli98@gmail.com';
const LOGO_URL = 'https://el-cuartito-admin-records.web.app/logo-label.png';
const DEFAULT_VINYL = 'https://el-cuartito-admin-records.web.app/default-vinyl.png';

// ─── copy of the shared helpers from mailService ─────────────────────────────

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
      <tr><td align="center" style="padding:40px 32px 32px 32px;">
        <img src="${LOGO_URL}" alt="El Cuartito Records" width="180"
             style="display:block;width:180px;height:auto;margin:0 auto;"/>
      </td></tr>
      <tr><td style="padding:0 32px;">
        <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
      </td></tr>`;

const emailClose = () => {
  const year = new Date().getFullYear();
  return `
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

const inlineDivider = () =>
  `<tr><td style="padding:0 32px;">
    <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
  </td></tr>`;

const signature = (line) =>
  `<tr><td style="padding:32px 32px 40px 32px;">
    <p style="margin:0;font-size:14px;line-height:1.6;color:#555555;">
      ${line}<br/>
      <span style="color:#111111;font-weight:600;">The El Cuartito crew</span>
    </p>
  </td></tr>`;

const itemRow = (item) => {
  const img = item.cover_image || item.image || DEFAULT_VINYL;
  const qty = item.quantity || item.qty || 1;
  return `
  <tr>
    <td width="64" style="padding:16px 0;border-top:1px solid #ececec;vertical-align:middle;">
      <img src="${img}" alt="" width="56" height="56"
           style="display:block;width:56px;height:56px;border-radius:2px;object-fit:cover;"/>
    </td>
    <td style="padding:16px 12px;border-top:1px solid #ececec;vertical-align:middle;">
      <div style="font-size:15px;font-weight:600;color:#111111;line-height:1.3;">${item.album}</div>
      <div style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${item.artist}</div>
      <div style="font-size:12px;color:#aaaaaa;margin-top:4px;">× ${qty}</div>
    </td>
    <td align="right" style="padding:16px 0;border-top:1px solid #ececec;vertical-align:middle;font-size:14px;color:#555555;white-space:nowrap;">DKK ${(item.unitPrice || 0).toFixed(2)}</td>
  </tr>`;
};

// ─── sample data ──────────────────────────────────────────────────────────────

const sampleItems = [
  {
    album: 'The Remixes: No Control / The Techno Wave',
    artist: 'Interactive',
    unitPrice: 149,
    qty: 1,
    cover_image: 'https://i.discogs.com/jKMiQ1HmNOV_qW3TA9Vy8b0e0FNGGbJ5LFH8TFR9VZI/rs:fit/g:sm/q:90/h:150/w:150/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTcxNDA1/ODEtMTQxMzI3ODU1/My01NzY5LmpwZWc.jpeg',
    productCondition: 'Second-hand',
  },
  {
    album: 'Second Half EP',
    artist: 'Zekt',
    unitPrice: 89,
    qty: 1,
    cover_image: '',
    productCondition: 'New',
  },
];

const sampleCustomer = {
  firstName: 'Alejo',
  lastName: 'Galli',
  email: TO,
  address: 'Nørrebrogade 12',
  postalCode: '2200',
  city: 'København N',
  country: 'Denmark',
};

// ─── email builders ───────────────────────────────────────────────────────────

function buildOrderConfirmation(items, saleLabel) {
  const items_total = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const shipping_cost = 55;
  const total_amount = items_total + shipping_cost;
  const itemsHtml = items.map(item => {
    const img = item.cover_image || DEFAULT_VINYL;
    return `
    <tr>
      <td width="64" style="padding:16px 0;border-top:1px solid #ececec;vertical-align:middle;">
        <img src="${img}" alt="" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:2px;object-fit:cover;"/>
      </td>
      <td style="padding:16px 12px;border-top:1px solid #ececec;vertical-align:middle;">
        <div style="font-size:15px;font-weight:600;color:#111111;line-height:1.3;">${item.album}</div>
        <div style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${item.artist}</div>
        <div style="font-size:12px;color:#aaaaaa;margin-top:4px;">× ${item.qty}</div>
      </td>
      <td align="right" style="padding:16px 0;border-top:1px solid #ececec;vertical-align:middle;font-size:14px;color:#555555;white-space:nowrap;">DKK ${item.unitPrice.toFixed(2)}</td>
    </tr>`;
  }).join('');
  return emailOpen(`Order ${saleLabel} confirmed — your records are being packed.`) + `
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order confirmed</p>
        <h1 style="margin:0 0 24px 0;font-size:26px;font-weight:500;color:#111111;line-height:1.25;">Hi Alejo, thanks for your order.</h1>
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#555555;">We've received order <strong style="color:#111111;">${saleLabel}</strong> and are already packing it for shipment.</p>
        <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#555555;">You'll receive another email with your tracking number as soon as the package leaves the shop.</p>
      </td></tr>
      <tr><td style="padding:0 32px 8px 32px;">
        <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order summary</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${itemsHtml}
          <tr><td colspan="3"><div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
          <tr>
            <td colspan="2" style="padding:8px 0;font-size:13px;color:#888888;">Subtotal</td>
            <td align="right" style="padding:8px 0;font-size:13px;color:#555555;white-space:nowrap;">DKK ${items_total.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:6px 0;font-size:13px;color:#888888;">Shipping</td>
            <td align="right" style="padding:6px 0;font-size:13px;color:#555555;white-space:nowrap;">DKK ${shipping_cost.toFixed(2)}</td>
          </tr>
          <tr><td colspan="3"><div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
          <tr>
            <td colspan="2" style="padding:10px 0 0 0;font-size:15px;font-weight:600;color:#111111;">Total</td>
            <td align="right" style="padding:10px 0 0 0;font-size:15px;font-weight:600;color:#111111;white-space:nowrap;">DKK ${total_amount.toFixed(2)}</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:32px 32px 8px 32px;">
        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Shipping address</p>
        <p style="margin:0;font-size:14px;line-height:1.8;color:#555555;">Alejo Galli<br/>Nørrebrogade 12<br/>2200 København N<br/>Denmark</p>
      </td></tr>
      ${inlineDivider()}
      ${signature('With love,')}
      ${emailClose()}`;
}

function buildShipped(items) {
  return emailOpen('Your order is on its way — tracking: 922052831823') + `
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">On its way</p>
        <h1 style="margin:0 0 24px 0;font-size:26px;font-weight:500;color:#111111;line-height:1.25;">Hi Alejo, your order is shipped.</h1>
        <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#555555;">Your records have left the shop and are now travelling to you. Use the tracking number below to follow them along the way.</p>
      </td></tr>
      <tr><td style="padding:0 32px 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ececec;">
          <tr><td style="padding:24px;">
            <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Tracking number</p>
            <p style="margin:0 0 20px 0;font-family:'SFMono-Regular',Consolas,monospace;font-size:20px;color:#111111;letter-spacing:1px;">922052831823</p>
            <a href="https://gls-group.eu/DK/en/parcel-tracking?match=922052831823" style="display:inline-block;background-color:#111111;color:#ffffff;padding:12px 24px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Track my order</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 8px 32px;">
        <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order summary</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${items.map(i => itemRow(i)).join('')}
        </table>
        <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
      </td></tr>
      ${inlineDivider()}
      ${signature('Enjoy the spin,')}
      ${emailClose()}`;
}

function buildPickup(items, saleLabel) {
  return emailOpen('Your order is ready — come by whenever you like!') + `
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Ready for pickup</p>
        <h1 style="margin:0 0 24px 0;font-size:26px;font-weight:500;color:#111111;line-height:1.25;">Hi Alejo, your order is ready.</h1>
        <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#555555;">Order <strong style="color:#111111;">${saleLabel}</strong> is packed and waiting for you at the shop.</p>
      </td></tr>
      <tr><td style="padding:0 32px 8px 32px;">
        <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order summary</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${items.map(i => itemRow(i)).join('')}
        </table>
        <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
      </td></tr>
      <tr><td style="padding:24px 32px 8px 32px;">
        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Where to find us</p>
        <p style="margin:0 0 8px 0;font-size:15px;font-weight:600;color:#111111;">El Cuartito Records</p>
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.8;color:#555555;">Dybbølsgade 14<br/>1721 København V, Denmark</p>
        <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Opening hours</p>
        <p style="margin:0;font-size:14px;color:#555555;">Tuesday – Saturday: 11:00 – 17:00</p>
      </td></tr>
      ${inlineDivider()}
      ${signature('See you soon,')}
      ${emailClose()}`;
}

function buildDiscogsPreparing(items) {
  return emailOpen("We're packing your Discogs order — tracking info coming soon.") + `
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order received</p>
        <h1 style="margin:0 0 24px 0;font-size:26px;font-weight:500;color:#111111;line-height:1.25;">Hi Alejo, we're packing your order.</h1>
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#555555;">Thanks for shopping with us. We're already preparing your order from <strong style="color:#111111;">Discogs</strong>.</p>
        <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#555555;">You'll get another email with the tracking number as soon as your package leaves the shop.</p>
      </td></tr>
      <tr><td style="padding:0 32px 8px 32px;">
        <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Order summary</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${items.map(i => itemRow(i)).join('')}
        </table>
        <div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div>
      </td></tr>
      ${inlineDivider()}
      ${signature('With love,')}
      ${emailClose()}`;
}

function buildSaleNotification(items, total) {
  const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding:12px 0;border-top:1px solid #ececec;vertical-align:top;">
        <div style="font-size:15px;font-weight:600;color:#111111;">${i.album}</div>
        <div style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${i.artist}</div>
        <div style="font-size:12px;color:#aaaaaa;margin-top:4px;">× ${i.qty}</div>
      </td>
      <td align="right" style="padding:12px 0;border-top:1px solid #ececec;vertical-align:top;font-size:14px;color:#555555;white-space:nowrap;">DKK ${(i.unitPrice * i.qty).toFixed(2)}</td>
    </tr>`).join('');

  return emailOpen() + `
      <tr><td style="padding:40px 32px 8px 32px;">
        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Nueva venta</p>
        <h1 style="margin:0 0 8px 0;font-size:32px;font-weight:500;color:#111111;line-height:1.1;">DKK ${total.toFixed(2)}</h1>
        <p style="margin:0 0 32px 0;font-size:15px;color:#555555;">Webshop · ${date} ${time}</p>
      </td></tr>
      <tr><td style="padding:0 32px 8px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ececec;">
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #ececec;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Canal</td>
            <td style="padding:16px 20px;border-bottom:1px solid #ececec;font-size:14px;color:#111111;font-weight:600;">Webshop</td>
          </tr>
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #ececec;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Pago</td>
            <td style="padding:16px 20px;border-bottom:1px solid #ececec;font-size:14px;color:#111111;font-weight:600;">Stripe</td>
          </tr>
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #ececec;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Artículos</td>
            <td style="padding:16px 20px;border-bottom:1px solid #ececec;font-size:14px;color:#111111;font-weight:600;">2</td>
          </tr>
          <tr>
            <td style="padding:16px 20px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Cliente</td>
            <td style="padding:16px 20px;font-size:14px;color:#111111;font-weight:600;">Alejo Galli</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 8px 32px;">
        <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;">Discos vendidos</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${itemsHtml}
          <tr><td colspan="2"><div style="height:1px;background-color:#ececec;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
          <tr>
            <td style="padding:10px 0 0 0;font-size:15px;font-weight:600;color:#111111;">Total</td>
            <td align="right" style="padding:10px 0 0 0;font-size:15px;font-weight:600;color:#111111;white-space:nowrap;">DKK ${Number(total).toFixed(2)}</td>
          </tr>
        </table>
      </td></tr>
      ${inlineDivider()}
      <tr><td style="padding:24px 32px 32px 32px;">
        <p style="margin:0;font-size:13px;color:#999999;">Notificación automática · El Cuartito Records</p>
      </td></tr>
      ${emailClose()}`;
}

// ─── send all ─────────────────────────────────────────────────────────────────

(async () => {
  console.log('Fetching real sale from Firestore...');
  const sale = await fetchRealSale();

  let realItems = sampleItems;
  let saleLabel = '#2026-0042';
  let totalReal = sampleItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  if (sale) {
    console.log(`Found sale: ${sale.id} (${sale.items?.length} items, channel: ${sale.channel})`);
    const enriched = await enrichItemImages(sale.items || []);
    realItems = enriched.map(i => ({
      album: i.album || i.title || 'Unknown',
      artist: i.artist || 'Unknown',
      unitPrice: i.priceAtSale || i.unitPrice || i.price || 0,
      qty: i.qty || i.quantity || 1,
      cover_image: i.cover_image || '',
    }));
    saleLabel = sale.orderNumber || sale.id?.slice(0, 8) || saleLabel;
    totalReal = sale.total_amount || sale.total || realItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    console.log(`Items enriched: ${realItems.map(i => `${i.album} → ${i.cover_image ? '✅ cover' : '⬜ no cover'}`).join(', ')}\n`);
  } else {
    console.log('No sale found, using sample data.\n');
  }

  const emails = [
    { subject: `[TEST] Order Confirmation ${saleLabel} — El Cuartito Records`, html: buildOrderConfirmation(realItems, saleLabel) },
    { subject: `[TEST] Your order is on its way — El Cuartito Records`,         html: buildShipped(realItems) },
    { subject: `[TEST] Your order is ready for pickup — El Cuartito Records`,   html: buildPickup(realItems, saleLabel) },
    { subject: `[TEST] We are preparing your Discogs order — El Cuartito Records`, html: buildDiscogsPreparing(realItems) },
    { subject: `[TEST] Nueva venta DKK ${totalReal.toFixed(2)} — El Cuartito`,  html: buildSaleNotification(realItems, totalReal) },
  ];

  console.log(`Sending ${emails.length} emails to ${TO}...\n`);
  for (const email of emails) {
    const { data, error } = await resend.emails.send({
      from: 'El Cuartito Records <hola@elcuartito.dk>',
      to: [TO],
      subject: email.subject,
      html: email.html,
    });
    if (error) {
      console.error(`❌ ${email.subject}\n   `, error);
    } else {
      console.log(`✅ ${email.subject}\n   id: ${data.id}`);
    }
    await new Promise(r => setTimeout(r, 400));
  }
  console.log('\nDone. Check your inbox!');
})();
