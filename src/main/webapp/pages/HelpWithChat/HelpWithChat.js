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

        console.log("user = " + JSON.stringify($scope.Variables.loggedInUser.getData()));
        console.log("conversation = " + JSON.stringify(data));

        // If this is the first time we are entering this conversation, set context variables.
        if (data.context.system.dialog_turn_counter == 1) {
            initializeConversationContext(data);
        }

        parseDataForPDF(data);


    }; // END $scope.watsonChatbot2Watsonresponse = function($isolateScope) {


    function initializeConversationContext(data) {
        console.log("New Conversation, setting context.");
        data.context.employeeRole = $scope.Variables.loggedInUser.getData().roles[0];
        data.context.employeeCountry = "US";
        data.context.employeeLocation = "US";
    }


    // Check watson output for text of the form [test.pdf][page#] and handle accordingly.
    function parseDataForPDF(data) {
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
    }

}]); // END Application.$controller