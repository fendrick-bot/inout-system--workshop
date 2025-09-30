import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateToken } from '../utils/jwt';

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    studentId: string;
    phone?: string;
    department?: string;
  }) {
    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existingUser.length > 0) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const [user] = await db.insert(users).values({
      ...data,
      password: hashedPassword,
      role: 'student',
    }).returning();

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user: this.sanitizeUser(user), token };
  }

  async login(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user: this.sanitizeUser(user), token };
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}