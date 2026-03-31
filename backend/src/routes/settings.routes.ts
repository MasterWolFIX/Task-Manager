import { Router } from 'express';
import { db } from '../db';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Zabezpieczenie wszystkich endpointów w tym routerze dla Admina
router.use(authMiddleware, requireAdmin);

// Pobierz ustawienia
router.get('/', async (req, res) => {
  try {
    // Pobierz wszystkie obecne ustawienia
    let allSettings = await db.query.settings.findMany();
    
    // Zestawienie pożądanego stanu domyślnego
    const defaultSettings = [
        { key: 'default_student_password', value: 'uczen123', type: 'string', description: 'Domyślne hasło dla nowych uczniów.' },
        { key: 'max_zip_size_mb', value: '50', type: 'int', description: 'Maksymalny limit uploadu (ZIP) w megabajtach.' }
    ];

    // Migracja/Konsolidacja: usuń "stare/duplikaty" jeśli istnieją pod innymi nazwami
    const oldKeys = ['max_file_size', 'zip_size_max'];
    for (const ok of oldKeys) {
        if (allSettings.find(s => s.key === ok)) {
            await db.delete(settings).where(eq(settings.key, ok));
        }
    }

    for (const ds of defaultSettings) {
        const found = allSettings.find(s => s.key === ds.key);
        if (!found) {
            await db.insert(settings).values(ds);
        }
    }
    
    // Pobierz ponownie
    allSettings = await db.query.settings.findMany();
    
    res.json(allSettings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Zaktualizuj ustawienie po kluczu
router.put('/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  if (value === undefined) return res.status(400).json({ message: 'Brak nowej wartości' });

  try {
    const [updated] = await db.update(settings).set({
      value: String(value),
      updatedAt: new Date(),
    }).where(eq(settings.key, key)).returning();

    if (!updated) return res.status(404).json({ message: 'Ustawienie nie istnieje' });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
