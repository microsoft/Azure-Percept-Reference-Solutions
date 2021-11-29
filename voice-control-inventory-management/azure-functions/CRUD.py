# SQL Server Database Connection Properties

import pyodbc



# Return the sql connection
def get_connection():
    server = 'Your server name'
    database = 'Your database name'
    username = 'Your user name'
    password = 'Your password'
    driver= '{ODBC Driver 17 for SQL Server}'
    connection = pyodbc.connect('DRIVER={};SERVER={};PORT=1433;DATABASE={};UID={};PWD={}'.format(driver, server, database,username, password))
    return connection


def close_connection(connection):
    # Commit the data


    # Close the connection
    
    connection.close()
    print('Connection Closed')


def create_data(table_name, data, connection):
    str = ""
    value_list = []
    for i in range(len(data)):
        tmpstr = "?,"
        str = str + tmpstr
    sql_query = str[:-1]
    sql_query = "Insert Into " + table_name + " Values("+sql_query+")"
    cursor = connection.cursor()
    for key in data:
         value_list.append(data[key])
    cursor.execute(sql_query, value_list)
    connection.commit()
    return connection


def insert_data(table_name, data, connection):
    str = ""
    str_col = ""
    value_list = []
    for i in range(len(data)):
        tmpstr = "?,"
        str = str + tmpstr
    sql_query = str[:-1]
    for key in data:
        print(key)
        str_col = str_col + " " + key+","
    column_name = str_col[:-1]
    print(column_name)
    sql_query = "Insert Into " + table_name +"("+ column_name + ")" +" Values("+sql_query+")"
    print(sql_query)
    cursor = connection.cursor()
    for key in data:
         value_list.append(data[key])
    cursor.execute(sql_query, value_list)
    connection.commit()
    return connection

def read_data(table_name, data, connection):
    # Get the sql connection
    cursor = connection.cursor()

    sql_query = "select * from " + table_name
    if len(data)>0:
        sql_query = sql_query + " where 1=1"
        for key, value in data.items():
            sql_query = sql_query + " and " + key + " = " + "'" +value+ "'"
    # Execute the sql query
    result = cursor.execute(sql_query)
    rows= cursor.fetchall()
    number_rows = len(rows)
    return rows, number_rows

def update_data(table_name, data, condition_id, connection):
    # Get the sql connection
    value_list = []
    cursor = connection.cursor()

    sql_query = "Update " + table_name + " Set "
    if len(data)>0:
        for key in data:
            sql_query = sql_query + key + " = ?, "
        sql_query = sql_query[:-2]
        sql_query = sql_query + " where 1=1"
    if len(condition_id)>0:
        for key in condition_id:
            sql_query = sql_query + " and " + key+" =?"

    # Execute the update query
    for key in data:
        value_list.append(data[key])
    for key in condition_id:
        value_list.append(condition_id[key])

    cursor.execute(sql_query, value_list)
    connection.commit()
    return connection


