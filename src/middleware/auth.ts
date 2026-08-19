import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, queryWithRetry } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'gep-super-secret-key-2026';

export interface AuthRequest extends Request {
  user?: { uid: string, phone: string, role: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET) as { uid: string, phone: string, role: string };
    
    // Check if user is blocked in database with retry on transient errors
    const existing = await queryWithRetry(() =>
      db.select().from(users).where(eq(users.uid, String(decodedToken.uid)))
    );
    if (existing.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    
    const user = existing[0];
    if (user.isBlocked) {
      return res.status(423).json({ error: 'તમારું એકાઉન્ટ એડમિન દ્વારા બ્લોક કરવામાં આવ્યું છે.' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
