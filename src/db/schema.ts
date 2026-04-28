// ===================================================================
// DB スキーマ定義(医局員アプリ・MVP 7テーブル)
// テーブル名は ikyokuin_* プレフィックスで既存DBと衝突回避
// ===================================================================
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  time,
  boolean,
  unique,
  index,
} from "drizzle-orm/pg-core";

// -------------------------------------------------------------------
// 1. users(全ユーザー共通・Clerk ミラー)
// -------------------------------------------------------------------
export const users = pgTable("ikyokuin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique().notNull(),
  email: text("email").unique().notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// -------------------------------------------------------------------
// 2. medical_departments(医局)
// -------------------------------------------------------------------
export const medicalDepartments = pgTable("ikyokuin_medical_departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  university: text("university"),
  plan: text("plan").notNull().default("free"),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// -------------------------------------------------------------------
// 3. groups(医局内グループ)
// -------------------------------------------------------------------
export const groups = pgTable("ikyokuin_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => medicalDepartments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
  displayOrder: integer("display_order").notNull().default(0),
  targetDutyWeekday: integer("target_duty_weekday").default(0),
  targetDutyWeekend: integer("target_duty_weekend").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// -------------------------------------------------------------------
// 4. memberships(医局-ユーザーの関係)
// -------------------------------------------------------------------
export const memberships = pgTable(
  "ikyokuin_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => medicalDepartments.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // 'admin' | 'member'
    groupId: uuid("group_id").references(() => groups.id),
    status: text("status").notNull().default("active"), // 'active' | 'left'
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (t) => ({
    userDeptUnique: unique().on(t.userId, t.departmentId),
    deptIdx: index().on(t.departmentId),
    userIdx: index().on(t.userId),
  })
);

// -------------------------------------------------------------------
// 5. shift_periods(月単位の確定単位)
// -------------------------------------------------------------------
export const shiftPeriods = pgTable(
  "ikyokuin_shift_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => medicalDepartments.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    status: text("status").notNull().default("draft"), // 'draft' | 'confirmed'
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id),
    kibouDeadline: timestamp("kibou_deadline", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deptYearMonthUnique: unique().on(t.departmentId, t.year, t.month),
  })
);

// -------------------------------------------------------------------
// 6. shifts(個別シフト)
// -------------------------------------------------------------------
export const shifts = pgTable(
  "ikyokuin_shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => shiftPeriods.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    type: text("type").notNull(), // 'duty' | 'oncall' | 'gaikin'
    label: text("label"), // 例: '〇〇病院', 'ICU当直', '院内当直'
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    startTime: time("start_time"),
    endTime: time("end_time"),
    isSplit: boolean("is_split").notNull().default(false),
    splitRole: text("split_role"), // 分割時: '日直' | '当直'
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    periodDateIdx: index().on(t.periodId, t.date),
    userDateIdx: index().on(t.assignedUserId, t.date),
  })
);

// -------------------------------------------------------------------
// 7. invitations(招待URL)
// -------------------------------------------------------------------
export const invitations = pgTable("ikyokuin_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => medicalDepartments.id, { onDelete: "cascade" }),
  token: text("token").unique().notNull(),
  groupId: uuid("group_id").references(() => groups.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
