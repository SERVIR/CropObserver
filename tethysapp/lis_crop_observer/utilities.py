from netCDF4 import Dataset
from datetime import datetime
import numpy as np
import os, tempfile, shutil,functools
import json
import shapely.geometry, shapely.ops
import fiona
import pyproj
import geojson, ast
from colour import Color
import time as tim
import uuid
from .app import LisCropObserver as app


def get_lis_variables(directory):

    dir_path = os.path.join(directory,'')

    for file in os.listdir(dir_path):
        nc_fid = Dataset(dir_path+file,'r')
        nc_var = nc_fid.variables

        var_list = []
        for var,name in zip(nc_var.values(),nc_fid.variables.keys()):
            has_long_name = False
            for attr in var.ncattrs():
                if attr == "long_name":
                    has_long_name = True
            if has_long_name is False:
                display_name = name
                var_list.append((str(display_name), name))

        return var_list


def get_lis_dates(directory):
    dir_path = os.path.join(directory, '')

    select_dates = []
    for file in sorted(os.listdir(dir_path)):
        nc_fid = Dataset(dir_path + file, 'r')
        nc_var = nc_fid.variables

        time = nc_var['time'][:]

        for timestep, v in enumerate(time):
            current_date = datetime.fromtimestamp(int(v)).strftime('%Y_%m_%d')
            display_date = datetime.fromtimestamp(int(v)).strftime('%Y %B %d')
            select_dates.append([display_date,current_date])

    return select_dates


def get_range(directory,var_list,breaks):

    dir_path = os.path.join(directory, '')

    red = Color("red")
    colors = list(red.range_to(Color("blue"), breaks))
    cbar = [c.hex for c in colors]

    var_metadata = []
    for var_name in var_list:
        var_json = {}
        var_min = []
        var_max = []
        for file in sorted(os.listdir(dir_path)):
            nc_fid = Dataset(dir_path + file, 'r')
            time = nc_fid.variables['time'][:]

            for timestep, v in enumerate(time):
                current_timestep = nc_fid.variables[var_name][timestep, :, :]
                var_min.append(current_timestep.min())
                var_max.append(current_timestep.max())

        dif = float(max(var_max)) - float(min(var_min))

        interval = range(min(var_min),max(var_max),int(dif/breaks))
        var_json["min"] = float(min(var_min))
        var_json["max"] = float(max(var_max))
        var_json["interval"] = interval
        var_json["name"] = var_name
        var_metadata.append(var_json)

    return var_metadata,cbar


def get_variable_info(directory,variable):
    dir_path = os.path.join(directory, '')

    for file in os.listdir(dir_path):
        nc_fid = Dataset(dir_path + file, 'r')
        nc_var = nc_fid.variables

        for var, name in zip(nc_var.values(), nc_fid.variables.keys()):
            if name == variable:
                lname_found = False
                for attr in var.ncattrs():
                    if attr == "long_name":
                        lname_found = True
                if lname_found == False:
                    var_info = {}
                    display_name = name
                    units = "Percentile"
                    var_info["display_name"] = display_name
                    var_info["units"] = units

        return var_info


def get_poly_timeseries(directory,var_name,bounds):

    dir_path = os.path.join(directory, '')

    graph_json = {}

    miny = float(bounds[1])
    minx = float(bounds[0])
    maxx = float(bounds[2])
    maxy = float(bounds[3])

    ts_plot = []

    for file in sorted(os.listdir(dir_path)):
        nc_fid = Dataset(dir_path + file, 'r')
        lats = nc_fid.variables['lat'][:]
        lons = nc_fid.variables['lon'][:]
        time = nc_fid.variables['time'][:]
        abslat = np.abs(lats - miny)
        abslon = np.abs(lons - minx)
        abslat2 = np.abs(lats - maxy)
        abslon2 = np.abs(lons - maxx)

        for timestep, v in enumerate(time):
            current_timestep = nc_fid.variables[var_name][timestep, :, :]

            lon_idx = (abslat.argmin())
            lat_idx = (abslon.argmin())
            lon2_idx = (abslat2.argmin())
            lat2_idx = (abslon2.argmin())

            var_vals = current_timestep[lat_idx:lat2_idx, lon_idx:lon2_idx]
            var_val = np.mean(var_vals)
            utc_time = tim.mktime(datetime.strptime(str(v), "%Y%m%d").timetuple())
            ts_plot.append([utc_time * 1000, round(float(var_val), 3)])

    graph_json["values"] = ts_plot
    graph_json["bounds"] = [round(minx,2),round(miny,2),round(maxx,2),round(maxy,2)]
    graph_json["success"] = "success"
    graph_json = json.dumps(graph_json)

    return graph_json


def get_pt_timeseries(directory,var_name,pt_coords):

    dir_path = os.path.join(directory,'')

    # print dir_path,var_name
    coords = pt_coords.split(',')
    stn_lat = float(coords[1])
    stn_lon = float(coords[0])

    ts_plot = []
    graph_json = {}
    try:
        for file in sorted(os.listdir(dir_path)):
            nc_fid = Dataset(dir_path+file,'r')
            lats = nc_fid.variables['lat'][:]
            lons = nc_fid.variables['lon'][:]
            time = nc_fid.variables['time'][:]
            abslat = np.abs(lats - stn_lat)  # Finding the absolute latitude
            abslon = np.abs(lons - stn_lon)  # Finding the absolute longitude
            for timestep,v in enumerate(time):

                current_timestep = nc_fid.variables[var_name][timestep,:,:]

                lon_idx = (abslat.argmin())
                lat_idx = (abslon.argmin())

                var_val = current_timestep[lat_idx,lon_idx]
                utc_time = tim.mktime(datetime.strptime(str(v), "%Y%m%d").timetuple())
                ts_plot.append([utc_time * 1000, round(float(var_val), 3)])


        graph_json["values"] = ts_plot
        graph_json["point"] = [round(stn_lat, 2), round(stn_lon, 2)]
        graph_json["success"] = "success"
        graph_json = json.dumps(graph_json)
        return graph_json

    except Exception as e:
        graph_json["success"] = e

        graph_json = json.dumps(graph_json)
        return graph_json


#Conver the shapefiles into a geojson object
def convert_shp(files):

    #Initizalizing an empty geojson string.
    geojson_string = ''

    try:
        #Storing the uploaded files in a temporary directory
        temp_dir = tempfile.mkdtemp()
        for f in files:
            f_name = f.name
            f_path = os.path.join(temp_dir,f_name)

            with open(f_path,'wb') as f_local:
                f_local.write(f.read())

        #Getting a list of files within the temporary directory
        for file in os.listdir(temp_dir):
            #Reading the shapefile only
            if file.endswith(".shp"):
                f_path = os.path.join(temp_dir,file)
                omit = ['SHAPE_AREA', 'SHAPE_LEN']

                #Reading the shapefile with fiona and reprojecting it
                with fiona.open(f_path) as source:
                    project = functools.partial(pyproj.transform,
                                                pyproj.Proj(**source.crs),
                                                pyproj.Proj(init='epsg:3857'))
                    features = []
                    for f in source:
                        shape = shapely.geometry.shape(f['geometry']) #Getting the shape of the shapefile
                        projected_shape = shapely.ops.transform(project, shape) #Transforming the shapefile

                        # Remove the properties we don't want
                        props = f['properties']  # props is a reference
                        for k in omit:
                            if k in props:
                                del props[k]

                        feature = geojson.Feature(id=f['id'],
                                                  geometry=projected_shape,
                                                  properties=props) #Creating a geojson feature by extracting properties through the fiona and shapely.geometry module
                        features.append(feature)
                    fc = geojson.FeatureCollection(features)

                    geojson_string = geojson.dumps(fc) #Creating the geojson string


    except:
        return 'error'
    finally:
        #Delete the temporary directory once the geojson string is created
        if temp_dir is not None:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

    return geojson_string

def get_crops(directory):
    crops_dir = os.path.join(directory, 'app_workspace/crops/')
    if not os.path.exists(crops_dir):
        os.mkdir(crops_dir)

    crops = []

    crops.append(("",""))
    for crop in os.listdir(crops_dir):
        crops.append((str(crop),str(crop)))

    return crops



#def find_shp(directory, crop):
    #crops_dir = os.path.join(directory, 'app_workspace/crops/')
    #for file in crops_dir:
        #file_name =


    #return shapefile
