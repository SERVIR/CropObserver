from django.http import JsonResponse, Http404, HttpResponse
from utilities import *
import json
import shapely.geometry
import os
import uuid
import json
from .app import LisCropObserver as app
from django.shortcuts import *

def upload_shp(request):

    return_obj = {
        'success':False
    }

    #Check if its an ajax post request
    if request.is_ajax() and request.method == 'POST':
        #Gettings the file list and converting the files to a geojson object. See utilities.py for the convert_shp function.
        file_list = request.FILES.getlist('files')
        shp_json = convert_shp(file_list)
        gjson_obj = json.loads(shp_json)
        geometry = gjson_obj["features"][0]["geometry"]
        shape_obj = shapely.geometry.asShape(geometry)
        poly_bounds = shape_obj.bounds

        #Returning the bounds and the geo_json object as a json object
        return_obj["bounds"] = poly_bounds
        return_obj["geo_json"] = gjson_obj
        return_obj["success"] = True

        # Serialize data to json
        for file in file_list:
            crop_name = file.name
        #crop = crop_name(file_list)
        #new_crop_id = uuid.uuid4()
        crop_dict = {
            #'id': str(new_crop_id),
            'crop_name': str(crop_name),
            'poly_bounds': poly_bounds,
            'gjson_obj': gjson_obj,
            'success': True
        }

        crop_json = json.dumps(crop_dict)

        # Write to file in app_workspace/dams/{{uuid}}.json
        # Make dams dir if it doesn't exist
        app_workspace = app.get_app_workspace()
        crops_dir = os.path.join(app_workspace.path, 'crops')
        if not os.path.exists(crops_dir):
            os.mkdir(crops_dir)

        # Name of the file is its crop_name
        file_name = str(os.path.splitext(crop_name)[0]) + '.json'
        file_path = os.path.join(crops_dir, file_name)

        # Write json
        with open(file_path, 'w') as f:
            f.write(crop_json)

    return JsonResponse(return_obj)



