from tethys_sdk.base import TethysAppBase, url_map_maker

class LisCropObserver(TethysAppBase):
    """
    Tethys app class for Lis Crop Observer.
    """

    name = 'Lis Crop Observer'
    index = 'lis_crop_observer:home'
    icon = 'lis_crop_observer/images/icon.gif'
    package = 'lis_crop_observer'
    root_url = 'lis-crop-observer'
    color = '#c0392b'
    description = 'Place a brief description of your app here.'
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
            UrlMap(name='upload-shp',
                   url='lis-crop-observer/upload-shp',
                   controller='lis_crop_observer.ajax_controllers.upload_shp'
            ),
        )

        return url_maps
