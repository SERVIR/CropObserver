from tethys_sdk.base import TethysAppBase, url_map_maker

class LisCropObserver(TethysAppBase):
    """
    Tethys app class for Lis Crop Observer.
    """

    name = 'LIS Crop Observer'
    index = 'lis_crop_observer:home'
    icon = 'lis_crop_observer/images/logo.png'
    package = 'lis_crop_observer'
    root_url = 'lis-crop-observer'
    color = '#c0392b'
    description = 'View LIS Crop data for HKH region.'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='lis-crop-observer',
                controller='lis_crop_observer.controllers.home'
                ),
            UrlMap(name='get-ts',
                   url='lis-crop-observer/get-ts',
                   controller='lis_crop_observer.controllers.get_ts'
                   ),
            UrlMap(name='upload-multiple-polygon-shp',
                   url='lis-crop-observer/upload-multiple-polygon-shp',
                   controller='lis_crop_observer.ajax_controllers.upload_multiple_polygon_shp'
                   ),
            UrlMap(name='change-dir',
                   url='lis-crop-observer/change-dir',
                   controller='lis_crop_observer.ajax_controllers.change_dir'
                   ),
            UrlMap(name='use-existing-shapefile',
                   url='lis-crop-observer/use-existing-shapefile',
                   controller='lis_crop_observer.ajax_controllers.use_existing_shapefile'
                   ),
            UrlMap(name='get-districts',
                   url='lis-crop-observer/get-districts',
                   controller='lis_crop_observer.ajax_controllers.get_districts'
                   ),
            UrlMap(name='crop-district-info',
                   url='lis-crop-observer/crop-district-info',
                   controller='lis_crop_observer.ajax_controllers.crop_district_info'
                   ),
        )

        return url_maps
