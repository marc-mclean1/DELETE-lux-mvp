Application.$controller("TestPagePageController", ["$scope", function($scope) {
    "use strict";
    var imageBaseURL = "http://img.michaels.com/";

    /* perform any action on widgets/variables within this block */
    $scope.onPageReady = function() {
        /*
         * variables can be accessed through '$scope.Variables' property here
         * e.g. to get dataSet in a staticVariable named 'loggedInUser' use following script
         * $scope.Variables.loggedInUser.getData()
         *
         * widgets can be accessed through '$scope.Widgets' property here
         * e.g. to get value of text widget named 'username' use following script
         * '$scope.Widgets.username.datavalue'
         */
    };
    //livelist calls this function to get the image url writtern in the use expression of the picture widget in listtemplate
    $scope.getProductImageUrl = function(product) {
        var originalImg = _.get(product, 'images.image-group.0.image'),
            smallImg;

        //if the image-group doesn't exist then just return empty string
        if (!originalImg) {
            return '';
        }

        //if it is an array then get the first object
        if (_.isArray(originalImg)) {
            originalImg = originalImg[0];
        }

        smallImg = (_.get(originalImg, '@path') || '').split("|")[0] + "|240:240";

        return imageBaseURL + '/' + smallImg;
    };

    $scope.getProductName = function(product) {
        return product['display-name'] || '';
    };

    $scope.getProductScore = function(product) {
        return product.score;
    };
}]);