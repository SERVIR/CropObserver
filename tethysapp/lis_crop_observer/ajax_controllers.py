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


        app_workspace = app.get_app_workspace()
        crops_dir = os.path.join(app_workspace.path, 'crops')
        if not os.path.exists(crops_dir):
            os.mkdir(crops_dir)


        # Serialize data to json
        for file in file_list:
            crop_name = file.name
        file_name = str(os.path.splitext(crop_name)[0])

        crop_json = json.dumps(return_obj)
        #poly_bounds = json.dumps(poly_bounds)
        #gjson_obj = json.dumps(gjson_obj)


        crop_file = os.path.join(crops_dir, file_name)
        if not os.path.exists(crop_file):
            os.mkdir(crop_file)


        # Name of the file is its crop_name
        file_name = str(os.path.splitext(crop_name)[0]) + '.json'
        file_path = os.path.join(crop_file, file_name)
        #polybounds_path = os.path.join(crop_file, 'polybounds.json')
        #gjsonobj_path = os.path.join(crop_file, 'gjsonobj.json')


        # Write json
        with open(file_path, 'w') as f:
            f.write(crop_json)
        #with open(polybounds_path, 'w') as f:
            #f.write(poly_bounds)
        #with open(gjsonobj_path, 'w') as f:
            #f.write(gjson_obj)

    return JsonResponse(return_obj)

def use_existing_shapefile(request):

    return_obj = {
        'success':False
    }


    #Check if its an ajax post request
    if request.is_ajax() and request.method == 'POST':
        post_crop = request.POST.get('crop')
        return_obj['name'] = post_crop
        app_workspace = app.get_app_workspace()
        crops_dir = os.path.join(app_workspace.path, 'crops')
        for file in os.listdir(crops_dir):
            if post_crop == file:
                cor_crop = os.path.join(crops_dir, file)
                for cropfile in os.listdir(cor_crop):
                    cropinfo = os.path.join(cor_crop, cropfile)
                    with open(cropinfo, 'r') as f:
                        return_obj = json.loads(f.readlines()[0])


    return JsonResponse(return_obj)



