import logging
import azure.functions as func
from . import CRUD



def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')

    req_body = req.get_json()
    color = req_body['color']
    num_box = req_body['num-box']
    action = req_body['action']

    if color and num_box and action:
        # upadte if record exists
        table_name = 'Stock'
        num_box = int(num_box)
        if action == 'remove':
            num_box = -(num_box)
        data = {'color':color, 'num_box':num_box}
        connection = CRUD.get_connection()
        connection = CRUD.insert_data(table_name, data, connection)
        CRUD.close_connection(connection)
        return func.HttpResponse(f"Hello, {action} {num_box} {color} boxes. This HTTP triggered function executed successfully.")
    else:
        return func.HttpResponse(
             "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.",
             status_code=200
        )
