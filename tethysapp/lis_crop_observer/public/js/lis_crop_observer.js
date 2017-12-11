 /*****************************************************************************
 * FILE:    LIS EXPLORER JS
 * DATE:    15 June 2017
 * AUTHOR: Sarva Pulla
 * COPYRIGHT: (c) Brigham Young University 2017
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var LIBRARY_OBJECT = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library

    /************************************************************************
     *                      MODULE LEVEL / GLOBAL VARIABLES
     *************************************************************************/
    var animationDelay,
        cbar,
        current_layer,
        $btnUpload,
        $btnshape,
        element,
        $get_ts,
        layers,
        map,
        $modalUpload,
        popup,
        slider_max,
        sliderInterval,
        shpSource,
        shpLayer,
        var_info,
        wms_layer,
        wms_source;
    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var addDefaultBehaviorToAjax,
        add_wms,
        animate,
        cbar_str,
        checkCsrfSafe,
        clear_coords,
        update_vars,
        clear_vars,
        getCookie,
        init_events,
        init_vars,
        init_map,
        init_slider,
        get_ts,
        crop_district_info,
        stdev,
        gen_color_bar,
        prepare_files,
        upload_file,
        upload_multiple_polygon_file,
        use_existing_crop,
        get_districts,
        update_color_bar,
        update_wms;
    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/
    init_vars = function(){
        var $layers_element = $('#layers');
        slider_max = $layers_element.attr('data-slider-max');
        var_info = $layers_element.attr('data-var-info');
        var_info = JSON.parse(var_info);
        cbar = $layers_element.attr('data-color-bar');
        cbar = JSON.parse(cbar);
        $get_ts = $("#get-ts");
        $modalUpload = $("#modalUpload");
        $btnUpload = $("#btn-add-shp");
        $btnshape = $("#btn-ex-shp");
        animationDelay  = 1000;
        sliderInterval = {};
    };

    animate = function(){
        var sliderVal = $("#slider").slider("value");

        sliderInterval = setInterval(function() {
            sliderVal += 1;
            $("#slider").slider("value", sliderVal);
            if (sliderVal===slider_max - 1) sliderVal=0;
        }, animationDelay);
    };

    $(".btn-run").on("click", animate);
    //Set the slider value to the current value to start the animation at the );
    $(".btn-stop").on("click", function() {
        //Call clearInterval to stop the animation.
        clearInterval(sliderInterval);
    });

    $(".btn-increase").on("click", function() {
        clearInterval(sliderInterval);

        if(animationDelay > 250){

            animationDelay = animationDelay - 250;
            $("#speed").val((1/(animationDelay/1000)).toFixed(2));
            animate();
        }

    });

    $(".btn-decrease").on("click", function() {
        clearInterval(sliderInterval);
        animationDelay = animationDelay + 250;
        $("#speed").val((1/(animationDelay/1000)).toFixed(2));
        animate();
    });


    gen_color_bar = function(){
        var cv  = document.getElementById('cv'),
            ctx = cv.getContext('2d');
        var var_option = $("#vars").find('option:selected').val();
        var cur_variable;
        var_info.forEach(function(element){
            if(element["name"] == var_option) {
                cur_variable = element;
            }
        });
        cbar.forEach(function(color,i){
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.fillRect(i*35,0,35,20);
            ctx.fillText(cur_variable["interval"][i],i*35,30);
        });

    };

    update_color_bar = function(){
        var cv  = document.getElementById('cv'),
            ctx = cv.getContext('2d');
        ctx.clearRect(0,0,cv.width,cv.height);
        var var_option = $("#vars").find('option:selected').val();
        var cur_variable;
        var_info.forEach(function(element){
            if(element["name"] == var_option) {
                cur_variable = element;
            }
        });
        cbar.forEach(function(color,i){
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.fillRect(i*35,0,35,20);
            ctx.fillText(cur_variable["interval"][i],i*35,30);
        });
    };

    //Initialize any relevant events. This one make sures that the map is adjusted based on the window size.
    init_events = function() {
        (function () {
            var target, observer, config;
            // select the target node
            target = $('#app-content-wrapper')[0];

            observer = new MutationObserver(function () {
                window.setTimeout(function () {
                    map.updateSize();
                }, 350);
            });
            $(window).on('resize', function () {
                map.updateSize();
            });

            config = {attributes: true};

            observer.observe(target, config);
        }());

          map.on("singleclick",function(evt){

            $(element).popover('destroy');


            if (map.getTargetElement().style.cursor == "pointer" && $("#types").find('option:selected').val()=="None") {
                var clickCoord = evt.coordinate;
                popup.setPosition(clickCoord);
                var view = map.getView();
                var viewResolution = view.getResolution();

                var wms_url = current_layer.getSource().getGetFeatureInfoUrl(evt.coordinate, viewResolution, view.getProjection(), {'INFO_FORMAT': 'application/json'}); //Get the wms url for the clicked point
                if (wms_url) {
                    //Retrieving the details for clicked point via the url
                    $.ajax({
                        type: "GET",
                        url: wms_url,
                        dataType: 'json',
                        success: function (result) {
                            var value = parseFloat(result["features"][0]["properties"]["GRAY_INDEX"]);
                            value = value.toFixed(2);
                            $(element).popover({
                                'placement': 'top',
                                'html': true,
                                //Dynamically Generating the popup content
                                'content':'Value: '+value
                            });

                            $(element).popover('show');
                            $(element).next().css('cursor', 'text');


                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            console.log(Error);
                        }
                    });
                }
            }
        });

        map.on('pointermove', function(evt) {
            if (evt.dragging) {
                return;
            }
            var pixel = map.getEventPixel(evt.originalEvent);
            var hit = map.forEachLayerAtPixel(pixel, function(layer) {
                if (layer != layers[0]&& layer != layers[1] && layer != layers[2] && layer != layers[4]){
                    current_layer = layer;
                    return true;}
            });
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        });
    };

    //This function is critical as it will ensure that only one of three inputs has value
    clear_coords = function(){
        $("#poly-lat-lon").val('');
        $("#point-lat-lon").val('');
        $("#shp-lat-lon").val('');
    };

    clear_vars = function() {
        $(".variables").remove();
    };

    //Creating the map object
    init_map = function(){
        var projection = ol.proj.get('EPSG:3857');
        var baseLayer = new ol.layer.Tile({
            source: new ol.source.BingMaps({
                key: '5TC0yID7CYaqv3nVQLKe~xWVt4aXWMJq2Ed72cO4xsA~ApdeyQwHyH_btMjQS1NJ7OHKY8BK-W-EMQMrIavoQUMYXeZIQOUURnKGBOC7UCt4',
                imagerySet: 'AerialWithLabels' // Options 'Aerial', 'AerialWithLabels', 'Road'
            })
        });

        //Creating an empty source and empty layer for displaying the shpefile object
        shpSource = new ol.source.Vector();
        shpLayer = new ol.layer.Vector({
            source: shpSource
        });

        //Creating an empty source and empty layer for storing the drawn features
        var source = new ol.source.Vector({
            wrapX: false
        });
        var vector_layer = new ol.layer.Vector({
            name: 'my_vectorlayer',
            source: source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                })
            })
        });
        var fullScreenControl = new ol.control.FullScreen();
        var view = new ol.View({
            center: [9330000, 3285000],
            projection: projection,
            zoom:6.7
        });
        wms_source = new ol.source.ImageWMS();

        wms_layer = new ol.layer.Image({
            source: wms_source
        });
        layers = [baseLayer,vector_layer,shpLayer,wms_layer];
        map = new ol.Map({
            target: document.getElementById("map"),
            layers: layers,
            view: view
        });
        map.addControl(new ol.control.ZoomSlider());
        map.addControl(fullScreenControl);
        map.crossOrigin = 'anonymous';
        element = document.getElementById('popup');

        popup = new ol.Overlay({
            element: element,
            positioning: 'bottom-center',
            stopEvent: true
        });

        map.addOverlay(popup);

        //Code for adding interaction for drawing on the map
        var lastFeature, draw, featureType;

        //Clear the last feature before adding a new feature to the map
        var removeLastFeature = function () {
            if (lastFeature) source.removeFeature(lastFeature);
        };

        //Add interaction to the map based on the selected interaction type
        var addInteraction = function (geomtype) {
            var typeSelect = document.getElementById('types');
            var value = typeSelect.value;
            $('#data').val('');
            if (value !== 'None') {
                if (draw)
                    map.removeInteraction(draw);

                draw = new ol.interaction.Draw({
                    source: source,
                    type: geomtype
                });


                map.addInteraction(draw);
            }
            if (featureType === 'Point' || featureType === 'Polygon') {

                draw.on('drawend', function (e) {
                    lastFeature = e.feature;

                });

                draw.on('drawstart', function (e) {
                    source.clear();
                });

            }


        };

        vector_layer.getSource().on('addfeature', function(event){
            //Extracting the point/polygon values from the drawn feature
            var feature_json = saveData();
            var parsed_feature = JSON.parse(feature_json);
            var feature_type = parsed_feature["features"][0]["geometry"]["type"];
            if (feature_type == 'Point'){
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"];
                var proj_coords = ol.proj.transform(coords, 'EPSG:3857','EPSG:4326');
                $("#point-lat-lon").val(proj_coords);

            } else if (feature_type == 'Polygon'){
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"][0];
                proj_coords = [];
                coords.forEach(function (coord) {
                    var transformed = ol.proj.transform(coord,'EPSG:3857','EPSG:4326');
                    proj_coords.push('['+transformed+']');
                });
                var json_object = '{"type":"Polygon","coordinates":[['+proj_coords+']]}';
                $("#poly-lat-lon").val(json_object);
            }
        });
        function saveData() {
            // get the format the user has chosen
            var data_type = 'GeoJSON',
                // define a format the data shall be converted to
                format = new ol.format[data_type](),
                // this will be the data in the chosen format
                data;
            try {
                // convert the data of the vector_layer into the chosen format
                data = format.writeFeatures(vector_layer.getSource().getFeatures());
            } catch (e) {
                // at time of creation there is an error in the GPX format (18.7.2014)
                $('#data').val(e.name + ": " + e.message);
                return;
            }
            // $('#data').val(JSON.stringify(data, null, 4));
            return data;

        }

        //Retrieve the relevant modal or tool based on the map interaction item
        $('#types').change(function (e) {
            featureType = $(this).find('option:selected').val();
            if(featureType == 'None'){
                $('#data').val('');
                clear_coords();
                map.removeInteraction(draw);
                vector_layer.getSource().clear();
                shpLayer.getSource().clear();
            }else if(featureType == 'Upload')
            {
                clear_coords();
                vector_layer.getSource().clear();
                shpLayer.getSource().clear();
                map.removeInteraction(draw);
                $modalUpload.modal('show');
            }else if(featureType == 'Point')
            {
                clear_coords();
                shpLayer.getSource().clear();
                addInteraction(featureType);
            }else if(featureType == 'Polygon'){
                clear_coords();
                shpLayer.getSource().clear();
                addInteraction(featureType);
            }
        }).change();
        init_events();

    };

    upload_file = function(){
        var files = $("#shp-upload-input")[0].files;
        var data;

        $modalUpload.modal('hide');
        data = prepare_files(files);

        $.ajax({
            url: '/apps/lis-crop-observer/upload-shp/',
            type: 'POST',
            data: data,
            dataType: 'json',
            processData: false,
            contentType: false,
            error: function (status) {

            }, success: function (response) {
                alert(response)
                var extents = response.bounds;
                alert(extents)
                shpSource = new ol.source.Vector({
                    features: (new ol.format.GeoJSON()).readFeatures(response.geo_json)
               });
                shpLayer = new ol.layer.Vector({
                    name:'shp_layer',
                    extent:[extents[0],extents[1],extents[2],extents[3]],
                    source: shpSource,
                    style:new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'blue',
                            lineDash: [4],
                            width: 3
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(0, 0, 255, 0.1)'
                        })
                    })
                });
                map.addLayer(shpLayer);


                map.getView().fit(shpLayer.getExtent(), map.getSize());
                map.updateSize();
                map.render();

                var min = ol.proj.transform([extents[0],extents[1]],'EPSG:3857','EPSG:4326');
               var max = ol.proj.transform([extents[2],extents[3]],'EPSG:3857','EPSG:4326');
                var proj_coords = min.concat(max);
                $("#shp-lat-lon").val(proj_coords);

            }
        });


    };

//    $("#btn-add-shp").on('click',upload_file);

    upload_multiple_polygon_file = function(){
        var files = $("#shp-upload-input")[0].files;
        var data;


        $modalUpload.modal('hide');
        data = prepare_files(files);

        $.ajax({
            url: '/apps/lis-crop-observer/upload-multiple-polygon-shp/',
            type: 'POST',
            data: data,
            dataType: 'json',
            processData: false,
            contentType: false,
            error: function (status) {

            }, success: function (response) {

                var crop_name = $("#crop-name-input").val();
                $.ajax({
                    url: '/apps/lis-crop-observer/change-dir/',
                    type: 'GET',
                    data: {'crop_name':crop_name},
                    dataType: 'json',
                    contentType: false,
                    error: function (status) {

                    }, success: function (response) {

                        var crops = response.crops;
                        var i;
                        var crop;
                        $("#crop-select").empty()

                        for (i = 0; i < crops.length; i++) {
                            crop = crops[i];
                            $("#crop-select").append('<option value="' + crop + '">' + crop + '</option>');
                        }

                        var my_options = $("#crop-select option");
                        my_options.sort(function(a,b) {
                            if (a.text > b.text) return 1;
                            else if (a.text < b.text) return -1;
                            else return 0
                        })
                        $("#crop-select").empty().append(my_options);
                    }
                });
            }
        });


    };

    $("#btn-add-shp").on('click',upload_multiple_polygon_file);

    use_existing_crop = function(){
        var district = $("#district-select").val();
        var crop = $("#crop-select").val();



        $.ajax({
            url: '/apps/lis-crop-observer/use-existing-shapefile/',
            type: 'GET',
            data: {'district' : district, 'crop' : crop},
            contentType: 'application/json',
            error: function (status) {

            }, success: function (response) {
                var extents = [8912254.297839355, 3042186.2310263347, 9818825.48021192, 3561140.678325965];
                clear_coords();
                shpLayer.getSource().clear();
                shpSource = new ol.source.Vector({
                    features: (new ol.format.GeoJSON()).readFeatures(response.geo_json)
                });
                shpLayer = new ol.layer.Vector({
                    name:'shp_layer',
                    extent:[extents[0],extents[1],extents[2],extents[3]],
                    source: shpSource,
                    style:new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'blue',
                            lineDash: [4],
                            width: 3
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(0, 0, 255, 0.1)'
                        })
                    })
                });
                map.addLayer(shpLayer);



//                map.getView().fit(shpLayer.getExtent(), map.getSize());
//                map.updateSize();
                map.render();

                var min = ol.proj.transform([extents[0],extents[1]],'EPSG:3857','EPSG:4326');
                var max = ol.proj.transform([extents[2],extents[3]],'EPSG:3857','EPSG:4326');
                var proj_coords = min.concat(max);
                $("#shp-lat-lon").val(proj_coords);


            }
        });


    };

    $("#district-select").on('change',use_existing_crop);

    crop_district_info = function(){
        var crop = $("#crop-select").val();
        var district_name = $("#district-select").val();
        var json_path = crop + "/" + district_name + ".json";
        var info_html = "Crop and district shapefiles don't have correct info.";


        $.ajax({
            url: '/apps/lis-crop-observer/crop-district-info/',
            type: 'GET',
            data: {'json_path' : json_path},
            contentType: 'application/json',
            error: function (status) {

            }, success: function (response) {
                info_html = response.info_html;
                $('#crop-district-info').html(info_html);
            }
        });

    };


    get_districts = function(){
        var crop = $("#crop-select").val();


        $.ajax({
            url: '/apps/lis-crop-observer/get-districts/',
            type: 'GET',
            data: {'crop' : crop},
            contentType: 'application/json',
            error: function (status) {

            }, success: function (response) {

                var districts = response.districts;
                var i;
                var dist;
                $("#district-select").empty()

                for (i = 0; i < districts.length; i++) {
                    dist = districts[i];
                    $("#district-select").append('<option value="' + dist + '">' + dist + '</option>');
                }

                var my_options = $("#district-select option");
                my_options.sort(function(a,b) {
                    if (a.text > b.text) return 1;
                    else if (a.text < b.text) return -1;
                    else return 0
                })
                $("#district-select").empty().append(my_options);


            }
        });


    };

    $("#crop-select").on('change',get_districts);

    update_vars = function() {
        clear_vars();
        var select_vars = $("#variable-select").val();
        var variable = "";

        if (select_vars != null) {
            for (var i = 0; i < select_vars.length; i++) {
                variable = select_vars[i];
                $("#get-ts").append('<input type="text" name=' + variable + ' class="variables" id="' + variable + '" value="' + variable + '" hidden>');
            }
        }
    };


    stdev = function(arr) {
        var n = arr.length;
        var sum = 0;

        arr.map(function(data) {
            sum+=data;
        });

        var mean = sum / n;

        var variance = 0.0;
        var v1 = 0.0;
        var v2 = 0.0;

        if (n != 1) {
            for (var i = 0; i<n; i++) {
                v1 = v1 + (arr[i] - mean) * (arr[i] - mean);
                v2 = v2 + (arr[i] - mean);
            }

            v2 = v2 * v2 / n;
            variance = (v1 - v2) / (n-1);
            if (variance < 0) { variance = 0; }
            var stddev = Math.sqrt(variance);
        }

        return {
            mean: Math.round(mean*100)/100,
            variance: variance,
            deviation: Math.round(stddev*100)/100
        };
    };


    get_ts = function(){
        $('.warning').html('');
        var datastring = $get_ts.serialize();
        var var_list = $("#variable-select").val();
        $('#seasons-statistic-info').empty();

        $.ajax({
            type:"POST",
            url:'/apps/lis-crop-observer/get-ts/',
            dataType:'HTML',
            data:datastring,
            success:function(result){
                var json_response = JSON.parse(result);
                var district_name = $("#district-select").val();
                var crop_name = $("#crop-select").val();

                if (json_response.success == "success"){
                    $('.warning').html('');
                    var chart = $('#plotter').highcharts({
                        chart: {
                            type:'area',
                            zoomType: 'x'
                        },
                        title: {
                            text: json_response.display_name + " values for " + crop_name + " in district " + district_name,
                            style: {
                                fontSize: '14px'
                            }
                        },
                        xAxis: {
                            type: 'datetime',
                            labels: {
                                format: '{value:%d %b %Y}',
                                rotation: 45,
                                align: 'left'
                            },
                            title: {
                                text: 'Date'
                            }
                        },
                        yAxis: {
                            max:100,
                            title: {
                                text: json_response.units
                            }

                        },
                        exporting: {
                            enabled: true
                        },
                        series: [
                        //     {
                        //    type:'area',
                        //    name:'Planting Season',
                        //     marker:{enabled:false},
                        //     lineWidth:0,
                        //     color:'rgba(255,255,0,.5)',
                        //    data:[[1049155200000,0],[1049155200000,100],[1051747199000,100],[1051747199000,0]]
                        //
                        // },{
                        //    type:'area',
                        //    name:'Growing Season',
                        //     marker:{enabled:false},
                        //     lineWidth:0,
                        //     color:'rgba(51,102,0,.5)',
                        //    data:[[1051747200000,0],[1051747200000,100],[1057017599000,100],[1057017599000,0]]
                        //
                        // },{
                        //    type:'area',
                        //    name:'Harvesting Season',
                        //     marker:{enabled:false},
                        //     lineWidth:0,
                        //     color:'rgba(153,76,0,.5)',
                        //    data:[[1057017600000,0],[1057017600000,100],[1059695999000,100],[1059695999000,0]]
                        //
                        // }
                        ]
                    }).highcharts();

                    $('#seasons-statistic-info').append("<h5>Crop Season Statistics</h5>");

                    var seasons = ["Planting", "Growing", "Harvesting"];
                    var json_path = crop_name + "/" + district_name + ".json";
                    var season_months = []

                    $.ajax({
                        url: '/apps/lis-crop-observer/crop-district-info/',
                        type: 'GET',
                        data: {'json_path' : json_path},
                        contentType: 'application/json',
                        error: function (status) {

                        }, success: function (response) {
                            for(var i = 0; i < seasons.length; ++i) {
                                season_months[seasons[i]] = response.crop_seasons[seasons[i]];
                            }

                            for(var i = 0; i < var_list.length; ++i) {
                                var variable = var_list[i];
                                var values = json_response.values[variable];
                                $('#seasons-statistic-info').append("<h6>" + variable + "</h6>");

                                chart.addSeries({
                                    data: values,
                                    name: variable
                                });

                                for(var m = 0; m < seasons.length; ++m) {
                                    $('#seasons-statistic-info').append(seasons[m] + ":<br>");

                                    var crop_season_vals = [];
                                    var months =  season_months[seasons[m]];

                                    for(var n = 0; n < months.length; ++n) {
                                        for (var k = 0; k < values.length; ++k) {
                                            var date = new Date(values[k][0]).toString().substr(4, 3);

                                            if (date == months[n]) {
                                                crop_season_vals.push(values[k][1]);
                                            }
                                        }
                                    }

                                    var total = 0;
                                    for (var l = 0; l < crop_season_vals.length; l++) {
                                        total += crop_season_vals[l];
                                    }
                                    var avg = (total / crop_season_vals.length).toFixed(2);
                                    var max = Math.max.apply(null, crop_season_vals).toFixed(2);
                                    var min = Math.min.apply(null, crop_season_vals).toFixed(2);
                                    var std_dev = stdev(crop_season_vals).deviation;

                                    $('#seasons-statistic-info').append("Mean = " + avg + "<br>Max = " + max + "<br>Min = "
                                        + min + "<br>SD = " + std_dev + "<br><br>");
                                }
                            }
                        }
                    });
                }
                else {
                    $('#plotter').empty();
                }
            },
            error:function(request,status,error){
                $('.warning').html('<b style="color:red">'+error+'. Please select another point and try again.</b>');
            }
        });
    };

    $("#district-select").on('change',crop_district_info);
    $("#crop-select").on('change',crop_district_info);
    $("#variable-select").on('change',update_vars);
    $("#variable-select").on('change',get_ts);
    $("#district-select").on('change',get_ts);

    prepare_files = function (files) {
        var data = new FormData();

        Object.keys(files).forEach(function (file) {
            data.append('files', files[file]);
        });

        return data;
    };

    addDefaultBehaviorToAjax = function () {
        // Add CSRF token to appropriate ajax requests
        $.ajaxSetup({
            beforeSend: function (xhr, settings) {
                if (!checkCsrfSafe(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", getCookie("csrftoken"));
                }
            }
        });
    };

    checkCsrfSafe = function (method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    };

    getCookie = function (name) {
        var cookie;
        var cookies;
        var cookieValue = null;
        var i;

        if (document.cookie && document.cookie !== '') {
            cookies = document.cookie.split(';');
            for (i = 0; i < cookies.length; i += 1) {
                cookie = $.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    init_slider = function() {

        $("#slider").slider({
            value: 1,
            min: 0,
            max: slider_max - 1,
            step: 1, //Assigning the slider step based on the depths that were retrieved in the controller
            animate: "fast",
            slide: function (event, ui) {
                var date_text = $("#date-select option")[ui.value].text;
                $( "#lis-date" ).val(date_text); //Get the value from the slider
                var date_value = $("#date-select option")[ui.value].value;

            }
        });
    };

    cbar_str = function(){
        var sld_color_string = '';
        var var_option = $("#vars").find('option:selected').val();
        var cur_variable;
        var_info.forEach(function(element){
            if(element["name"] == var_option) {
                cur_variable = element;
            }
        });
        cbar.forEach(function(color,i){
            var color_map_entry = '<ColorMapEntry color="'+color+'" quantity="'+cur_variable["interval"][i]+'" label="label'+i+'" opacity="0.7"/>';
            sld_color_string += color_map_entry;
        });
        return sld_color_string


    };


    add_wms = function(){
        // gs_layer_list.forEach(function(item){
        map.removeLayer(wms_layer);
        var color_str = cbar_str();
        var store_name = $("#date-select").find('option:selected').val();
        var layer_var = store_name+"_"+$("#vars").find('option:selected').val();

        var layer_name = 'lis:'+layer_var;
        var sld_string = '<StyledLayerDescriptor version="1.0.0"><NamedLayer><Name>'+layer_name+'</Name><UserStyle><FeatureTypeStyle><Rule>\
        <RasterSymbolizer> \
        <ColorMap>\
        <ColorMapEntry color="#000000" quantity="-9999" label="nodata" opacity="0.0" />'+
            color_str
            +'<ColorMapEntry color="#000000" quantity="9999E36" label="nodata" opacity="0.0" /></ColorMap>\
        </RasterSymbolizer>\
        </Rule>\
        </FeatureTypeStyle>\
        </UserStyle>\
        </NamedLayer>\
        </StyledLayerDescriptor>';

        wms_source = new ol.source.ImageWMS({
            url: 'http://tethys.byu.edu:8181/geoserver/wms',
            params: {'LAYERS':layer_name,'SLD_BODY':sld_string},
            serverType: 'geoserver',
            crossOrigin: 'Anonymous'
        });

        wms_layer = new ol.layer.Image({
            source: wms_source
        });

        map.addLayer(wms_layer);

    };

    update_wms = function(date_str){

        var color_str = cbar_str();
        var var_option = $("#vars").find('option:selected').val();
        var layer_name = 'lis:'+date_str+'_'+var_option;

        var sld_string = '<StyledLayerDescriptor version="1.0.0"><NamedLayer><Name>'+layer_name+'</Name><UserStyle><FeatureTypeStyle><Rule>\
        <RasterSymbolizer> \
        <ColorMap> \
        <ColorMapEntry color="#000000" quantity="-9999" label="nodata" opacity="0.0" />'+
            color_str
            +' <ColorMapEntry color="#000000" quantity="9999E36" label="nodata" opacity="0.0" /></ColorMap>\
        </RasterSymbolizer>\
        </Rule>\
        </FeatureTypeStyle>\
        </UserStyle>\
        </NamedLayer>\
        </StyledLayerDescriptor>';

        wms_source.updateParams({'LAYERS':layer_name,'SLD_BODY':sld_string});

    };

    /************************************************************************
     *                        DEFINE PUBLIC INTERFACE
     *************************************************************************/
    /*
     * Library object that contains public facing functions of the package.
     * This is the object that is returned by the library wrapper function.
     * See below.
     * NOTE: The functions in the public interface have access to the private
     * functions of the library because of JavaScript function scope.
     */


    /************************************************************************
     *                  INITIALIZATION / CONSTRUCTOR
     *************************************************************************/

    // Initialization: jQuery function that gets called when
    // the DOM tree finishes loading
    $(function() {
        init_vars();
        addDefaultBehaviorToAjax();
        init_map();
        init_slider();
        gen_color_bar();

        $("#speed").val((1/(animationDelay/1000)).toFixed(2));


        $("#date-select").change(function(){
            add_wms();
            var selected_option = $(this).find('option:selected').index();
            $("#slider").slider("value", selected_option);
        }).change();

        $("#vars").change(function(){
            clearInterval(sliderInterval);
            update_color_bar();
            var val = $("#slider").slider("value");
            var date_value = $("#date-select option")[val].value;
            update_wms(date_value);
        });

        $("#slider").on("slidechange", function(event, ui) {
            var date_text = $("#date-select option")[ui.value].text;
            $( "#lis-date" ).val(date_text); //Get the value from the slider
            var date_value = $("#date-select option")[ui.value].value;
            update_wms(date_value);

        });

    });

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.