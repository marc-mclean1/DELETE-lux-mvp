Application.$controller("MainPageController", ["$scope", function($scope) {
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

    //sample request body for nlu service
    $scope.requestBodyNLU = {
        "text": "",
        "features": {
            "entities": {
                "emotion": true,
                "sentiment": true,
                "limit": 10
            },
            "keywords": {
                "emotion": true,
                "sentiment": true,
                "limit": 10
            },
            "categories": {
                "emotion": true,
                "sentiment": true,
                "limit": 10
            }
        }
    };

    $scope.requestBodyConversation = {
        "input": {
            "text": ""
        },
        "alternate_intents": true
    };

    //on message form submit set the requestbody for the nlu service and invoke it.
    $scope.messageFormSubmit = function($event, $isolateScope, $formData) {
        var message = _.get($scope.Widgets, 'messageForm.formWidgets.message.datavalue') || _.get($formData, 'message');
        if (!message) {
            return;
        }
        $scope.requestBodyNLU.text = message;
        $scope.requestBodyConversation.input.text = message;
        $scope.Variables.invokeNLUService.setInput('RequestBody', $scope.requestBodyNLU);
        $scope.Variables.invokeConversationService.setInput('RequestBody', $scope.requestBodyConversation);
        $scope.Variables.invokeConversationService.invoke();
        $scope.Variables.invokeNLUService.invoke();
    };

    //livelist calls this function to get the image url writtern in the use expression of the picture widget in listtemplate
    $scope.getProductImageUrl = function(product) {
        var originalImg = _.get(product, 'images.image-group.0.image'),
            smallImg,
            picurl,
            newImg = new Image,
            pictureWidget = this.currentItemWidgets.Picture.$element.find('img'),
            loadingIconSrc = 'resources/images/imagelists/loading.gif';

        //if the image-group doesn't exist then just return empty string
        if (!originalImg) {
            return '';
        }

        //if it is an array then get the first object
        if (_.isArray(originalImg)) {
            originalImg = originalImg[0];
        }

        smallImg = (_.get(originalImg, '@path') || '').split("|")[0] + "|240:240";

        picurl = imageBaseURL + '/' + smallImg;

        //on load of the image just change the source of the pictureWidget
        newImg.onload = function() {
            pictureWidget[0].src = picurl;
        };

        //this will load the image asynchronously
        newImg.src = picurl;

        //when navigated this will make the old image again to loading state
        pictureWidget[0].src = loadingIconSrc;

        return loadingIconSrc;
    };

    $scope.getProductName = function(product) {
        return product['display-name'] || '';
    };

    $scope.getProductScore = function(product) {
        return product.score;
    };

    $scope.getProductRating = function(product) {
        return _.get(product, 'bvAverageRating') || '';
    };


    $scope.discoverMoreClick = function($event, $isolateScope) {
        //on discover click
        var keywordParams = [],
            entityParams = [];

        var convEntities = ['color', 'brand'];

        _.forEach($scope.Widgets.entityCheckbox.datavalue, function(entity) {
            pushToArrayIfNotPresent(entityParams, 'enriched_long-description.entities.type', entity.type);
            pushToArrayIfNotPresent(entityParams, 'enriched_long-description.entities.text', entity.text);
        });


        _.forEach($scope.Widgets.entity_ConversationCheckbox.datavalue, function(entity) {
            if (_.includes(convEntities, entity.entity)) {
                pushToArrayIfNotPresent(entityParams, entity.entity, entity.value);
            } else {
                pushToArrayIfNotPresent(entityParams, 'enriched_long-description.entities.text', entity.value);
            }
        });

        //build comma separated keyword params for keywords
        _.forEach($scope.Widgets.keywordCheckbox.datavalue, function(keyword) {
            pushToArrayIfNotPresent(keywordParams, 'enriched_long-description.keywords.text', keyword.text);
        });
        console.log(entityParams, keywordParams);
        $scope.Variables.invokeDiscoveryServiceWFilter.setInput('query', keywordParams.length ? (keywordParams.join(',')) : "");
        $scope.Variables.invokeDiscoveryServiceWFilter.setInput('filter', entityParams.length ? (entityParams.join(',')) : "");
        $scope.Variables.invokeDiscoveryServiceWFilter.invoke();
    };

    function pushToArrayIfNotPresent(array, key, value) {
        if (value) {
            var str = key + ':"' + value + '"';
            if (!_.includes(array, str))
                array.push(str);
        }
    }

    $scope.invokeNLUServiceonSuccess = function(variable, data) {
        //needed to empty the datavalue as the widget has a minor bug
        $scope.Widgets.entityCheckbox.datavalue = [];
        $scope.Widgets.keywordCheckbox.datavalue = [];
        $scope.Widgets.entity_ConversationCheckbox.datavalue = [];
    };


    $scope.discoveryListSetrecord = function($event, $isolateScope, $index, $data) {
        $("html, body").animate({
            scrollTop: 0
        }, "fast");
    };

}]);