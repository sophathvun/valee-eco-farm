import sqlite3
import os

def create_database():
    # ទីតាំងឯកសារ Database
    db_path = 'farm_database.db'
    
    # ភ្ជាប់ទៅកាន់ SQLite (វានឹងបង្កើតឯកសារ farm_database.db ដោយស្វ័យប្រវត្តិប្រសិនបើវាមិនទាន់មាន)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # បង្កើតតារាង ប្រភេទ (Categories) សម្រាប់កំណត់ចំណូល ឬ ចំណាយ
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL -- ប្រើពាក្យ 'income' (ចំណូល) ឬ 'expense' (ចំណាយ)
        )
    ''')
    
    # បង្កើតតារាង ប្រតិបត្តិការ (Transactions សម្រាប់កត់ត្រាចំណូលចំណាយប្រចាំថ្ងៃ)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            category_id INTEGER,
            description TEXT,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
    ''')
    
    # បញ្ចូលទិន្នន័យប្រភេទខ្លះៗជាស្រេច (Default Categories សម្រាប់កសិដ្ឋានជ្រូក) ប្រសិនបើតារាងទទេ
    cursor.execute('SELECT COUNT(*) FROM categories')
    if cursor.fetchone()[0] == 0:
        default_categories = [
            ('លក់ជ្រូកសាច់', 'income'),
            ('លក់កូនជ្រូក', 'income'),
            ('លក់ជី (លាមកជ្រូក)', 'income'),
            ('ចំណីជ្រូក', 'expense'),
            ('ថ្នាំសង្កូវ និងវ៉ាក់សាំង', 'expense'),
            ('ប្រាក់ខែបុគ្គលិក', 'expense'),
            ('ថ្លៃទឹក និងភ្លើង', 'expense'),
            ('ថ្លៃដឹកជញ្ជូន', 'expense'),
            ('ផ្សេងៗ', 'expense')
        ]
        cursor.executemany('INSERT INTO categories (name, type) VALUES (?, ?)', default_categories)
    
    # Save (Commit) និងបិទការភ្ជាប់
    conn.commit()
    conn.close()
    
    print(f"ជោគជ័យ! មូលដ្ឋានទិន្នន័យត្រូវបានបង្កើតនៅ: {os.path.abspath(db_path)}")

if __name__ == '__main__':
    create_database()
