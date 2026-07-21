import jwt from 'jsonwebtoken';
import fs from 'fs';
import bcrypt from 'bcrypt';
import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import NodeCache from 'node-cache';
import { db, queryWithRetry, getDbConfig } from './src/db/index.ts';
import { posts, exams, examResults, users, notifications, calendarEvents, bookmarks, settings, pushSubscriptions, leaderboardSummary, wishlist } from './src/db/schema.ts';
import { eq, desc, inArray, and, sql, ne } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';

export const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes default
const PORT = 3000;

// Reusable middleware to authorize admin users
const requireAdmin = async (req: AuthRequest, res: any, next: any) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const u = await queryWithRetry(() =>
      db.select().from(users).where(eq(users.uid, String(req.user.uid)))
    );
    if (u.length === 0 || u[0].role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
    }
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get or Create user when logging in


const JWT_SECRET = process.env.JWT_SECRET || 'gep-super-secret-key-2026';

const convertGujaratiToEnglish = (val: any): string => {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  const map: { [key: string]: string } = {
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
  };
  return str.replace(/[૦-૯]/g, d => map[d] || d);
};

const validatePhoneNumber = (rawPhone: any): { isValid: boolean; error?: string; cleaned?: string } => {
  const cleaned = convertGujaratiToEnglish(rawPhone).replace(/\D/g, '');
  if (cleaned.length !== 10) {
    return { isValid: false, error: 'કૃપા કરીને સાચો ૧૦ આંકડાનો મોબાઈલ નંબર લખો.' };
  }

  // Must start with 6, 7, 8, or 9
  const firstDigit = cleaned[0];
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return { isValid: false, error: 'અમાન્ય મોબાઈલ નંબર! ભારતીય મોબાઈલ નંબર ૬, ૭, ૮ કે ૯ થી શરૂ થવો જોઈએ.' };
  }

  // Check if all digits are the same (e.g. 9999999999, 0000000000, 1111111111)
  const allSame = cleaned.split('').every(char => char === cleaned[0]);
  if (allSame) {
    return { isValid: false, error: 'અમાન્ય મોબાઈલ નંબર! કૃપા કરીને તમારો સાચો અને ચાલુ નંબર દાખલ કરો.' };
  }

  // Check sequential ascending or descending (e.g., 1234567890, 9876543210, 0123456789)
  const sequentialAsc = '01234567890';
  const sequentialDesc = '98765432109';
  if (sequentialAsc.includes(cleaned) || sequentialDesc.includes(cleaned)) {
    return { isValid: false, error: 'ક્રમિક આંકડા વાળો નકલી કે અમાન્ય નંબર સ્વીકાર્ય નથી.' };
  }

  return { isValid: true, cleaned };
};

async function getSetting(key: string, fallbackEnvVar?: string): Promise<string> {
  try {
    const row = await db.select().from(settings).where(eq(settings.key, key));
    if (row.length > 0 && row[0].value) {
      return row[0].value;
    }
  } catch (err) {
    console.warn(`[getSetting] Failed to fetch key ${key}:`, err);
  }
  return fallbackEnvVar ? (process.env[fallbackEnvVar] || '') : '';
}

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

async function sendSMS(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
  try {
    const gatewayType = await getSetting('SMS_GATEWAY_TYPE', 'SMS_GATEWAY_TYPE') || 'sandbox';
    if (gatewayType === 'disabled') {
      return { success: false, message: 'SMS Gateway is disabled.' };
    }
    if (gatewayType === 'sandbox') {
      console.log(`[SMS Sandbox] Sent OTP ${otp} to phone ${phone}`);
      return { success: true, message: `Demo OTP ${otp} sent to ${phone}.` };
    }

    const template = await getSetting('SMS_GATEWAY_TEMPLATE') || 'તમારો વેરિફિકેશન ઓટીપી કોડ {otp} છે.';
    const messageText = template.replace('{otp}', otp).replace('{phone}', phone);

    if (gatewayType === 'twilio') {
      const sid = await getSetting('SMS_TWILIO_SID');
      const token = await getSetting('SMS_TWILIO_AUTH_TOKEN');
      const from = await getSetting('SMS_TWILIO_FROM_NUMBER');

      if (!sid || !token || !from) {
        return { success: false, message: 'Twilio configurations are missing.' };
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');

      const params = new URLSearchParams();
      params.append('To', phone.startsWith('+') ? phone : `+91${phone}`);
      params.append('From', from);
      params.append('Body', messageText);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Twilio error (${response.status}): ${errText}`);
      }

      return { success: true, message: 'SMS sent via Twilio successfully.' };
    }

    if (gatewayType === 'custom_get' || gatewayType === 'custom_post') {
      const urlTemplate = await getSetting('SMS_GATEWAY_URL');
      const headersJson = await getSetting('SMS_GATEWAY_HEADERS');
      const bodyTemplate = await getSetting('SMS_GATEWAY_BODY_OR_PARAMS');

      if (!urlTemplate) {
        return { success: false, message: 'Custom Gateway API URL is missing.' };
      }

      let finalUrl = urlTemplate
        .replace(/{phone}/g, encodeURIComponent(phone))
        .replace(/{otp}/g, encodeURIComponent(otp))
        .replace(/{message}/g, encodeURIComponent(messageText));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (headersJson) {
        try {
          const parsedHeaders = JSON.parse(headersJson);
          for (const [hk, hv] of Object.entries(parsedHeaders)) {
            if (typeof hv === 'string') {
              headers[hk] = hv
                .replace(/{phone}/g, phone)
                .replace(/{otp}/g, otp)
                .replace(/{message}/g, messageText);
            } else {
              headers[hk] = String(hv);
            }
          }
        } catch (e) {
          console.error('[SMS Custom Gateway] Headers JSON parse error:', e);
        }
      }

      if (gatewayType === 'custom_get') {
        if (bodyTemplate) {
          let paramString = bodyTemplate
            .replace(/{phone}/g, encodeURIComponent(phone))
            .replace(/{otp}/g, encodeURIComponent(otp))
            .replace(/{message}/g, encodeURIComponent(messageText));
          if (!finalUrl.includes('?')) {
            finalUrl += '?' + paramString;
          } else {
            finalUrl += '&' + paramString;
          }
        }

        const response = await fetch(finalUrl, {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`GET API error (${response.status}): ${errText}`);
        }

        return { success: true, message: 'SMS sent via GET API successfully.' };
      } else {
        let reqBody: any = null;

        if (bodyTemplate) {
          let bodyStr = bodyTemplate
            .replace(/{phone}/g, phone)
            .replace(/{otp}/g, otp)
            .replace(/{message}/g, messageText);
          
          try {
            reqBody = JSON.stringify(JSON.parse(bodyStr));
          } catch (e) {
            reqBody = bodyStr;
          }
        } else {
          reqBody = JSON.stringify({
            to: phone,
            otp,
            message: messageText
          });
        }

        const response = await fetch(finalUrl, {
          method: 'POST',
          headers,
          body: reqBody
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`POST API error (${response.status}): ${errText}`);
        }

        return { success: true, message: 'SMS sent via POST API successfully.' };
      }
    }

    return { success: false, message: `Unsupported SMS gateway type: ${gatewayType}` };
  } catch (error: any) {
    console.error('[sendSMS Error]:', error);
    return { success: false, message: error.message || 'Unknown SMS Sending Error' };
  }
}

app.get('/api/settings/sms-status', async (req, res) => {
  try {
    const gatewayType = await getSetting('SMS_GATEWAY_TYPE', 'SMS_GATEWAY_TYPE') || 'disabled';
    res.json({
      enabled: gatewayType !== 'disabled',
      gatewayType
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/sms/send-otp', async (req, res) => {
  try {
    let { phone, purpose } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'મોબાઈલ નંબર જરૂરી છે.' });
    }

    const phoneVal = validatePhoneNumber(phone);
    if (!phoneVal.isValid) {
      return res.status(400).json({ error: phoneVal.error });
    }
    phone = phoneVal.cleaned!;

    const existing = await db.query.users.findFirst({ where: eq(users.phone, phone) });
    if (purpose === 'login' || purpose === 'forgot') {
      if (!existing) {
        return res.status(400).json({ error: 'આ મોબાઈલ નંબર રજીસ્ટર નથી. કૃપા કરીને પહેલા નવું રજીસ્ટ્રેશન કરો.' });
      }
      if (existing.isBlocked) {
        return res.status(423).json({ error: 'તમારૂ એકાઉન્ટ એડમિન દ્વારા સસ્પેન્ડ કરવામાં આવ્યું છે.' });
      }
    } else {
      if (existing) {
        return res.status(400).json({ error: 'આ મોબાઈલ નંબર અગાઉથી રજીસ્ટર્ડ છે. કૃપા કરીને લોગિન કરો.' });
      }
    }

    const gatewayType = await getSetting('SMS_GATEWAY_TYPE', 'SMS_GATEWAY_TYPE') || 'disabled';
    if (gatewayType === 'disabled') {
      return res.status(400).json({ error: 'મોબાઈલ નંબર વેરિફિકેશન હાલમાં બંધ છે.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(phone, { otp, expiresAt });

    const smsRes = await sendSMS(phone, otp);
    if (!smsRes.success) {
      if (gatewayType === 'sandbox') {
        return res.json({
          success: true,
          isSandbox: true,
          demoCode: otp,
          message: 'સેન્ડબોક્સ મોડમાં ડેમો ઓટીપી સફળતાપૂર્વક જનરેટ થયો.'
        });
      }
      return res.status(500).json({ error: `એસએમએસ મોકલવામાં નિષ્ફળતા: ${smsRes.message}` });
    }

    if (gatewayType === 'sandbox') {
      return res.json({
        success: true,
        isSandbox: true,
        demoCode: otp,
        message: `ડેમો ઓટીપી સફળતાપૂર્વક મોકલવામાં આવ્યો છે! ડેમો કોડ: ${otp}`
      });
    }

    res.json({ success: true, message: 'ઓટીપી તમારા મોબાઈલ નંબર પર સફળતાપૂર્વક મોકલવામાં આવ્યો છે.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/sms/verify-otp', async (req, res) => {
  try {
    let { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'મોબાઈલ નંબર અને ઓટીપી જરૂરી છે.' });
    }

    phone = convertGujaratiToEnglish(phone).replace(/\D/g, '').slice(-10);
    const otpVal = convertGujaratiToEnglish(otp).trim();

    const stored = otpStore.get(phone);
    if (!stored || stored.otp !== otpVal || Date.now() > stored.expiresAt) {
      return res.status(400).json({ error: 'દાખલ કરેલ ઓટીપી ખોટો છે અથવા તેની સમય મર્યાદા સમાપ્ત થઈ ગઈ છે.' });
    }

    res.json({ success: true, message: 'ઓટીપી સફળતાપૂર્વક વેરિફાય કરવામાં આવ્યો છે.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/sms/verify-login', async (req, res) => {
  try {
    let { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'મોબાઈલ નંબર અને ઓટીપી જરૂરી છે.' });
    }

    phone = convertGujaratiToEnglish(phone).replace(/\D/g, '').slice(-10);
    const otpVal = convertGujaratiToEnglish(otp).trim();

    const stored = otpStore.get(phone);
    if (!stored || stored.otp !== otpVal || Date.now() > stored.expiresAt) {
      return res.status(400).json({ error: 'દાખલ કરેલ ઓટીપી ખોટો છે અથવા તેની સમય મર્યાદા સમાપ્ત થઈ ગઈ છે.' });
    }
    otpStore.delete(phone);

    const user = await db.query.users.findFirst({ where: eq(users.phone, phone) });
    if (!user) {
      return res.status(404).json({ error: 'યુઝર મળ્યો નથી.' });
    }
    if (user.isBlocked) {
      return res.status(423).json({ error: 'તમારૂ એકાઉન્ટ એડમિન દ્વારા સસ્પેન્ડ કરવામાં આવ્યું છે.' });
    }

    if (user.subscriptionPlan !== 'free' && user.subscriptionExpiry) {
      if (new Date(user.subscriptionExpiry).getTime() <= Date.now()) {
        await db.update(users).set({ subscriptionPlan: 'free', subscriptionExpiry: null }).where(eq(users.id, user.id));
        user.subscriptionPlan = 'free';
        user.subscriptionExpiry = null;
      }
    }

    const token = jwt.sign({ uid: user.uid, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ...user, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    let { phone, password, otp } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'ફોન નંબર અને પાસવર્ડ જરૂરી છે.' });

    const phoneVal = validatePhoneNumber(phone);
    if (!phoneVal.isValid) {
      return res.status(400).json({ error: phoneVal.error });
    }
    phone = phoneVal.cleaned!;
    password = convertGujaratiToEnglish(password);

    const gatewayType = await getSetting('SMS_GATEWAY_TYPE', 'SMS_GATEWAY_TYPE') || 'disabled';
    if (gatewayType !== 'disabled') {
      if (!otp) {
        return res.status(400).json({ error: 'મોબાઈલ વેરિફિકેશન માટે ઓટીપી દાખલ કરવો જરૂરી છે.' });
      }
      const otpVal = convertGujaratiToEnglish(otp).trim();
      const stored = otpStore.get(phone);
      if (!stored || stored.otp !== otpVal || Date.now() > stored.expiresAt) {
        return res.status(400).json({ error: 'દાખલ કરેલ ઓટીપી ખોટો છે અથવા તેની સમય મર્યાદા સમાપ્ત થઈ ગઈ છે.' });
      }
      otpStore.delete(phone);
    }

    // check existing
    const existing = await db.query.users.findFirst({ where: eq(users.phone, phone) });
    if (existing) {
      return res.status(400).json({ error: 'આ મોબાઈલ નંબર અગાઉથી રજીસ્ટર્ડ છે. કૃપા કરીને લોગિન કરો.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = 'local_' + phone;
    const userRole = phone === '9725722729' ? 'admin' : 'user';

    const newUser = await db.insert(users).values({
      uid,
      phone,
      password: hashedPassword,
      name: 'User ' + phone,
      role: userRole
    }).returning();

    const token = jwt.sign({ uid, phone, role: userRole }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ ...newUser[0], token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/firebase/verify', async (req, res) => {
  try {
    const { phone, uid, name, email, isDemo } = req.body;
    let verifiedPhone = convertGujaratiToEnglish(phone || '');
    if (verifiedPhone.startsWith('+91')) {
      verifiedPhone = verifiedPhone.replace('+91', '');
    }
    verifiedPhone = verifiedPhone.replace(/\D/g, '').slice(-10);

    if (!verifiedPhone || verifiedPhone.length !== 10) {
      return res.status(400).json({ error: 'સાચો ૧૦ આંકડાનો મોબાઈલ નંબર દાખલ કરો.' });
    }

    // Register or login the user with verifiedPhone
    let user = await db.query.users.findFirst({ where: eq(users.phone, verifiedPhone) });
    const userRole = verifiedPhone === '9725722729' ? 'admin' : 'user';
    
    if (!user) {
      // Register new user on the fly
      const finalUid = uid || ('firebase_' + verifiedPhone);
      const newUser = await db.insert(users).values({
        uid: finalUid,
        phone: verifiedPhone,
        name: name || 'User ' + verifiedPhone,
        email: email || null,
        role: userRole,
        subscriptionPlan: 'free',
        isBlocked: false,
        allowedExams: 3
      }).returning();
      user = newUser[0];
    } else {
      if (user.isBlocked) {
        return res.status(423).json({ error: 'તમારૂ એકાઉન્ટ એડમિન દ્વારા સસ્પેન્ડ કરવામાં આવ્યું છે.' });
      }
      if (user.phone === '9725722729' && user.role !== 'admin') {
        await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id));
        user.role = 'admin';
      }
    }

    const token = jwt.sign({ uid: user.uid, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ ...user, token, isSandbox: !!isDemo });
  } catch (error: any) {
    console.error('[Firebase Auth Error]', error);
    return res.status(500).json({ error: error.message || 'Firebase વેરિફિકેશન દરમિયાન ભૂલ આવી.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    let { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'ફોન નંબર અને પાસવર્ડ જરૂરી છે.' });

    phone = convertGujaratiToEnglish(phone).replace(/\D/g, '').slice(-10);
    password = convertGujaratiToEnglish(password).trim();
    
    console.log(`[DEBUG] Login attempt. Phone: ${phone}, Type: ${typeof phone}`);

    let user = await db.query.users.findFirst({ where: eq(users.phone, phone) });
    console.log(`[DEBUG] User found: ${!!user}`);
    if (!user) {
      return res.status(404).json({ error: 'આ મોબાઈલ નંબર રજીસ્ટર નથી. કૃપા કરીને પહેલા નવું રજીસ્ટ્રેશન કરો.' });
    }
    
    if (user.phone === '9725722729' && user.role !== 'admin') {
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id));
      user.role = 'admin';
    }
    if (user.isBlocked) {
      return res.status(423).json({ error: 'તમારૂ એકાઉન્ટ એડમિન દ્વારા સસ્પેન્ડ કરવામાં આવ્યું છે. વધુ માહિતી માટે એડમિનનો સંપર્ક કરો.' });
    }

    if (user.subscriptionPlan !== 'free' && user.subscriptionExpiry) {
      if (new Date(user.subscriptionExpiry).getTime() <= Date.now()) {
        await db.update(users).set({ subscriptionPlan: 'free', subscriptionExpiry: null }).where(eq(users.id, user.id));
        user.subscriptionPlan = 'free';
        user.subscriptionExpiry = null;
      }
    }

    let isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({ error: 'પાસવર્ડ ખોટો છે.' });
    }

    const token = jwt.sign({ uid: user.uid, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ...user, token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/auth/forgot-password/verify', async (req, res) => {
  try {
    let { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'મોબાઈલ નંબર અને ઓટીપી જરૂરી છે.' });
    }

    phone = convertGujaratiToEnglish(phone).replace(/\D/g, '').slice(-10);
    const otpVal = convertGujaratiToEnglish(otp).trim();

    const existing = await db.select().from(users).where(eq(users.phone, phone));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'આ મોબાઈલ નંબર રજીસ્ટર નથી.' });
    }
    const user = existing[0];

    const stored = otpStore.get(phone);
    if (!stored || stored.otp !== otpVal || Date.now() > stored.expiresAt) {
      return res.status(400).json({ error: 'દાખલ કરેલ ઓટીપી ખોટો છે અથવા તેની સમય મર્યાદા સમાપ્ત થઈ ગઈ છે.' });
    }
    otpStore.delete(phone); // Clean up OTP after verification

    res.json({ success: true, uid: user.uid });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/forgot-password/reset', async (req, res) => {
  try {
    let { uid, newPassword } = req.body;
    newPassword = convertGujaratiToEnglish(newPassword);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.uid, uid));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    let { currentPassword, newPassword } = req.body;
    currentPassword = convertGujaratiToEnglish(currentPassword);
    newPassword = convertGujaratiToEnglish(newPassword);
    const uid = req.user!.uid;
    const usersArr = await db.select().from(users).where(eq(users.uid, uid));
    if (usersArr.length === 0) return res.status(404).json({ error: 'યુઝર મળ્યો નથી' });
    const user = usersArr[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password || '');
    if (!isMatch) return res.status(400).json({ error: 'હાલનો પાસવર્ડ ખોટો છે.' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.uid, uid));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});



app.get('/api/diagnostics/db', async (req, res) => {
  try {
    const cloudsqlExists = fs.existsSync('/cloudsql');
    let cloudsqlDirs: string[] = [];
    if (cloudsqlExists) {
      try {
        cloudsqlDirs = fs.readdirSync('/cloudsql');
      } catch (e: any) {
        cloudsqlDirs = [`Error: ${e.message}`];
      }
    }

    const appCloudsqlExists = fs.existsSync('/app/cloudsql');
    let appCloudsqlDirs: string[] = [];
    if (appCloudsqlExists) {
      try {
        appCloudsqlDirs = fs.readdirSync('/app/cloudsql');
      } catch (e: any) {
        appCloudsqlDirs = [`Error: ${e.message}`];
      }
    }

    const config = getDbConfig();
    const maskedConfig = {
      ...config,
      password: config.password ? `${config.password.substring(0, 2)}...${config.password.substring(config.password.length - 2)}` : 'undefined'
    };

    let queryResult: any = null;
    let queryError: any = null;
    try {
      const start = Date.now();
      const dbRes = await db.execute(sql`SELECT 1 as val`);
      queryResult = {
        data: dbRes.rows,
        durationMs: Date.now() - start
      };
    } catch (e: any) {
      queryError = {
        message: e.message,
        stack: e.stack,
        cause: e.cause ? { message: e.cause.message, code: e.cause.code } : null,
        originalError: e.originalError ? { message: e.originalError.message, code: e.originalError.code } : null
      };
    }

    res.json({
      success: queryError === null,
      env: {
        SQL_HOST: process.env.SQL_HOST || 'not_set',
        SQL_USER: process.env.SQL_USER || 'not_set',
        SQL_DB_NAME: process.env.SQL_DB_NAME || 'not_set',
        NODE_ENV: process.env.NODE_ENV || 'not_set',
      },
      directories: {
        '/cloudsql': { exists: cloudsqlExists, contents: cloudsqlDirs },
        '/app/cloudsql': { exists: appCloudsqlExists, contents: appCloudsqlDirs },
      },
      resolvedConfig: maskedConfig,
      queryResult,
      queryError
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Dynamic XML Sitemap Generator (with external Image Thumbnail indexing support)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const sitemapBaseUrl = await getSetting('SITEMAP_BASE_URL');
    const sitemapPostsLimitStr = await getSetting('SITEMAP_POSTS_LIMIT') || '50000';
    const sitemapChangeFreq = await getSetting('SITEMAP_CHANGE_FREQ') || 'daily';
    const sitemapPriorityStr = await getSetting('SITEMAP_PRIORITY') || '0.8';
    const sitemapIncludeImagesStr = await getSetting('SITEMAP_INCLUDE_IMAGES') || 'true';

    // Fallback base URL is the current request's domain
    const baseUrl = sitemapBaseUrl && sitemapBaseUrl.trim() !== '' 
      ? sitemapBaseUrl.trim().replace(/\/$/, '') 
      : `${req.protocol}://${req.get('host')}`;
    const postsLimit = parseInt(sitemapPostsLimitStr, 10) || 50000;
    const includeImages = sitemapIncludeImagesStr === 'true';

    // Query posts ordered by date descending
    const allPosts = await queryWithRetry(() => 
      db.select().from(posts).orderBy(desc(posts.id))
    );
    
    const limitedPosts = allPosts.slice(0, postsLimit);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // 1. Home Page
    xml += `
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // 2. Category Landing Pages
    const categoriesList = ['job', 'answer_key', 'result', 'selection_list', 'news'];
    for (const cat of categoriesList) {
      xml += `
  <url>
    <loc>${baseUrl}/${cat}/</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
    }

    // Escape helper
    const escapeXml = (str: string): string => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // 3. Blog Posts
    for (const p of limitedPosts) {
      const targetSlug = p.slug && p.slug.trim() !== '' ? p.slug.trim() : String(p.id);
      const postCategory = p.category || 'job';
      const postUrl = `${baseUrl}/${postCategory}/${targetSlug}/`;
      
      let lastModDate = '';
      try {
        if (p.date) {
          const dateObj = new Date(p.date);
          if (!isNaN(dateObj.getTime())) {
            lastModDate = dateObj.toISOString().split('T')[0];
          }
        }
      } catch (e) {
        // Fallback
      }
      if (!lastModDate) {
        lastModDate = new Date().toISOString().split('T')[0];
      }

      xml += `
  <url>
    <loc>${escapeXml(postUrl)}</loc>
    <lastmod>${lastModDate}</lastmod>
    <changefreq>${sitemapChangeFreq}</changefreq>
    <priority>${sitemapPriorityStr}</priority>`;

      if (includeImages && p.thumbnail && p.thumbnail.trim() !== '') {
        let imageUrl = p.thumbnail.trim();
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        xml += `
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(p.title)}</image:title>
    </image:image>`;
      }

      xml += `
  </url>`;
    }

    xml += `\n</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err: any) {
    res.status(500).send(`Error generating sitemap: ${err.message}`);
  }
});

// Redirect /sitemap to /sitemap.xml
app.get('/sitemap', (req, res) => {
  res.redirect(301, '/sitemap.xml');
});

// Dynamic robots.txt Generator
app.get('/robots.txt', async (req, res) => {
  try {
    const sitemapBaseUrl = await getSetting('SITEMAP_BASE_URL');
    const baseUrl = sitemapBaseUrl && sitemapBaseUrl.trim() !== '' 
      ? sitemapBaseUrl.trim().replace(/\/$/, '') 
      : `${req.protocol}://${req.get('host')}`;

    const robotsTxt = `User-agent: *
Allow: /

# Sitemap URL
Sitemap: ${baseUrl}/sitemap.xml
`;
    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);
  } catch (err: any) {
    res.status(500).send(`Error generating robots.txt: ${err.message}`);
  }
});

// Blog/CMS Posts
app.get('/api/posts', async (req, res) => {
  const cachedData = cache.get('posts');
  if (cachedData) return res.json(cachedData);

  try {
    const allPosts = await queryWithRetry(() => db.select().from(posts).orderBy(desc(posts.id)));
    const processedPosts = allPosts.map(p => ({ ...p, createdAt: p.date, updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null }));
    cache.set('posts', processedPosts);
    res.json(processedPosts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/posts/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    let post = null;
    if (!isNaN(Number(slug))) {
       const postsArr = await queryWithRetry(() => db.select().from(posts).where(eq(posts.id, Number(slug))));
       post = postsArr[0];
    } else {
       const postsArr = await queryWithRetry(() => db.select().from(posts).where(eq(posts.slug, slug)));
       post = postsArr[0];
    }
    
    if (!post) {
      return res.status(404).json({ error: 'પોસ્ટ મળી નથી.' });
    }
    
    // Increment views
    await queryWithRetry(() => db.update(posts).set({ views: (post.views || 0) + 1 }).where(eq(posts.id, post.id)));
    post.views = (post.views || 0) + 1;
    
    res.json({ ...post, createdAt: post.date, updatedAt: post.updatedAt ? post.updatedAt.toISOString() : null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { category, title, content, thumbnail, metaTitle, metaDesc, slug, focusKeyword, tags } = req.body;
    if (!category || !title || !content) {
      return res.status(400).json({ error: 'કેટેગરી, શીર્ષક અને સામગ્રી આવશ્યક છે.' });
    }
    const newPostArr = await queryWithRetry(() => db.insert(posts).values({
      category, title, content, thumbnail, metaTitle, metaDesc, slug, focusKeyword, tags, date: new Date().toISOString()
    }).returning());
    cache.del('posts');
    
    const post = newPostArr[0];
    const safeToISO = (val: any) => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString();
      try {
        return new Date(val).toISOString();
      } catch (_) {
        return null;
      }
    };
    
    res.status(201).json({ ...post, createdAt: post.date, updatedAt: safeToISO(post.updatedAt) });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin Update Post
app.put('/api/posts/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { category, title, content, thumbnail, metaTitle, metaDesc, slug, focusKeyword, tags } = req.body;

    // Check if slug is unique (and not belonging to the current post being updated)
    if (slug) {
      const existing = await queryWithRetry(() => 
        db.select().from(posts).where(and(eq(posts.slug, slug), ne(posts.id, Number(id))))
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'આ સ્લગ (slug) અન્ય પોસ્ટમાં વપરાયેલ છે.' });
      }
    }
    
    const updatedPostArr = await queryWithRetry(() => db.update(posts)
      .set({
        category,
        title,
        content,
        thumbnail,
        metaTitle,
        metaDesc,
        slug,
        focusKeyword,
        tags,
        updatedAt: sql`now()`
      })
      .where(eq(posts.id, Number(id)))
      .returning());
      
    if (updatedPostArr.length === 0) {
      return res.status(404).json({ error: 'પોસ્ટ મળી નથી.' });
    }
    
    cache.del('posts');
    
    const post = updatedPostArr[0];
    const safeToISO = (val: any) => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString();
      try {
        return new Date(val).toISOString();
      } catch (_) {
        return null;
      }
    };

    res.json({ ...post, createdAt: post.date, updatedAt: safeToISO(post.updatedAt) });
  } catch (error: any) {
    console.error(`[PUT /api/posts/${req.params.id}] Update failed:`, error);
    res.status(400).json({ error: error.message });
  }
});

// Admin Delete Post
app.delete('/api/posts/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const deletedArr = await queryWithRetry(() =>
      db.delete(posts)
        .where(eq(posts.id, Number(id)))
        .returning()
    );
      
    if (deletedArr.length === 0) {
      return res.status(404).json({ error: 'પોસ્ટ મળી નથી.' });
    }
    
    cache.del('posts');
    res.json({ message: 'પોસ્ટ સફળતાપૂર્વક ડિલીટ થઈ!' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Exams Endpoints
app.get('/api/exams', async (req, res) => {
  const cachedData = cache.get('exams');
  if (cachedData) return res.json(cachedData);

  try {
    const allExams = await queryWithRetry(() =>
      db.select().from(exams).orderBy(desc(exams.id))
    );
    console.log('Exams found:', allExams.length);
    const processedExams = allExams.map(exam => {
      let parsedQuestions = exam.questions;
      if (typeof exam.questions === 'string') {
        try {
          parsedQuestions = JSON.parse(exam.questions);
        } catch (e) {
          console.error('Failed to parse questions for exam:', exam.id, e);
          parsedQuestions = [];
        }
      }
      return {
        ...exam,
        questions: parsedQuestions
      };
    });
    cache.set('exams', processedExams);
    res.json(processedExams);
  } catch (error: any) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/exams/:id', async (req, res) => {
  try {
    const examArr = await queryWithRetry(() =>
      db.select().from(exams).where(eq(exams.id, Number(req.params.id)))
    );
    if (!examArr.length) {
      return res.status(404).json({ error: 'પરીક્ષા મળી નથી.' });
    }
    const exam = examArr[0];
    let parsedQuestions = exam.questions;
    if (typeof exam.questions === 'string') {
      try {
        parsedQuestions = JSON.parse(exam.questions);
      } catch (e) {
        console.error('Failed to parse questions for exam:', exam.id, e);
        parsedQuestions = [];
      }
    }
    res.json({
      ...exam,
      questions: parsedQuestions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// --- Admin User Management ---
app.post('/api/admin/db-utility/run-sql', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { sqlStatement } = req.body;
    if (!sqlStatement) return res.status(400).json({ error: 'SQL કમાન્ડ જરૂરી છે.' });
    
    // WARNING: This is extremely dangerous. Only for admin in admin panel.
    const result = await db.execute(sql.raw(sqlStatement));
    res.json({ success: true, rows: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/db-utility/status', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Just a simple check
    await db.execute(sql`SELECT 1`);
    res.json({ connected: true });
  } catch (err: any) {
    res.json({ connected: false, error: err.message });
  }
});

app.get('/api/admin/db-utility/info', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const dbNameRes = await db.execute(sql`SELECT current_database()`);
    const tablesRes = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    const columnsRes = await db.execute(sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`);
    
    const dbName = dbNameRes.rows[0].current_database;
    const tables = tablesRes.rows.map((t: any) => ({
      name: t.table_name,
      columns: columnsRes.rows.filter((c: any) => c.table_name === t.table_name).map((c: any) => c.column_name)
    }));
    
    res.json({ dbName, tables });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const u = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
    if (u[0].role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    const allUsers = await db.select().from(users).orderBy(desc(users.id));
    const userIds = allUsers.map(user => user.id);
    
    // Fetch test counts efficiently
    let testCounts: Record<number, number> = {};
    const results = await db.select({
      userId: examResults.userId,
      count: sql<number>`count(*)`
    })
    .from(examResults)
    .groupBy(examResults.userId);
    
    results.forEach(r => {
      testCounts[r.userId] = Number(r.count);
    });

    const enrichedUsers = allUsers.map(user => {
      let plan = user.subscriptionPlan;
      if (plan !== 'free' && user.subscriptionExpiry) {
        if (new Date(user.subscriptionExpiry).getTime() < Date.now()) {
          plan = 'free';
        }
      }
      return {
        ...user,
        password: '', // hide password
        totalTestsTaken: testCounts[user.id] || 0,
        activePlan: plan
      };
    });

    res.json(enrichedUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const u = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
    if (u[0].role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    const userId = Number(req.params.id);
    const body = req.body || {};

    const targetUserArr = await db.select().from(users).where(eq(users.id, userId));
    if (targetUserArr.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUser = targetUserArr[0];
    
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.category !== undefined) updates.category = body.category;
    if (body.dob !== undefined) updates.dob = body.dob;
    if (body.address !== undefined) updates.address = body.address;
    
    if (body.role !== undefined) {
      const targetPhone = body.phone || targetUser.phone;
      if (body.role === 'admin' && targetPhone !== '9725722729') {
        updates.role = 'user';
      } else {
        updates.role = body.role;
      }
    }
    if (body.isBlocked !== undefined) updates.isBlocked = body.isBlocked;
    if (body.subscriptionPlan !== undefined) {
      updates.subscriptionPlan = body.subscriptionPlan;
      if (body.subscriptionPlan === 'monthly' || body.subscriptionPlan === 'yearly') {
        updates.allowedExams = 30000;
      }
    }
    if (body.subscriptionExpiry !== undefined) {
      updates.subscriptionExpiry = body.subscriptionExpiry ? new Date(body.subscriptionExpiry) : null;
    }
    if (body.allowedExams !== undefined && updates.allowedExams !== 30000) {
      updates.allowedExams = body.allowedExams !== null ? Number(body.allowedExams) : 3;
    }

    await db.update(users).set(updates).where(eq(users.id, userId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const u = await queryWithRetry(() =>
      db.select().from(users).where(eq(users.uid, String(req.user?.uid)))
    );
    if (u.length === 0 || u[0].role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    const userId = Number(req.params.id);
    
    // Delete bookmarks for this user first to prevent foreign key violations
    await queryWithRetry(() =>
      db.delete(bookmarks).where(eq(bookmarks.userId, userId))
    );
    // Delete exam results for this user
    await queryWithRetry(() =>
      db.delete(examResults).where(eq(examResults.userId, userId))
    );
    // Delete the user
    await queryWithRetry(() =>
      db.delete(users).where(eq(users.id, userId))
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Admin Add Exam
app.post('/api/admin/exams', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, duration, totalQuestions, type, questions, answerKeyUploaded, subject, difficulty, totalVacancies, examDate } = req.body;
    if (!name || !duration || !totalQuestions || !type || !questions) {
      return res.status(400).json({ error: 'તમામ વિગતો અને પ્રશ્નો આવશ્યક છે.' });
    }
    const newExamArr = await db.insert(exams).values({
      name,
      duration: Number(duration),
      totalQuestions: Number(totalQuestions),
      type,
      questions,
      answerKeyUploaded: answerKeyUploaded || false,
      subject: subject || null,
      difficulty: difficulty || null,
      totalVacancies: totalVacancies || null,
      examDate: examDate || null
    }).returning();

    cache.del('exams');
    res.status(201).json({ message: 'પરીક્ષા સફળતાપૂર્વક ઉમેરવામાં આવી!', exam: newExamArr[0] });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin Update Exam
app.put('/api/admin/exams/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, duration, totalQuestions, type, questions, answerKeyUploaded, subject, difficulty, totalVacancies, examDate } = req.body;
    
    const updatedExamArr = await db.update(exams)
      .set({
        name,
        duration: duration !== undefined ? Number(duration) : undefined,
        totalQuestions: totalQuestions !== undefined ? Number(totalQuestions) : undefined,
        type,
        questions,
        answerKeyUploaded,
        subject: subject !== undefined ? subject : undefined,
        difficulty: difficulty !== undefined ? difficulty : undefined,
        totalVacancies: totalVacancies !== undefined ? totalVacancies : undefined,
        examDate: examDate !== undefined ? examDate : undefined
      })
      .where(eq(exams.id, Number(id)))
      .returning();
      
    if (updatedExamArr.length === 0) {
      return res.status(404).json({ error: 'પરીક્ષા મળી નથી.' });
    }

    res.json({ message: 'પરીક્ષા સફળતાપૂર્વક અપડેટ કરવામાં આવી!', exam: updatedExamArr[0] });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin Delete Exam
app.delete('/api/admin/exams/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Delete associated exam results first
    await queryWithRetry(() =>
      db.delete(examResults).where(eq(examResults.examId, Number(id)))
    );
    // Delete associated bookmarks
    await queryWithRetry(() =>
      db.delete(bookmarks).where(eq(bookmarks.examId, Number(id)))
    );
    
    const deletedArr = await queryWithRetry(() =>
      db.delete(exams)
        .where(eq(exams.id, Number(id)))
        .returning()
    );
      
    if (deletedArr.length === 0) {
      return res.status(404).json({ error: 'પરીક્ષા મળી નથી.' });
    }

    res.json({ message: 'પરીક્ષા સફળતાપૂર્વક ડિલીટ કરવામાં આવી!' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin Toggle Answer Key Status
app.put('/api/admin/exams/:id/toggle-key', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { answerKeyUploaded } = req.body;
    
    const updatedArr = await db.update(exams)
      .set({ answerKeyUploaded })
      .where(eq(exams.id, Number(id)))
      .returning();
      
    if (updatedArr.length === 0) {
      return res.status(404).json({ error: 'પરીક્ષા મળી નથી.' });
    }

    res.json({ message: 'આન્સર કી સ્ટેટસ સફળતાપૂર્વક અપડેટ થયું!', exam: updatedArr[0] });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Helper to calculate score with negative marking
function calculatePreciseScore(questions: any, answers: any) {
  let qList = [];
  let ansObj = {};
  try {
    qList = typeof questions === 'string' ? JSON.parse(questions) : questions;
  } catch (e) {
    qList = questions || [];
  }
  try {
    ansObj = typeof answers === 'string' ? JSON.parse(answers) : answers;
  } catch (e) {
    ansObj = answers || {};
  }
  
  if (!Array.isArray(qList)) return 0;
  
  let score = 0;
  qList.forEach((q: any) => {
    const ans = ansObj[q.id];
    if (ans === undefined) {
      score -= 0.25;
    } else if (ans === 'E') {
      // no marks deducted or added
    } else if (ans === q.correctAnswer) {
      score += 1;
    } else {
      score -= 0.25;
    }
  });
  return score;
}

// Helper functions for PDF generation
function generateSingleExamHTML(user: any, h: any): string {
  const obtained = h.marksObtained !== null ? h.marksObtained : 0;
  const pct = h.totalMarks ? ((obtained / h.totalMarks) * 100) : 0;
  const isPassed = pct >= 40;
  
  const correctCount = h.correctCount !== undefined ? h.correctCount : 0;
  const incorrectCount = h.incorrectCount !== undefined ? h.incorrectCount : 0;
  const leftCount = h.leftCount !== undefined ? h.leftCount : 0;
  const eCount = h.eCount !== undefined ? h.eCount : 0;
  
  const questions = h.questions || [];
  const answers = h.answers || {};

  const correctQuestions: any[] = [];
  const incorrectQuestions: any[] = [];
  const leftQuestions: any[] = [];
  const eQuestions: any[] = [];

  questions.forEach((q: any) => {
    const ans = answers[q.id];
    if (ans === undefined) {
      leftQuestions.push(q);
    } else if (ans === 'E') {
      eQuestions.push(q);
    } else if (ans === q.correctAnswer) {
      correctQuestions.push(q);
    } else {
      incorrectQuestions.push(q);
    }
  });

  const formattedDate = h.submittedAt ? new Date(h.submittedAt).toLocaleDateString('gu-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }) : 'N/A';

  const correctText = correctQuestions.map((q, idx) => `
    <div class="mb-4 p-4 border border-green-100 rounded-lg bg-green-50/30">
      <p class="font-semibold text-slate-800 mb-2">પ્રશ્ન ${idx + 1}. ${q.questionText}</p>
      <div class="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
        <div>A. ${q.options?.A || ''}</div>
        <div>B. ${q.options?.B || ''}</div>
        <div>C. ${q.options?.C || ''}</div>
        <div>D. ${q.options?.D || ''}</div>
      </div>
      <p class="text-sm text-green-700 font-medium">સાચો જવાબ: (${q.correctAnswer}) ${q.options?.[q.correctAnswer as keyof typeof q.options] || ''}</p>
      <p class="text-sm text-green-700 font-medium">તમારો જવાબ: (${answers[q.id]}) ${q.options?.[answers[q.id] as keyof typeof q.options] || ''}</p>
    </div>
  `).join('');

  const incorrectText = incorrectQuestions.map((q, idx) => `
    <div class="mb-4 p-4 border border-red-100 rounded-lg bg-red-50/30">
      <p class="font-semibold text-slate-800 mb-2">પ્રશ્ન ${idx + 1}. ${q.questionText}</p>
      <div class="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
        <div>A. ${q.options?.A || ''}</div>
        <div>B. ${q.options?.B || ''}</div>
        <div>C. ${q.options?.C || ''}</div>
        <div>D. ${q.options?.D || ''}</div>
      </div>
      <p class="text-sm text-green-700 font-medium">સાચો જવાબ: (${q.correctAnswer}) ${q.options?.[q.correctAnswer as keyof typeof q.options] || ''}</p>
      <p class="text-sm text-red-700 font-medium">તમારો જવાબ: (${answers[q.id] || 'N/A'}) ${q.options?.[answers[q.id] as keyof typeof q.options] || ''}</p>
    </div>
  `).join('');

  const leftText = leftQuestions.map((q, idx) => `
    <div class="mb-4 p-4 border border-amber-100 rounded-lg bg-amber-50/30">
      <p class="font-semibold text-slate-800 mb-2">પ્રશ્ન ${idx + 1}. ${q.questionText}</p>
      <div class="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
        <div>A. ${q.options?.A || ''}</div>
        <div>B. ${q.options?.B || ''}</div>
        <div>C. ${q.options?.C || ''}</div>
        <div>D. ${q.options?.D || ''}</div>
      </div>
      <p class="text-sm text-green-700 font-medium">સાચો જવાબ: (${q.correctAnswer}) ${q.options?.[q.correctAnswer as keyof typeof q.options] || ''}</p>
      <p class="text-sm text-amber-700 font-medium">તમારો જવાબ: કોરો છોડેલ (કોઈ વિકલ્પ પસંદ કરેલ નથી)</p>
    </div>
  `).join('');

  const eText = eQuestions.map((q, idx) => `
    <div class="mb-4 p-4 border border-indigo-100 rounded-lg bg-indigo-50/30">
      <p class="font-semibold text-slate-800 mb-2">પ્રશ્ન ${idx + 1}. ${q.questionText}</p>
      <div class="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
        <div>A. ${q.options?.A || ''}</div>
        <div>B. ${q.options?.B || ''}</div>
        <div>C. ${q.options?.C || ''}</div>
        <div>D. ${q.options?.D || ''}</div>
      </div>
      <p class="text-sm text-green-700 font-medium">સાચો જવાબ: (${q.correctAnswer}) ${q.options?.[q.correctAnswer as keyof typeof q.options] || ''}</p>
      <p class="text-sm text-indigo-700 font-medium">તમારો જવાબ: E વિકલ્પ (જવાબ ન આપેલ)</p>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="UTF-8">
      <title>Gujarat Exam Portal Result</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Noto Sans Gujarati', 'Inter', sans-serif;
          -webkit-print-color-adjust: exact;
        }
        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body class="bg-white p-6 max-w-4xl mx-auto text-slate-800">
      
      <!-- HEADER CARD -->
      <div class="bg-[#4F46E5] text-white p-6 rounded-2xl mb-6 shadow-md flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">GUJARAT EXAM PORTAL</h1>
          <p class="text-lg text-indigo-100 font-medium mt-1">વિગતવાર પરીક્ષા ગુણપત્રક (Detailed Result Summary)</p>
        </div>
        <div class="text-right">
          <span class="bg-white/15 text-white px-3 py-1 rounded-full text-xs font-semibold">MOCK TEST RESULT</span>
        </div>
      </div>

      <!-- CANDIDATE INFORMATION -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 class="text-sm font-bold tracking-wider text-slate-500 uppercase mb-4">CANDIDATE INFORMATION / ઉમેદવારની માહિતી</h2>
        <div class="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <span class="text-slate-500">Name / નામ:</span>
            <span class="font-semibold text-slate-800 ml-1">${user.name || 'N/A'}</span>
          </div>
          <div>
            <span class="text-slate-500">Category / કેટેગરી:</span>
            <span class="font-semibold text-slate-800 ml-1">${user.category || 'General'}</span>
          </div>
          <div>
            <span class="text-slate-500">Mobile / મોબાઈલ:</span>
            <span class="font-semibold text-slate-800 ml-1">${user.phone || 'N/A'}</span>
          </div>
          <div>
            <span class="text-slate-500">Date of Birth / જન્મ તારીખ:</span>
            <span class="font-semibold text-slate-800 ml-1">${user.dob || 'N/A'}</span>
          </div>
          <div>
            <span class="text-slate-500">Email / ઇમેઇલ:</span>
            <span class="font-semibold text-slate-800 ml-1">${user.email || 'N/A'}</span>
          </div>
          <div>
            <span class="text-slate-500">Exam Date / પરીક્ષા તારીખ:</span>
            <span class="font-semibold text-slate-800 ml-1">${formattedDate}</span>
          </div>
          <div class="col-span-2 mt-1 pt-2 border-t border-slate-200">
            <span class="text-slate-500">Exam Name / પરીક્ષાનું નામ:</span>
            <span class="font-bold text-slate-800 ml-1">${h.examName}</span>
          </div>
        </div>
      </div>

      <!-- PERFORMANCE SCORECARD -->
      <h2 class="text-base font-bold text-slate-700 mb-3 uppercase">MOCK TEST PERFORMANCE SCORECARD / પરફોર્મન્સ સ્કોરકાર્ડ</h2>
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col justify-between">
          <span class="text-xs font-bold text-green-700 uppercase">MARKS OBTAINED / મેળવેલ ગુણ</span>
          <span class="text-2xl font-bold text-green-800 mt-2">${obtained} / ${h.totalMarks}</span>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase">TIME CONSUMED / સમય લીધેલ</span>
          <span class="text-2xl font-bold text-slate-800 mt-2">${h.timeTaken}</span>
        </div>
      </div>

      <!-- QUESTION-WISE PERFORMANCE BREAKDOWN -->
      <h2 class="text-base font-bold text-slate-700 mb-3 uppercase">QUESTION-WISE PERFORMANCE BREAKDOWN / પ્રશ્નવાર સવિસ્તાર</h2>
      <div class="grid grid-cols-4 gap-3 mb-6">
        <div class="bg-green-50 border border-green-100 rounded-xl p-3 flex flex-col justify-between">
          <span class="text-[11px] font-bold text-green-700">CORRECT / સાચા</span>
          <div class="flex justify-between items-end mt-2">
            <span class="text-xs text-green-600">+${correctCount * 1} Marks</span>
            <span class="text-lg font-bold text-green-800">${correctCount}</span>
          </div>
        </div>
        <div class="bg-red-50 border border-red-100 rounded-xl p-3 flex flex-col justify-between">
          <span class="text-[11px] font-bold text-red-700">INCORRECT / ખોટા</span>
          <div class="flex justify-between items-end mt-2">
            <span class="text-xs text-red-600">-${(incorrectCount * 0.25).toFixed(2)} Marks</span>
            <span class="text-lg font-bold text-red-800">${incorrectCount}</span>
          </div>
        </div>
        <div class="bg-amber-50 border border-amber-100 rounded-xl p-3 flex flex-col justify-between">
          <span class="text-[11px] font-bold text-amber-700">UNANSWERED / કોરા</span>
          <div class="flex justify-between items-end mt-2">
            <span class="text-xs text-amber-600">-${(leftCount * 0.25).toFixed(2)} Marks</span>
            <span class="text-lg font-bold text-amber-800">${leftCount}</span>
          </div>
        </div>
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex flex-col justify-between">
          <span class="text-[11px] font-bold text-indigo-700">OPTION E / E વિકલ્પ</span>
          <div class="flex justify-between items-end mt-2">
            <span class="text-xs text-indigo-600">0.00 Marks</span>
            <span class="text-lg font-bold text-indigo-800">${eCount}</span>
          </div>
        </div>
      </div>

      <!-- STATUS & REMARKS BOX -->
      <div class="${isPassed ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-red-50 border border-red-200 text-red-900'} rounded-2xl p-4 mb-6">
        <h3 class="text-sm font-bold uppercase mb-1">
          ${isPassed ? 'STATUS: PASS / પાસ - ઉત્તીર્ણ' : 'STATUS: FAIL / નાપાસ અને વધારે મહેનત કરવાની જરૂર છે'}
        </h3>
        <p class="text-xs opacity-90 mb-1">
          ${isPassed ? 'Remarks: Congratulations! You have passed this mock test with a qualifying score. Keep up the great effort!' : 'Remarks: You did not achieve the minimum qualifying score. You need to study more and work harder.'}
        </p>
        <p class="text-xs font-semibold">
          ${isPassed ? 'પરીક્ષામાં ઉત્કૃષ્ટ પરિણામ મેળવવા તૈયારી ચાલુ રાખો.' : 'વધારે મહેનત કરવાની જરૂર છે - નબળા વિષયોનું રિવિઝન કરો'}
        </p>
      </div>

      <!-- PERFORMANCE SYNOPSIS -->
      <div class="mb-6">
        <h2 class="text-sm font-bold text-slate-700 mb-2 uppercase">PERFORMANCE SYNOPSIS / પરફોર્મન્સ સમરી</h2>
        <ul class="text-xs space-y-1.5 text-slate-600">
          <li class="flex items-start gap-1">
            <span class="font-bold text-indigo-600">•</span>
            <span>Core Evaluation: Answers were cross-verified with the master key. (માસ્ટર આન્સર કી સાથે મૂલ્યાંકન કરેલ છે.)</span>
          </li>
          <li class="flex items-start gap-1">
            <span class="font-bold text-indigo-600">•</span>
            <span>Recommended Action: Revise topics where errors were made during evaluation. (નબળા વિષયોનું રિવિઝન કરો.)</span>
          </li>
          <li class="flex items-start gap-1">
            <span class="font-bold text-indigo-600">•</span>
            <span>Next Scheduled Mock Test: Check notifications center for upcoming test schedules. (આગામી ટેસ્ટ માટે નોટિફિકેશન જુઓ.)</span>
          </li>
        </ul>
      </div>

      <!-- PORTAL SEAL -->
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
        <h4 class="font-bold text-slate-700 uppercase mb-1">OFFICIAL ELECTRONIC SIGNATURE & SEAL / સત્તાવાર ઇલેક્ટ્રોનિક સહી અને સિક્કો</h4>
        <p class="text-slate-500">Digitally signed and authorized by GUJARAT EXAM PORTAL WEBSITE. No physical signature is required.</p>
      </div>

      <!-- MULTI-PAGE QUESTIONS SECTION -->
      ${correctQuestions.length > 0 ? `
        <div class="page-break mt-8">
          <div class="bg-green-600 text-white px-4 py-2 rounded-lg font-bold mb-4">
            સાચા પ્રશ્નો (Correct Answers) - કુલ પ્રશ્નો: ${correctQuestions.length}
          </div>
          ${correctText}
        </div>
      ` : ''}

      ${incorrectQuestions.length > 0 ? `
        <div class="page-break mt-8">
          <div class="bg-red-600 text-white px-4 py-2 rounded-lg font-bold mb-4">
            ખોટા જવાબ આપેલ પ્રશ્નો (Incorrect Answers) - કુલ પ્રશ્નો: ${incorrectQuestions.length}
          </div>
          ${incorrectText}
        </div>
      ` : ''}

      ${leftQuestions.length > 0 ? `
        <div class="page-break mt-8">
          <div class="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold mb-4">
            કોરા છોડેલા પ્રશ્નો (Left Unanswered) - કુલ પ્રશ્નો: ${leftQuestions.length}
          </div>
          ${leftText}
        </div>
      ` : ''}

      ${eQuestions.length > 0 ? `
        <div class="page-break mt-8">
          <div class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold mb-4">
            E વિકલ્પ પસંદ કરેલ પ્રશ્નો (Option E Chosen) - કુલ પ્રશ્નો: ${eQuestions.length}
          </div>
          ${eText}
        </div>
      ` : ''}

    </body>
    </html>
  `;
}

function generateAllHistoryHTML(user: any, history: any[]): string {
  const formattedToday = new Date().toLocaleDateString('gu-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const tableRows = (history || []).map((h, idx) => {
    const attemptDate = h.submittedAt ? new Date(h.submittedAt).toLocaleDateString('gu-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }) : 'N/A';
    const scoreText = h.marksObtained !== null ? `${h.marksObtained} / ${h.totalMarks}` : 'રિઝલ્ટ પેન્ડિંગ';
    const rowClass = idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white';

    return `
      <tr class="${rowClass} border-b border-slate-100">
        <td class="px-4 py-2.5 text-center font-medium">${idx + 1}</td>
        <td class="px-4 py-2.5 font-semibold text-slate-800">${h.examName}</td>
        <td class="px-4 py-2.5 text-center text-slate-600">${attemptDate}</td>
        <td class="px-4 py-2.5 text-center text-slate-600">${h.timeTaken}</td>
        <td class="px-4 py-2.5 text-center font-bold ${h.marksObtained !== null && (h.marksObtained / h.totalMarks) >= 0.4 ? 'text-green-600' : 'text-red-500'}">${scoreText}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="UTF-8">
      <title>Gujarat Exam Portal Summary Report</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Noto Sans Gujarati', 'Inter', sans-serif;
          -webkit-print-color-adjust: exact;
        }
      </style>
    </head>
    <body class="bg-white p-6 max-w-4xl mx-auto text-slate-800">

      <!-- HEADER CARD -->
      <div class="bg-blue-700 text-white p-6 rounded-2xl mb-6 shadow-md flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">GUJARAT EXAM PORTAL</h1>
          <p class="text-lg text-blue-100 font-medium mt-1">પરીક્ષા પરિણામ અહેવાલ (Exam Summary & Analytics)</p>
        </div>
        <div class="text-right">
          <span class="bg-white/15 text-white px-3 py-1 rounded-full text-xs font-semibold">OVERALL PERFORMANCE REPORT</span>
        </div>
      </div>

      <!-- CANDIDATE PROFILE -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 class="text-sm font-bold tracking-wider text-slate-500 uppercase mb-4">CANDIDATE PROFILE / ઉમેદવાર પ્રોફાઇલ</h2>
        <div class="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <span class="text-slate-500">Name / નામ:</span>
            <span class="font-semibold text-slate-800 ml-1">${user.name || 'N/A'}</span>
          </div>
          <div>
            <span class="text-slate-500">Category / કેટેગરી:</span>
            <span class="font-semibold text-slate-800 ml-1">${user.category || 'General'}</span>
          </div>
          <div>
            <span class="text-slate-500">Mobile / મોબાઈલ:</span>
            <span class="font-semibold text-slate-800 ml-1">${user.phone || 'N/A'}</span>
          </div>
          <div>
            <span class="text-slate-500">Date of Birth / જન્મ તારીખ:</span>
            <span class="font-semibold text-slate-800 ml-1">${user.dob || 'N/A'}</span>
          </div>
          <div>
            <span class="text-slate-500">Email / ઇમેઇલ:</span>
            <span class="font-semibold text-slate-800 ml-1">${user.email || 'N/A'}</span>
          </div>
          <div>
            <span class="text-slate-500">Report Date / રિપોર્ટ તારીખ:</span>
            <span class="font-semibold text-slate-800 ml-1">${formattedToday}</span>
          </div>
        </div>
      </div>

      <!-- TABLE: RECENT MOCK TEST ATTEMPTS -->
      <h2 class="text-base font-bold text-slate-700 mb-3 uppercase">RECENT MOCK TEST ATTEMPTS / તાજેતરના મોક ટેસ્ટ પરિણામો</h2>
      <div class="border border-slate-200 rounded-2xl overflow-hidden mb-6 shadow-sm">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-600 text-xs font-bold uppercase border-b border-slate-200">
              <th class="px-4 py-3 text-center w-12">SR. / ક્રમ</th>
              <th class="px-4 py-3">EXAM NAME / પરીક્ષાનું નામ</th>
              <th class="px-4 py-3 text-center">ATTEMPT DATE / તારીખ</th>
              <th class="px-4 py-3 text-center">TIME / સમય</th>
              <th class="px-4 py-3 text-center">MARKS / મેળવેલ ગુણ</th>
            </tr>
          </thead>
          <tbody class="text-sm text-slate-700">
            ${tableRows}
          </tbody>
        </table>
      </div>

      <!-- PORTAL DIAGNOSTICS -->
      <div class="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-4 mb-6">
        <h3 class="text-sm font-bold uppercase mb-1">PORTAL DIAGNOSTICS & VERIFICATION / પોર્ટલ ચકાસણી પત્ર</h3>
        <p class="text-xs opacity-90 mb-1">This is a computer-generated summary of exams taken on the Gujarat Exam Portal.</p>
        <p class="text-xs font-semibold">Verify your scores and analytics anytime in your dashboard profile page. (તમામ સ્કોર પ્રોફાઈલ પેજ પર ચકાસી શકો છો.)</p>
      </div>

      <!-- FOOTER -->
      <p class="text-[10px] text-slate-400 text-center">
        Generated automatically. Candidate ID: ${String(user.id || '').substring(0, 8)} | Page 1 of 1
      </p>

    </body>
    </html>
  `;
}

// PDF Generation endpoint using Puppeteer GET
app.get('/api/generate-pdf', async (req, res) => {
  let browser;
  try {
    const { type, id, token } = req.query;
    if (!token) {
      return res.status(401).send('Authentication required');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(String(token), JWT_SECRET);
    } catch (e) {
      return res.status(401).send('Invalid or expired token');
    }

    const existing = await queryWithRetry(() =>
      db.select().from(users).where(eq(users.uid, String(decoded.uid)))
    );
    if (existing.length === 0) {
      return res.status(401).send('User not found');
    }
    
    const dbUser = existing[0];
    if (dbUser.isBlocked) {
      return res.status(423).send('તમારું એકાઉન્ટ બ્લોક કરવામાં આવ્યું છે.');
    }

    let htmlContent = '';
    if (type === 'single') {
      if (!id) {
        return res.status(400).send('Exam result ID is required for single exam PDF');
      }
      const resultArr = await db.select().from(examResults).where(eq(examResults.id, Number(id)));
      if (resultArr.length === 0) {
        return res.status(404).send('Exam result not found');
      }
      const result = resultArr[0];

      // Auth check
      if (result.userId !== dbUser.id && dbUser.role !== 'admin') {
        return res.status(403).send('Unauthorized to access this exam result');
      }

      const examArr = await db.select().from(exams).where(eq(exams.id, result.examId));
      if (examArr.length === 0) {
        return res.status(404).send('Exam not found');
      }
      const exam = examArr[0];

      let timeTaken = 'N/A';
      let ansObj: any = {};
      try {
        ansObj = typeof result.answers === 'string' ? JSON.parse(result.answers) : result.answers || {};
        timeTaken = ansObj?.timeTaken || 'N/A';
      } catch (e) {}

      const qList = typeof exam.questions === 'string' ? JSON.parse(exam.questions) : exam.questions || [];
      const preciseScore = calculatePreciseScore(qList, ansObj);
      const isAnswerKeyAvailable = exam.type !== 'bharti' || exam.answerKeyUploaded === true;

      let correctCount = 0;
      let incorrectCount = 0;
      let leftCount = 0;
      let eCount = 0;

      if (Array.isArray(qList)) {
        qList.forEach((q: any) => {
          const ans = ansObj[q.id];
          if (ans === undefined) {
            leftCount++;
          } else if (ans === 'E') {
            eCount++;
          } else if (ans === q.correctAnswer) {
            correctCount++;
          } else {
            incorrectCount++;
          }
        });
      }

      const h = {
        id: result.id,
        examId: result.examId,
        marksObtained: isAnswerKeyAvailable ? preciseScore : null,
        submittedAt: result.date,
        examName: exam.name,
        totalMarks: exam.totalQuestions,
        timeTaken,
        correctCount,
        incorrectCount,
        leftCount,
        eCount,
        answerKeyUploaded: exam.answerKeyUploaded,
        questions: qList,
        answers: ansObj
      };

      htmlContent = generateSingleExamHTML(dbUser, h);

    } else if (type === 'all') {
      const results = await db.execute(sql`
        SELECT er.id, er.answers, er.date as "submittedAt", er.exam_id as "examId",
               e.name as "examName", e.total_questions as "totalMarks", e.questions,
               e.type as "examType", e.answer_key_uploaded as "answerKeyUploaded"
        FROM exam_results er
        JOIN exams e ON er.exam_id = e.id
        WHERE er.user_id = ${dbUser.id}
        ORDER BY er.id DESC
      `);
      
      const historyList = results.rows.map((r: any) => {
        let tTaken = 'N/A';
        try {
          const aObj = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
          tTaken = aObj?.timeTaken || 'N/A';
        } catch (e) {}
        
        const preciseScore = calculatePreciseScore(r.questions, r.answers);
        const isAnswerKeyAvailable = r.examType !== 'bharti' || r.answerKeyUploaded === true;

        return {
          id: r.id,
          examId: r.examId,
          marksObtained: isAnswerKeyAvailable ? preciseScore : null,
          submittedAt: r.submittedAt,
          examName: r.examName,
          totalMarks: r.totalMarks,
          timeTaken: tTaken,
          answerKeyUploaded: r.answerKeyUploaded
        };
      });

      htmlContent = generateAllHistoryHTML(dbUser, historyList);
    } else {
      return res.status(400).send('Invalid generation type specified');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const autoPrintScript = `
      <script>
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            window.print();
          }, 800);
        });
      </script>
    `;
    res.send(htmlContent + autoPrintScript);

  } catch (error: any) {
    console.error('Error serving PDF template (GET):', error);
    res.status(500).send(`PDF view failed: ${error.message}`);
  }
});

// Submit Exam
app.post('/api/exams/:id/submit', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { answers, timeTaken } = req.body;
    
    // Fetch the exam questions to calculate score
    const examArr = await db.select().from(exams).where(eq(exams.id, Number(req.params.id)));
    if (!examArr.length) {
      return res.status(404).json({ error: 'પરીક્ષા મળી નથી.' });
    }
    const exam = examArr[0];
    const totalQuestions = exam.totalQuestions || (exam.questions as any[]).length;
    
    // Calculate score
    const computedScore = calculatePreciseScore(exam.questions, answers);
    
    // Pack timeTaken into answers to persist it without changing schema
    const answersWithMeta = {
      ...(answers || {}),
      timeTaken: timeTaken || 'N/A'
    };
    
    // Get db user id
    const usersArr = await db.select().from(users).where(eq(users.uid, req.user!.uid));
    if (!usersArr.length) {
       return res.status(404).json({ error: 'યુઝર મળ્યો નથી.' });
    }
    const dbUser = usersArr[0];
    const userId = dbUser.id;
    
    // Check if user has already submitted this exam
    const checkResult = await db.select()
      .from(examResults)
      .where(and(eq(examResults.userId, userId), eq(examResults.examId, Number(req.params.id))));
    
    if (checkResult.length > 0) {
      return res.status(400).json({ error: 'આ પરીક્ષા તમે પહેલેથી જ આપી દીધેલ છે. એક પરીક્ષા બીજી વખત આપી શકાતી નથી.' });
    }
    
    // Since 'score' in schema is an integer, we store a rounded integer to satisfy the database constraint,
    // but we will return and reconstruct the float representation.
    const roundedScore = Math.round(computedScore);
    
    const newResult = await db.insert(examResults).values({
      userId,
      examId: Number(req.params.id),
      score: roundedScore,
      answers: answersWithMeta,
      date: new Date().toISOString()
    }).returning();

    // Construct response matching the frontend requirements
    res.status(201).json({ 
      message: 'પરીક્ષા સફળતાપૂર્વક સબમિટ થઈ!', 
      result: {
        id: newResult[0].id,
        userId: newResult[0].userId,
        examId: newResult[0].examId,
        marksObtained: computedScore,
        totalMarks: totalQuestions,
        timeTaken: timeTaken || 'N/A',
        submittedAt: newResult[0].date,
        answerKeyUploaded: exam.answerKeyUploaded
      }
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Results Merit
app.get('/api/merit', async (req, res) => {
  try {
    const summaries = await db.select().from(leaderboardSummary);
    let combined = summaries.find(s => s.type === 'combined')?.data || [];
    let mock = summaries.find(s => s.type === 'mock')?.data || [];
    let bharti = summaries.find(s => s.type === 'bharti')?.data || [];
    const updatedAt = summaries.find(s => s.type === 'combined')?.updatedAt || new Date();

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const isStale = summaries.length === 0 || !updatedAt || new Date(updatedAt) < twelveHoursAgo;

    if (isStale) {
      console.log('[Leaderboard API/merit] Cache is stale, empty or older than 12 hours. Recalculating...');
      await recalculateLeaderboard();
      const newSummaries = await db.select().from(leaderboardSummary);
      combined = newSummaries.find(s => s.type === 'combined')?.data || [];
      mock = newSummaries.find(s => s.type === 'mock')?.data || [];
      bharti = newSummaries.find(s => s.type === 'bharti')?.data || [];
      const newUpdatedAt = newSummaries.find(s => s.type === 'combined')?.updatedAt || new Date();

      res.json({
        combinedMerit: combined,
        mockMerit: mock,
        bhartiMerit: bharti,
        updatedAt: newUpdatedAt
      });
      return;
    }

    res.json({
      combinedMerit: combined,
      mockMerit: mock,
      bhartiMerit: bharti,
      updatedAt: updatedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});



// Profile update
app.put('/api/user/profile/:userId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { name, email, category, dob, address } = req.body;

    if (!name || !email || !category || !dob || !address) {
      return res.status(400).json({ error: 'બધી માહિતી (*) ભરવી ફરજિયાત છે.' });
    }
    
    const usersArr = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!usersArr.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Auth check: user must be editing their own profile, or be an admin
    if (req.user!.uid !== usersArr[0].uid) {
      const u = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
      if (u.length === 0 || u[0].role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: You cannot edit another user\'s profile.' });
      }
    }
    
    const updated = await db.update(users).set({
      name, email, category, dob, address
    }).where(eq(users.id, Number(userId))).returning();
    
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bookmarks
app.get('/api/user/:userId/bookmarks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const usersArr = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!usersArr.length) {
      return res.json([]);
    }
    
    // Auth check
    if (req.user!.uid !== usersArr[0].uid) {
      const u = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
      if (u.length === 0 || u[0].role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    
    const dbUserId = usersArr[0].id;
    const b = await db.select().from(bookmarks).where(eq(bookmarks.userId, dbUserId)).orderBy(desc(bookmarks.id));
    const mapped = b.map(bmk => ({
      id: bmk.id,
      userId: bmk.userId,
      examId: bmk.examId,
      examName: bmk.examName,
      questionId: bmk.questionId,
      bookmarkedAt: bmk.date,
      question: {
        id: bmk.questionId,
        type: 'regular', // It's fine to default if we don't have it saved
        questionText: bmk.questionText,
        options: bmk.options,
        correctAnswer: bmk.correctAnswer,
      }
    }));
    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/:userId/bookmarks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { examId, examName, question } = req.body;
    const usersArr = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!usersArr.length) return res.status(404).json({ error: 'User not found' });
    
    // Auth check
    if (req.user!.uid !== usersArr[0].uid) {
      const u = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
      if (u.length === 0 || u[0].role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    
    const dbUserId = usersArr[0].id;
    
    await db.insert(bookmarks).values({
      userId: dbUserId,
      questionId: question.id,
      examId,
      examName,
      questionText: question.questionText || question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      date: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user/:userId/bookmarks/:questionId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId, questionId } = req.params;
    const usersArr = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!usersArr.length) return res.status(404).json({ error: 'User not found' });
    
    // Auth check
    if (req.user!.uid !== usersArr[0].uid) {
      const u = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
      if (u.length === 0 || u[0].role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    
    const dbUserId = usersArr[0].id;
    
    // Safe & parameterized delete using Drizzle built-in APIs
    await db.delete(bookmarks).where(and(eq(bookmarks.userId, dbUserId), eq(bookmarks.questionId, questionId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Wish List Endpoints
app.get('/api/user/:userId/wishlist', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const usersArr = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!usersArr.length) return res.status(404).json({ error: 'User not found' });
    
    // Auth check
    if (req.user!.uid !== usersArr[0].uid) {
      const u = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
      if (u.length === 0 || u[0].role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    
    const dbUserId = usersArr[0].id;
    
    // Fetch wishlist items joined with exams
    const list = await db.select({
      id: wishlist.id,
      userId: wishlist.userId,
      examId: wishlist.examId,
      createdAt: wishlist.createdAt,
      exam: exams
    })
    .from(wishlist)
    .innerJoin(exams, eq(wishlist.examId, exams.id))
    .where(eq(wishlist.userId, dbUserId));
    
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/:userId/wishlist', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { examId } = req.body;
    const usersArr = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!usersArr.length) return res.status(404).json({ error: 'User not found' });
    
    // Auth check
    if (req.user!.uid !== usersArr[0].uid) {
      const u = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
      if (u.length === 0 || u[0].role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    
    const dbUserId = usersArr[0].id;
    
    // Check if already exists
    const existing = await db.select().from(wishlist).where(and(eq(wishlist.userId, dbUserId), eq(wishlist.examId, Number(examId))));
    if (existing.length > 0) {
      return res.json({ success: true, message: 'Already in wishlist' });
    }
    
    await db.insert(wishlist).values({
      userId: dbUserId,
      examId: Number(examId)
    });
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user/:userId/wishlist/:examId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId, examId } = req.params;
    const usersArr = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!usersArr.length) return res.status(404).json({ error: 'User not found' });
    
    // Auth check
    if (req.user!.uid !== usersArr[0].uid) {
      const u = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
      if (u.length === 0 || u[0].role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    
    const dbUserId = usersArr[0].id;
    
    await db.delete(wishlist).where(and(eq(wishlist.userId, dbUserId), eq(wishlist.examId, Number(examId))));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/exams/:userId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const usersArr = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!usersArr.length) return res.json([]);
    
    // Auth check
    if (req.user!.uid !== usersArr[0].uid) {
      const u = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
      if (u.length === 0 || u[0].role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    
    const dbUserId = usersArr[0].id;
    const results = await db.execute(sql`
      SELECT er.id, er.answers, er.date as "submittedAt", er.exam_id as "examId",
             e.name as "examName", e.total_questions as "totalMarks", e.questions,
             e.type as "examType", e.answer_key_uploaded as "answerKeyUploaded"
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      WHERE er.user_id = ${dbUserId}
      ORDER BY er.id DESC
    `);
    
    res.json(results.rows.map((r: any) => {
      let timeTaken = 'N/A';
      try {
        const ansObj = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
        timeTaken = ansObj?.timeTaken || 'N/A';
      } catch (e) {}
      
      const preciseScore = calculatePreciseScore(r.questions, r.answers);
      const isAnswerKeyAvailable = r.examType !== 'bharti' || r.answerKeyUploaded === true;

      let correctCount = 0;
      let incorrectCount = 0;
      let leftCount = 0;
      let eCount = 0;

      let qList: any[] = [];
      let ansObj: any = {};

      try {
        qList = typeof r.questions === 'string' ? JSON.parse(r.questions) : r.questions || [];
        ansObj = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers || {};
        if (Array.isArray(qList)) {
          qList.forEach((q: any) => {
            const ans = ansObj[q.id];
            if (ans === undefined) {
              leftCount++;
            } else if (ans === 'E') {
              eCount++;
            } else if (ans === q.correctAnswer) {
              correctCount++;
            } else {
              incorrectCount++;
            }
          });
        }
      } catch (e) {}
      
      return {
        id: r.id,
        examId: r.examId,
        marksObtained: isAnswerKeyAvailable ? preciseScore : null,
        submittedAt: r.submittedAt,
        examName: r.examName,
        totalMarks: r.totalMarks,
        timeTaken,
        correctCount,
        incorrectCount,
        leftCount,
        eCount,
        answerKeyUploaded: r.answerKeyUploaded,
        questions: qList,
        answers: ansObj
      };
    }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function recalculateLeaderboard() {
  try {
    const results = await db.execute(sql`
      SELECT er.id, er.answers, er.date,
             u.name as "userName", u.category as "userCategory",
             e.id as "examId", e.name as "examName", e.type as "examType", e.questions,
             e.answer_key_uploaded as "answerKeyUploaded"
      FROM exam_results er
      JOIN users u ON er.user_id = u.id
      JOIN exams e ON er.exam_id = e.id
    `);

    const parsedEntries = results.rows
      .filter((r: any) => r.examType !== 'bharti' || r.answerKeyUploaded === true)
      .map((r: any) => {
        const preciseScore = calculatePreciseScore(r.questions, r.answers);
        return {
          userName: r.userName || 'Anonymous',
          userCategory: r.userCategory || 'General',
          examName: r.examName,
          examType: r.examType,
          score: preciseScore,
          date: r.date
        };
      });

    // 1. Mock Merit list
    const mockList = parsedEntries
      .filter((entry: any) => entry.examType === 'mock')
      .sort((a: any, b: any) => b.score - a.score)
      .map((entry: any, idx: number) => ({
        rank: idx + 1,
        name: entry.userName,
        examName: entry.examName,
        category: entry.userCategory,
        score: Number(entry.score.toFixed(2))
      }));

    // 2. Bharti Merit list
    const bhartiList = parsedEntries
      .filter((entry: any) => entry.examType === 'bharti')
      .sort((a: any, b: any) => b.score - a.score)
      .map((entry: any, idx: number) => {
        const rank = idx + 1;
        let selectionProbability = 35;
        if (rank === 1) selectionProbability = 95;
        else if (rank === 2) selectionProbability = 88;
        else if (rank === 3) selectionProbability = 75;
        else if (rank === 4) selectionProbability = 65;
        else if (rank === 5) selectionProbability = 60;

        return {
          rank,
          name: entry.userName,
          examName: entry.examName,
          category: entry.userCategory,
          score: Number(entry.score.toFixed(2)),
          selectionProbability
        };
      });

    // 3. Combined Merit list
    const userMap = new Map<string, { name: string, category: string, examsTaken: number, totalScore: number }>();
    parsedEntries.forEach((entry: any) => {
      const existing = userMap.get(entry.userName);
      if (existing) {
        existing.examsTaken += 1;
        existing.totalScore += entry.score;
      } else {
        userMap.set(entry.userName, {
          name: entry.userName,
          category: entry.userCategory,
          examsTaken: 1,
          totalScore: entry.score
        });
      }
    });

    const combinedList = Array.from(userMap.values())
      .map((u: any) => ({
        name: u.name,
        category: u.category,
        examsTaken: u.examsTaken,
        score: Number(u.totalScore.toFixed(2))
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .map((entry: any, idx: number) => ({
        rank: idx + 1,
        ...entry
      }));

    // Save to leaderboard_summary using standard Drizzle ORM
    const types = ['combined', 'mock', 'bharti'];
    const lists = [combinedList, mockList, bhartiList];
    
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      const d = lists[i];
      const existing = await db.select().from(leaderboardSummary).where(eq(leaderboardSummary.type, t));
      if (existing.length) {
        await db.update(leaderboardSummary).set({ data: d, updatedAt: new Date() }).where(eq(leaderboardSummary.type, t));
      } else {
        await db.insert(leaderboardSummary).values({ type: t, data: d, updatedAt: new Date() });
      }
    }

    console.log('[Leaderboard Cache] Leaderboard calculated and cached successfully.');
  } catch (err: any) {
    console.error('[Leaderboard Cache Error] Error recalculating leaderboard:', err);
  }
}

app.get('/api/leaderboard', async (req, res) => {
  try {
    const summaries = await db.select().from(leaderboardSummary);
    let combined = summaries.find(s => s.type === 'combined')?.data || [];
    let mock = summaries.find(s => s.type === 'mock')?.data || [];
    let bharti = summaries.find(s => s.type === 'bharti')?.data || [];
    const updatedAt = summaries.find(s => s.type === 'combined')?.updatedAt || new Date();

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const isStale = summaries.length === 0 || !updatedAt || new Date(updatedAt) < twelveHoursAgo;

    if (isStale) {
      console.log('[Leaderboard API/leaderboard] Cache is stale, empty or older than 12 hours. Recalculating...');
      await recalculateLeaderboard();
      const newSummaries = await db.select().from(leaderboardSummary);
      combined = newSummaries.find(s => s.type === 'combined')?.data || [];
      mock = newSummaries.find(s => s.type === 'mock')?.data || [];
      bharti = newSummaries.find(s => s.type === 'bharti')?.data || [];
      const newUpdatedAt = newSummaries.find(s => s.type === 'combined')?.updatedAt || new Date();

      res.json({
        combinedMerit: combined,
        mockMerit: mock,
        bhartiMerit: bharti,
        updatedAt: newUpdatedAt
      });
      return;
    }

    res.json({
      combinedMerit: combined,
      mockMerit: mock,
      bhartiMerit: bharti,
      updatedAt: updatedAt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Calendar
app.get('/api/calendar', async (req, res) => {
  try {
    const events = await queryWithRetry(() => db.select().from(calendarEvents).orderBy(desc(calendarEvents.id)));
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calendar', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { examName, department, startDate, endDate, examDate, officialLink, status, expectedVacancies } = req.body;
    if (!examName || !department || !startDate || !endDate) {
      return res.status(400).json({ error: 'તમામ ફરજિયાત વિગતો આવશ્યક છે.' });
    }
    
    const parsedVacancies = expectedVacancies ? parseInt(expectedVacancies, 10) : null;
    const finalExamDate = examDate || '';

    const newEvent = await db.insert(calendarEvents).values({
      examName, department, startDate, endDate, examDate: finalExamDate, officialLink, expectedVacancies: parsedVacancies, status: status || 'upcoming'
    }).returning();
    res.status(201).json(newEvent[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/calendar/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { examName, department, startDate, endDate, examDate, officialLink, status, expectedVacancies } = req.body;
    if (!examName || !department || !startDate || !endDate) {
      return res.status(400).json({ error: 'તમામ ફરજિયાત વિગતો આવશ્યક છે.' });
    }
    
    const parsedVacancies = expectedVacancies ? parseInt(expectedVacancies, 10) : null;
    const finalExamDate = examDate || '';

    const updatedEvent = await db.update(calendarEvents)
      .set({ examName, department, startDate, endDate, examDate: finalExamDate, officialLink, expectedVacancies: parsedVacancies, status: status || 'upcoming' })
      .where(eq(calendarEvents.id, parseInt(id, 10)))
      .returning();
      
    if (updatedEvent.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(updatedEvent[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/calendar/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await queryWithRetry(() =>
      db.delete(calendarEvents)
        .where(eq(calendarEvents.id, parseInt(id, 10)))
        .returning()
    );
      
    if (deletedEvent.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(deletedEvent[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});


// --- Push Notification Setup ---
let vapidKeys = { publicKey: '', privateKey: '' };
async function initPushSetup() {
  try {
    const pubKeySetting = await db.select().from(settings).where(eq(settings.key, 'VAPID_PUBLIC_KEY'));
    const privKeySetting = await db.select().from(settings).where(eq(settings.key, 'VAPID_PRIVATE_KEY'));
    
    if (pubKeySetting.length === 0 || privKeySetting.length === 0) {
      const keys = webpush.generateVAPIDKeys();
      await db.insert(settings).values({ key: 'VAPID_PUBLIC_KEY', value: keys.publicKey }).onConflictDoNothing();
      await db.insert(settings).values({ key: 'VAPID_PRIVATE_KEY', value: keys.privateKey }).onConflictDoNothing();
      vapidKeys = keys;
    } else {
      vapidKeys.publicKey = pubKeySetting[0].value;
      vapidKeys.privateKey = privKeySetting[0].value;
    }
    webpush.setVapidDetails('mailto:admin@example.com', vapidKeys.publicKey, vapidKeys.privateKey);
  } catch (err) {
    console.error('Push setup error:', err);
  }
}
initPushSetup();

app.get('/api/notifications/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/notifications/subscribe', requireAuth, async (req: AuthRequest, res) => {
  try {
    const subscription = req.body;
    const user = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
    const userId = user[0]?.id || null;
    
    // Upsert the subscription endpoint using try-catch to handle potential race condition on unique constraint
    try {
        await db.insert(pushSubscriptions).values({
            userId,
            endpoint: subscription.endpoint,
            auth: subscription.keys.auth,
            p256dh: subscription.keys.p256dh
        });
    } catch (err: any) {
        // Assume unique constraint violation, update userId if it was null
        if (err.code === '23505') { // Unique constraint violation in PostgreSQL
            if (userId) {
                await db.update(pushSubscriptions)
                  .set({ userId })
                  .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
            }
        } else {
            throw err;
        }
    }
    res.status(201).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/subscribers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
    if (user[0]?.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    
    const subs = await db.select().from(pushSubscriptions);
    res.json({ count: subs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
    if (user[0]?.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    const { title, body, type, link } = req.body;

    // Server-side deduplication check: check if the exact same notification was sent in the last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const duplicateCheck = await queryWithRetry(() => db.select().from(notifications).where(
      and(
        eq(notifications.title, title),
        eq(notifications.body, body),
        sql`${notifications.date} >= ${tenSecondsAgo}`
      )
    ));
    if (duplicateCheck.length > 0) {
      console.log('[Notification Deduplicated] Duplicate request ignored.');
      return res.status(200).json({ success: true, duplicated: true });
    }
    
    // Insert into notifications history
    await db.insert(notifications).values({
      title, body, type, link, date: new Date().toISOString()
    });

    // Send push notification to all subscribers
    const subs = await db.select().from(pushSubscriptions);
    const payload = JSON.stringify({
      title,
      body,
      url: link || '/'
    });
    
    let sentCount = 0;
    for (const sub of subs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
          }
        };
        await webpush.sendNotification(pushSubscription, payload);
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or is no longer valid, remove it
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
        } else {
          console.error('Error sending push notification:', err);
        }
      }
    }
    
    res.status(201).json({ success: true, sent: sentCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Notifications
app.delete('/api/notifications/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await db.delete(notifications).where(eq(notifications.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const notifs = await db.select().from(notifications).orderBy(desc(notifications.id));
    res.json(notifs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// --- VITE MIDDLEWARE SETUP ---

async function seedDatabase() {
  try {
    const dbPath = path.join(process.cwd(), 'db.json');
    if (!fs.existsSync(dbPath)) {
      console.log('db.json not found, skipping seeding.');
      return;
    }
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // 1. Seed Users
    if (data.users && data.passwords) {
      console.log('Seeding users from db.json...');
      for (const u of data.users) {
        const phone = u.mobile;
        if (!phone) continue;
        
        const existing = await db.select().from(users).where(eq(users.phone, phone));
        if (existing.length === 0) {
          const rawPassword = data.passwords[phone] || '123456';
          const hashedPassword = await bcrypt.hash(rawPassword, 10);
          const uid = u.id || 'local_' + phone;
          
          await db.insert(users).values({
            uid,
            phone,
            password: hashedPassword,
            name: u.name || 'User ' + phone,
            email: u.email || null,
            category: u.category || 'General',
            dob: u.dob || null,
            address: u.address || null,
            role: u.role || 'user',
            isBlocked: u.isBlocked || false,
            subscriptionPlan: 'free',
          });
          console.log('Seeded user:', phone);
        }
      }
    }

    // 2. Seed Exams
    if (data.exams) {
      console.log('Seeding exams...');
      for (const ex of data.exams) {
        const existing = await db.select().from(exams).where(eq(exams.name, ex.name));
        if (existing.length === 0) {
          await db.insert(exams).values({
            name: ex.name,
            duration: Number(ex.duration) || 60,
            totalQuestions: Number(ex.totalQuestions) || 100,
            type: ex.type || 'mock',
            questions: ex.questions || [],
            answerKeyUploaded: ex.answerKeyUploaded || false,
          });
          console.log('Seeded exam:', ex.name);
        }
      }
    }

    // 3. Seed Calendar Events
    if (data.calendarEvents) {
      console.log('Seeding calendar events...');
      for (const ev of data.calendarEvents) {
        const existing = await db.select().from(calendarEvents).where(eq(calendarEvents.examName, ev.examName));
        if (existing.length === 0) {
          await db.insert(calendarEvents).values({
            examName: ev.examName,
            department: ev.department || 'Other',
            startDate: ev.startDate || '',
            endDate: ev.endDate || '',
            examDate: ev.examDate || '',
            officialLink: ev.officialLink || '',
            expectedVacancies: ev.expectedVacancies ? Number(ev.expectedVacancies) : null,
            status: ev.status || 'upcoming',
          });
          console.log('Seeded calendar event:', ev.examName);
        }
      }
    }

    // 4. Seed Posts
    if (data.posts) {
      console.log('Seeding blog posts...');
      for (const p of data.posts) {
        const existing = await db.select().from(posts).where(eq(posts.title, p.title));
        if (existing.length === 0) {
          await db.insert(posts).values({
            category: p.category || 'General',
            title: p.title,
            content: p.content || '',
            thumbnail: p.thumbnail || '',
            metaTitle: p.metaTitle || '',
            metaDesc: p.metaDesc || '',
            slug: p.slug || p.id || null,
            views: p.views || 0,
            date: p.date || p.createdAt || new Date().toISOString(),
          });
          console.log('Seeded post:', p.title);
        }
      }
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}

async function initLeaderboardCache() {
  try {
    // Check the last update time of the leaderboard cache
    const summaries = await db.select().from(leaderboardSummary);
    const combinedSummary = summaries.find(s => s.type === 'combined');
    const updatedAt = combinedSummary?.updatedAt;
    const count = summaries.length;
    
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const isStale = count === 0 || !updatedAt || new Date(updatedAt) < twelveHoursAgo;

    if (isStale) {
      console.log('[Leaderboard Cache] Cache is stale, empty or older than 12 hours on boot. Running recalculation...');
      await recalculateLeaderboard();
    } else {
      console.log('[Leaderboard Cache] Cache is fresh (last updated at:', updatedAt, '). Skipping boot recalculation.');
    }

    // 2. Setup 12-hour background job interval (12 * 60 * 60 * 1000 ms)
    setInterval(async () => {
      console.log('[Leaderboard Cache] Running scheduled 12-hour leaderboard calculation...');
      await recalculateLeaderboard();
    }, 12 * 60 * 60 * 1000);

  } catch (err: any) {
    console.error('[Leaderboard Cache Init Error] Failed to initialize leaderboard cache:', err);
  }
}

async function ensureSingleAdmin() {
  try {
    const targetPhone = '9725722729';
    console.log(`[Admin Guard] Ensuring only ${targetPhone} is admin, and deleting any other admins.`);

    // 1. If 9725722729 exists, make sure they are an admin
    const targetUser = await queryWithRetry(() => db.select().from(users).where(eq(users.phone, targetPhone)));
    if (targetUser.length > 0) {
      if (targetUser[0].role !== 'admin') {
        await queryWithRetry(() => db.update(users).set({ role: 'admin' }).where(eq(users.id, targetUser[0].id)));
        console.log(`[Admin Guard] Promoted ${targetPhone} to admin.`);
      }
    }

    // 2. Find any other admins (role is 'admin' but phone is not 9725722729) and delete them
    const otherAdmins = await queryWithRetry(() => db.select().from(users).where(
      and(
        eq(users.role, 'admin'),
        ne(users.phone, targetPhone)
      )
    ));

    for (const otherAdmin of otherAdmins) {
      console.log(`[Admin Guard] Deleting unauthorized admin user: phone=${otherAdmin.phone}, id=${otherAdmin.id}`);
      await queryWithRetry(() => db.delete(bookmarks).where(eq(bookmarks.userId, otherAdmin.id)));
      await queryWithRetry(() => db.delete(examResults).where(eq(examResults.userId, otherAdmin.id)));
      await queryWithRetry(() => db.delete(users).where(eq(users.id, otherAdmin.id)));
    }
  } catch (err: any) {
    console.error('[Admin Guard Error] Failed to enforce single admin policy:', err);
  }
}

async function ensureSchemaUpToDate() {
  try {
    console.log('[Schema Auto-Migrator] Checking if database columns are up-to-date...');
    
    // 1. Check columns for "exams" table
    const examsColsResult = await queryWithRetry(() => db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'exams'
    `));
    
    const existingExamsCols = examsColsResult.rows.map((row: any) => String(row.column_name).toLowerCase());
    console.log('[Schema Auto-Migrator] Existing columns in exams:', existingExamsCols);

    const requiredExamsCols = [
      { name: 'subject', type: 'text' },
      { name: 'difficulty', type: 'text' },
      { name: 'total_vacancies', type: 'text' },
      { name: 'exam_date', type: 'text' }
    ];

    for (const col of requiredExamsCols) {
      if (!existingExamsCols.includes(col.name.toLowerCase())) {
        console.log(`[Schema Auto-Migrator] Column "${col.name}" is missing in "exams" table. Adding it...`);
        await queryWithRetry(() => db.execute(sql.raw(`
          ALTER TABLE exams ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `)));
        console.log(`[Schema Auto-Migrator] Column "${col.name}" added successfully.`);
      }
    }

    console.log('[Schema Auto-Migrator] Database schema verification completed.');
  } catch (err: any) {
    console.error('[Schema Auto-Migrator Error] Failed to auto-migrate database columns:', err);
  }
}

async function runBackgroundInitialization() {
  try {
    // Run schema auto-migration first to ensure any missing columns are added before database queries run
    await ensureSchemaUpToDate();

    console.log('[Server Init] Starting leaderboard cache initialization in the background (automatic database seeding is disabled)...');
    // Seeding is disabled to prevent deleted or modified data from being overwritten on server restart
    // await seedDatabase();
    await initLeaderboardCache();
    console.log('[Server Init] Background leaderboard cache initialization completed successfully.');
    await ensureSingleAdmin();
  } catch (err) {
    console.error('[Server Init Error] Background initialization failed:', err);
  }
}

async function startServer() {
  runBackgroundInitialization();

// --- Payment and Subscription Routes ---
app.get('/api/settings/razorpay-key', async (req, res) => {
  try {
    const keySetting = await db.select().from(settings).where(eq(settings.key, 'RAZORPAY_KEY_ID'));
    res.json({ keyId: keySetting.length > 0 ? keySetting[0].value : '' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/firebase-config', async (req, res) => {
  try {
    const enabled = await getSetting('FIREBASE_ENABLED', 'FIREBASE_ENABLED') || 'false';
    const apiKey = await getSetting('FIREBASE_API_KEY', 'FIREBASE_API_KEY');
    const authDomain = await getSetting('FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN');
    const projectId = await getSetting('FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID');
    const storageBucket = await getSetting('FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET');
    const messagingSenderId = await getSetting('FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID');
    const appId = await getSetting('FIREBASE_APP_ID', 'FIREBASE_APP_ID');

    res.json({
      enabled: enabled === 'true',
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/public', async (req, res) => {
  try {
    const googleAnalyticsId = await getSetting('GOOGLE_ANALYTICS_ID') || '';
    const customHeadCode = await getSetting('CUSTOM_HEAD_CODE') || '';
    const adsPostBelowHeader = await getSetting('ADS_POST_BELOW_HEADER') || '';
    const adsPostBelowThumb = await getSetting('ADS_POST_BELOW_THUMB') || '';
    const adsPostAboveRelated = await getSetting('ADS_POST_ABOVE_RELATED') || '';
    const adsSidebarBottom = await getSetting('ADS_SIDEBAR_BOTTOM') || '';
    res.json({
      googleAnalyticsId,
      customHeadCode,
      adsPostBelowHeader,
      adsPostBelowThumb,
      adsPostAboveRelated,
      adsSidebarBottom
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
    if (!user.length || user[0].role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    const razorpayKeyId = await getSetting('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_ID');
    const razorpayKeySecret = await getSetting('RAZORPAY_KEY_SECRET', 'RAZORPAY_KEY_SECRET');
    
    const firebaseApiKey = await getSetting('FIREBASE_API_KEY', 'FIREBASE_API_KEY');
    const firebaseAuthDomain = await getSetting('FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN');
    const firebaseProjectId = await getSetting('FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID');
    const firebaseStorageBucket = await getSetting('FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET');
    const firebaseMessagingSenderId = await getSetting('FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID');
    const firebaseAppId = await getSetting('FIREBASE_APP_ID', 'FIREBASE_APP_ID');
    const firebaseEnabled = await getSetting('FIREBASE_ENABLED', 'FIREBASE_ENABLED') || 'false';

    const smsGatewayType = await getSetting('SMS_GATEWAY_TYPE') || 'disabled';
    const smsGatewayUrl = await getSetting('SMS_GATEWAY_URL') || '';
    const smsGatewayHeaders = await getSetting('SMS_GATEWAY_HEADERS') || '';
    const smsGatewayBody = await getSetting('SMS_GATEWAY_BODY_OR_PARAMS') || '';
    const smsGatewayTemplate = await getSetting('SMS_GATEWAY_TEMPLATE') || 'તમારો વેરિફિકેશન ઓટીપી કોડ {otp} છે.';
    const smsTwilioSid = await getSetting('SMS_TWILIO_SID') || '';
    const smsTwilioAuthToken = await getSetting('SMS_TWILIO_AUTH_TOKEN') || '';
    const smsTwilioFrom = await getSetting('SMS_TWILIO_FROM_NUMBER') || '';

    const sitemapBaseUrl = await getSetting('SITEMAP_BASE_URL') || '';
    const sitemapPostsLimit = await getSetting('SITEMAP_POSTS_LIMIT') || '50000';
    const sitemapChangeFreq = await getSetting('SITEMAP_CHANGE_FREQ') || 'daily';
    const sitemapPriority = await getSetting('SITEMAP_PRIORITY') || '0.8';
    const sitemapIncludeImages = await getSetting('SITEMAP_INCLUDE_IMAGES') || 'true';

    const googleAnalyticsId = await getSetting('GOOGLE_ANALYTICS_ID') || '';
    const customHeadCode = await getSetting('CUSTOM_HEAD_CODE') || '';

    const adsPostBelowHeader = await getSetting('ADS_POST_BELOW_HEADER') || '';
    const adsPostBelowThumb = await getSetting('ADS_POST_BELOW_THUMB') || '';
    const adsPostAboveRelated = await getSetting('ADS_POST_ABOVE_RELATED') || '';
    const adsSidebarBottom = await getSetting('ADS_SIDEBAR_BOTTOM') || '';

    res.json({
      razorpayKeyId,
      razorpayKeySecret,
      firebaseApiKey,
      firebaseAuthDomain,
      firebaseProjectId,
      firebaseStorageBucket,
      firebaseMessagingSenderId,
      firebaseAppId,
      firebaseEnabled: firebaseEnabled === 'true',
      smsGatewayType,
      smsGatewayUrl,
      smsGatewayHeaders,
      smsGatewayBody,
      smsGatewayTemplate,
      smsTwilioSid,
      smsTwilioAuthToken,
      smsTwilioFrom,
      sitemapBaseUrl,
      sitemapPostsLimit,
      sitemapChangeFreq,
      sitemapPriority,
      sitemapIncludeImages: sitemapIncludeImages === 'true',
      googleAnalyticsId,
      customHeadCode,
      adsPostBelowHeader,
      adsPostBelowThumb,
      adsPostAboveRelated,
      adsSidebarBottom
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/export-database', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
    if (!user.length || user[0].role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    // Read query parameter "tables". It can be a comma-separated list of table names.
    const tablesParam = req.query.tables;
    let selectedTables: string[] = [];
    if (typeof tablesParam === 'string' && tablesParam.trim()) {
      selectedTables = tablesParam.split(',').map(t => t.trim().toLowerCase());
    }

    const backupData: any = {
      exportedAt: new Date().toISOString(),
      tablesExported: selectedTables.length > 0 ? selectedTables : ['all']
    };

    const shouldExport = (tableName: string) => {
      if (selectedTables.length === 0) return true; // export all by default
      return selectedTables.includes(tableName);
    };

    if (shouldExport('users')) {
      const allUsers = await db.select().from(users);
      backupData.users = allUsers.map(u => {
        const { password, ...rest } = u; // Keep passwords out of backup file for safety
        return rest;
      });
    }

    if (shouldExport('exams')) {
      backupData.exams = await db.select().from(exams);
    }

    if (shouldExport('exam_results')) {
      backupData.exam_results = await db.select().from(examResults);
    }

    if (shouldExport('posts')) {
      backupData.posts = await db.select().from(posts);
    }

    if (shouldExport('notifications')) {
      backupData.notifications = await db.select().from(notifications);
    }

    if (shouldExport('calendar_events')) {
      backupData.calendar_events = await db.select().from(calendarEvents);
    }

    if (shouldExport('bookmarks')) {
      backupData.bookmarks = await db.select().from(bookmarks);
    }

    if (shouldExport('settings')) {
      backupData.settings = await db.select().from(settings);
    }

    if (shouldExport('push_subscriptions')) {
      backupData.push_subscriptions = await db.select().from(pushSubscriptions);
    }

    if (shouldExport('leaderboard_summary')) {
      backupData.leaderboard_summary = await db.select().from(leaderboardSummary);
    }

    if (shouldExport('wishlist')) {
      backupData.wishlist = await db.select().from(wishlist);
    }

    const filename = selectedTables.length === 1
      ? `${selectedTables[0]}_backup_${new Date().toISOString().split('T')[0]}.json`
      : `database_backup_${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
    if (!user.length || user[0].role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    const { 
      razorpayKeyId, razorpayKeySecret,
      firebaseApiKey, firebaseAuthDomain, firebaseProjectId, firebaseStorageBucket,
      firebaseMessagingSenderId, firebaseAppId, firebaseEnabled,
      smsGatewayType, smsGatewayUrl, smsGatewayHeaders, smsGatewayBody, smsGatewayTemplate,
      smsTwilioSid, smsTwilioAuthToken, smsTwilioFrom,
      sitemapBaseUrl, sitemapPostsLimit, sitemapChangeFreq, sitemapPriority, sitemapIncludeImages,
      googleAnalyticsId, customHeadCode,
      adsPostBelowHeader, adsPostBelowThumb, adsPostAboveRelated, adsSidebarBottom
    } = req.body;

    const saveSetting = async (key: string, value: string) => {
      const existing = await db.select().from(settings).where(eq(settings.key, key));
      if (existing.length) {
        await db.update(settings).set({ value }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value });
      }
    };

    if (razorpayKeyId !== undefined) await saveSetting('RAZORPAY_KEY_ID', razorpayKeyId);
    if (razorpayKeySecret !== undefined) await saveSetting('RAZORPAY_KEY_SECRET', razorpayKeySecret);

    if (firebaseApiKey !== undefined) await saveSetting('FIREBASE_API_KEY', firebaseApiKey);
    if (firebaseAuthDomain !== undefined) await saveSetting('FIREBASE_AUTH_DOMAIN', firebaseAuthDomain);
    if (firebaseProjectId !== undefined) await saveSetting('FIREBASE_PROJECT_ID', firebaseProjectId);
    if (firebaseStorageBucket !== undefined) await saveSetting('FIREBASE_STORAGE_BUCKET', firebaseStorageBucket);
    if (firebaseMessagingSenderId !== undefined) await saveSetting('FIREBASE_MESSAGING_SENDER_ID', firebaseMessagingSenderId);
    if (firebaseAppId !== undefined) await saveSetting('FIREBASE_APP_ID', firebaseAppId);
    if (firebaseEnabled !== undefined) await saveSetting('FIREBASE_ENABLED', firebaseEnabled ? 'true' : 'false');

    if (smsGatewayType !== undefined) await saveSetting('SMS_GATEWAY_TYPE', smsGatewayType);
    if (smsGatewayUrl !== undefined) await saveSetting('SMS_GATEWAY_URL', smsGatewayUrl);
    if (smsGatewayHeaders !== undefined) await saveSetting('SMS_GATEWAY_HEADERS', smsGatewayHeaders);
    if (smsGatewayBody !== undefined) await saveSetting('SMS_GATEWAY_BODY_OR_PARAMS', smsGatewayBody);
    if (smsGatewayTemplate !== undefined) await saveSetting('SMS_GATEWAY_TEMPLATE', smsGatewayTemplate);
    if (smsTwilioSid !== undefined) await saveSetting('SMS_TWILIO_SID', smsTwilioSid);
    if (smsTwilioAuthToken !== undefined) await saveSetting('SMS_TWILIO_AUTH_TOKEN', smsTwilioAuthToken);
    if (smsTwilioFrom !== undefined) await saveSetting('SMS_TWILIO_FROM_NUMBER', smsTwilioFrom);

    if (sitemapBaseUrl !== undefined) await saveSetting('SITEMAP_BASE_URL', sitemapBaseUrl);
    if (sitemapPostsLimit !== undefined) await saveSetting('SITEMAP_POSTS_LIMIT', String(sitemapPostsLimit));
    if (sitemapChangeFreq !== undefined) await saveSetting('SITEMAP_CHANGE_FREQ', sitemapChangeFreq);
    if (sitemapPriority !== undefined) await saveSetting('SITEMAP_PRIORITY', String(sitemapPriority));
    if (sitemapIncludeImages !== undefined) await saveSetting('SITEMAP_INCLUDE_IMAGES', sitemapIncludeImages ? 'true' : 'false');

    if (googleAnalyticsId !== undefined) await saveSetting('GOOGLE_ANALYTICS_ID', googleAnalyticsId);
    if (customHeadCode !== undefined) await saveSetting('CUSTOM_HEAD_CODE', customHeadCode);

    if (adsPostBelowHeader !== undefined) await saveSetting('ADS_POST_BELOW_HEADER', adsPostBelowHeader);
    if (adsPostBelowThumb !== undefined) await saveSetting('ADS_POST_BELOW_THUMB', adsPostBelowThumb);
    if (adsPostAboveRelated !== undefined) await saveSetting('ADS_POST_ABOVE_RELATED', adsPostAboveRelated);
    if (adsSidebarBottom !== undefined) await saveSetting('ADS_SIDEBAR_BOTTOM', adsSidebarBottom);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/razorpay', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
    if (user[0].role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    const { keyId, keySecret } = req.body;
    
    // Upsert keyId
    const existingKey = await db.select().from(settings).where(eq(settings.key, 'RAZORPAY_KEY_ID'));
    if (existingKey.length) {
      await db.update(settings).set({ value: keyId }).where(eq(settings.key, 'RAZORPAY_KEY_ID'));
    } else {
      await db.insert(settings).values({ key: 'RAZORPAY_KEY_ID', value: keyId });
    }
    
    // Upsert keySecret
    const existingSecret = await db.select().from(settings).where(eq(settings.key, 'RAZORPAY_KEY_SECRET'));
    if (existingSecret.length) {
      await db.update(settings).set({ value: keySecret }).where(eq(settings.key, 'RAZORPAY_KEY_SECRET'));
    } else {
      await db.insert(settings).values({ key: 'RAZORPAY_KEY_SECRET', value: keySecret });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/subscription-status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
    const userId = user[0]?.id;
    const results = await db.select().from(examResults).where(eq(examResults.userId, userId));
    
    const u = user[0];
    const totalTestsTaken = results.length;
    let isSubscribed = false;
    
    if (u.subscriptionPlan !== 'free' && u.subscriptionExpiry) {
       if (new Date(u.subscriptionExpiry).getTime() > Date.now()) {
         isSubscribed = true;
       } else {
         // Expired
         await db.update(users).set({ subscriptionPlan: 'free', subscriptionExpiry: null }).where(eq(users.id, userId));
         u.subscriptionPlan = 'free';
       }
    }

    const allowed = typeof u.allowedExams === 'number' ? u.allowedExams : 3;
    const canTakeTest = isSubscribed || totalTestsTaken < allowed;

    res.json({
      totalTestsTaken,
      subscriptionPlan: u.subscriptionPlan || 'free',
      subscriptionExpiry: u.subscriptionExpiry,
      isSubscribed,
      canTakeTest,
      allowedExams: allowed
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payment/create-order', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { plan } = req.body; // 'monthly' or 'yearly'
    const amount = plan === 'monthly' ? 4900 : 49900; // in paise (₹49 and ₹499)
    
    const keySetting = await db.select().from(settings).where(eq(settings.key, 'RAZORPAY_KEY_ID'));
    const secretSetting = await db.select().from(settings).where(eq(settings.key, 'RAZORPAY_KEY_SECRET'));
    
    if (!keySetting.length || !secretSetting.length) {
      return res.status(500).json({ error: 'Razorpay keys not configured.' });
    }

    const instance = new Razorpay({
      key_id: keySetting[0].value,
      key_secret: secretSetting[0].value,
    });

    const options = {
      amount,
      currency: 'INR',
      receipt: `rcpt_${req.user?.uid}_${Date.now()}`,
    };

    const order = await instance.orders.create(options);
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payment/verify', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    
    const secretSetting = await db.select().from(settings).where(eq(settings.key, 'RAZORPAY_KEY_SECRET'));
    if (!secretSetting.length) return res.status(500).json({ error: 'Razorpay not configured' });

    const secret = secretSetting[0].value;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");
      
    if (expectedSignature === razorpay_signature) {
       // Payment valid, update user
       const uArr = await db.select().from(users).where(eq(users.uid, String(req.user?.uid)));
       const userId = uArr[0]?.id;
       const expiryDate = new Date();
       if (plan === 'monthly') expiryDate.setMonth(expiryDate.getMonth() + 1);
       if (plan === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
       
       await db.update(users).set({
         subscriptionPlan: plan,
         subscriptionExpiry: expiryDate,
         allowedExams: 30000
       }).where(eq(users.id, userId));
       
       res.json({ success: true });
    } else {
       res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', async (req, res) => {
      try {
        const indexPath = path.join(distPath, 'index.html');
        if (!fs.existsSync(indexPath)) {
          return res.status(404).send('Not Found');
        }
        let html = fs.readFileSync(indexPath, 'utf-8');
        
        const googleAnalyticsId = await getSetting('GOOGLE_ANALYTICS_ID') || '';
        const customHeadCode = await getSetting('CUSTOM_HEAD_CODE') || '';
        
        // 1. Dynamic SEO / OpenGraph / TwitterCard Injection for Single Posts
        const pathSegments = req.path.split('/').filter(Boolean);
        let slug = '';
        const validCategories = ['job', 'answer_key', 'result', 'selection_list', 'news'];
        
        if (pathSegments.length === 2 && validCategories.includes(pathSegments[0])) {
          slug = decodeURIComponent(pathSegments[1]);
        } else if (pathSegments[0] === 'post' && pathSegments[1]) {
          slug = decodeURIComponent(pathSegments[1]);
        }
        
        let seoMeta = '';
        if (slug) {
          try {
            let post: any = null;
            if (!isNaN(Number(slug))) {
              const postsArr = await queryWithRetry(() => db.select().from(posts).where(eq(posts.id, Number(slug))));
              post = postsArr[0];
            } else {
              const postsArr = await queryWithRetry(() => db.select().from(posts).where(eq(posts.slug, slug)));
              post = postsArr[0];
            }
            
            if (post) {
              const titleText = post.metaTitle || post.title;
              const plainContent = (post.content || '').replace(/<[^>]*>/g, '');
              const descText = post.metaDesc || (plainContent.substring(0, 155).trim() + (plainContent.length > 155 ? '...' : ''));
              
              const hostHeader = req.get('host') || 'gujarat-exam-portal.com';
              const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
              const fullUrl = `${protocol}://${hostHeader}${req.originalUrl}`;
              
              let imageUrl = post.thumbnail || '/logo.svg';
              if (imageUrl.startsWith('/')) {
                imageUrl = `${protocol}://${hostHeader}${imageUrl}`;
              }
              
              // Escape double quotes to prevent HTML breaking
              const escTitleText = titleText.replace(/"/g, '&quot;');
              const escDescText = descText.replace(/"/g, '&quot;');
              
              // Replace existing title
              html = html.replace(/<title>.*?<\/title>/, `<title>${escTitleText} - Gujarat Exam Portal</title>`);
              
              seoMeta = `
    <!-- Dynamic Social SEO Meta Tags -->
    <meta name="description" content="${escDescText}" />
    <meta property="og:title" content="${escTitleText}" />
    <meta property="og:description" content="${escDescText}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escTitleText}" />
    <meta name="twitter:description" content="${escDescText}" />
    <meta name="twitter:image" content="${imageUrl}" />
`;
            }
          } catch (dbErr) {
            console.error('[SEO Inject Error] Failed to fetch post for SEO:', dbErr);
          }
        }
        
        let injection = seoMeta;
        if (googleAnalyticsId) {
          injection += `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${googleAnalyticsId}');
  </script>`;
        }
        if (customHeadCode) {
          injection += `\n${customHeadCode}\n`;
        }
        
        if (injection) {
          html = html.replace('</head>', `${injection}</head>`);
        }
        
        res.send(html);
      } catch (err: any) {
        console.error('[Index Serve Error] Failed to serve dynamic index:', err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
