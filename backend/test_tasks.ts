import { db } from './src/db';
import { tasks } from './src/db/schema';
import { desc } from 'drizzle-orm';

async function main() {
    try {
        console.log("Fetching tasks test...");
        const allTasks = await db.query.tasks.findMany({
            orderBy: [desc(tasks.createdAt)],
            with: {
                author: { columns: { name: true, email: true } }
            }
        });
        console.log("Tasks length:", allTasks.length);
    } catch(err) {
        console.error("Error fetching tasks:", err);
    }
}
main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
