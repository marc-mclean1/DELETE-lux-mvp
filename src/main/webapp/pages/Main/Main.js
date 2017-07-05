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





// Remove this method for production... it is deprecated now that we are storing file information in context.        
function parseDataForPDF_deprecated(data) {
    var ret = false;
    var output_text = _.get(data, 'output.text');

    /* check for a message from chat, last entry first */
    if (Array.isArray(output_text)) {
        _.forEachRight(output_text, function(text, index) {
            if (_.includes(text, ".pdf]")) {
                console.log("FOUND PDF");
                var boolClearPDF = false;
                // parse the PDF information (find last mentioned PDF)
                var pos = text.lastIndexOf(".pdf]");
                for (var i = pos; i >= 0; i--) {
                    if (text[i] == "[") {
                        ret = true;
                        if (i !== 0 && text[i - 1] == "-") {
                            boolClearPDF = true;
                        }
                        pos += 4;
                        var pdf = text.substring(i + 1, pos);
                        var page = "";
                        var url = pdf;
                        var im = text.length;
                        if (pos + 1 < im && text[pos + 1] == "[") {
                            for (i = (pos + 2); i < im; i++) {
                                if (text[i] == "]") {
                                    page = _.toInteger(text.substring(pos + 2, i));
                                    if (page > 0) {
                                        console.log("FOUND PAGE");
                                        url += "#page=" + page;
                                        page = "[" + page + "]";
                                    }
                                    break;
                                }
                            }
                        }
                        console.log("URL = " + url);

                        // only handle if an open bracket is found, otherwise, we do nothing.
                        $scope.sourceURL = "resources/files/" + url.replace(/ /g, '_');

                        // Now, depending on boolClearPDF, either remove brackets or entire reference.
                        if (boolClearPDF) {
                            data.output.text[index] = text.replace("-[" + pdf + "]" + page, "");
                        } else { // will preserve page as i.e., test.pdf[2].
                            data.output.text[index] = text.replace("[" + pdf + "]", pdf);
                        }
                        break;
                    }
                }
            }
        });
    } else {
        //handle the string - this should never happen.
    }
    return ret;
}




function mySend() {
    console.log('sending');
    $('[data-ng-controller="WatsonChatbotController"]').scope().send('No');
}