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

        console.log($scope.Widgets);


    };

    $scope.watsonChatbot2Watsonresponse = function($isolateScope) {
        var data = $isolateScope.watsonresponse;

        console.log("user = " + JSON.stringify($scope.Variables.loggedInUser.getData()));
        console.log("conversation = " + JSON.stringify(data));

        // Check input and possibly add to scope variable.
        // TODO: this method should be placed on the outbound side - i.e., the initial call to Watson Conversation.
        // This would allow us to perform the NLU query in parallel to the conversation analysis.t6ttft66t5556tt65656t
        if (data.context.system.dialog_turn_counter == 1) {
            initializeConversationContext(data);
        } else {
            // For anything but the first blank input, capture the user input into an array.
            $scope.Variables.staticVariable3.addItem({
                dataValue: data.input.text
            });
        }

        if (data.input.text == "var3") {
            console.log("staticVariable3: ", $scope.Variables.staticVariable3.getData());
        }

        sendInputToNLU(data.input.text);

        var hasPDF = parseDataForPDF(data);



    }; // END $scope.watsonChatbot2Watsonresponse = function($isolateScope) {


    function initializeConversationContext(data) {
        console.log("New Conversation, setting context.");
        data.context.employeeRole = $scope.Variables.loggedInUser.getData().roles[0];
        data.context.employeeCountry = "US";
        data.context.employeeLocation = "US";
    }



    // request body for NLU service, update text prior to sending.
    $scope.requestBodyNLU = {
        "text": "",
        "features": {
            "entities": {
                "emotion": false,
                "sentiment": false,
                "limit": 5
            },
            "keywords": {
                "emotion": false,
                "sentiment": false,
                "limit": 5
            },
            "concepts": {
                "limit": 5
            },
            "semantic_roles": {
                "entities": true,
                "keywords": true,
                "limit": 5
            },
            "categories": {},
            "relations": {},
            "sentiment": {}
        }
    };
    // called in order to send input to NLU... 
    function sendInputToNLU(inputText) {
        console.log("User Input ==> " + inputText);
        if (inputText) {
            console.log($scope.requestBodyNLU);
            $scope.requestBodyNLU.text = inputText;
            $scope.Variables.invokeNLUService.setInput('RequestBody', $scope.requestBodyNLU);
            $scope.Variables.invokeNLUService.invoke();
        }
    };
    // This does not seem to get called.  Not sure why.
    $scope.invokeNLUServiceOnResult = function(variable, data) {
        console.log("invokeNLUServiceOnResult:", variable, data);
    };
    // This gets called on error condition (keeps wm popup from automatically displaying)
    $scope.invokeNLUServiceOnError = function(variable, data) {
        console.log("invokeNLUServiceOnError:", variable, data);
    };
    // "onSuccess": "invokeNLUServiceonSuccess($event, $scope)",
    $scope.invokeNLUServiceOnSuccess = function(variable, data) {
        //needed to empty the datavalue as the widget has a minor bug
        console.log("invokeNLUServiceOnSuccess:", variable, data);
        // $scope.Widgets.entityCheckbox.datavalue = [];
        // $scope.Widgets.keywordCheckbox.datavalue = [];
        // $scope.Widgets.entity_ConversationCheckbox.datavalue = [];
    };





    // request body for DISCOVERY service, update prior to sending.
    // This gets called on error condition (keeps wm popup from automatically displaying)
    $scope.invokeDiscoveryServiceOnError = function(variable, data) {
        console.log("invokeDiscoveryServiceOnError:", variable, data);
    };
    // "onSuccess": "invokeNLUServiceonSuccess($event, $scope)",
    $scope.invokeDiscoveryServiceOnSuccess = function(variable, data) {
        //needed to empty the datavalue as the widget has a minor bug
        console.log("invokeDiscoveryServiceOnSuccess:", variable, data);
        // $scope.Widgets.entityCheckbox.datavalue = [];
        // $scope.Widgets.keywordCheckbox.datavalue = [];
        // $scope.Widgets.entity_ConversationCheckbox.datavalue = [];
    };





    // Check watson output for text of the form [test.pdf][page#] and handle accordingly.
    function parseDataForPDF(data) {
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

}]); // END Application.$controller