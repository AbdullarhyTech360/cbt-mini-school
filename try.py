# A python code to show how to use sqlite3 database

# import the library

import sqlite3

# establish a connection
connection = sqlite3.connect("my_database.db")

# create a cursor object
cursor = connection.cursor()

# You can start creating tables
cursor.execute(
    "CREATE TABLE IF NOT EXISTS products (name TEXT, price REAL)"
)

# # Insert data
# cursor.execute(
#     "INSERT INTO products VALUES ('Macbook', 999)"
# )

# #Commit changes
# connection.commit() 

# select some items from the db
cursor.execute(
    "SELECT * FROM products"
)

print(cursor.fetchall())
