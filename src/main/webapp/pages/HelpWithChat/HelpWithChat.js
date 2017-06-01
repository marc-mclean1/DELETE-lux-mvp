Application.$controller("HelpWithChatPageController", ["$scope", function($scope) {
    "use strict";

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

    $scope.watsonChatbot2Watsonresponse = function($isolateScope) {
        var data = $isolateScope.watsonresponse;
        var output_text = _.get(data, 'output.text');

        /* check for a message from chat */
        if (Array.isArray(output_text)) {
            _.forEach(output_text, function(text) {

                if (_.includes(text, ".pdf")) {
                    $scope.sourceURL = "resources/files/" + text.substring(0, text.indexOf(".pdf") + 4);
                }
            });
        } else {
            //handle the string
        }

    };

}]);