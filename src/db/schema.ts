import { pgTable, text, timestamp, uuid, varchar, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['student', 'admin']);
export const gatePassStatusEnum = pgEnum('gate_pass_status', ['active', 'expired', 'revoked']);
export const entryTypeEnum = pgEnum('entry_type', ['inward', 'outward']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  studentId: varchar('student_id', { length: 50 }).unique(),
  phone: varchar('phone', { length: 20 }),
  department: varchar('department', { length: 100 }),
  role: userRoleEnum('role').notNull().default('student'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const gatePasses = pgTable('gate_passes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  qrCode: text('qr_code').notNull().unique(),
  status: gatePassStatusEnum('status').notNull().default('active'),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
});

export const gatePassLogs = pgTable('gate_pass_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  gatePassId: uuid('gate_pass_id').notNull().references(() => gatePasses.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  scannedBy: uuid('scanned_by').notNull().references(() => users.id),
  entryType: entryTypeEnum('entry_type').notNull(),
  scannedAt: timestamp('scanned_at').defaultNow().notNull(),
  location: varchar('location', { length: 100 }),
  notes: text('notes'),
});

export const usersRelations = relations(users, ({ many }) => ({
  gatePasses: many(gatePasses),
  logs: many(gatePassLogs, { relationName: 'userLogs' }),
  scannedLogs: many(gatePassLogs, { relationName: 'adminScans' }),
}));

export const gatePassesRelations = relations(gatePasses, ({ one, many }) => ({
  user: one(users, {
    fields: [gatePasses.userId],
    references: [users.id],
  }),
  logs: many(gatePassLogs),
}));

export const gatePassLogsRelations = relations(gatePassLogs, ({ one }) => ({
  gatePass: one(gatePasses, {
    fields: [gatePassLogs.gatePassId],
    references: [gatePasses.id],
  }),
  user: one(users, {
    fields: [gatePassLogs.userId],
    references: [users.id],
    relationName: 'userLogs',
  }),
  scanner: one(users, {
    fields: [gatePassLogs.scannedBy],
    references: [users.id],
    relationName: 'adminScans',
  }),
}));