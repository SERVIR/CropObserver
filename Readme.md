## Synopsis

Grace data visualizer for drought index information on the South Asia region.

## Code Example (Computing statistics)

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

## Motivation

This project was for a joint class with Dr. Jim Nelson at BYU and Dr. Ben Zaitchik at JHU.

## Installation

See http://www.tethysplatform.org for infromation regarding installing apps. All data is currently provided in the repo.

## Tests

See the "LIS_information.txt" file for test information.

## Contributors

Corey Krewson, Wanshu Nie, Hechang and Tylor Bayer.
