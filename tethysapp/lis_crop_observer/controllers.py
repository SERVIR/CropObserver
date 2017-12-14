from django.shortcuts import render, reverse, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .model import add_new_shapefile
from tethys_sdk.gizmos import *
from django.http import JsonResponse, HttpResponse
import json,shapely.geometry
from lis import *
from utilities import *


LIS_DIRECTORY = "/Users/TylorBayer/lis"
SHAPEFILES = "/Users/TylorBayer/tethysdev/tethysapp-lis_crop_observer/tethysapp/lis_crop_observer/workspaces/"

@login_required()
def home(request):
    """
    Controller for the app home page.
    """

    display_vars = {'RootzoneSoilPercentile': 'Rootzone Soil Percentile',
                    'SurfaceSoilPercentile': 'Surface Soil Percentile', 'TWSPercentile': 'TWS Percentile'}

    var_metadata, cbar = get_range(LIS_DIRECTORY, display_vars, 20)

    var_metadata = json.dumps(var_metadata)
    cbar = json.dumps(cbar)

    var_list = get_lis_variables(LIS_DIRECTORY)

    crop_list = get_crops(SHAPEFILES)

    dates_list = get_lis_dates(LIS_DIRECTORY)

    slider_max = len(dates_list)

    first_day = dates_list[0][0]

    variable_select = SelectInput(display_text='Select Variables to Display',
                                  name='variable-select',
                                  multiple=True,
                                  options=var_list, )

    crop_select = SelectInput(display_text='Select a Crop',
                                  name='crop-select',
                                  options=crop_list,
                              )

    district_select = SelectInput(display_text='Select a District',
                                  name='district-select',
                              )

    date_select = SelectInput(display_text='Select a Date',
                              name='date-select',
                              options=dates_list,
                              )

    crop_name = TextInput(display_text='Enter Crop Name',
                          name='crop-name'
                          )

    context = {
        'host': 'http://%s' % request.get_host(),
        'variable_select': variable_select,
        'district_select': district_select,
        'crop_select': crop_select,
        'date_select': date_select,
        'first_day': first_day,
        'slider_max': slider_max,
        'display_vars': display_vars,
        'var_metadata': var_metadata,
        'cbar': cbar,
        'crop_name':crop_name,
    }

    return render(request, 'lis_crop_observer/home.html', context)


@login_required()
def get_ts(request):

    return_obj = {}

    if request.is_ajax() and request.method == 'POST':

        var_list = get_lis_variables(LIS_DIRECTORY)
        values = {}

        for var in var_list:
            try:
                variable = request.POST[str(var[0])]

                variable_info = get_variable_info(LIS_DIRECTORY, variable)

                pt_coords = request.POST['point-lat-lon']
                poly_coords = request.POST['poly-lat-lon']
                shp_bounds = request.POST['shp-lat-lon']

                if pt_coords:
                    graph = get_pt_timeseries(LIS_DIRECTORY, variable, pt_coords)
                    graph = json.loads(graph)
                    if graph["success"] == "success":
                        values.update({variable: graph["values"]})
                        return_obj["location"] = graph["point"]
                        return_obj["display_name"] = variable_info["display_name"]
                        return_obj["units"] = variable_info["units"]

                        return_obj["success"] = "success"

                    if graph["success"] != "success":
                        return_obj["success"] = graph["success"]

                if poly_coords:
                    poly_geojson = json.loads(poly_coords)
                    shape_obj = shapely.geometry.asShape(poly_geojson)
                    poly_bounds = shape_obj.bounds
                    graph = get_poly_timeseries(LIS_DIRECTORY, variable, poly_bounds)
                    graph = json.loads(graph)
                    if graph["success"] == "success":
                        values.update({variable: graph["values"]})
                        return_obj["location"] = graph["bounds"]
                        return_obj["display_name"] = variable_info["display_name"]
                        return_obj["units"] = variable_info["units"]

                        return_obj["success"] = "success"

                    if graph["success"] != "success":
                        return_obj["success"] = graph["success"]

                if shp_bounds:
                    shp_bounds = tuple(shp_bounds.split(','))
                    graph = get_poly_timeseries(LIS_DIRECTORY, variable, shp_bounds)
                    graph = json.loads(graph)
                    if graph["success"] == "success":
                        values.update({variable: graph["values"]})
                        return_obj["location"] = graph["bounds"]
                        return_obj["display_name"] = variable_info["display_name"]
                        return_obj["units"] = variable_info["units"]

                        return_obj["success"] = "success"

                    if graph["success"] != "success":
                        return_obj["success"] = graph["success"]

                return_obj["values"] = values

            except:
                pass


    return JsonResponse(return_obj)

