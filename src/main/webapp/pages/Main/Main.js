Application.$controller("MainPageController", ["$scope", function($scope) {
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
            _.forEach(output_text, function(text, index) {

                if (_.includes(text, ".pdf]")) {
                    // pull out the entire PDF
                    var pos = text.indexOf(".pdf]");
                    for (var i = pos; i >= 0; i--) {
                        if (text[i] == "[") {
                            var pdf = text.substring(i + 1, pos + 4);
                            console.log("pos = " + pos);
                            console.log("PDF = " + pdf);
                            // only handle if an open bracket is found, otherwise, we do nothing.
                            $scope.sourceURL = "resources/files/" + pdf.replace(/ /g, '_');
                            data.output.text[index] = text.replace("[" + pdf + "]", pdf);
                            break;
                        }
                    }
                }
            });
        } else {
            //handle the string - this should never happen.
        }
    };
    $scope.sendYes = function() {
        alert('Yes');
        //$scope.Widgets.watsonChatbot2.send('yes');
    }

}]);

function mySend() {
    console.log('sending');
    $('[data-ng-controller="WatsonChatbotController"]').scope().send('No');
}