import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  const result = await db.insert(users)
    .values({
      uid,
      email,
      name: name || '',
      role: email.toLowerCase() === 'kkp2677@gmail.com' ? 'admin' : 'user',
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        role: email.toLowerCase() === 'kkp2677@gmail.com' ? 'admin' : 'user',
      },
    })
    .returning();

  return result[0];
}
