
import mysql.connector
import os

def get_db_connection():
    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME", "lifeline_db"),
        port=int(os.getenv("DB_PORT", "3306"))
    )
    return connection


if __name__ == "__main__":
    try:
        connection = get_db_connection()

        if connection.is_connected():
            print("LifeLine database connected successfully!")

        connection.close()

    except mysql.connector.Error as error:
        print("Database connection failed:", error)
