import { db } from './index';
import { users, settings } from './schema';
import * as bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  // Seed default settings
  const defaultSettings = [
    {
      key: 'max_zip_size_mb',
      value: '10',
      type: 'int',
      description: 'Maksymalny rozmiar pliku ZIP w megabajtach'
    },
    {
      key: 'max_code_length',
      value: '100000',
      type: 'int',
      description: 'Maksymalna długość kodu w znakach'
    },
    {
      key: 'allowed_zip_extensions',
      value: 'php,py,js,ts,jsx,tsx,html,css,scss,sass,txt,md,json,yaml,yml,xml,sql,sh,bash,c,cpp,h,java,kt,go,rs,vue,cs,rb,swift',
      type: 'string',
      description: 'Dozwolone rozszerzenia plików wewnątrz przesyłanych archiwów ZIP'
    },
    {
      key: 'session_timeout_minutes',
      value: '60',
      type: 'int',
      description: 'Czas w minutach po którym następuje automatyczne wylogowanie z powodu nieaktywności'
    }
  ];

  for (const s of defaultSettings) {
    await db.insert(settings)
      .values(s)
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: s.value, type: s.type, description: s.description }
      });
  }
  console.log('✅ Default settings seeded');

  // Seed admin user
  const adminEmail = 'admin@example.com';
  const existingAdmin = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, adminEmail)
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.insert(users).values({
      name: 'Administrator',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    });
    console.log('✅ Default admin user created (admin@example.com / admin123)');
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  console.log('Seeding completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
