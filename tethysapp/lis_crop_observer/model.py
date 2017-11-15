import os
import uuid
import json
from .app import LisCropObserver as app

def add_new_shapefile(name):
    """
    Persist new shapefile.
    """
    # Serialize data to json
    new_shapefile_id = uuid.uuid4()
    shapefile_dict = {
        'id': str(new_shapefile_id),
        'name': name
    }

    shapefile_json = json.dumps(shapefile_dict)

    # Write to file in app_workspace/shapefiles/{{uuid}}.json
    # Make shapefiles dir if it doesn't exist
    app_workspace = app.get_app_workspace()
    shapefiles_dir = os.path.join(app_workspace.path, 'shapefiles')
    if not os.path.exists(shapefiles_dir):
        os.mkdir(shapefiles_dir)

    # Name of the file is its id
    file_name = str(new_shapefile_id) + '.json'
    file_path = os.path.join(shapefiles_dir, file_name)

    # Write json
    with open(file_path, 'w') as f:
        f.write(shapefile_json)