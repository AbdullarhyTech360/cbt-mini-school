import sqlite3

conn = sqlite3.connect('instance/users.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Tables in database:')
for table in tables:
    print(f'  - {table[0]}')

# Check if report_config table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='report_config'")
result = cursor.fetchone()
if result:
    print('\nreport_config table exists')
    # Get columns in report_config table
    cursor.execute("PRAGMA table_info(report_config)")
    columns = cursor.fetchall()
    print('Columns in report_config table:')
    for column in columns:
        print(f'  - {column[1]} ({column[2]})')
else:
    print('\nreport_config table does not exist')

conn.close()