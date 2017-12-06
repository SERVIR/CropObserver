from django.http import JsonResponse, Http404, HttpResponse
from utilities import *
import json, os, pyproj, fiona, geojson
import shapely.geometry
from .app import LisCropObserver as app
import datetime
from django.shortcuts import *


def upload_shp(request):
    return_obj = {
        'success': False
    }

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'POST':
        # Gettings the file list and converting the files to a geojson object. See utilities.py for the convert_shp function.
        file_list = request.FILES.getlist('files')
        shp_json = convert_shp(file_list)
        gjson_obj = json.loads(shp_json)
        geometry = gjson_obj["features"][0]["geometry"]
        shape_obj = shapely.geometry.asShape(geometry)
        poly_bounds = shape_obj.bounds

        # Returning the bounds and the geo_json object as a json object
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

        crop_file = os.path.join(crops_dir, file_name)
        if not os.path.exists(crop_file):
            os.mkdir(crop_file)

        # Name of the file is its crop_name
        file_name = str(os.path.splitext(crop_name)[0]) + '.json'
        file_path = os.path.join(crop_file, file_name)

        # Write json
        with open(file_path, 'w') as f:
            f.write(crop_json)

    return JsonResponse(return_obj)


def upload_multiple_polygon_shp(request):
    return_obj = {
        'success': False
    }

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'POST':
        file_list = request.FILES.getlist('files')
        # Initizalizing an empty geojson string.
        geojson_string = ''

        try:
            # Storing the uploaded files in a temporary directory
            temp_dir = tempfile.mkdtemp()
            for f in file_list:
                f_name = f.name
                f_path = os.path.join(temp_dir, f_name)

                with open(f_path, 'wb') as f_local:
                    f_local.write(f.read())


            app_workspace = app.get_app_workspace()
            for file in os.listdir(temp_dir):
                # Reading the shapefile only
                if file.endswith(".shp"):
                    f_path = os.path.join(temp_dir, file)
                    omit = ['SHAPE_AREA', 'SHAPE_LEN']
                    with fiona.open(f_path) as source:
                        project = functools.partial(pyproj.transform,
                                                pyproj.Proj(**source.crs),
                                                pyproj.Proj(init='epsg:3857'))
                        for f in source:
                            geojson_string = ''
                            return_obj = {'success': False}
                            features = []
                            district = (f['properties']['NAME_3'])
                            shape = shapely.geometry.shape(f['geometry'])  # Getting the shape of the shapefile
                            projected_shape = shapely.ops.transform(project, shape)  # Transforming the shapefile
                            # Remove the properties we don't want
                            props = f['properties']  # props is a reference
                            for k in omit:
                                if k in props:
                                    del props[k]

                            feature = geojson.Feature(id=f['id'],
                                                  district=district,
                                                  geometry=projected_shape,
                                                  properties=props)  # Creating a geojson feature by extracting properties through the fiona and shapely.geometry module
                            features.append(feature)
                            fc = geojson.FeatureCollection(features)
                            geometry = fc["features"][0]["geometry"]
                            shape_obj = shapely.geometry.asShape(geometry)
                            poly_bounds = shape_obj.bounds

                            # Returning the bounds and the geo_json object as a json object
                            return_obj["bounds"] = poly_bounds
                            return_obj["geo_json"] = fc
                            return_obj["success"] = True

                            district_json = json.dumps(return_obj)

                            crops_dir = os.path.join(app_workspace.path, 'crops')
                            if not os.path.exists(crops_dir):
                                os.mkdir(crops_dir)

                            crop_dir = os.path.join(crops_dir, 'xxxxxxxxxxx')
                            if not os.path.exists(crop_dir):
                                os.mkdir(crop_dir)

                            # Name of the file is its crop_name
                            file_name = district + '.json'
                            file_path = os.path.join(crop_dir, file_name)

                            # Write json
                            with open(file_path, 'w') as f:
                                f.write(district_json)
        except:
            return 'error'
        finally:
            # Delete the temporary directory once the geojson string is created
            if temp_dir is not None:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)

    return JsonResponse(return_obj)


def use_existing_shapefile(request):
    return_obj = {
        'success': False
    }

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'GET':
        post_crop = request.GET.get('crop')
        post_dist = request.GET.get('district')
        return_obj['name'] = post_crop
        app_workspace = app.get_app_workspace()
        crops_dir = os.path.join(app_workspace.path, 'crops')
        for file in os.listdir(crops_dir):
            if post_crop == file:
                cor_crop = os.path.join(crops_dir, file)
                for distfile in os.listdir(cor_crop):
                    if distfile == post_dist + '.json':
                        distinfo = os.path.join(cor_crop, distfile)
                        with open(distinfo, 'r') as f:
                            return_obj = json.loads(f.readlines()[0])

    return JsonResponse(return_obj)


def get_districts(request):
    return_obj = {
        'success': False
    }

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'GET':
        crop = request.GET.get('crop')
        app_workspace = app.get_app_workspace()
        crops_dir = os.path.join(app_workspace.path, 'crops')
        dist_dir = os.path.join(crops_dir, crop)

        districts = []

        for district in os.listdir(dist_dir):
            district_name = str(os.path.splitext(district)[0])
            districts.append(district_name)

        return_obj['districts'] = districts

    return JsonResponse(return_obj)


def crop_district_info(request):
    return_obj = {
        'success': False
    }

    info_html = ""

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'GET':
        json_path = "crops/" + request.GET.get('json_path')
        app_workspace = app.get_app_workspace()
        json_path = os.path.join(app_workspace.path, json_path)
        data = json.load(open(json_path))

        json_properties = data["geo_json"]["features"][0]["properties"]

        crop_percentage = "Crop Percentage not found."

        planting = []
        growing = []
        harvesting = []

        for property in json_properties:
            if property[3:] == "percent":
                crop_percentage = json_properties[property]

            if json_properties[property] == 1.0:
                planting.append(property[5:].title())

            if json_properties[property] == 2.0:
                growing.append(property[5:].title())

            if json_properties[property] == 3.0:
                harvesting.append(property[5:].title())

        info_html += "Crop land cover percentage: " + crop_percentage + " "

        info_html += "<br>Planting months:"
        for month in planting:
            info_html += "  " + month

        info_html += "<br>Growing months:"
        for month in growing:
            info_html += "  " + month

        info_html += "<br>Harvesting months:"
        for month in harvesting:
            info_html += "  " + month

        return_obj['info_html'] = info_html

    return JsonResponse(return_obj)


def change_dir(request):
    return_obj = {
        'success': False
    }

    crops = []

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'GET':
        crop_name = request.GET.get('crop_name')
        app_workspace = app.get_app_workspace()
        crops_dir = os.path.join(app_workspace.path, 'crops')
        os.rename(os.path.join(crops_dir, 'xxxxxxxxxxx'),
              os.path.join(crops_dir, crop_name))

        for cropfiles in os.listdir(crops_dir):
            name = str(os.path.splitext(cropfiles)[0])
            crops.append(name)

        return_obj['crops'] = crops

    return JsonResponse(return_obj)

def get_crop_percentage(request):
    return_obj = {
        'success': False
    }

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'GET':
        crop = request.GET.get('crop')
        app_workspace = app.get_app_workspace()
        crops_dir = os.path.join(app_workspace.path, 'crops')
        dist_dir = os.path.join(crops_dir, crop)

        districts = []

        for district in os.listdir(dist_dir):
            district_name = str(os.path.splitext(district)[0])
            districts.append(district_name)

        return_obj['districts'] = districts

    return JsonResponse(return_obj)
